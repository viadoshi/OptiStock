# ============================================================
# orm_models.py — SQLAlchemy ORM Table Definitions
# ============================================================
#
# What this file does (plain English):
#
#   Each class here describes one MySQL table.  SQLAlchemy reads
#   these classes and knows how to:
#     • CREATE the table (run at startup via init_db)
#     • INSERT / SELECT / UPDATE / DELETE rows
#     • Map rows back into Python objects you can work with
#
#   These tables mirror the existing Pydantic models in models.py,
#   which in turn mirror the TypeScript interfaces in the frontend.
#   Nothing changes from the API's point of view — endpoints keep
#   returning the same JSON shapes.
#
# Tables created:
#   products        → Product catalog (12 seed SKUs)
#   sales           → Sales transaction log
#   stock_alerts    → Inventory warning events
#   abc_items       → ABC Pareto classification records
#
# Note: AppSettings, DashboardMetrics, and ProductForecast are NOT
#       stored in MySQL in this phase — they remain in-memory or as
#       computed values (same as before).  Only the four core tables
#       with CRUD endpoints are persisted.
# ============================================================

from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    Boolean,
    Text,
    DateTime,
)
from sqlalchemy.sql import func

from database import Base  # Base is the DeclarativeBase from database.py


# ──────────────────────────────────────────────────────────────
# Table 1:  products
# ──────────────────────────────────────────────────────────────
# Mirrors:  Pydantic Product model  (models.py lines 66-73)
#           Seed data               (seed_data.py lines 38-123)
#           API endpoints:          GET/POST/PATCH/DELETE /api/v1/products
# ──────────────────────────────────────────────────────────────

class ProductORM(Base):
    """
    One row = one SKU in the product catalog.

    Column notes:
      id           → e.g. "prod-001"  (string, not auto-increment, because
                     the existing API already generates IDs like prod-XXXXX)
      status       → one of: in_stock | low_stock | out_of_stock | overstocked
      category     → one of the 6 allowed categories
      image_url    → optional URL string, nullable
    """
    __tablename__ = "products"

    # Primary key — we use a human-readable string ID (e.g. "prod-001")
    # index=True makes lookups by ID fast
    id               = Column(String(50),  primary_key=True, index=True)

    sku              = Column(String(50),  nullable=False, unique=True, index=True)
    name             = Column(String(200), nullable=False)
    category         = Column(String(100), nullable=False)

    current_stock    = Column(Integer,     nullable=False, default=0)
    min_stock_level  = Column(Integer,     nullable=False, default=0)
    reorder_point    = Column(Integer,     nullable=False, default=0)
    safety_stock     = Column(Integer,     nullable=False, default=0)

    cost_price       = Column(Float,       nullable=False)
    selling_price    = Column(Float,       nullable=False)

    lead_time_days         = Column(Integer, nullable=False, default=7)
    daily_demand_average   = Column(Float,   nullable=False, default=1.0)

    status           = Column(String(20),  nullable=False, default="in_stock")
    incoming_stock   = Column(Integer,     nullable=False, default=0)
    supplier         = Column(String(200), nullable=False)
    last_restocked   = Column(String(20),  nullable=True)   # ISO date "YYYY-MM-DD"
    image_url        = Column(String(500), nullable=True)

    # Audit timestamps (auto-managed by MySQL)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Product id={self.id!r} sku={self.sku!r} stock={self.current_stock}>"


# ──────────────────────────────────────────────────────────────
# Table 2:  sales
# ──────────────────────────────────────────────────────────────
# Mirrors:  Pydantic SaleTransaction model  (models.py lines 99-111)
#           Seed data                        (seed_data.py lines 130-210)
#           API endpoints:                  GET/POST /api/v1/sales
# ──────────────────────────────────────────────────────────────

