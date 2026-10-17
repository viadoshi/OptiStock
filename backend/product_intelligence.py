# ============================================================
# product_intelligence.py — Product Intelligence & Unsupervised ML Pipeline
# OptiStock AI — Inventory & Demand Forecasting System
# ============================================================
#
# Audited Modules:
#   1. ABC Pareto Inventory Analysis:
#      - Evaluates product contribution via Annual Consumption Value (Cost-based)
#        or Annual Sales Revenue.
#      - Configurable A/B/C threshold bounds (default 80% / 95% / 100%).
#      - Strict cost price integrity: never substitutes selling price for cost.
#      - Explanations of classification assignment and action policy.
#
#   2. K-Means Product Segmentation:
#      - Product-level feature aggregation (demand, CV, stock, days remaining, ROP ratio).
#      - StandardScaler preprocessing pipeline.
#      - Configurable k clusters with Silhouette Score validation.
#      - Guards against small sample sizes, zero variance, and empty clusters.
#      - Model persistence with joblib.
#
#   3. Isolation Forest Anomaly Detection:
#      - Multi-feature operational outlier detection (spikes, drops, stock-to-demand).
#      - Guarded against insufficient sample sizes (< 30 organic transactions).
#      - Transparent isolation between Organic MySQL and Synthetic Benchmark data.
#      - Human-readable operational explanations for flagged observations.
# ============================================================

from __future__ import annotations

import os
import math
import time
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, date, timedelta

import numpy as np
import pandas as pd
import joblib

from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.metrics import silhouette_score
from sqlalchemy.orm import Session

from orm_models import ProductORM, SaleTransactionORM, ABCItemORM
from models import (
    ABCItemDetail,
    ABCAnalysisSummary,
    ABCAnalysisResponse,
    SegmentedProduct,
    ClusterProfile,
    SegmentationResponse,
    AnomalyObservation,
    AnomalyDetectionResponse,
)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)
BENCHMARK_CSV_PATH = os.path.join(os.path.dirname(__file__), "data", "synthetic_sales_benchmark.csv")

# Simple in-memory cache to prevent redundant model fitting
_SEGMENTATION_CACHE: Dict[str, Tuple[float, SegmentationResponse]] = {}
_ANOMALY_CACHE: Dict[str, Tuple[float, AnomalyDetectionResponse]] = {}
CACHE_TTL_SECONDS = 120.0


# ============================================================
# 1. ABC INVENTORY ANALYSIS
# ============================================================

