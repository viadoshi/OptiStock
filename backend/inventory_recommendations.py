# ============================================================
# inventory_recommendations.py — Smart Inventory Recommendations Engine
# OptiStock AI — Demand Forecasting & Sizing System
#
# Audited Sizing Architecture & Logic Framework:
#
# 1. Dated Sales & Zero-Demand Filling:
#      - Completed transactions filtered strictly (Pending / Refunded excluded).
#      - Spans from min(date) to max(date). Days without sales filled with 0.0.
#      - Usable history requires BOTH >= 30 completed orders AND >= 30 calendar days span.
#
# 2. Expected Lead-Time Demand (LTD):
#      LTD = d_daily × L
#      Where:
#        d_daily = Average daily demand (units/day)
#        L       = Supplier lead time in calendar days
#
# 3. Safety Stock (SS) & One-Sided Cycle Service Level (CSL):
#      Case A (Reliable history: >= 30 orders AND >= 30 days span):
#        SS = ceil(Z_CSL × σ_d × √L)
#        Where:
#          Z_CSL = One-sided upper quantile for cycle service level
#                  (e.g., Z = 1.645 for 95% non-stockout probability).
#                  Strictly distinguished from two-sided ±1.96 prediction intervals.
#          σ_d   = Sample standard deviation of daily demand (zero-sales days included).
#      Case B (Insufficient history / Missing variance):
#        SS = ceil(d_daily × fallback_safety_days)
#        Marked explicitly as estimated with transparency warnings.
#
# 4. Reorder Point (ROP):
#      ROP = ceil(LTD + SS)
#
# 5. Days of Stock Remaining (DSR):
#      DSR = current_stock ÷ d_daily  (Safe division: None if d_daily <= 0)
#
# 6. Target Stock Level & Suggested Replenishment Quantity:
#      Target Stock Level S = ceil(LTD + SS + (d_daily × target_coverage_days))
#      Net Inventory I_net = max(0, current_stock) + max(0, incoming_stock)
#      Policy:
#        If status is 'critical' OR I_net <= ROP:
#          Q = max(0, S - I_net)
#        Else:
#          Q = 0  (Net stock above reorder trigger)
#
# 7. Status Classification Hierarchy (Mutually Exclusive):
#      Tier 1 - Critical: current_stock <= 0 OR current_stock < LTD
#      Tier 2 - Reorder Now: I_net <= ROP (and not Critical)
#      Tier 3 - Overstock: I_net > ROP AND (DSR > overstock_days_threshold OR current_stock > S * 1.5)
#      Tier 4 - Healthy: Adequate balance
#
# 8. Cost KPI Integrity:
#      Uses actual wholesale unit cost (cost_price). Never substitutes retail selling_price.
# ============================================================

from __future__ import annotations

import math
from datetime import datetime, date, timedelta
from typing import List, Optional, Tuple, Dict, Any
import numpy as np
from sqlalchemy.orm import Session

from orm_models import ProductORM, SaleTransactionORM
from models import (
    InventoryRecommendation,
    CalculationDetails,
    RecommendationSummary,
    RecommendationParameters,
    InventoryRecommendationsResponse,
    InventoryStatus,
    DemandSource,
    ProductCategory,
)


# ──────────────────────────────────────────────────────────────
# 1. Pure Empirical Daily Demand & Variance Calculator
# ──────────────────────────────────────────────────────────────

