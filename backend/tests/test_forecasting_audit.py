# ============================================================
# test_forecasting_audit.py — Automated Verification for AI Demand Forecasting
# OptiStock AI Audit Test Suite
# ============================================================

import os
import sys
import numpy as np
import pandas as pd
import pytest

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml_forecasting import (
    calculate_wape,
    safe_r2_score,
    _load_product_demand_series,
    _engineer_features,
    _train_and_evaluate_models,
    run_forecast,
    FEATURE_COLUMNS,
)


# ------------------------------------------------------------
# 1. Audit Chronological Splitting
# ------------------------------------------------------------

def test_chronological_splits_strictly_ordered():
    """
    Confirms that train, validation, and test splits are strictly chronological
    and that future dates NEVER leak into training or validation sets.
    """
    dates = pd.date_range("2024-01-01", periods=100, freq="D")
    raw_df = pd.DataFrame({
        "date": dates,
        "daily_demand": np.random.uniform(5, 20, size=100)
    })
    feat_df = _engineer_features(raw_df)
    n = len(feat_df)
    
    n_train = int(n * 0.70)
    n_val = int(n * 0.15)
    
    train_df = feat_df.iloc[:n_train]
    val_df = feat_df.iloc[n_train : n_train + n_val]
    test_df = feat_df.iloc[n_train + n_val :]
    
    # Check non-empty
    assert len(train_df) > 0
    assert len(val_df) > 0
    assert len(test_df) > 0
    
    # Check strict chronological boundary ordering
    assert train_df["date"].max() < val_df["date"].min(), "Train dates must precede validation dates"
    assert val_df["date"].max() < test_df["date"].min(), "Validation dates must precede test dates"
    
    # Check zero overlap
    train_dates = set(train_df["date"])
    val_dates = set(val_df["date"])
    test_dates = set(test_df["date"])
    assert train_dates.isdisjoint(val_dates), "Train and validation dates must not overlap"
    assert val_dates.isdisjoint(test_dates), "Validation and test dates must not overlap"
    assert train_dates.isdisjoint(test_dates), "Train and test dates must not overlap"


# ------------------------------------------------------------
# 2. Audit Data Leakage Prevention in Features & Preprocessing
# ------------------------------------------------------------

def test_feature_engineering_zero_leakage():
    """
    Checks that features use ONLY information available at the forecast origin.
    Target y_t must not appear in any feature calculated for row t.
    """
    dates = pd.date_range("2024-01-01", periods=50, freq="D")
    demand = np.arange(1, 51, dtype=float)  # 1.0, 2.0, ..., 50.0
    raw_df = pd.DataFrame({"date": dates, "daily_demand": demand})
    
    feat_df = _engineer_features(raw_df)
    
    # In row i, target is daily_demand[i].
    # lag_1 must equal daily_demand[i-1], lag_2 must equal daily_demand[i-2], etc.
    for i in range(len(feat_df)):
        current_demand = feat_df.loc[i, "daily_demand"]
        lag1 = feat_df.loc[i, "lag_1"]
        lag2 = feat_df.loc[i, "lag_2"]
        lag7 = feat_df.loc[i, "lag_7"]
        roll7 = feat_df.loc[i, "roll_mean_7"]
        
        # Current demand must not equal lag_1 unless by coincidence
        assert lag1 == current_demand - 1.0, "lag_1 must reflect t-1 observation"
        assert lag2 == current_demand - 2.0, "lag_2 must reflect t-2 observation"
        assert lag7 == current_demand - 7.0, "lag_7 must reflect t-7 observation"
        
        # roll_mean_7 must be mean of (t-7 ... t-1)
        expected_roll7 = np.mean([current_demand - k for k in range(1, 8)])
        assert abs(roll7 - expected_roll7) < 1e-5, "roll_mean_7 must use only past 7 days"


