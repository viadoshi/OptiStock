# ============================================================
# db_seed.py — Populate MySQL Tables from Existing Seed Data
# ============================================================
#
# What this file does (plain English):
#
#   After init_db() creates the tables, this module checks if
#   each table is empty.  If it is, it inserts the same seed
#   records that were previously stored in RAM (from seed_data.py).
#
#   It is SAFE to call on every startup because it only inserts
#   when a table has zero rows — if the data is already there,
#   it does nothing (no duplicates, no overwrites).
#
#   Mapping note — Pydantic field names vs ORM column names:
#     Pydantic           →  ORM column (database)
#     currentStock       →  current_stock
#     minStockLevel      →  min_stock_level
#     reorderPoint       →  reorder_point
#     safetyStock        →  safety_stock
#     costPrice          →  cost_price
#     sellingPrice       →  selling_price
#     leadTimeDays       →  lead_time_days
#     dailyDemandAverage →  daily_demand_average
#     lastRestocked      →  last_restocked
#     imageUrl           →  image_url
#     (same pattern for other tables)
#
# ============================================================

from sqlalchemy.orm import Session

from orm_models import ProductORM, SaleTransactionORM, StockAlertORM, ABCItemORM
from seed_data import seed_products, seed_sales, seed_alerts, seed_abc_items


def seed_products_table(db: Session) -> None:
    """Insert seed products if the products table is empty."""
    count = db.query(ProductORM).count()
    if count > 0:
        print(f"[db_seed.py]   products table already has {count} rows — skipping seed.")
        return

    for p in seed_products:
        row = ProductORM(
            id=p.id,
            sku=p.sku,
            name=p.name,
            category=p.category,
            current_stock=p.currentStock,
            min_stock_level=p.minStockLevel,
            reorder_point=p.reorderPoint,
            safety_stock=p.safetyStock,
            cost_price=p.costPrice,
            selling_price=p.sellingPrice,
            lead_time_days=p.leadTimeDays,
            daily_demand_average=p.dailyDemandAverage,
            status=p.status,
            supplier=p.supplier,
            last_restocked=p.lastRestocked,
            image_url=getattr(p, "imageUrl", None),
        )
        db.add(row)

    db.commit()
    print(f"[db_seed.py]   [OK]  Inserted {len(seed_products)} products.")


def seed_sales_table(db: Session) -> None:
    """Insert seed sales transactions if the sales table is empty."""
    count = db.query(SaleTransactionORM).count()
    if count > 0:
        print(f"[db_seed.py]   sales table already has {count} rows — skipping seed.")
        return

    for s in seed_sales:
        row = SaleTransactionORM(
            id=s.id,
            date=s.date,
            product_id=s.productId,
            product_name=s.productName,
            sku=s.sku,
            category=s.category,
            quantity=s.quantity,
            unit_price=s.unitPrice,
            total_revenue=s.totalRevenue,
            channel=s.channel,
            status=s.status,
        )
        db.add(row)

    db.commit()
    print(f"[db_seed.py]   [OK]  Inserted {len(seed_sales)} sales transactions.")


def seed_alerts_table(db: Session) -> None:
    """Insert seed stock alerts if the stock_alerts table is empty."""
    count = db.query(StockAlertORM).count()
    if count > 0:
        print(f"[db_seed.py]   stock_alerts table already has {count} rows — skipping seed.")
        return

    for a in seed_alerts:
        row = StockAlertORM(
            id=a.id,
            product_id=a.productId,
            product_name=a.productName,
            sku=a.sku,
            severity=a.severity,
            type=a.type,
            message=a.message,
            days_remaining=a.daysRemaining,
            current_stock=a.currentStock,
            recommended_order=a.recommendedOrder,
            timestamp=a.timestamp,
            resolved=a.resolved,
        )
        db.add(row)

    db.commit()
    print(f"[db_seed.py]   [OK]  Inserted {len(seed_alerts)} stock alerts.")


def seed_abc_table(db: Session) -> None:
    """Insert seed ABC items if the abc_items table is empty."""
    count = db.query(ABCItemORM).count()
    if count > 0:
        print(f"[db_seed.py]   abc_items table already has {count} rows — skipping seed.")
        return

    for item in seed_abc_items:
        row = ABCItemORM(
            id=item.id,
            sku=item.sku,
            name=item.name,
            classification=item.classification,
            annual_revenue=item.annualRevenue,
            revenue_share_percent=item.revenueSharePercent,
            cumulative_revenue_share_percent=item.cumulativeRevenueSharePercent,
            turnover_ratio=item.turnoverRatio,
            days_sales_inventory=item.daysSalesInventory,
            recommendation=item.recommendation,
        )
        db.add(row)

    db.commit()
    print(f"[db_seed.py]   [OK]  Inserted {len(seed_abc_items)} ABC classification items.")


def seed_all(db: Session) -> None:
    """
    Master seeder — call this once at startup after init_db().
    Safely seeds all four tables only if they are empty.
    """
    print("[db_seed.py] [SEED] Checking database seed status...")
    seed_products_table(db)
    seed_sales_table(db)
    seed_alerts_table(db)
    seed_abc_table(db)
    print("[db_seed.py] [OK] Seed check complete.")