def calculate_empirical_daily_demand(
    sales_records: List[Tuple[str, float, str]],
    min_orders_threshold: int = 30,
    min_days_span_threshold: int = 30,
) -> Tuple[float, Optional[float], int, int, bool, str]:
    """
    Parses dated sales transactions, excludes refunds/pending, fills zero-sales days,
    and computes mean daily demand and standard deviation over the observation window.

    Returns:
        (mean_daily_demand, std_daily_demand, completed_orders_count,
         calendar_days_span, has_sufficient_history, methodology_explanation)
    """
    # Filter strictly for completed sales with positive quantity
    valid_sales: List[Tuple[date, float]] = []
    for date_str, qty, status in sales_records:
        if status != "Completed" or qty is None or float(qty) <= 0:
            continue
        try:
            # Parse ISO date or "YYYY-MM-DD HH:MM"
            d_clean = str(date_str).strip()[:10]
            dt = datetime.strptime(d_clean, "%Y-%m-%d").date()
            valid_sales.append((dt, float(qty)))
        except Exception:
            continue

    if not valid_sales:
        return 0.0, None, 0, 0, False, "No completed sales transactions found in database."

    # Group completed sales by calendar date
    daily_sales_map: Dict[date, float] = {}
    for d, qty in valid_sales:
        daily_sales_map[d] = daily_sales_map.get(d, 0.0) + qty

    min_date = min(daily_sales_map.keys())
    max_date = max(daily_sales_map.keys())
    calendar_days_span = (max_date - min_date).days + 1
    completed_orders_count = len(valid_sales)

    # Validate both transaction sample size AND calendar observation span
    has_sufficient = (
        completed_orders_count >= min_orders_threshold
        and calendar_days_span >= min_days_span_threshold
    )

    # Build continuous daily time series filling zero-sales days
    daily_series: List[float] = []
    curr = min_date
    while curr <= max_date:
        daily_series.append(daily_sales_map.get(curr, 0.0))
        curr += timedelta(days=1)

    arr = np.array(daily_series, dtype=float)
    mean_daily = float(np.mean(arr)) if len(arr) > 0 else 0.0

    if has_sufficient:
        # Sample standard deviation (ddof=1) across continuous calendar days
        std_daily = float(np.std(arr, ddof=1)) if len(arr) > 1 else 0.0
        explanation = (
            f"Empirical time series across {calendar_days_span} calendar days with "
            f"{completed_orders_count} completed orders (all zero-sales days accounted for)."
        )
        return round(mean_daily, 2), round(std_daily, 2), completed_orders_count, calendar_days_span, True, explanation
    else:
        explanation = (
            f"Insufficient usable history: {completed_orders_count} orders over {calendar_days_span} calendar days "
            f"(requires >= {min_orders_threshold} orders and >= {min_days_span_threshold} days span for reliable empirical variance)."
        )
        return round(mean_daily, 2), None, completed_orders_count, calendar_days_span, False, explanation


# ──────────────────────────────────────────────────────────────
# 2. Pure Inventory Calculation Functions (Unit-Testable)
# ──────────────────────────────────────────────────────────────

def calculate_lead_time_demand(daily_demand: float, lead_time_days: int) -> float:
    """
    Computes expected demand during supplier lead time.
    Safely clamps negative values to 0.0.
    """
    if daily_demand <= 0.0 or lead_time_days <= 0:
        return 0.0
    return round(float(daily_demand * lead_time_days), 2)


def calculate_safety_stock(
    daily_demand: float,
    lead_time_days: int,
    demand_std: Optional[float] = None,
    service_level_z: float = 1.645,
    default_safety_days: int = 7,
    has_sufficient_history: bool = False,
) -> Tuple[int, bool, str]:
    """
    Calculates safety stock buffer.
    Distinguishes one-sided cycle service level (CSL) from two-sided prediction intervals.
    Returns (safety_stock_units, is_estimated, method_description).
    """
    effective_lead_time = max(1, lead_time_days)
    effective_demand = max(0.0, daily_demand)

    # Case A: Sufficient history with reliable demand variability
    if has_sufficient_history and demand_std is not None and demand_std > 0:
        raw_ss = service_level_z * demand_std * math.sqrt(effective_lead_time)
        ss = int(math.ceil(raw_ss))
        method = (
            f"Statistical One-Sided CSL: Z({service_level_z:.3f}) × σ_d({demand_std:.2f}) × √L({effective_lead_time})"
        )
        return ss, False, method

    # Case B: Insufficient history or zero variability -> Configurable fallback
    raw_ss = effective_demand * max(1, default_safety_days)
    ss = int(math.ceil(raw_ss))
    method = f"Configurable Fallback Buffer: {default_safety_days} days coverage estimate"
    return ss, True, method


def calculate_reorder_point(expected_lead_time_demand: float, safety_stock: int) -> int:
    """
    Computes reorder point (ROP): expected lead-time demand + safety stock.
    """
    return int(math.ceil(max(0.0, expected_lead_time_demand) + max(0, safety_stock)))