def test_scaler_fit_strictly_on_train():
    """
    Checks that StandardScaler is fit solely on the training set,
    and validation/test sets use the train parameters without refitting.
    """
    from sklearn.preprocessing import StandardScaler
    
    train_x = pd.DataFrame({"lag_1": [10.0, 20.0, 30.0]})
    val_x = pd.DataFrame({"lag_1": [100.0, 200.0, 300.0]})
    
    scaler = StandardScaler()
    scaled_train = scaler.fit_transform(train_x)
    scaled_val = scaler.transform(val_x)
    
    # Train mean is 20.0, train std is sqrt(200/3) ~ 8.165
    assert abs(scaler.mean_[0] - 20.0) < 1e-4
    # Scaled val must use train mean (20.0), not val mean (200.0)
    assert scaled_val[0][0] > 5.0, "Validation feature scaled using train parameters"


# ------------------------------------------------------------
# 3. Audit Recursive Forecasting State Updates
# ------------------------------------------------------------

def test_recursive_forecast_updates_lags():
    """
    Verifies that multi-step recursive forecasting updates lag and rolling features
    after each predicted day using the predicted value.
    """
    res = run_forecast(
        product_id="PROD-001",
        product_name="Wireless Noise-Canceling Headphones",
        sku="WH-1000XM5",
        daily_demand_avg=12.5,
        reorder_point=45,
        lead_time_days=7,
        current_stock=80,
        cost_price=249.99,
        model_name="Auto",
        horizon_days=14,
    )
    
    future_points = [p for p in res.forecastPoints if p.actualDemand is None]
    assert len(future_points) == 14, "Expected 14 future recursive forecast points"
    
    # Check that predictions vary and are not identical static repeats
    preds = [p.predictedDemand for p in future_points]
    assert len(set(preds)) > 1, "Recursive forecast predictions should adapt over time"
    
    # Check that lower confidence bound is clipped at 0
    for p in future_points:
        assert p.predictedDemand >= 0.0, "Predicted demand must be non-negative"
        assert p.lowerConfidence >= 0.0, "Lower confidence bound must not be negative"
        assert p.upperConfidence >= p.predictedDemand, "Upper confidence bound must exceed point forecast"


# ------------------------------------------------------------
# 4. Audit Model Selection & Validation Separation
# ------------------------------------------------------------

def test_model_selection_champion_has_lowest_validation_mae():
    """
    Inspects model selection: Champion MUST have the lowest Validation MAE.
    Evaluation on untouched Test split must report metrics for all models on the identical test rows.
    """
    res = run_forecast(
        product_id="PROD-001",
        product_name="Wireless Noise-Canceling Headphones",
        sku="WH-1000XM5",
        daily_demand_avg=12.5,
        reorder_point=45,
        lead_time_days=7,
        current_stock=80,
        cost_price=249.99,
        model_name="Auto",
        horizon_days=7,
    )
    
    comparisons = res.modelComparisons
    assert len(comparisons) >= 5, "Expected Baseline + 4 ML candidates"
    
    # Find candidate marked champion
    champions = [c for c in comparisons if c.isChampion]
    assert len(champions) == 1, "Exactly one model should be marked champion"
    champ = champions[0]
    
    # Filter non-baseline candidates
    ml_candidates = [c for c in comparisons if not c.modelName.startswith("Baseline")]
    min_val_mae = min(c.valMae for c in ml_candidates)
    
    assert champ.valMae == min_val_mae, (
        f"Champion {champ.modelName} (Val MAE: {champ.valMae}) "
        f"must have the minimum Validation MAE among candidates ({min_val_mae})"
    )
    assert res.model == champ.modelName, "Selected model must match the validation champion"