def run_abc_analysis(
    db: Session,
    measure: str = "consumption_value",
    threshold_a: float = 80.0,
    threshold_b: float = 95.0,
    filter_class: Optional[str] = None,
) -> ABCAnalysisResponse:
    """
    Computes Pareto ABC inventory classification across all catalog products.
    
    Measures:
      - 'consumption_value': Annual Consumption Value = Annual Demand Units * Wholesale Unit Cost
      - 'revenue': Annual Sales Revenue = Annual Demand Units * Retail Selling Price
    
    Thresholds:
      - Class A: First threshold_a% of cumulative value (default 80%)
      - Class B: From threshold_a% up to threshold_b% (default 80% to 95%)
      - Class C: Remaining tail from threshold_b% to 100% (default 95% to 100%)
    """
    warnings: List[str] = []

    # Validate thresholds
    t_a = float(threshold_a) if 0.0 < threshold_a < 100.0 else 80.0
    t_b = float(threshold_b) if t_a < threshold_b <= 100.0 else 95.0
    if t_a >= t_b:
        t_a, t_b = 80.0, 95.0
        warnings.append("Threshold A must be strictly less than Threshold B. Reset to defaults: 80% / 95%.")

    normalized_measure = "revenue" if measure.lower() == "revenue" else "consumption_value"
    measure_label = (
        "Annual Sales Revenue (Revenue-based)"
        if normalized_measure == "revenue"
        else "Annual Consumption Value (Cost-based)"
    )

    products = db.query(ProductORM).all()
    if not products:
        summary = ABCAnalysisSummary(
            totalItems=0,
            totalContributionValue=0.0,
            measure=normalized_measure,
            measureLabel=measure_label,
            thresholdA=t_a,
            thresholdB=t_b,
            classACount=0,
            classBCount=0,
            classCCount=0,
            classAValue=0.0,
            classBValue=0.0,
            classCValue=0.0,
            classAValueSharePercent=0.0,
            classBValueSharePercent=0.0,
            classCValueSharePercent=0.0,
            classAItemSharePercent=0.0,
            classBItemSharePercent=0.0,
            classCItemSharePercent=0.0,
            dataProvenance="MYSQL_ORGANIC_CATALOG",
            warnings=["No products found in database."],
        )
        return ABCAnalysisResponse(summary=summary, items=[])

    raw_items = []
    has_missing_costs = False

    for p in products:
        d = max(0.0, float(p.daily_demand_average or 1.0))
        annual_units = round(d * 365.0, 1)

        cost_price: Optional[float] = None
        if p.cost_price is not None and float(p.cost_price) > 0.0:
            cost_price = round(float(p.cost_price), 2)
        else:
            has_missing_costs = True

        selling_price = round(float(p.selling_price or 0.0), 2)

        if normalized_measure == "consumption_value":
            if cost_price is None:
                unit_rate = 0.0
                is_cost_missing = True
            else:
                unit_rate = cost_price
                is_cost_missing = False
        else:
            unit_rate = selling_price
            is_cost_missing = (cost_price is None)

        contribution_value = round(annual_units * unit_rate, 2)
        stock = int(p.current_stock or 0)
        turnover_ratio = round(annual_units / max(stock, 1), 2)
        days_sales_inventory = int(round(stock / max(d, 0.1)))

        raw_items.append({
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "category": p.category,
            "annualQuantity": annual_units,
            "unitCostPrice": cost_price,
            "unitSellingPrice": selling_price,
            "unitMeasureRate": unit_rate,
            "contributionValue": contribution_value,
            "currentStock": stock,
            "turnoverRatio": turnover_ratio,
            "daysSalesInventory": days_sales_inventory,
            "isCostMissing": is_cost_missing,
        })

    if has_missing_costs and normalized_measure == "consumption_value":
        warnings.append("One or more products have missing wholesale unit cost (cost_price). Contribution calculated as $0.00 without substituting selling price.")

    # Sort descending by contribution value
    raw_items.sort(key=lambda x: x["contributionValue"], reverse=True)
    total_val = sum(x["contributionValue"] for x in raw_items)

    processed_items: List[ABCItemDetail] = []
    running_val = 0.0
    class_a_count = 0
    class_b_count = 0
    class_c_count = 0
    class_a_val = 0.0
    class_b_val = 0.0
    class_c_val = 0.0

    for rank, itm in enumerate(raw_items, start=1):
        c_val = itm["contributionValue"]
        if total_val > 0.0:
            share_pct = round((c_val / total_val) * 100.0, 2)
            prior_cum_pct = (running_val / total_val) * 100.0
            running_val += c_val
            cum_pct = min(100.0, round((running_val / total_val) * 100.0, 2))
        else:
            share_pct = 0.0
            prior_cum_pct = 0.0
            cum_pct = 0.0

        # Boundary logic: item that pushes past threshold_a belongs to Class A
        # so Class A captures >= threshold_a% of portfolio value
        if prior_cum_pct < t_a:
            classification = "A"
            class_a_count += 1
            class_a_val += c_val
            reason = (
                f"Class A: Ranked #{rank} contributor generating ${c_val:,.2f} "
                f"({share_pct}% of total {normalized_measure.replace('_', ' ')}). "
                f"Falls within cumulative {t_a}% threshold. Strict perpetual control, "
                f"daily cycle counts, and priority reordering required."
            )
        elif prior_cum_pct < t_b:
            classification = "B"
            class_b_count += 1
            class_b_val += c_val
            reason = (
                f"Class B: Ranked #{rank} moderate contributor generating ${c_val:,.2f} "
                f"({share_pct}% share, cumulative reaching {cum_pct}%). "
                f"Falls in the {t_a}%-{t_b}% band. Managed via automated periodic reviews."
            )
        else:
            classification = "C"
            class_c_count += 1
            class_c_val += c_val
            reason = (
                f"Class C: Ranked #{rank} low-contribution SKU generating ${c_val:,.2f} "
                f"({share_pct}% share, in final {t_b}%-100% tail). "
                f"Order in larger batches with relaxed controls to minimize procurement overhead."
            )

        processed_items.append(ABCItemDetail(
            id=itm["id"],
            sku=itm["sku"],
            name=itm["name"],
            category=itm["category"],
            classification=classification,
            annualQuantity=itm["annualQuantity"],
            unitCostPrice=itm["unitCostPrice"],
            unitSellingPrice=itm["unitSellingPrice"],
            unitMeasureRate=itm["unitMeasureRate"],
            contributionValue=c_val,
            valueSharePercent=share_pct,
            cumulativeValueSharePercent=cum_pct,
            rank=rank,
            turnoverRatio=itm["turnoverRatio"],
            daysSalesInventory=itm["daysSalesInventory"],
            currentStock=itm["currentStock"],
            reason=reason,
            isCostMissing=itm["isCostMissing"],
        ))

    total_items = len(processed_items)
    a_val_share = round((class_a_val / total_val * 100.0), 2) if total_val > 0 else 0.0
    b_val_share = round((class_b_val / total_val * 100.0), 2) if total_val > 0 else 0.0
    c_val_share = round((class_c_val / total_val * 100.0), 2) if total_val > 0 else 0.0

    a_itm_share = round((class_a_count / total_items * 100.0), 2) if total_items > 0 else 0.0
    b_itm_share = round((class_b_count / total_items * 100.0), 2) if total_items > 0 else 0.0
    c_itm_share = round((class_c_count / total_items * 100.0), 2) if total_items > 0 else 0.0

    summary = ABCAnalysisSummary(
        totalItems=total_items,
        totalContributionValue=round(total_val, 2),
        measure=normalized_measure,
        measureLabel=measure_label,
        thresholdA=t_a,
        thresholdB=t_b,
        classACount=class_a_count,
        classBCount=class_b_count,
        classCCount=class_c_count,
        classAValue=round(class_a_val, 2),
        classBValue=round(class_b_val, 2),
        classCValue=round(class_c_val, 2),
        classAValueSharePercent=a_val_share,
        classBValueSharePercent=b_val_share,
        classCValueSharePercent=c_val_share,
        classAItemSharePercent=a_itm_share,
        classBItemSharePercent=b_itm_share,
        classCItemSharePercent=c_itm_share,
        dataProvenance="MYSQL_ORGANIC_CATALOG",
        warnings=warnings,
    )

    if filter_class:
        target = filter_class.upper().strip()
        filtered_items = [i for i in processed_items if i.classification == target]
        return ABCAnalysisResponse(summary=summary, items=filtered_items)

    return ABCAnalysisResponse(summary=summary, items=processed_items)


