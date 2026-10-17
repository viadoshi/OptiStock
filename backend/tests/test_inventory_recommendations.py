# ============================================================
# test_inventory_recommendations.py — Unit & Integration Tests
# OptiStock AI — Smart Inventory Recommendations Test Suite
# ============================================================

import os
import sys
import pytest
import math
from fastapi import HTTPException

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from inventory_recommendations import (
    calculate_lead_time_demand,
    calculate_safety_stock,
    calculate_reorder_point,
    calculate_days_of_stock_remaining,
    calculate_replenishment_quantity,
    classify_inventory_status,
    compute_product_recommendation,
    generate_all_recommendations,
)
from database import SessionLocal
from orm_models import ProductORM
import main


# ──────────────────────────────────────────────────────────────
# 1. Formula & Pure Calculation Unit Tests
# ──────────────────────────────────────────────────────────────

def test_calculate_lead_time_demand():
    """Verify LTD = daily_demand * lead_time_days and safe boundary handling."""
    # Standard: 5.2 demand * 5 days = 26.0
    assert calculate_lead_time_demand(5.2, 5) == 26.0

    # Zero daily demand
    assert calculate_lead_time_demand(0.0, 7) == 0.0

    # Zero or negative lead time
    assert calculate_lead_time_demand(4.0, 0) == 0.0
    assert calculate_lead_time_demand(4.0, -3) == 0.0

    # Negative daily demand
    assert calculate_lead_time_demand(-2.5, 5) == 0.0


def test_calculate_safety_stock_statistical():
    """Verify statistical safety stock with sufficient history: Z * sigma * sqrt(L)."""
    # Z = 1.645, sigma = 2.0, L = 9 days -> 1.645 * 2.0 * 3.0 = 9.87 -> ceil = 10
    ss, is_est, method = calculate_safety_stock(
        daily_demand=5.0,
        lead_time_days=9,
        demand_std=2.0,
        service_level_z=1.645,
        default_safety_days=7,
        has_sufficient_history=True,
    )
    assert ss == 10
    assert is_est is False
    assert "Statistical" in method
    assert "Z(1.645)" in method


def test_calculate_safety_stock_fallback():
    """Verify fallback safety stock when history is insufficient or sigma is None."""
    # 4.5 demand * 7 fallback days = 31.5 -> ceil = 32
    ss, is_est, method = calculate_safety_stock(
        daily_demand=4.5,
        lead_time_days=5,
        demand_std=None,
        service_level_z=1.645,
        default_safety_days=7,
        has_sufficient_history=False,
    )
    assert ss == 32
    assert is_est is True
    assert "Fallback" in method and "7 days" in method


def test_calculate_reorder_point():
    """Verify Reorder Point = ceil(LTD + SS)."""
    # LTD = 26.0, SS = 37 -> ROP = 63
    assert calculate_reorder_point(26.0, 37) == 63
    assert calculate_reorder_point(0.0, 10) == 10
    assert calculate_reorder_point(15.4, 0) == 16


def test_calculate_days_of_stock_remaining_zero_demand():
    """Verify safe handling of zero demand (no division by zero)."""
    assert calculate_days_of_stock_remaining(50, 0.0) is None
    assert calculate_days_of_stock_remaining(50, -1.0) is None


def test_calculate_days_of_stock_remaining_normal():
    """Verify normal DSR = current_stock / daily_demand."""
    # 14 / 5.2 = 2.692 -> 2.7
    assert calculate_days_of_stock_remaining(14, 5.2) == 2.7
    # 0 stock -> 0.0
    assert calculate_days_of_stock_remaining(0, 5.0) == 0.0
    # Negative stock clamped to 0.0
    assert calculate_days_of_stock_remaining(-5, 5.0) == 0.0


def test_calculate_replenishment_quantity_never_negative():
    """Verify suggested order quantity is never negative even if overstocked."""
    # current_stock = 200, incoming = 50, target = 100
    qty, target = calculate_replenishment_quantity(
        current_stock=200,
        incoming_stock=50,
        reorder_point=40,
        expected_lead_time_demand=20.0,
        safety_stock=20,
        daily_demand=2.0,
        target_coverage_days=14,
        status="overstock",
    )
    assert qty == 0
    assert target > 0


def test_calculate_replenishment_quantity_accounts_for_incoming():
    """Verify confirmed incoming stock reduces the suggested replenishment quantity."""
    # target = 26 + 37 + (5.2 * 14) = 63 + 72.8 = 135.8 -> 136
    # current = 14, incoming = 40 -> net = 54
    # Shortfall = 136 - 54 = 82
    qty, target = calculate_replenishment_quantity(
        current_stock=14,
        incoming_stock=40,
        reorder_point=63,
        expected_lead_time_demand=26.0,
        safety_stock=37,
        daily_demand=5.2,
        target_coverage_days=14,
        status="critical",
    )
    assert target == 136
    assert qty == 82