def calculate_days_of_stock_remaining(
    current_stock: int, daily_demand: float
) -> Optional[float]:
    """
    Safely computes days of stock remaining: current_stock / daily_demand.
    Never divides by zero. Clamps negative stock to 0.0 days.
    """
    if daily_demand <= 0.0:
        return None
    effective_stock = max(0, current_stock)
    return round(float(effective_stock / daily_demand), 1)


def calculate_replenishment_quantity(
    current_stock: int,
    incoming_stock: int,
    reorder_point: int,
    expected_lead_time_demand: float,
    safety_stock: int,
    daily_demand: float,
    target_coverage_days: int,
    status: InventoryStatus,
) -> Tuple[int, int]:
    """
    Computes order-up-to target stock level and suggested replenishment quantity.
    Returns (suggested_replenishment_qty, target_stock_level).
    Never returns a negative suggested quantity.
    Units are consistent integer SKU pieces.
    """
    effective_stock = max(0, current_stock)
    effective_incoming = max(0, incoming_stock)
    net_inventory = effective_stock + effective_incoming

    # Target stock level = LTD + SS + (demand * target_coverage_days)
    lead_and_buffer = max(0.0, expected_lead_time_demand) + max(0, safety_stock)
    coverage_demand = max(0.0, daily_demand) * max(1, target_coverage_days)
    target_stock_level = int(math.ceil(lead_and_buffer + coverage_demand))

    # Replenish if stock is critical or net stock is at or below ROP
    if status in ("critical", "reorder_now") or net_inventory <= reorder_point:
        shortfall = target_stock_level - net_inventory
        suggested_qty = max(0, shortfall)
    else:
        suggested_qty = 0

    return suggested_qty, target_stock_level


def classify_inventory_status(
    current_stock: int,
    incoming_stock: int,
    expected_lead_time_demand: float,
    reorder_point: int,
    days_of_stock_remaining: Optional[float],
    lead_time_days: int,
    overstock_days_threshold: float,
    target_stock_level: int,
) -> Tuple[InventoryStatus, str, str]:
    """
    Classifies inventory status using a strict, mutually exclusive hierarchy:
      1. Critical: current_stock <= 0 OR current_stock < expected_lead_time_demand
      2. Reorder Now: net_inventory <= reorder_point (and Tier 1 is False)
      3. Overstock: net_inventory > reorder_point AND (DSR > threshold OR current_stock > target * 1.5)
      4. Healthy: Balanced coverage between ROP and Overstock threshold
    """
    net_inventory = max(0, current_stock) + max(0, incoming_stock)

    # ── Tier 1: Critical (Stockout Imminent or Active) ─────────────
    if current_stock <= 0:
        if incoming_stock > 0:
            return (
                "critical",
                "Critical",
                f"Warehouse shelf stock is 0 (shelf stockout). However, {incoming_stock} units are currently in transit on open purchase order.",
            )
        return (
            "critical",
            "Critical",
            "Stockout alert: Current inventory is zero or depleted. Immediate replenishment required.",
        )

    if current_stock < expected_lead_time_demand or (
        days_of_stock_remaining is not None and days_of_stock_remaining < lead_time_days
    ):
        return (
            "critical",
            "Critical",
            f"Stockout imminent before delivery: Current stock ({current_stock} units, {days_of_stock_remaining} days) "
            f"cannot cover expected lead-time demand ({expected_lead_time_demand:.1f} units over {lead_time_days} days).",
        )

    # ── Tier 2: Reorder Now (Net Inventory at or below ROP) ────────
    if net_inventory <= reorder_point:
        return (
            "reorder_now",
            "Reorder Now",
            f"Reorder point reached: Net stock ({net_inventory} units) is at or below reorder threshold ({reorder_point} units). "
            f"Replenish now to prevent dipping into safety stock.",
        )

    # ── Tier 3: Overstock (Net stock exceeds ROP AND exceeds threshold) ──
    # Note: Cannot be overstocked if net inventory <= reorder point
    if days_of_stock_remaining is not None and days_of_stock_remaining > overstock_days_threshold:
        return (
            "overstock",
            "Overstocked",
            f"Excess inventory detected: {current_stock} units represents {days_of_stock_remaining:.1f} days of supply, "
            f"exceeding the {overstock_days_threshold:.0f}-day overstock threshold.",
        )
    if current_stock > target_stock_level * 1.5 and current_stock > reorder_point * 2:
        return (
            "overstock",
            "Overstocked",
            f"Excess inventory detected: Current stock ({current_stock} units) exceeds 150% of target stock level ({target_stock_level} units).",
        )

    # ── Tier 4: Healthy (Balanced between ROP and Overstock) ──────
    days_text = f"{days_of_stock_remaining:.1f} days" if days_of_stock_remaining is not None else "indefinite"
    return (
        "healthy",
        "Healthy",
        f"Inventory healthy: Stock ({current_stock} units, {days_text}) adequately covers lead-time demand and safety buffer.",
    )