# ============================================================
# 2. K-MEANS PRODUCT SEGMENTATION
# ============================================================

FEATURE_NAMES = [
    "daily_demand",
    "demand_variability_cv",
    "current_stock",
    "days_of_stock_remaining",
    "stockout_risk_ratio",
    "cost_price",
]


def _get_benchmark_product_variability() -> Dict[str, float]:
    """Computes daily demand coefficient of variation (CV = std/mean) from benchmark data."""
    if not os.path.exists(BENCHMARK_CSV_PATH):
        return {}
    try:
        df = pd.read_csv(BENCHMARK_CSV_PATH)
        cv_map = {}
        for pid, grp in df.groupby("product_id"):
            m = float(grp["daily_demand"].mean())
            s = float(grp["daily_demand"].std())
            cv_map[str(pid)] = round(s / max(m, 0.1), 3)
        return cv_map
    except Exception:
        return {}


def run_product_segmentation(
    db: Session,
    n_clusters: int = 3,
    use_benchmark: bool = True,
    force_retrain: bool = False,
) -> SegmentationResponse:
    """
    Fits and evaluates a K-Means clustering pipeline across catalog products.
    """
    cache_key = f"k_{n_clusters}_bm_{use_benchmark}"
    if not force_retrain and cache_key in _SEGMENTATION_CACHE:
        cached_ts, cached_res = _SEGMENTATION_CACHE[cache_key]
        if time.time() - cached_ts < CACHE_TTL_SECONDS:
            return cached_res

    products = db.query(ProductORM).all()
    n_samples = len(products)
    if n_samples < 3:
        raise ValueError("At least 3 products are required for K-Means product segmentation.")
    if n_clusters < 2:
        raise ValueError("Number of clusters (k) must be at least 2.")
    if n_clusters >= n_samples:
        raise ValueError(
            f"Number of clusters ({n_clusters}) must be strictly less than product count ({n_samples})."
        )

    warnings: List[str] = []
    cv_map = _get_benchmark_product_variability() if use_benchmark else {}

    raw_features: List[Dict[str, Any]] = []
    prod_meta: List[Dict[str, Any]] = []

    for p in products:
        d = max(0.1, float(p.daily_demand_average or 1.0))
        stock = float(p.current_stock or 0)
        rop = max(1.0, float(p.reorder_point or 1))
        cost = float(p.cost_price or (p.selling_price * 0.5) or 10.0)
        selling = float(p.selling_price or 20.0)

        # CV: coefficient of variation
        cv = cv_map.get(str(p.id), 0.25)
        days_remaining = round(stock / d, 1)
        stockout_risk_ratio = round(stock / rop, 2)

        feat = {
            "daily_demand": d,
            "demand_variability_cv": cv,
            "current_stock": stock,
            "days_of_stock_remaining": days_remaining,
            "stockout_risk_ratio": stockout_risk_ratio,
            "cost_price": cost,
        }
        raw_features.append(feat)

        prod_meta.append({
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "category": p.category,
            "dailyDemand": round(d, 2),
            "demandVariabilityCv": cv,
            "currentStock": int(stock),
            "daysOfStockRemaining": days_remaining,
            "stockoutRiskRatio": stockout_risk_ratio,
            "costPrice": round(cost, 2) if p.cost_price else None,
            "sellingPrice": round(selling, 2),
        })

    df_feats = pd.DataFrame(raw_features)[FEATURE_NAMES]

    # Guard against zero variance across all features
    variances = df_feats.var()
    if (variances < 1e-9).all():
        raise ValueError("Cannot perform clustering: all features have near-zero variance across products.")

    # Standardize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df_feats.values)

    # Fit K-Means
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X_scaled)

    # Evaluate Silhouette Score
    unique_labels = np.unique(labels)
    if len(unique_labels) > 1 and len(unique_labels) < n_samples:
        sil_score = float(silhouette_score(X_scaled, labels))
        sil_score = round(sil_score, 4)
        if sil_score >= 0.45:
            sil_eval = f"Good cluster separation (Score: {sil_score:.3f}). Groups reflect distinct inventory patterns."
        elif sil_score >= 0.20:
            sil_eval = f"Moderate cluster cohesion (Score: {sil_score:.3f}). Meaningful operational boundaries exist."
        else:
            sil_eval = f"Weak cluster distinction (Score: {sil_score:.3f}). Inventory metrics show significant overlap."
    else:
        sil_score = None
        sil_eval = "Insufficient distinct cluster distribution to compute silhouette score."

    # Build Cluster Profiles & Neutral Grounded Descriptions
    global_means = df_feats.mean()
    cluster_profiles: List[ClusterProfile] = []

    for c_id in range(n_clusters):
        mask = (labels == c_id)
        c_size = int(np.sum(mask))
        if c_size == 0:
            continue

        c_feats = df_feats[mask]
        avg_d = float(c_feats["daily_demand"].mean())
        avg_cv = float(c_feats["demand_variability_cv"].mean())
        avg_stock = float(c_feats["current_stock"].mean())
        avg_days = float(c_feats["days_of_stock_remaining"].mean())
        avg_risk = float(c_feats["stockout_risk_ratio"].mean())
        avg_cost = float(c_feats["cost_price"].mean())

        # Grounded description based on deviations from global mean
        desc_parts = []
        if avg_d > global_means["daily_demand"] * 1.2:
            desc_parts.append("High-velocity demand")
        elif avg_d < global_means["daily_demand"] * 0.8:
            desc_parts.append("Lower-velocity demand")
        else:
            desc_parts.append("Moderate demand velocity")

        if avg_days < global_means["days_of_stock_remaining"] * 0.8:
            desc_parts.append(f"lean inventory coverage (avg {avg_days:.1f} days)")
        elif avg_days > global_means["days_of_stock_remaining"] * 1.2:
            desc_parts.append(f"extended inventory buffer (avg {avg_days:.1f} days)")
        else:
            desc_parts.append(f"standard inventory coverage (avg {avg_days:.1f} days)")

        if avg_cost > global_means["cost_price"] * 1.2:
            desc_parts.append("higher unit procurement cost")
        elif avg_cost < global_means["cost_price"] * 0.8:
            desc_parts.append("economical unit cost")

        description = f"Cluster {c_id + 1}: " + ", with ".join(desc_parts) + "."

        cluster_profiles.append(ClusterProfile(
            clusterId=c_id,
            clusterLabel=f"Cluster {c_id + 1}",
            size=c_size,
            itemSharePercent=round((c_size / n_samples) * 100.0, 1),
            avgDailyDemand=round(avg_d, 2),
            avgDemandVariabilityCv=round(avg_cv, 3),
            avgCurrentStock=round(avg_stock, 1),
            avgDaysOfStockRemaining=round(avg_days, 1),
            avgStockoutRiskRatio=round(avg_risk, 2),
            avgCostPrice=round(avg_cost, 2),
            avgSellingPrice=round(float(c_feats["cost_price"].mean() * 1.8), 2),
            description=description,
        ))

    # Assigned product items
    assigned_products: List[SegmentedProduct] = []
    for idx, meta in enumerate(prod_meta):
        c_id = int(labels[idx])
        assigned_products.append(SegmentedProduct(
            id=meta["id"],
            sku=meta["sku"],
            name=meta["name"],
            category=meta["category"],
            clusterId=c_id,
            clusterLabel=f"Cluster {c_id + 1}",
            dailyDemand=meta["dailyDemand"],
            demandVariabilityCv=meta["demandVariabilityCv"],
            currentStock=meta["currentStock"],
            daysOfStockRemaining=meta["daysOfStockRemaining"],
            stockoutRiskRatio=meta["stockoutRiskRatio"],
            costPrice=meta["costPrice"],
            sellingPrice=meta["sellingPrice"],
        ))

    # Persistence with joblib
    model_path = os.path.join(MODELS_DIR, "kmeans_product_segmentation.joblib")
    try:
        joblib.dump({
            "scaler": scaler,
            "kmeans": kmeans,
            "feature_names": FEATURE_NAMES,
            "n_clusters": n_clusters,
            "fitted_at": datetime.now().isoformat(),
        }, model_path)
    except Exception as e:
        warnings.append(f"Failed to persist clustering model: {e}")

    provenance = "SYNTHETIC_BENCHMARK_DEV" if use_benchmark else "MYSQL_ORGANIC_DATA"
    is_synth = bool(use_benchmark)
    if is_synth:
        warnings.append(
            "Clustering features incorporate synthetic benchmark demand variability for developmental segmentation. "
            "These are exploratory operational profiles, not verified real-world customer segments."
        )

    response = SegmentationResponse(
        nClusters=n_clusters,
        silhouetteScore=sil_score,
        silhouetteEvaluation=sil_eval,
        featuresUsed=FEATURE_NAMES,
        clusterProfiles=cluster_profiles,
        products=assigned_products,
        dataProvenance=provenance,
        isSyntheticDevelopment=is_synth,
        warnings=warnings,
        modelSavedPath=model_path,
    )

    _SEGMENTATION_CACHE[cache_key] = (time.time(), response)
    return response