class SaleTransactionORM(Base):
    """
    One row = one sales order (can be Completed / Pending / Refunded).

    product_id is a string foreign-key reference to products.id.
    We do NOT add a SQLAlchemy ForeignKey constraint so that the
    database stays flexible during demo/mock data phases.
    """
    __tablename__ = "sales"

    id            = Column(String(50),  primary_key=True, index=True)  # e.g. "TXN-9021"
    date          = Column(String(20),  nullable=False)   # e.g. "2026-10-01 16:42"
    product_id    = Column(String(50),  nullable=False, index=True)
    product_name  = Column(String(200), nullable=False)
    sku           = Column(String(50),  nullable=False)
    category      = Column(String(100), nullable=False)
    quantity      = Column(Integer,     nullable=False, default=1)
    unit_price    = Column(Float,       nullable=False)
    total_revenue = Column(Float,       nullable=False)
    channel       = Column(String(50),  nullable=False)   # e.g. "Online Store"
    status        = Column(String(20),  nullable=False)   # Completed / Pending / Refunded

    created_at = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<Sale id={self.id!r} product={self.product_name!r} revenue={self.total_revenue}>"


# ──────────────────────────────────────────────────────────────
# Table 3:  stock_alerts
# ──────────────────────────────────────────────────────────────
# Mirrors:  Pydantic StockAlert model  (models.py lines 168-181)
#           Seed data                   (seed_data.py  — seed_alerts list)
#           API endpoints:             GET /api/v1/alerts
#                                      PATCH /api/v1/alerts/{id}/resolve
# ──────────────────────────────────────────────────────────────

class StockAlertORM(Base):
    """
    One row = one inventory warning event.

    severity  → critical | warning | info
    type      → stockout_imminent | reorder_point_reached |
                overstocked | delayed_lead_time
    resolved  → False = active alert, True = dismissed/resolved
    """
    __tablename__ = "stock_alerts"

    id                = Column(String(50),  primary_key=True, index=True)
    product_id        = Column(String(50),  nullable=False, index=True)
    product_name      = Column(String(200), nullable=False)
    sku               = Column(String(50),  nullable=False)
    severity          = Column(String(20),  nullable=False)
    type              = Column(String(50),  nullable=False)
    message           = Column(Text,        nullable=False)
    days_remaining    = Column(Integer,     nullable=False, default=0)
    current_stock     = Column(Integer,     nullable=False, default=0)
    recommended_order = Column(Integer,     nullable=False, default=0)
    timestamp         = Column(String(30),  nullable=False)
    resolved          = Column(Boolean,     nullable=False, default=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        sev = self.severity
        return f"<Alert id={self.id!r} product={self.product_name!r} severity={sev!r} resolved={self.resolved}>"


# ──────────────────────────────────────────────────────────────
# Table 4:  abc_items
# ──────────────────────────────────────────────────────────────
# Mirrors:  Pydantic ABCItem model    (models.py lines 193-204)
#           Seed data                  (seed_data.py — seed_abc_items list)
#           API endpoint:             GET /api/v1/intelligence/abc
# ──────────────────────────────────────────────────────────────

class ABCItemORM(Base):
    """
    One row = one SKU's Pareto ABC classification.

    classification → "A" | "B" | "C"
    """
    __tablename__ = "abc_items"

    id                             = Column(String(50),  primary_key=True, index=True)
    sku                            = Column(String(50),  nullable=False, unique=True)
    name                           = Column(String(200), nullable=False)
    classification                 = Column(String(1),   nullable=False)  # A / B / C
    annual_revenue                 = Column(Float,       nullable=False)
    revenue_share_percent          = Column(Float,       nullable=False)
    cumulative_revenue_share_percent = Column(Float,     nullable=False)
    turnover_ratio                 = Column(Float,       nullable=False)
    days_sales_inventory           = Column(Integer,     nullable=False)
    recommendation                 = Column(Text,        nullable=False)

    created_at = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<ABCItem sku={self.sku!r} class={self.classification!r} revenue={self.annual_revenue}>"
