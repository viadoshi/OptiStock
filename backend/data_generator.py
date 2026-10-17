# ============================================================
# data_generator.py — Clearly Labeled Synthetic Development Benchmark
# ============================================================
#
# WHY THIS EXISTS:
#   The MySQL database currently contains 12 seed sales transactions
#   across 12 products over a 3-day window (2026-09-29 to 2026-10-01).
#   That is ~1 record per SKU, which is mathematically insufficient
#   for training time-series ML models (lag features require 1-14 days
#   of prior data; rolling averages require 7-30 days; seasonality
#   requires at least 1-2 seasonal cycles).
#
#   Per project requirements, we do NOT silently fabricate sales.
#   Instead, this script generates an explicit, clearly labeled benchmark
#   dataset (data_origin = "SYNTHETIC_BENCHMARK_DEV") based on each SKU's
#   catalog baseline demand, seasonal elasticity, and realistic stochastic
#   variance.
#
#   Real MySQL transactions are layered on top when available with
#   data_origin = "MYSQL_ORGANIC_SALE".
# ============================================================

import os
import math
import random
from datetime import date, timedelta
import numpy as np
import pandas as pd

from database import SessionLocal
from orm_models import ProductORM

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CSV_PATH = os.path.join(DATA_DIR, "synthetic_sales_benchmark.csv")


def generate_benchmark_dataset(n_days: int = 730) -> pd.DataFrame:
    """
    Generates 730 days (2 years) of daily demand benchmark records
    for all products in the database.
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    db = SessionLocal()
    try:
        products = db.query(ProductORM).all()
        if not products:
            from seed_data import seed_products
            products = [
                type("Prod", (), {
                    "id": p.id,
                    "sku": p.sku,
                    "name": p.name,
                    "category": p.category,
                    "daily_demand_average": p.dailyDemandAverage,
                    "lead_time_days": p.leadTimeDays,
                })() for p in seed_products
            ]
    finally:
        db.close()

    end_date = date.today()
    start_date = end_date - timedelta(days=n_days)

    all_rows = []

    for p in products:
        seed = sum(ord(c) for c in p.id)
        rng = random.Random(seed)
        np_rng = np.random.default_rng(seed)

        base_avg = float(p.daily_demand_average or 3.0)

        for i in range(n_days):
            cur_date = start_date + timedelta(days=i)
            dow = cur_date.weekday()
            month = cur_date.month

            # Weekly seasonality: Monday-Friday higher, weekends lower
            weekly_factor = 0.70 if dow >= 5 else 1.12

            # Annual seasonality: Holiday surge in Q4, summer dip in Q3
            if month in (11, 12):
                annual_factor = 1.35 + 0.10 * math.sin(math.pi * (month - 10) / 3)
            elif month in (7, 8):
                annual_factor = 0.82
            else:
                annual_factor = 1.0 + 0.08 * math.sin(2 * math.pi * i / 365.25)

            # Trend: 2.5% annual secular growth
            trend_factor = 1.0 + 0.025 * (i / 365.25)

            expected_demand = base_avg * weekly_factor * annual_factor * trend_factor

            # Stochastic Gaussian noise (~18% variance)
            noise = float(np_rng.normal(0, expected_demand * 0.18))

            # Promotional spike (~2.5% chance)
            spike = float(expected_demand * rng.uniform(0.6, 1.4)) if rng.random() < 0.025 else 0.0

            daily_qty = max(0.0, round(expected_demand + noise + spike, 1))

            all_rows.append({
                "date": cur_date.isoformat(),
                "product_id": p.id,
                "sku": p.sku,
                "product_name": p.name,
                "category": p.category,
                "daily_demand": daily_qty,
                "data_origin": "SYNTHETIC_BENCHMARK_DEV",
            })

    df = pd.DataFrame(all_rows)
    df.to_csv(CSV_PATH, index=False)
    print(f"[data_generator.py] Generated {len(df)} benchmark records -> {CSV_PATH}")
    return df


if __name__ == "__main__":
    generate_benchmark_dataset()