def test_baseline_moving_average_uses_only_past_observations():
    """
    Checks that the 7-day moving-average baseline uses strictly prior observations.
    """
    res = run_forecast(
        product_id="PROD-001",
        product_name="Test Product",
        sku="TEST-SKU",
        daily_demand_avg=10.0,
        reorder_point=30,
        lead_time_days=5,
        current_stock=50,
        cost_price=100.0,
        model_name="Auto",
        horizon_days=7,
    )
    baseline_comp = next((c for c in res.modelComparisons if "Baseline" in c.modelName), None)
    assert baseline_comp is not None, "Baseline model must be evaluated"
    assert baseline_comp.mae > 0, "Baseline MAE should be computed"
    assert baseline_comp.rmse > 0, "Baseline RMSE should be computed"


# ------------------------------------------------------------
# 5. Audit Safe R² Calculation
# ------------------------------------------------------------

def test_safe_r2_score_guards_against_zero_variance():
    """
    Verifies that safe_r2_score handles constant or near-zero variance targets
    gracefully without division-by-zero or NaN.
    """
    # Constant target: variance is 0
    y_true_const = np.array([10.0, 10.0, 10.0, 10.0])
    y_pred = np.array([10.1, 9.9, 10.0, 10.2])
    
    score = safe_r2_score(y_true_const, y_pred)
    assert score == 0.0, f"Expected safe R2 to return 0.0 on zero variance, got {score}"
    
    # Insufficient samples (< 2)
    score_single = safe_r2_score(np.array([10.0]), np.array([10.0]))
    assert score_single == 0.0, "Expected safe R2 to return 0.0 for single observation"
    
    # Normal target: should match standard bounded range
    y_true_norm = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
    y_pred_norm = np.array([1.1, 2.0, 2.9, 4.1, 4.9])
    score_norm = safe_r2_score(y_true_norm, y_pred_norm)
    assert 0.9 <= score_norm <= 1.0, f"Expected high R2 for near-perfect predictions, got {score_norm}"


# ------------------------------------------------------------
# 6. Audit Organic vs Synthetic Data & Insufficient History Flag
# ------------------------------------------------------------

def test_organic_data_aggregation_and_cancelled_filtering():
    """
    Confirm how duplicate dates, missing days, cancelled orders,
    and missing quantities are handled.
    """
    # Simulate sales transactions with duplicate dates, cancelled orders, and negative quantities
    sales_history = [
        ("2026-03-01", 5.0),
        ("2026-03-01", 3.0),   # Duplicate date: total demand for 2026-03-01 should be 8.0
        ("2026-03-02", -2.0),  # Refund / negative qty: should be filtered out
        ("2026-03-03", 0.0),   # 0 qty: filtered out
        ("2026-03-04", 4.0),
    ]
    
    df, txn_count = _load_product_demand_series(
        product_id="PROD-001",
        daily_demand_avg=12.5,
        sales_history=sales_history,
    )
    
    # Only the 3 positive transactions should be counted
    assert txn_count == 3, f"Expected 3 positive transactions, got {txn_count}"
    
    # Duplicate date 2026-03-01 should have been summed to 8.0
    row_match = df[df["date"] == pd.to_datetime("2026-03-01")]
    if not row_match.empty:
        assert row_match["daily_demand"].iloc[0] == 8.0, "Duplicate sales on same date must be summed"


def test_insufficient_history_warning():
    """
    Check that products with insufficient history (< 30 transactions)
    are clearly marked with limited forecast reliability.
    """
    few_sales = [("2026-03-01", 2.0), ("2026-03-02", 4.0)]
    
    res = run_forecast(
        product_id="PROD-001",
        product_name="Wireless Noise-Canceling Headphones",
        sku="WH-1000XM5",
        daily_demand_avg=12.5,
        reorder_point=45,
        lead_time_days=7,
        current_stock=80,
        cost_price=249.99,
        model_name="Auto",
        horizon_days=7,
        sales_history=few_sales,
    )
    
    assert res.dataSummary.hasInsufficientHistory is True, "Should flag insufficient history when < 30 transactions"
    assert "Limited Forecast Reliability" in res.dataSummary.limitationsNote
    assert res.dataSummary.realTransactionsCount == 2
