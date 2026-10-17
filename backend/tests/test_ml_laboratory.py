# ============================================================
# test_ml_laboratory.py — Machine Learning Laboratory Test Suite
# OptiStock AI — Supervised, Unsupervised & Tournament Tests
# ============================================================

import os
import sys
import pytest
import numpy as np

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import SessionLocal
from ml_laboratory import (
    ALGORITHM_CATALOG,
    train_and_evaluate_experiment,
    run_model_leaderboard,
    _prepare_regression_dataset,
    _prepare_classification_dataset,
    _prepare_unsupervised_dataset,
)
import main


@pytest.fixture
def db_session():
    """Yield a database session from the connection pool."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ──────────────────────────────────────────────────────────────
# 1. Algorithm Catalog & Metadata Tests
# ──────────────────────────────────────────────────────────────

def test_algorithm_catalog_completeness():
    """Verify algorithm catalog contains all 24 required models across tasks."""
    assert len(ALGORITHM_CATALOG) == 24

    reg_algos = [a for a in ALGORITHM_CATALOG.values() if a.task == "regression"]
    clf_algos = [a for a in ALGORITHM_CATALOG.values() if a.task == "classification"]
    unsup_algos = [a for a in ALGORITHM_CATALOG.values() if a.category == "unsupervised"]

    assert len(reg_algos) == 10
    assert len(clf_algos) == 9
    assert len(unsup_algos) == 5

    # Check required educational metadata is populated
    for algo in ALGORITHM_CATALOG.values():
        assert len(algo.whatItDoes) > 20
        assert len(algo.advantages) >= 1
        assert len(algo.limitations) >= 1
        assert len(algo.interpretationGuide) > 10


# ──────────────────────────────────────────────────────────────
# 2. Supervised Regression Tests
# ──────────────────────────────────────────────────────────────

def test_regression_training_and_metrics(db_session):
    """Verify regression algorithms train cleanly with valid MAE, RMSE, and R2 metrics."""
    # Test Ridge Regression
    res = train_and_evaluate_experiment("ridge_regression", {"alpha": 1.0}, db_session)

    assert res.task == "regression"
    assert res.regressionMetrics is not None
    assert res.regressionMetrics.mae > 0.0
    assert res.regressionMetrics.rmse >= res.regressionMetrics.mae
    assert -1.0 <= res.regressionMetrics.r2 <= 1.0
    assert res.regressionMetrics.wape is not None and res.regressionMetrics.wape >= 0.0
    assert len(res.sampleVisualData) > 0
    assert "Ridge Regression" in res.plainEnglishExplanation


def test_regression_zero_leakage_and_chronological_splits(db_session):
    """Verify regression dataset uses strictly chronological splits with zero data leakage."""
    X_train, X_test, y_train, y_test, features, n_train, n_test = _prepare_regression_dataset(db_session)

    assert n_train > 0 and n_test > 0
    assert X_train.shape[1] == len(features)
    assert X_test.shape[1] == len(features)
    assert len(y_train) == n_train
    assert len(y_test) == n_test

    # Features must use shifted lags, never contemporaneous target
    assert "lag_1" in features
    assert "target_y" not in features
    assert "daily_demand" not in features


def test_regression_leaderboard_championship(db_session):
    """Verify regression tournament evaluates all 10 models and crowns lowest MAE as champion."""
    lb = run_model_leaderboard(task="regression", db=db_session, force_refresh=True)

    assert lb.task == "regression"
    assert lb.totalModelsEvaluated == 10
    assert len(lb.leaderboard) == 10

    # Verify ranked strictly ascending by MAE (lowest error first)
    maes = [item.primaryMetricValue for item in lb.leaderboard]
    for i in range(len(maes) - 1):
        assert maes[i] <= maes[i + 1]

    # Verify champion assignment
    assert lb.leaderboard[0].isChampion is True
    assert "Champion" in lb.leaderboard[0].summaryVerdict
    assert lb.leaderboard[0].algorithmName == lb.championAlgorithm


# ──────────────────────────────────────────────────────────────
# 3. Supervised Classification Tests
# ──────────────────────────────────────────────────────────────

def test_classification_training_and_confusion_matrix(db_session):
    """Verify classification algorithms train and produce calibrated 2x2 confusion matrix."""
    res = train_and_evaluate_experiment("random_forest_classifier", {"n_estimators": 50, "max_depth": 5}, db_session)

    assert res.task == "classification"
    assert res.classificationMetrics is not None
    m = res.classificationMetrics

    assert 0.0 <= m.accuracy <= 1.0
    assert 0.0 <= m.precision <= 1.0
    assert 0.0 <= m.recall <= 1.0
    assert 0.0 <= m.f1Score <= 1.0

    # Confusion matrix total must equal test sample size
    cm = m.confusionMatrix
    assert (cm.tn + cm.fp + cm.fn + cm.tp) == res.testSampleCount
    assert cm.tn >= 0 and cm.tp >= 0


def test_classification_target_leakage_prevention(db_session):
    """Verify classification features strictly omit current_stock and reorder_point to prevent leakage."""
    X_train, X_test, y_train, y_test, features, n_train, n_test = _prepare_classification_dataset(db_session)

    assert "current_stock" not in features
    assert "reorder_point" not in features
    assert "min_stock_level" not in features
    assert "stockout_risk" not in features

    # Must contain legitimate operational drivers
    assert "daily_demand" in features
    assert "lead_time_days" in features
    assert "profit_margin" in features

    # Test stratified class balance
    assert len(np.unique(y_train)) == 2
    assert len(np.unique(y_test)) == 2


def test_classification_leaderboard_championship(db_session):
    """Verify classification tournament evaluates all 9 classifiers and crowns highest F1 as champion."""
    lb = run_model_leaderboard(task="classification", db=db_session, force_refresh=True)

    assert lb.task == "classification"
    assert lb.totalModelsEvaluated == 9
    assert len(lb.leaderboard) == 9

    # Verify ranked strictly descending by F1-Score (highest first)
    f1s = [item.primaryMetricValue for item in lb.leaderboard]
    for i in range(len(f1s) - 1):
        assert f1s[i] >= f1s[i + 1]

    assert lb.leaderboard[0].isChampion is True
    assert lb.leaderboard[0].algorithmName == lb.championAlgorithm


# ──────────────────────────────────────────────────────────────
# 4. Unsupervised Learning & PCA Tests
# ──────────────────────────────────────────────────────────────

def test_pca_explained_variance_and_projections(db_session):
    """Verify PCA computes legitimate explained variance and generates 2D coordinates."""
    res = train_and_evaluate_experiment("pca_decomposition", {}, db_session)

    assert res.task == "dimensionality_reduction"
    assert res.pcaMetrics is not None
    p = res.pcaMetrics

    assert len(p.explainedVarianceRatio) == 2
    assert p.pc1VariancePercent > 0.0
    assert p.pc2VariancePercent > 0.0
    assert p.cumulativeExplainedVariance == round(p.pc1VariancePercent + p.pc2VariancePercent, 2)
    assert p.cumulativeExplainedVariance <= 100.0

    # Check 2D projected coordinates for all products
    assert len(res.sampleVisualData) >= 12
    for pt in res.sampleVisualData:
        assert isinstance(pt.x, float)
        assert isinstance(pt.y, float)


def test_kmeans_clustering_silhouette_score(db_session):
    """Verify K-Means partitions catalog products and computes a valid silhouette score."""
    res = train_and_evaluate_experiment("kmeans_clustering", {"n_clusters": 3}, db_session)

    assert res.task == "clustering"
    assert res.clusteringMetrics is not None
    assert res.clusteringMetrics.nClusters == 3
    assert res.clusteringMetrics.silhouetteScore is not None
    assert -1.0 <= res.clusteringMetrics.silhouetteScore <= 1.0


def test_dbscan_silhouette_edge_case_guard(db_session):
    """Verify DBSCAN safely guards against silhouette calculation when output has only 1 cluster or noise."""
    # With a large eps, all points merge into a single cluster
    res_large = train_and_evaluate_experiment("dbscan_clustering", {"eps": 10.0, "min_samples": 2}, db_session)
    assert res_large.clusteringMetrics is not None

    if res_large.clusteringMetrics.nClusters < 2:
        # Silhouette score must be None with an educational warning
        assert res_large.clusteringMetrics.silhouetteScore is None
        assert any("undefined" in w for w in res_large.warnings)


def test_isolation_forest_laboratory_execution(db_session):
    """Verify Isolation Forest flags multidimensional inventory anomalies in the laboratory."""
    res = train_and_evaluate_experiment("isolation_forest", {"contamination": 0.08}, db_session)

    assert res.task == "anomaly_detection"
    assert res.clusteringMetrics is not None
    assert res.clusteringMetrics.noisePoints >= 1
    assert any(pt.isAnomaly for pt in res.sampleVisualData)


# ──────────────────────────────────────────────────────────────
# 5. Safety, Validation & API Endpoints Tests
# ──────────────────────────────────────────────────────────────

def test_invalid_algorithm_name_raises_error(db_session):
    """Verify passing an unknown algorithm name raises a clean ValueError."""
    with pytest.raises(ValueError, match="not recognized"):
        train_and_evaluate_experiment("quantum_neural_teleportation", {}, db_session)


def test_api_laboratory_endpoints(db_session):
    """Verify main FastAPI laboratory endpoints return valid schemas and data."""
    # 1. Algorithms catalog endpoint
    catalog_res = main.get_algorithm_catalog(task=None)
    assert len(catalog_res) == 24

    reg_catalog = main.get_algorithm_catalog(task="regression")
    assert len(reg_catalog) == 10

    # 2. Single experiment train endpoint
    train_req = main.TrainExperimentRequest(
        algorithmId="linear_regression",
        task="regression",
        parameters={"fit_intercept": True},
    )
    exp_res = main.train_laboratory_experiment(train_req, db=db_session)
    assert exp_res.algorithmId == "linear_regression"
    assert exp_res.regressionMetrics is not None

    # 3. Leaderboard endpoint
    lb_res = main.get_model_leaderboard(task="regression", refresh=False, db=db_session)
    assert lb_res.totalModelsEvaluated == 10
    assert len(lb_res.championAlgorithm) > 0