def test_classify_inventory_status_cases():
    """Verify classification logic across Critical, Reorder Now, Overstock, and Healthy."""
    # 1. Critical due to zero stock
    status, label, _ = classify_inventory_status(
        current_stock=0,
        incoming_stock=0,
        expected_lead_time_demand=20.0,
        reorder_point=40,
        days_of_stock_remaining=0.0,
        lead_time_days=7,
        overstock_days_threshold=45.0,
        target_stock_level=100,
    )
    assert status == "critical"
    assert label == "Critical"

    # 2. Critical due to stock lower than lead-time demand (stockout before arrival)
    status, label, _ = classify_inventory_status(
        current_stock=10,
        incoming_stock=0,
        expected_lead_time_demand=25.0,
        reorder_point=45,
        days_of_stock_remaining=2.0,
        lead_time_days=5,
        overstock_days_threshold=45.0,
        target_stock_level=120,
    )
    assert status == "critical"

    # 3. Reorder Now: stock covers lead time but is <= ROP
    status, label, _ = classify_inventory_status(
        current_stock=30,
        incoming_stock=0,
        expected_lead_time_demand=25.0,
        reorder_point=45,
        days_of_stock_remaining=6.0,
        lead_time_days=5,
        overstock_days_threshold=45.0,
        target_stock_level=120,
    )
    assert status == "reorder_now"
    assert label == "Reorder Now"

    # 4. Overstock: days of stock > 45 days
    status, label, _ = classify_inventory_status(
        current_stock=150,
        incoming_stock=0,
        expected_lead_time_demand=20.0,
        reorder_point=40,
        days_of_stock_remaining=60.0,
        lead_time_days=5,
        overstock_days_threshold=45.0,
        target_stock_level=100,
    )
    assert status == "overstock"
    assert label == "Overstocked"

    # 5. Healthy: within balanced range
    status, label, _ = classify_inventory_status(
        current_stock=70,
        incoming_stock=0,
        expected_lead_time_demand=20.0,
        reorder_point=40,
        days_of_stock_remaining=20.0,
        lead_time_days=5,
        overstock_days_threshold=45.0,
        target_stock_level=100,
    )
    assert status == "healthy"
    assert label == "Healthy"


# ──────────────────────────────────────────────────────────────
# 2. Database Integration & Transparency Tests
# ──────────────────────────────────────────────────────────────

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_product_recommendation_transparency_and_warnings(db_session):
    """Verify product recommendation generates calculation inputs and explainable warnings."""
    prod = db_session.query(ProductORM).filter(ProductORM.id == "prod-001").first()
    assert prod is not None

    rec = compute_product_recommendation(
        product=prod,
        db=db_session,
        target_coverage_days=14,
        default_lead_time_days=7,
        default_safety_stock_days=7,
    )

    # Check fields are populated
    assert rec.productId == "prod-001"
    assert rec.sku == "TECH-LOG-01"
    assert rec.currentStock == prod.current_stock
    assert rec.dailyDemand > 0
    assert rec.reorderPoint > 0
    assert rec.suggestedReplenishmentQty >= 0
    assert rec.status in ("critical", "reorder_now", "healthy", "overstock")

    # Check explainability calculationDetails object
    assert rec.calculationDetails.dailyDemand == rec.dailyDemand
    assert rec.calculationDetails.reorderPoint == rec.reorderPoint
    assert rec.calculationDetails.expectedLeadTimeDemand == rec.expectedLeadTimeDemand
    assert rec.calculationDetails.safetyStock == rec.safetyStock
    assert "dailyDemand" in rec.calculationDetails.expectedLeadTimeDemandFormula

    # Check limited organic data warning is triggered since seed data has < 30 transactions
    assert any("Limited organic history" in w for w in rec.warnings)
    assert rec.isSafetyStockEstimated is True