# ──────────────────────────────────────────────────────────────
# 3. Core Recommendation Builder for Database Products
# ──────────────────────────────────────────────────────────────

def compute_product_recommendation(
    product: ProductORM,
    db: Session,
    target_coverage_days: int = 14,
    default_lead_time_days: int = 7,
    default_safety_stock_days: int = 7,
    overstock_days_threshold: float = 45.0,
    service_level_z: float = 1.645,
    use_ml_forecast: bool = False,
    forecast_cache: Optional[Dict[str, Any]] = None,
) -> InventoryRecommendation:
    """
    Builds a complete explainable inventory recommendation for a single product.
    Enforces honest data origin labels, zero-sales handling, and unit-cost verification.
    """
    warnings: List[str] = []

    # 1. Lead Time Resolution
    raw_lead_time = product.lead_time_days
    if raw_lead_time is None or raw_lead_time <= 0:
        lead_time = default_lead_time_days
        is_lead_time_fallback = True
        warnings.append(
            f"Supplier lead time missing or invalid ({raw_lead_time}); applied configurable default of {default_lead_time_days} days."
        )
    else:
        lead_time = raw_lead_time
        is_lead_time_fallback = False

    # 2. Stock Values Validation
    raw_stock = product.current_stock if product.current_stock is not None else 0
    if raw_stock < 0:
        warnings.append(
            f"Negative inventory balance detected ({raw_stock} units). Clamped to 0 for calculations."
        )
        current_stock = 0
    else:
        current_stock = raw_stock

    incoming_stock = getattr(product, "incoming_stock", 0) or 0
    if incoming_stock < 0:
        incoming_stock = 0
    net_stock = current_stock + incoming_stock

    # 3. Organic Sales History Analysis with Date Filling
    sales_rows = (
        db.query(SaleTransactionORM.date, SaleTransactionORM.quantity, SaleTransactionORM.status)
        .filter(SaleTransactionORM.product_id == product.id)
        .all()
    )
    sales_tuples = [(r.date, float(r.quantity), r.status) for r in sales_rows]

    (
        empirical_mean,
        empirical_std,
        completed_orders,
        calendar_span,
        has_sufficient_history,
        history_explanation,
    ) = calculate_empirical_daily_demand(
        sales_records=sales_tuples,
        min_orders_threshold=30,
        min_days_span_threshold=30,
    )

    daily_demand = float(product.daily_demand_average or 0.0)
    demand_std: Optional[float] = None
    demand_source: DemandSource = "catalog_velocity"
    demand_source_label = "Catalog Baseline Velocity"

    if has_sufficient_history and empirical_mean > 0:
        daily_demand = empirical_mean
        demand_std = empirical_std
        demand_source = "organic_sales"
        demand_source_label = f"Organic MySQL Sales ({completed_orders} orders over {calendar_span} days)"
    else:
        warnings.append(
            f"Limited organic history in MySQL ({completed_orders} completed orders over {calendar_span} calendar days; "
            "requires >= 30 orders and >= 30 days span). Sizing uses catalog velocity with estimated fallback safety stock."
        )

    # 4. Optional ML Forecast Override (Exploratory / Benchmark Prior)
    if use_ml_forecast:
        try:
            from ml_forecasting import run_forecast
            sales_history = [(r[0], r[1]) for r in sales_tuples if r[2] == "Completed"]
            f_res = run_forecast(
                product_id=product.id,
                product_name=product.name,
                sku=product.sku,
                daily_demand_avg=product.daily_demand_average,
                reorder_point=product.reorder_point,
                lead_time_days=lead_time,
                current_stock=current_stock,
                cost_price=product.cost_price,
                model_name="XGBoost Regressor",
                horizon_days=30,
                sales_history=sales_history,
            )
            # Compute average forecasted daily demand over the lead-time window
            future_points = [p for p in f_res.forecastPoints if p.actualDemand is None]
            if future_points:
                lt_pts = future_points[:lead_time] if len(future_points) >= lead_time else future_points
                daily_demand = float(np.mean([p.predictedDemand for p in lt_pts]))
            demand_source = "synthetic_benchmark"
            demand_source_label = f"ML {f_res.model} Forecast (Synthetic Benchmark Prior)"
            warnings.append(
                "Synthetic benchmark data was generated for algorithmic development and does NOT "
                "represent verified real-world customer demand. Use as an exploratory decision-support benchmark only."
            )
        except Exception as e:
            warnings.append(f"ML forecast pipeline unavailable ({e}); fell back to catalog velocity.")

    # Check for zero or negative demand
    if daily_demand <= 0.0:
        daily_demand = 0.0
        warnings.append("Zero daily demand recorded. Stock coverage is indefinite; replenishment is paused.")

    # 5. Core Formulas Execution
    expected_ltd = calculate_lead_time_demand(daily_demand, lead_time)

    safety_stock, is_ss_estimated, ss_method = calculate_safety_stock(
        daily_demand=daily_demand,
        lead_time_days=lead_time,
        demand_std=demand_std,
        service_level_z=service_level_z,
        default_safety_days=default_safety_stock_days,
        has_sufficient_history=has_sufficient_history,
    )

    reorder_point = calculate_reorder_point(expected_ltd, safety_stock)
    days_of_stock = calculate_days_of_stock_remaining(current_stock, daily_demand)

    # Compute target stock level tentatively
    target_stock_level = int(
        math.ceil(expected_ltd + safety_stock + (daily_demand * target_coverage_days))
    )

    # 6. Status Classification
    status, status_label, status_explanation = classify_inventory_status(
        current_stock=current_stock,
        incoming_stock=incoming_stock,
        expected_lead_time_demand=expected_ltd,
        reorder_point=reorder_point,
        days_of_stock_remaining=days_of_stock,
        lead_time_days=lead_time,
        overstock_days_threshold=overstock_days_threshold,
        target_stock_level=target_stock_level,
    )

    # 7. Sizing Replenishment Quantity
    suggested_qty, target_stock_level = calculate_replenishment_quantity(
        current_stock=current_stock,
        incoming_stock=incoming_stock,
        reorder_point=reorder_point,
        expected_lead_time_demand=expected_ltd,
        safety_stock=safety_stock,
        daily_demand=daily_demand,
        target_coverage_days=target_coverage_days,
        status=status,
    )

    # 8. Wholesale Cost Integrity (No Retail Selling Price Substitution)
    raw_cost = product.cost_price
    if raw_cost is None or float(raw_cost) <= 0:
        cost_price = None
        estimated_cost = None
        is_cost_missing = True
        warnings.append(
            "Supplier wholesale cost price is missing or non-positive ($0.00). "
            "Estimated replenishment cost is omitted; retail selling price was not used as cost."
        )
    else:
        cost_price = float(raw_cost)
        estimated_cost = round(suggested_qty * cost_price, 2)
        is_cost_missing = False

    # 9. Assemble Calculation Details for Total Explainability
    calc_details = CalculationDetails(
        dailyDemand=round(daily_demand, 2),
        supplierLeadTimeDays=lead_time,
        isLeadTimeFallback=is_lead_time_fallback,
        safetyStock=safety_stock,
        isSafetyStockEstimated=is_ss_estimated,
        safetyStockMethod=ss_method,
        expectedLeadTimeDemand=round(expected_ltd, 2),
        reorderPoint=reorder_point,
        currentStock=current_stock,
        incomingStock=incoming_stock,
        netStock=net_stock,
        targetCoverageDays=target_coverage_days,
        targetStockLevel=target_stock_level,
        overstockThreshold=overstock_days_threshold,
        serviceLevelZ=service_level_z,
        serviceLevelType="One-sided Cycle Service Level (CSL) non-stockout probability",
        zScoreExplanation=(
            f"Z = {service_level_z:.3f} represents the one-sided standard normal quantile for non-stockout "
            f"probability during lead time (P(D <= ROP)), strictly distinguished from two-sided ±1.96 prediction intervals."
        ),
    )

    return InventoryRecommendation(
        productId=product.id,
        productName=product.name,
        sku=product.sku,
        category=product.category,  # type: ignore
        currentStock=current_stock,
        incomingStock=incoming_stock,
        netStock=net_stock,
        dailyDemand=round(daily_demand, 2),
        demandSource=demand_source,
        demandSourceLabel=demand_source_label,
        supplierLeadTimeDays=lead_time,
        isLeadTimeFallback=is_lead_time_fallback,
        expectedLeadTimeDemand=round(expected_ltd, 2),
        safetyStock=safety_stock,
        isSafetyStockEstimated=is_ss_estimated,
        reorderPoint=reorder_point,
        suggestedReplenishmentQty=suggested_qty,
        daysOfStockRemaining=days_of_stock,
        status=status,
        statusLabel=status_label,
        statusExplanation=status_explanation,
        warnings=warnings,
        calculationDetails=calc_details,
        costPrice=cost_price,
        estimatedReplenishmentCost=estimated_cost,
        isCostMissing=is_cost_missing,
        supplier=product.supplier or "Unknown Supplier",
    )