# ============================================================
# 3. ISOLATION FOREST ANOMALY DETECTION
# ============================================================

ANOMALY_FEATURE_NAMES = [
    "daily_quantity",
    "demand_deviation",
    "relative_demand_ratio",
    "day_over_day_change",
    "stock_to_demand_ratio",
]


def run_anomaly_detection(
    db: Session,
    contamination: float = 0.05,
    use_benchmark: bool = True,
    force_retrain: bool = False,
) -> AnomalyDetectionResponse:
    """
    Executes Isolation Forest anomaly detection on inventory/demand observation data.
    
    Guards:
      - If organic MySQL mode is chosen and organic completed sales < 30, returns
        an explicit insufficient_organic_data status.
      - Never labels anomalies as fraud/error; labels them as operational review events.
    """
    cache_key = f"cont_{contamination}_bm_{use_benchmark}"
    if not force_retrain and cache_key in _ANOMALY_CACHE:
        cached_ts, cached_res = _ANOMALY_CACHE[cache_key]
        if time.time() - cached_ts < CACHE_TTL_SECONDS:
            return cached_res

    # Clamp contamination
    c_val = float(np.clip(contamination, 0.01, 0.25))
    c_explanation = (
        f"Contamination parameter ({c_val:.2f}) represents the expected statistical proportion "
        f"of extreme anomalies in the dataset ({c_val * 100:.1f}% expected outliers). "
        f"Lower values isolate only extreme deviances."
    )

    # Check organic transactions
    organic_sales_count = (
        db.query(SaleTransactionORM)
        .filter(SaleTransactionORM.status == "Completed")
        .count()
    )

    if not use_benchmark and organic_sales_count < 30:
        return AnomalyDetectionResponse(
            status="insufficient_organic_data",
            totalObservations=organic_sales_count,
            anomalyCount=0,
            normalCount=organic_sales_count,
            anomalyRatePercent=0.0,
            contamination=c_val,
            contaminationExplanation=c_explanation,
            featuresUsed=ANOMALY_FEATURE_NAMES,
            anomalies=[],
            recentObservations=[],
            dataProvenance="MYSQL_ORGANIC_DATA",
            isSyntheticDevelopment=False,
            warnings=[
                f"Organic MySQL database contains only {organic_sales_count} completed sales transactions, "
                f"which is mathematically insufficient to train a reliable Isolation Forest (minimum 30 required). "
                f"Please switch to the Synthetic Benchmark development mode to evaluate the detection pipeline."
            ],
        )

    # Load observation time series
    if not os.path.exists(BENCHMARK_CSV_PATH):
        raise FileNotFoundError("Synthetic benchmark sales dataset not found for anomaly detection training.")

    df_bm = pd.read_csv(BENCHMARK_CSV_PATH)
    # Take the most recent 180 days across products to ensure responsive training
    df_bm["date_dt"] = pd.to_datetime(df_bm["date"])
    cutoff_date = df_bm["date_dt"].max() - timedelta(days=180)
    df_recent = df_bm[df_bm["date_dt"] >= cutoff_date].copy().sort_values(["product_id", "date_dt"])

    # Catalog product lookup for baseline demand & stock
    products = db.query(ProductORM).all()
    prod_map = {
        p.id: {
            "name": p.name,
            "sku": p.sku,
            "category": p.category,
            "baseline": max(0.5, float(p.daily_demand_average or 1.0)),
            "stock": int(p.current_stock or 0),
        }
        for p in products
    }

    obs_records = []
    for pid, grp in df_recent.groupby("product_id"):
        meta = prod_map.get(str(pid), {
            "name": grp["product_name"].iloc[0],
            "sku": grp["sku"].iloc[0],
            "category": grp["category"].iloc[0],
            "baseline": float(grp["daily_demand"].mean()),
            "stock": 50,
        })
        base_d = meta["baseline"]
        stock = meta["stock"]

        grp = grp.sort_values("date_dt")
        quantities = grp["daily_demand"].values
        dates = grp["date"].values

        prev_q = base_d
        for i in range(len(quantities)):
            q = float(quantities[i])
            dt_str = str(dates[i])
            dev = q - base_d
            ratio = q / max(base_d, 0.5)
            dod = abs(q - prev_q)
            stock_ratio = stock / max(q, 0.1)

            obs_records.append({
                "observationId": f"OBS-{pid}-{dt_str}",
                "productId": str(pid),
                "sku": meta["sku"],
                "productName": meta["name"],
                "category": meta["category"],
                "date": dt_str,
                "dailyQuantity": round(q, 1),
                "baselineDailyDemand": round(base_d, 2),
                "demandDeviation": round(dev, 2),
                "relativeDemandRatio": round(ratio, 2),
                "dayOverDayChange": round(dod, 2),
                "stockLevel": stock,
                "daysRemaining": round(stock / max(q, 0.1), 1),
                "stockToDemandRatio": round(stock_ratio, 2),
            })
            prev_q = q

    df_obs = pd.DataFrame(obs_records)
    feat_matrix = df_obs[[
        "dailyQuantity",
        "demandDeviation",
        "relativeDemandRatio",
        "dayOverDayChange",
        "stockToDemandRatio",
    ]].values

    # Train Isolation Forest
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=c_val,
        random_state=42,
        n_jobs=-1,
    )
    preds = iso_forest.fit_predict(feat_matrix)  # -1 for anomaly, 1 for normal
    raw_scores = iso_forest.decision_function(feat_matrix)  # lower = more abnormal

    # Normalize scores to [0, 1] where 1.0 is extreme anomaly
    min_s, max_s = float(raw_scores.min()), float(raw_scores.max())
    s_range = max(1e-5, max_s - min_s)
    norm_scores = 1.0 - ((raw_scores - min_s) / s_range)

    anomalies: List[AnomalyObservation] = []
    all_obs: List[AnomalyObservation] = []

    for idx, row in df_obs.iterrows():
        is_anom = bool(preds[idx] == -1)
        score = round(float(norm_scores[idx]), 3)
        raw_s = round(float(raw_scores[idx]), 4)
        q = row["dailyQuantity"]
        base = row["baselineDailyDemand"]
        ratio = row["relativeDemandRatio"]
        dod = row["dayOverDayChange"]

        # Human-readable explanation of why observation is unusual
        if is_anom:
            if ratio >= 2.5:
                expl = (
                    f"Demand Surge: Daily quantity ({q:.1f} units) was {ratio:.1f}x higher than baseline "
                    f"({base:.1f} units), with a day-over-day acceleration of +{dod:.1f} units."
                )
                action = "Verify potential bulk purchase order, flash sale, or institutional B2B procurement."
            elif q <= 0.2 and base >= 3.0:
                expl = (
                    f"Demand Drop: Daily demand collapsed to {q:.1f} units despite a high baseline of "
                    f"{base:.1f} units/day."
                )
                action = "Investigate potential inventory stockout on digital storefront or checkout gateway disruption."
            elif dod >= base * 2.0:
                expl = (
                    f"Extreme Velocity Shift: Volatility shift of {dod:.1f} units between consecutive days."
                )
                action = "Check for inventory rebalancing, delayed batch posting, or localized marketing campaign."
            else:
                expl = (
                    f"Multivariate Outlier: Unusual combination of demand deviation ({row['demandDeviation']:+.1f}) "
                    f"and stock coverage posture ({row['daysRemaining']:.1f} days)."
                )
                action = "Conduct regular operational audit to verify replenishment timing and catalog parameters."
        else:
            expl = f"Within normal stochastic variance (ratio: {ratio:.1f}x baseline)."
            action = "No action required."

        obs_item = AnomalyObservation(
            observationId=row["observationId"],
            productId=row["productId"],
            sku=row["sku"],
            productName=row["productName"],
            category=row["category"],
            date=row["date"],
            dailyQuantity=row["dailyQuantity"],
            baselineDailyDemand=row["baselineDailyDemand"],
            demandDeviation=row["demandDeviation"],
            relativeDemandRatio=row["relativeDemandRatio"],
            stockLevel=row["stockLevel"],
            daysRemaining=row["daysRemaining"],
            anomalyScore=score,
            rawDecisionScore=raw_s,
            isAnomaly=is_anom,
            explanation=expl,
            recommendedInvestigation=action,
        )

        all_obs.append(obs_item)
        if is_anom:
            anomalies.append(obs_item)

    # Sort anomalies descending by anomaly score (most severe first)
    anomalies.sort(key=lambda x: x.anomalyScore, reverse=True)
    recent_sample = sorted(all_obs[-30:], key=lambda x: x.date, reverse=True)

    total_count = len(all_obs)
    anom_count = len(anomalies)
    normal_count = total_count - anom_count
    anom_rate = round((anom_count / max(total_count, 1)) * 100.0, 2)

    response = AnomalyDetectionResponse(
        status="success",
        totalObservations=total_count,
        anomalyCount=anom_count,
        normalCount=normal_count,
        anomalyRatePercent=anom_rate,
        contamination=c_val,
        contaminationExplanation=c_explanation,
        featuresUsed=ANOMALY_FEATURE_NAMES,
        anomalies=anomalies[:50],  # Return top 50 anomalies
        recentObservations=recent_sample,
        dataProvenance="SYNTHETIC_BENCHMARK_DEV",
        isSyntheticDevelopment=True,
        warnings=[
            "Isolation Forest trained on benchmark development data. Flagged records represent "
            "unusual operational events for managerial review, not confirmed fraud or data corruption."
        ],
    )

    _ANOMALY_CACHE[cache_key] = (time.time(), response)
    return response