def test_api_recommendations_portfolio_and_summary(db_session):
    """Verify GET /api/v1/recommendations endpoint returns full portfolio summary."""
    response = main.get_inventory_recommendations(
        category=None,
        status=None,
        target_coverage_days=14,
        default_lead_time_days=7,
        default_safety_stock_days=7,
        overstock_days_threshold=45.0,
        service_level_z=1.645,
        use_ml_forecast=False,
        db=db_session,
    )

    assert response.summary.totalProducts == len(response.recommendations)
    assert response.summary.totalProducts >= 12
    assert response.summary.criticalCount >= 1
    assert response.summary.totalSuggestedOrderUnits >= 0
    assert response.summary.totalEstimatedReplenishmentCost >= 0.0

    # Test category filtering
    elec_response = main.get_inventory_recommendations(
        category="Electronics",
        status=None,
        target_coverage_days=14,
        default_lead_time_days=7,
        default_safety_stock_days=7,
        overstock_days_threshold=45.0,
        service_level_z=1.645,
        use_ml_forecast=False,
        db=db_session,
    )
    for r in elec_response.recommendations:
        assert r.category == "Electronics"


def test_api_single_product_recommendation(db_session):
    """Verify GET /api/v1/recommendations/{product_id} returns 200 for valid SKU and 404 for missing."""
    rec = main.get_product_recommendation(
        product_id="prod-002",
        target_coverage_days=14,
        default_lead_time_days=7,
        default_safety_stock_days=7,
        overstock_days_threshold=45.0,
        service_level_z=1.645,
        use_ml_forecast=False,
        db=db_session,
    )
    assert rec.productId == "prod-002"
    assert rec.productName == "Noise-Cancelling Over-Ear Headphones"

    # Missing product raises 404
    with pytest.raises(HTTPException) as exc:
        main.get_product_recommendation(
            product_id="non-existent-sku-xyz",
            target_coverage_days=14,
            default_lead_time_days=7,
            default_safety_stock_days=7,
            overstock_days_threshold=45.0,
            service_level_z=1.645,
            use_ml_forecast=False,
            db=db_session,
        )
    assert exc.value.status_code == 404


# ──────────────────────────────────────────────────────────────
# 3. Audited Edge Case & Logic Integrity Tests
# ──────────────────────────────────────────────────────────────

from inventory_recommendations import calculate_empirical_daily_demand


def test_empirical_daily_demand_fills_zero_sales_days():
    """
    Verify daily demand builds a continuous calendar time series.
    Zero-sales days are filled with 0.0 (preventing inflated demand).
    """
    # 30 orders spread across 30 days:
    # 29 days have 1 order of 2 units each = 58 units total over 30 days
    # Day 1 to Day 30 (30 days span)
    sales = []
    base_date = "2026-09-01"
    from datetime import datetime, timedelta
    start = datetime.strptime(base_date, "%Y-%m-%d").date()

    # 30 transactions across 30 calendar days
    for i in range(30):
        d_str = (start + timedelta(days=i)).isoformat()
        sales.append((d_str, 2.0, "Completed"))

    mean_d, std_d, order_cnt, span_days, sufficient, expl = calculate_empirical_daily_demand(sales)
    assert sufficient is True
    assert span_days == 30
    assert order_cnt == 30
    assert mean_d == 2.0
    assert std_d == 0.0  # Exactly 2 units every day -> zero variance

    # Now test with zero sales on most days:
    # Day 0: 30 units, Day 29: 30 units (2 orders, but 30 days span)
    sparse_sales = [
        (start.isoformat(), 30.0, "Completed"),
        ((start + timedelta(days=29)).isoformat(), 30.0, "Completed"),
    ]
    # Span is 30 days, total units = 60 -> mean must be 60 / 30 = 2.0 units/day (NOT 30.0!)
    mean_s, std_s, ord_s, span_s, suff_s, _ = calculate_empirical_daily_demand(sparse_sales)
    assert mean_s == 2.0
    assert span_s == 30
    assert suff_s is False  # Only 2 orders (< 30 required)


def test_empirical_daily_demand_excludes_refunded_and_pending():
    """Verify that Refunded and Pending orders are excluded from positive demand."""
    sales = [
        ("2026-10-01", 10.0, "Completed"),
        ("2026-10-01", 50.0, "Refunded"),
        ("2026-10-01", 20.0, "Pending"),
    ]
    mean_d, _, order_cnt, _, _, _ = calculate_empirical_daily_demand(sales)
    assert order_cnt == 1
    assert mean_d == 10.0  # Only the completed 10 units counted


def test_usable_history_requires_both_orders_and_calendar_span():
    """
    Verify that 35 orders within 3 days is flagged as insufficient history
    because the calendar observation span is too narrow (< 30 days).
    """
    from datetime import datetime, timedelta
    start = datetime.strptime("2026-10-01", "%Y-%m-%d").date()
    high_freq_sales = []
    # 35 orders placed across only 3 days
    for i in range(35):
        d_str = (start + timedelta(days=(i % 3))).isoformat()
        high_freq_sales.append((d_str, 1.0, "Completed"))

    mean_d, std_d, order_cnt, span_days, sufficient, expl = calculate_empirical_daily_demand(high_freq_sales)
    assert order_cnt == 35
    assert span_days == 3
    assert sufficient is False  # Calendar span < 30 days -> statistically insufficient variance
    assert std_d is None
    assert "requires >= 30 orders and >= 30 days span" in expl