# ──────────────────────────────────────────────────────────────
# 4. Portfolio-Wide Recommendations Generator
# ──────────────────────────────────────────────────────────────

def generate_all_recommendations(
    db: Session,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    target_coverage_days: int = 14,
    default_lead_time_days: int = 7,
    default_safety_stock_days: int = 7,
    overstock_days_threshold: float = 45.0,
    service_level_z: float = 1.645,
    use_ml_forecast: bool = False,
) -> InventoryRecommendationsResponse:
    """
    Computes recommendations for all catalog SKUs, applies filtering,
    and aggregates portfolio summary statistics.
    """
    query = db.query(ProductORM)
    if category:
        query = query.filter(ProductORM.category == category)
    products = query.all()

    recommendations: List[InventoryRecommendation] = []
    for p in products:
        rec = compute_product_recommendation(
            product=p,
            db=db,
            target_coverage_days=target_coverage_days,
            default_lead_time_days=default_lead_time_days,
            default_safety_stock_days=default_safety_stock_days,
            overstock_days_threshold=overstock_days_threshold,
            service_level_z=service_level_z,
            use_ml_forecast=use_ml_forecast,
        )
        if status_filter is None or rec.status == status_filter.lower():
            recommendations.append(rec)

    # Compute Portfolio KPI Summary
    crit_count = sum(1 for r in recommendations if r.status == "critical")
    reorder_count = sum(1 for r in recommendations if r.status == "reorder_now")
    healthy_count = sum(1 for r in recommendations if r.status == "healthy")
    overstock_count = sum(1 for r in recommendations if r.status == "overstock")
    total_order_units = sum(r.suggestedReplenishmentQty for r in recommendations)

    # Cost calculation: only sums products with valid cost price
    costs = [r.estimatedReplenishmentCost for r in recommendations if r.estimatedReplenishmentCost is not None]
    total_cost = round(sum(costs), 2)
    has_missing_costs = any(r.isCostMissing for r in recommendations)

    summary = RecommendationSummary(
        totalProducts=len(recommendations),
        criticalCount=crit_count,
        reorderNowCount=reorder_count,
        healthyCount=healthy_count,
        overstockedCount=overstock_count,
        totalSuggestedOrderUnits=total_order_units,
        totalEstimatedReplenishmentCost=total_cost,
        hasMissingCosts=has_missing_costs,
    )

    parameters = RecommendationParameters(
        targetCoverageDays=target_coverage_days,
        defaultLeadTimeDays=default_lead_time_days,
        defaultSafetyStockDays=default_safety_stock_days,
        overstockDaysThreshold=overstock_days_threshold,
        serviceLevelZ=service_level_z,
        useMlForecast=use_ml_forecast,
    )

    return InventoryRecommendationsResponse(
        summary=summary,
        parameters=parameters,
        recommendations=recommendations,
    )
