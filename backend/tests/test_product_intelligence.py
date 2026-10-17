# ============================================================
# test_product_intelligence.py — Product Intelligence Test Suite
# OptiStock AI — ABC Analysis, K-Means Clustering, Isolation Forest
# ============================================================

import os
import sys
import pytest
import numpy as np

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import SessionLocal
from orm_models import ProductORM, SaleTransactionORM
from product_intelligence import (
    run_abc_analysis,
    run_product_segmentation,
    run_anomaly_detection,
)
import main


@pytest.fixture
def db_session():
    """Yield a database session from the local connection pool."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ──────────────────────────────────────────────────────────────
# 1. ABC Inventory Analysis Tests
# ──────────────────────────────────────────────────────────────

def test_abc_ranking_and_cumulative_percentages(db_session):
    """Verify ABC analysis ranks products strictly descending by contribution and calculates cumulative share."""
    res = run_abc_analysis(db_session, measure="consumption_value", threshold_a=80.0, threshold_b=95.0)

    assert res.summary.totalItems >= 12
    assert len(res.items) == res.summary.totalItems

    # Verify strictly descending by contribution value
    contributions = [item.contributionValue for item in res.items]
    for i in range(len(contributions) - 1):
        assert contributions[i] >= contributions[i + 1], "Items must be sorted descending by contribution"

    # Verify cumulative percentage reaches ~100%
    assert res.items[-1].cumulativeValueSharePercent >= 99.5
    assert res.items[0].rank == 1
    assert res.items[-1].rank == len(res.items)

    # Verify share percentages sum to ~100%
    total_share = sum(item.valueSharePercent for item in res.items)
    assert 99.0 <= total_share <= 101.0


def test_abc_threshold_boundaries_and_reasons(db_session):
    """Verify configurable A/B/C classification thresholds assign items to correct tiers with valid reasons."""
    # Standard 80 / 95
    res_std = run_abc_analysis(db_session, measure="revenue", threshold_a=80.0, threshold_b=95.0)
    assert res_std.summary.classACount >= 1
    assert res_std.summary.classBCount >= 1
    assert res_std.summary.classCCount >= 1

    for item in res_std.items:
        assert item.classification in ("A", "B", "C")
        assert len(item.reason) > 20
        assert f"Class {item.classification}" in item.reason

    # Custom tighter thresholds: 60 / 85
    res_custom = run_abc_analysis(db_session, measure="revenue", threshold_a=60.0, threshold_b=85.0)
    assert res_custom.summary.thresholdA == 60.0
    assert res_custom.summary.thresholdB == 85.0
    # Class A count with 60% threshold must be <= Class A count with 80% threshold
    assert res_custom.summary.classACount <= res_std.summary.classACount


def test_abc_missing_cost_handling(db_session):
    """Verify cost-based measure handles missing or zero cost gracefully without substituting selling price."""
    # Create an in-memory mock or query products
    res_cost = run_abc_analysis(db_session, measure="consumption_value")
    assert res_cost.summary.measure == "consumption_value"
    assert "Cost-based" in res_cost.summary.measureLabel

    # When measure is revenue, measure label reflects sales revenue
    res_rev = run_abc_analysis(db_session, measure="revenue")
    assert res_rev.summary.measure == "revenue"
    assert "Revenue-based" in res_rev.summary.measureLabel

    for itm in res_cost.items:
        if itm.isCostMissing:
            # Must NOT substitute selling price as cost
            assert itm.unitMeasureRate == 0.0
            assert itm.contributionValue == 0.0


# ──────────────────────────────────────────────────────────────
# 2. K-Means Product Segmentation Tests
# ──────────────────────────────────────────────────────────────

def test_kmeans_feature_preprocessing_and_clustering(db_session):
    """Verify K-Means standardizes features, segments catalog products into k clusters, and saves the model."""
    k = 3
    res = run_product_segmentation(db_session, n_clusters=k, use_benchmark=True, force_retrain=True)

    assert res.nClusters == k
    assert len(res.clusterProfiles) == k
    assert len(res.products) >= 12

    # Check features used
    assert "daily_demand" in res.featuresUsed
    assert "current_stock" in res.featuresUsed
    assert "demand_variability_cv" in res.featuresUsed

    # Check each product has a valid cluster label
    assigned_clusters = set()
    for p in res.products:
        assert 0 <= p.clusterId < k
        assert p.clusterLabel in [f"Cluster {i+1}" for i in range(k)]
        assigned_clusters.add(p.clusterId)

    # Check all clusters are non-empty
    assert len(assigned_clusters) == k

    # Check cluster profiles have valid non-negative metrics
    for cp in res.clusterProfiles:
        assert cp.size > 0
        assert cp.avgDailyDemand >= 0.0
        assert cp.avgCurrentStock >= 0.0
        assert len(cp.description) > 10

    # Check joblib model path
    assert res.modelSavedPath is not None
    assert os.path.exists(res.modelSavedPath)


def test_kmeans_invalid_cluster_counts_and_guards(db_session):
    """Verify guards against invalid cluster counts (k < 2, k >= n_samples)."""
    # k < 2
    with pytest.raises(ValueError, match="at least 2"):
        run_product_segmentation(db_session, n_clusters=1)

    # k >= total products
    total_prods = db_session.query(ProductORM).count()
    with pytest.raises(ValueError, match="strictly less"):
        run_product_segmentation(db_session, n_clusters=total_prods + 1)


def test_kmeans_silhouette_score_evaluation(db_session):
    """Verify silhouette score is calculated and has a qualitative explanation."""
    res = run_product_segmentation(db_session, n_clusters=3, use_benchmark=True, force_retrain=True)

    assert res.silhouetteScore is not None
    assert -1.0 <= res.silhouetteScore <= 1.0
    assert len(res.silhouetteEvaluation) > 10


# ──────────────────────────────────────────────────────────────
# 3. Isolation Forest Anomaly Detection Tests
# ──────────────────────────────────────────────────────────────

def test_anomaly_detection_insufficient_organic_data(db_session):
    """Verify organic MySQL mode flags insufficient data (< 30 sales) and protects against spurious ML fit."""
    res = run_anomaly_detection(db_session, contamination=0.05, use_benchmark=False, force_retrain=True)

    assert res.status == "insufficient_organic_data"
    assert res.anomalyCount == 0
    assert res.isSyntheticDevelopment is False
    assert res.dataProvenance == "MYSQL_ORGANIC_DATA"
    assert any("mathematically insufficient" in w for w in res.warnings)


def test_anomaly_detection_benchmark_isolation_forest(db_session):
    """Verify Isolation Forest executes on benchmark observations with configurable contamination."""
    contamination = 0.05
    res = run_anomaly_detection(
        db_session,
        contamination=contamination,
        use_benchmark=True,
        force_retrain=True,
    )

    assert res.status == "success"
    assert res.totalObservations > 500
    assert res.anomalyCount > 0
    assert res.isSyntheticDevelopment is True
    assert res.dataProvenance == "SYNTHETIC_BENCHMARK_DEV"

    # Outlier percentage should be roughly around the contamination prior (~5% +- 2%)
    assert 3.0 <= res.anomalyRatePercent <= 8.0

    # Check anomaly records schema
    for anom in res.anomalies[:10]:
        assert anom.isAnomaly is True
        assert 0.0 <= anom.anomalyScore <= 1.0
        assert len(anom.explanation) > 15
        assert len(anom.recommendedInvestigation) > 15
        assert anom.dailyQuantity >= 0.0


def test_ml_reproducibility(db_session):
    """Verify reproducible random seeds yield identical clustering and anomaly outputs."""
    # K-Means reproducibility
    seg1 = run_product_segmentation(db_session, n_clusters=3, use_benchmark=True, force_retrain=True)
    seg2 = run_product_segmentation(db_session, n_clusters=3, use_benchmark=True, force_retrain=True)

    labels1 = [p.clusterId for p in seg1.products]
    labels2 = [p.clusterId for p in seg2.products]
    assert labels1 == labels2, "K-Means cluster assignments must be deterministic with random_state=42"

    # Isolation Forest reproducibility
    anom1 = run_anomaly_detection(db_session, contamination=0.05, use_benchmark=True, force_retrain=True)
    anom2 = run_anomaly_detection(db_session, contamination=0.05, use_benchmark=True, force_retrain=True)

    assert anom1.anomalyCount == anom2.anomalyCount
    ids1 = [a.observationId for a in anom1.anomalies[:15]]
    ids2 = [a.observationId for a in anom2.anomalies[:15]]
    assert ids1 == ids2, "Isolation Forest flagged anomalies must be deterministic with random_state=42"


# ──────────────────────────────────────────────────────────────
# 4. API Endpoints & Schemas Tests
# ──────────────────────────────────────────────────────────────

def test_api_product_intelligence_endpoints(db_session):
    """Verify main FastAPI endpoint handlers return expected schemas and statuses."""
    # 1. ABC API
    abc_res = main.get_abc_analysis(
        classification=None,
        measure="consumption_value",
        threshold_a=80.0,
        threshold_b=95.0,
        legacy=False,
        db=db_session,
    )
    assert abc_res.summary.totalItems >= 12
    assert len(abc_res.items) >= 12

    # 1b. ABC legacy compatibility
    abc_legacy = main.get_abc_analysis(
        classification=None,
        legacy=True,
        db=db_session,
    )
    assert isinstance(abc_legacy, list)
    assert len(abc_legacy) >= 8

    # 2. Segmentation API
    seg_res = main.get_product_segmentation(
        n_clusters=3,
        use_benchmark=True,
        retrain=False,
        db=db_session,
    )
    assert seg_res.nClusters == 3
    assert len(seg_res.clusterProfiles) == 3

    # 3. Anomalies API
    anom_res = main.get_inventory_anomalies(
        contamination=0.05,
        use_benchmark=True,
        retrain=False,
        db=db_session,
    )
    assert anom_res.status == "success"
    assert anom_res.anomalyCount > 0