def test_safety_stock_one_sided_csl_z_score():
    """
    Verify safety stock sizing explicitly uses one-sided cycle service level (CSL)
    Z-factor (Z = 1.645 for 95% non-stockout probability), distinct from two-sided ±1.96.
    """
    # Daily demand = 10, L = 4 days, sigma_d = 3.0
    # Formula: ceil(Z * sigma_d * sqrt(L))
    # With one-sided 95% Z = 1.645: 1.645 * 3.0 * 2.0 = 9.87 -> ceil = 10
    ss_onesided, is_est, method = calculate_safety_stock(
        daily_demand=10.0,
        lead_time_days=4,
        demand_std=3.0,
        service_level_z=1.645,
        has_sufficient_history=True,
    )
    assert ss_onesided == 10
    assert "One-Sided CSL" in method

    # With two-sided 95% Z = 1.96: 1.96 * 3.0 * 2.0 = 11.76 -> ceil = 12
    ss_twosided, _, _ = calculate_safety_stock(
        daily_demand=10.0,
        lead_time_days=4,
        demand_std=3.0,
        service_level_z=1.96,
        has_sufficient_history=True,
    )
    assert ss_twosided == 12
    # Ensure they produce distinct buffers
    assert ss_onesided != ss_twosided


def test_status_classification_hierarchy_no_overstock_below_rop():
    """
    Verify mutual exclusivity: an item with stock <= ROP is NEVER classified as Overstocked,
    even if overstock_days_threshold is set low.
    """
    # current_stock = 15, expected_ltd = 10, ROP = 25, daily_demand = 1.0
    # Days remaining = 15 days. If overstock_days_threshold = 10 days,
    # the item is low on stock (stock <= ROP), NOT overstocked!
    status, label, _ = classify_inventory_status(
        current_stock=15,
        incoming_stock=0,
        expected_lead_time_demand=10.0,
        reorder_point=25,
        days_of_stock_remaining=15.0,
        lead_time_days=10,
        overstock_days_threshold=10.0,  # Low threshold
        target_stock_level=50,
    )
    assert status == "reorder_now"
    assert status != "overstock"


def test_critical_shelf_stockout_with_incoming_coverage():
    """
    Verify that when current_stock == 0, status is Critical (shelf stockout),
    but suggested order quantity is 0 if incoming stock already satisfies the target.
    """
    # current_stock = 0, incoming = 100, target_level = 90
    qty, target = calculate_replenishment_quantity(
        current_stock=0,
        incoming_stock=100,
        reorder_point=40,
        expected_lead_time_demand=20.0,
        safety_stock=20,
        daily_demand=2.0,
        target_coverage_days=14,
        status="critical",
    )
    # Target is 20 + 20 + 28 = 68. Incoming is 100 -> Shortfall is 0!
    assert qty == 0

    status, label, explanation = classify_inventory_status(
        current_stock=0,
        incoming_stock=100,
        expected_lead_time_demand=20.0,
        reorder_point=40,
        days_of_stock_remaining=0.0,
        lead_time_days=7,
        overstock_days_threshold=45.0,
        target_stock_level=target,
    )
    assert status == "critical"
    assert "in transit" in explanation


def test_cost_price_integrity_no_selling_price_fallback(db_session):
    """
    Verify that missing or zero wholesale cost_price flags isCostMissing=True
    and does NOT substitute retail selling_price as cost.
    """
    # Create mock product with cost_price = 0, selling_price = 100
    mock_prod = ProductORM(
        id="test-cost-sku",
        sku="TEST-COST-01",
        name="Zero Cost Test Product",
        category="Electronics",
        current_stock=5,
        lead_time_days=7,
        daily_demand_average=2.0,
        cost_price=0.0,       # Missing/zero wholesale cost
        selling_price=100.0,  # Retail customer price
        reorder_point=20,
        safety_stock=10,
        status="in_stock",
        supplier="Test Supplier",
    )

    rec = compute_product_recommendation(mock_prod, db=db_session)
    assert rec.isCostMissing is True
    assert rec.costPrice is None
    assert rec.estimatedReplenishmentCost is None
    assert any("wholesale cost price is missing" in w for w in rec.warnings)
    # Ensure selling price (100.0) was NOT used as cost
    assert rec.costPrice != 100.0

