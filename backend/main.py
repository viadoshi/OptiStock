# ============================================================
# main.py — FastAPI Backend for AI Inventory & Demand Forecasting System
# BCA Final Year Project
#
# Phase 2: MySQL + SQLAlchemy Integration
#
# Architecture:
#   GET  /                         → Welcome + API overview
#   GET  /health                   → Health check
#
#   GET  /api/v1/products          → List all products (with filtering)
#   GET  /api/v1/products/{id}     → Get product by ID
#   POST /api/v1/products          → Add a new product SKU
#   PATCH /api/v1/products/{id}    → Update product fields (stock, status, etc.)
#   DELETE /api/v1/products/{id}   → Remove a product SKU
#
#   GET  /api/v1/sales             → List all sale transactions (with filtering)
#   POST /api/v1/sales             → Record a new sale
#
#   GET  /api/v1/forecasts/{id}    → Get ML forecast for a product
#   POST /api/v1/forecasts/run     → Run model inference (model/horizon selectable)
#
#   GET  /api/v1/alerts            → List all stock alerts
#   PATCH /api/v1/alerts/{id}/resolve → Mark alert as resolved
#
#   GET  /api/v1/intelligence/abc  → Get full ABC Pareto analysis
#   GET  /api/v1/dashboard         → Get dashboard KPI metrics
#
#   GET  /api/v1/settings          → Get current settings
#   PATCH /api/v1/settings         → Update settings
#
# NOTE: The JSON responses returned by every endpoint are
#       identical to Phase 1 — the frontend does not change.
# ============================================================

from datetime import datetime, date
from typing import Optional, List, Union
from copy import deepcopy

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# ── Pydantic response models (unchanged) ─────────────────────
from models import (
    Product, ProductCreate, ProductUpdate,
    SaleTransaction, SaleTransactionCreate,
    ProductForecast, ForecastRequest,
    StockAlert, AlertResolveRequest,
    ABCItem,
    DashboardMetrics,
    AppSettings, AppSettingsUpdate,
    MessageResponse,
    InventoryRecommendation, InventoryRecommendationsResponse,
    ABCAnalysisResponse,
    SegmentationResponse, SegmentationRetrainRequest,
    AnomalyDetectionResponse, AnomalyDetectRequest,
)

# ── SQLAlchemy ORM table classes ──────────────────────────────
from orm_models import (
    ProductORM, SaleTransactionORM, StockAlertORM, ABCItemORM,
)

# ── Database engine, session factory, and init function ───────
from database import get_db, init_db

# ── Seed data (settings & dashboard metrics remain in-memory) ───
from seed_data import (
    seed_dashboard_metrics,
    initial_settings,
)
from db_seed import seed_all

# ── Phase 3: Real ML Forecasting Pipeline ─────────────────────
from ml_forecasting import run_forecast

# ── Smart Inventory Recommendations Engine ───────────────────
from inventory_recommendations import (
    compute_product_recommendation,
    generate_all_recommendations,
)

# ── Product Intelligence (ABC, K-Means, Isolation Forest) ──────
from product_intelligence import (
    run_abc_analysis,
    run_product_segmentation,
    run_anomaly_detection,
)

# ── ML Model Laboratory ───────────────────────────────────────
from models import (
    AlgorithmCatalogItem,
    ExperimentResult,
    TrainExperimentRequest,
    LeaderboardResponse,
)
from ml_laboratory import (
    ALGORITHM_CATALOG,
    train_and_evaluate_experiment,
    run_model_leaderboard,
)


# ============================================================
# FastAPI Application Instance
# ============================================================

app = FastAPI(
    title="OptiStock AI — Inventory & Demand Forecasting API",
    description=(
        "REST API backend for a BCA Final Year AI Inventory Management System. "
        "Provides CRUD endpoints for products, sales, ML demand forecasting, "
        "stock alerts, ABC analysis, and system settings. "
        "Phase 2: Backed by MySQL 8.0 via SQLAlchemy + PyMySQL."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


# ============================================================
# CORS Middleware
# Allows the React frontend (localhost:5173) to communicate
# with this backend without browser cross-origin blocks.
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # Create-React-App dev server
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# In-Memory store — only for data NOT yet in MySQL
# (Settings and forecast data remain in-memory in Phase 2;
#  products, sales, alerts, and abc_items now live in MySQL)
# ============================================================

# Forecast data is now generated live by the ML pipeline (no in-memory store needed)
_dashboard_metrics: DashboardMetrics = deepcopy(seed_dashboard_metrics)
_settings: AppSettings = deepcopy(initial_settings)


# ============================================================
# Startup Event
# Runs once when uvicorn starts the server.
# Creates all MySQL tables (IF NOT EXISTS) and seeds them if empty.
# ============================================================

@app.on_event("startup")
def on_startup():
    """
    Called automatically by FastAPI when the server starts.
    Safe to run multiple times — it never drops existing data.
    """
    print("\n[main.py] [INFO] Starting OptiStock AI Backend (Phase 2 - MySQL)")
    init_db()                       # CREATE TABLE IF NOT EXISTS
    db = next(get_db())             # borrow a session for seeding
    try:
        seed_all(db)                # seed only if tables are empty
    finally:
        db.close()
    print("[main.py] [OK] Database ready.\n")


# ============================================================
# Helper functions
# These convert ORM row objects into Pydantic model instances
# so the endpoints can return the same JSON as before.
# ============================================================

def _orm_to_product(row: ProductORM) -> Product:
    """Convert a ProductORM database row → Pydantic Product."""
    return Product(
        id=row.id,
        sku=row.sku,
        name=row.name,
        category=row.category,
        currentStock=row.current_stock,
        incomingStock=getattr(row, "incoming_stock", 0) or 0,
        minStockLevel=row.min_stock_level,
        reorderPoint=row.reorder_point,
        safetyStock=row.safety_stock,
        costPrice=row.cost_price,
        sellingPrice=row.selling_price,
        leadTimeDays=row.lead_time_days,
        dailyDemandAverage=row.daily_demand_average,
        status=row.status,
        supplier=row.supplier,
        lastRestocked=row.last_restocked or "",
        imageUrl=row.image_url,
    )


def _orm_to_sale(row: SaleTransactionORM) -> SaleTransaction:
    """Convert a SaleTransactionORM database row → Pydantic SaleTransaction."""
    return SaleTransaction(
        id=row.id,
        date=row.date,
        productId=row.product_id,
        productName=row.product_name,
        sku=row.sku,
        category=row.category,
        quantity=row.quantity,
        unitPrice=row.unit_price,
        totalRevenue=row.total_revenue,
        channel=row.channel,
        status=row.status,
    )


def _orm_to_alert(row: StockAlertORM) -> StockAlert:
    """Convert a StockAlertORM database row → Pydantic StockAlert."""
    return StockAlert(
        id=row.id,
        productId=row.product_id,
        productName=row.product_name,
        sku=row.sku,
        severity=row.severity,
        type=row.type,
        message=row.message,
        daysRemaining=row.days_remaining,
        currentStock=row.current_stock,
        recommendedOrder=row.recommended_order,
        timestamp=row.timestamp,
        resolved=row.resolved,
    )


def _orm_to_abc(row: ABCItemORM) -> ABCItem:
    """Convert an ABCItemORM database row → Pydantic ABCItem."""
    return ABCItem(
        id=row.id,
        sku=row.sku,
        name=row.name,
        classification=row.classification,
        annualRevenue=row.annual_revenue,
        revenueSharePercent=row.revenue_share_percent,
        cumulativeRevenueSharePercent=row.cumulative_revenue_share_percent,
        turnoverRatio=row.turnover_ratio,
        daysSalesInventory=row.days_sales_inventory,
        recommendation=row.recommendation,
    )


# ============================================================
# ROOT & HEALTH ENDPOINTS
# ============================================================

@app.get("/", tags=["System"], summary="API Welcome & Overview")
def root():
    """
    Welcome endpoint. Returns a summary of available API modules
    and confirms that the FastAPI backend is running correctly.
    """
    return {
        "message": "Welcome to the OptiStock AI Inventory & Demand Forecasting System API!",
        "status": "Backend is running (Phase 2 — MySQL)",
        "version": "2.0.0",
        "project": "BCA Final Year Project",
        "docs": "Visit http://127.0.0.1:8000/docs for interactive Swagger UI",
        "redoc": "Visit http://127.0.0.1:8000/redoc for ReDoc documentation",
        "modules": {
            "products": "/api/v1/products — Product catalog CRUD",
            "sales": "/api/v1/sales — Sales transaction log",
            "forecasting": "/api/v1/forecasts — ML demand forecasting",
            "alerts": "/api/v1/alerts — Stock alert management",
            "intelligence": "/api/v1/intelligence/abc — ABC Pareto analysis",
            "dashboard": "/api/v1/dashboard — KPI metrics summary",
            "settings": "/api/v1/settings — System configuration",
        },
    }


@app.get("/health", tags=["System"], summary="Health Check")
def health_check(db: Session = Depends(get_db)):
    """
    Standard health check endpoint.
    Used by monitoring tools to verify the server is alive.
    Now also reports live counts from MySQL.
    """
    product_count = db.query(ProductORM).count()
    active_alerts = db.query(StockAlertORM).filter(StockAlertORM.resolved == False).count()  # noqa: E712
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": "MySQL 8.0 via SQLAlchemy",
        "products_loaded": product_count,
        "alerts_active": active_alerts,
    }


# ============================================================
# PRODUCTS ENDPOINTS
# GET    /api/v1/products
# GET    /api/v1/products/{product_id}
# POST   /api/v1/products
# PATCH  /api/v1/products/{product_id}
# DELETE /api/v1/products/{product_id}
# ============================================================

@app.get(
    "/api/v1/products",
    response_model=List[Product],
    tags=["Products"],
    summary="List All Products",
)
def get_products(
    category: Optional[str] = Query(None, description="Filter by product category"),
    status: Optional[str] = Query(None, description="Filter by stock status"),
    search: Optional[str] = Query(None, description="Search by SKU, name, or supplier"),
    db: Session = Depends(get_db),
):
    """
    Returns the full list of inventory products from MySQL.
    Supports optional filtering by category, status, and search text.
    """
    query = db.query(ProductORM)

    if category:
        query = query.filter(ProductORM.category == category)

    if status:
        query = query.filter(ProductORM.status == status)

    if search:
        q = f"%{search.lower()}%"
        query = query.filter(
            ProductORM.name.ilike(q)
            | ProductORM.sku.ilike(q)
            | ProductORM.supplier.ilike(q)
        )

    rows = query.all()
    return [_orm_to_product(r) for r in rows]


@app.get(
    "/api/v1/products/{product_id}",
    response_model=Product,
    tags=["Products"],
    summary="Get Product by ID",
)
def get_product(product_id: str, db: Session = Depends(get_db)):
    """
    Returns a single product by its unique ID (e.g. prod-001).
    Raises 404 if not found.
    """
    row = db.query(ProductORM).filter(ProductORM.id == product_id).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found.")
    return _orm_to_product(row)


@app.post(
    "/api/v1/products",
    response_model=Product,
    status_code=201,
    tags=["Products"],
    summary="Add a New Product SKU",
)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    """
    Creates a new product SKU and saves it to MySQL.
    Rejects duplicate SKU codes (HTTP 409).
    The server auto-generates a unique id and sets lastRestocked to today.
    """
    # Check for duplicate SKU
    existing = db.query(ProductORM).filter(ProductORM.sku == payload.sku).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"SKU '{payload.sku}' already exists. Use a unique SKU code.",
        )

    new_id = f"prod-{int(datetime.now().timestamp() * 1000) % 100000:05d}"

    row = ProductORM(
        id=new_id,
        sku=payload.sku,
        name=payload.name,
        category=payload.category,
        current_stock=payload.currentStock,
        incoming_stock=payload.incomingStock,
        min_stock_level=payload.minStockLevel,
        reorder_point=payload.reorderPoint,
        safety_stock=payload.safetyStock,
        cost_price=payload.costPrice,
        selling_price=payload.sellingPrice,
        lead_time_days=payload.leadTimeDays,
        daily_demand_average=payload.dailyDemandAverage,
        status=payload.status,
        supplier=payload.supplier,
        last_restocked=date.today().isoformat(),
        image_url=getattr(payload, "imageUrl", None),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _orm_to_product(row)


@app.patch(
    "/api/v1/products/{product_id}",
    response_model=Product,
    tags=["Products"],
    summary="Update Product Fields",
)
def update_product(product_id: str, payload: ProductUpdate, db: Session = Depends(get_db)):
    """
    Partially updates a product in MySQL (PATCH semantics).
    Only fields provided in the request body are changed.
    """
    row = db.query(ProductORM).filter(ProductORM.id == product_id).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found.")

    # Map Pydantic camelCase fields → ORM snake_case columns
    field_map = {
        "currentStock":      "current_stock",
        "incomingStock":     "incoming_stock",
        "minStockLevel":     "min_stock_level",
        "reorderPoint":      "reorder_point",
        "safetyStock":       "safety_stock",
        "costPrice":         "cost_price",
        "sellingPrice":      "selling_price",
        "leadTimeDays":      "lead_time_days",
        "dailyDemandAverage": "daily_demand_average",
        "lastRestocked":     "last_restocked",
        "status":            "status",
        "supplier":          "supplier",
    }

    updates = payload.model_dump(exclude_none=True)
    for pydantic_key, value in updates.items():
        orm_key = field_map.get(pydantic_key, pydantic_key)
        setattr(row, orm_key, value)

    db.commit()
    db.refresh(row)
    return _orm_to_product(row)


@app.delete(
    "/api/v1/products/{product_id}",
    response_model=MessageResponse,
    tags=["Products"],
    summary="Delete a Product SKU",
)
def delete_product(product_id: str, db: Session = Depends(get_db)):
    """
    Permanently removes a product from MySQL.
    Raises 404 if the product ID does not exist.
    """
    row = db.query(ProductORM).filter(ProductORM.id == product_id).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found.")

    name, sku = row.name, row.sku
    db.delete(row)
    db.commit()
    return MessageResponse(message=f"Product '{name}' (SKU: {sku}) successfully deleted.")


# ============================================================
# SALES ENDPOINTS
# GET  /api/v1/sales
# POST /api/v1/sales
# ============================================================

@app.get(
    "/api/v1/sales",
    response_model=List[SaleTransaction],
    tags=["Sales"],
    summary="List All Sales Transactions",
)
def get_sales(
    channel: Optional[str] = Query(None, description="Filter by sales channel"),
    status: Optional[str] = Query(None, description="Filter by transaction status"),
    product_id: Optional[str] = Query(None, alias="productId", description="Filter by product ID"),
    db: Session = Depends(get_db),
):
    """
    Returns all sales transaction records from MySQL, newest first.
    Supports filtering by channel, status, and productId.
    """
    query = db.query(SaleTransactionORM)

    if channel:
        query = query.filter(SaleTransactionORM.channel == channel)
    if status:
        query = query.filter(SaleTransactionORM.status == status)
    if product_id:
        query = query.filter(SaleTransactionORM.product_id == product_id)

    # Sort newest first (by the date string; works for our "YYYY-MM-DD HH:MM" format)
    rows = query.order_by(SaleTransactionORM.date.desc()).all()
    return [_orm_to_sale(r) for r in rows]


@app.post(
    "/api/v1/sales",
    response_model=SaleTransaction,
    status_code=201,
    tags=["Sales"],
    summary="Record a New Sale",
)
def create_sale(payload: Union[SaleTransactionCreate, SaleTransaction], db: Session = Depends(get_db)):
    """
    Records a new sales transaction in MySQL. Supports both lightweight
    SaleTransactionCreate bodies and full SaleTransaction objects.
    """
    if isinstance(payload, SaleTransactionCreate):
        product = db.query(ProductORM).filter(ProductORM.id == payload.productId).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product '{payload.productId}' not found.")
        
        tx_id = f"tx-{int(datetime.now().timestamp() * 1000) % 1000000:06d}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
        total_rev = round(float(payload.quantity * product.selling_price), 2)

        row = SaleTransactionORM(
            id=tx_id,
            date=now_str,
            product_id=product.id,
            product_name=product.name,
            sku=product.sku,
            category=product.category,
            quantity=payload.quantity,
            unit_price=product.selling_price,
            total_revenue=total_rev,
            channel=payload.channel,
            status="Completed",
        )
    else:
        row = SaleTransactionORM(
            id=payload.id,
            date=payload.date,
            product_id=payload.productId,
            product_name=payload.productName,
            sku=payload.sku,
            category=payload.category,
            quantity=payload.quantity,
            unit_price=payload.unitPrice,
            total_revenue=payload.totalRevenue,
            channel=payload.channel,
            status=payload.status,
        )

    db.add(row)
    db.commit()
    db.refresh(row)
    return _orm_to_sale(row)


# ============================================================
# DEMAND FORECASTING ENDPOINTS
# GET  /api/v1/forecasts/{product_id}
# POST /api/v1/forecasts/run
# Phase 3: Backed by a real XGBoost / Random Forest / Linear ML pipeline
# ============================================================

def _get_sales_history(product_id: str, db: Session) -> list[tuple[str, float]]:
    """
    Fetch the real daily sales quantities from MySQL for a product.
    Returns a list of (date_str, quantity) tuples for the last 365 days.
    These augment the synthetic training data in the ML pipeline.
    """
    rows = (
        db.query(SaleTransactionORM.date, SaleTransactionORM.quantity)
        .filter(
            SaleTransactionORM.product_id == product_id,
            SaleTransactionORM.status == "Completed",
        )
        .all()
    )
    return [(r.date, float(r.quantity)) for r in rows]


@app.get(
    "/api/v1/forecasts/{product_id}",
    response_model=ProductForecast,
    tags=["Demand Forecasting"],
    summary="Get ML Forecast for a Product",
)
def get_forecast(
    product_id: str,
    model: Optional[str] = Query(
        "XGBoost Regressor",
        description="ML model: 'XGBoost Regressor', 'Random Forest', or 'Prophet'",
    ),
    horizon: int = Query(30, ge=7, le=90, description="Forecast horizon in days"),
    db: Session = Depends(get_db),
):
    """
    Phase 3: Runs a real XGBoost / Random Forest / Linear Regression
    forecasting pipeline for the specified product.

    The model is trained on 365 days of synthetic demand data augmented
    with real sales transactions from MySQL. R2, RMSE, and MAE are computed
    on a true 20% hold-out split.
    """
    product = db.query(ProductORM).filter(ProductORM.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found.")

    # Validate model name
    valid_models = {
        "XGBoost Regressor",
        "Random Forest",
        "Gradient Boosting",
        "Linear Regression",
        "Prophet",
    }
    model_name = model if model in valid_models else "XGBoost Regressor"

    # Fetch real sales history from MySQL to augment synthetic training data
    sales_history = _get_sales_history(product_id, db)

    return run_forecast(
        product_id=product.id,
        product_name=product.name,
        sku=product.sku,
        daily_demand_avg=product.daily_demand_average,
        reorder_point=product.reorder_point,
        lead_time_days=product.lead_time_days,
        current_stock=product.current_stock,
        cost_price=product.cost_price,
        model_name=model_name,
        horizon_days=horizon,
        sales_history=sales_history,
    )


@app.post(
    "/api/v1/forecasts/run",
    response_model=ProductForecast,
    tags=["Demand Forecasting"],
    summary="Run ML Model Inference (explicit model + horizon)",
)
def run_model_inference(payload: ForecastRequest, db: Session = Depends(get_db)):
    """
    Phase 3: Runs a fresh ML forecasting inference with the exact model
    and horizon specified in the request body.

    Equivalent to GET /api/v1/forecasts/{id}?model=...&horizon=...
    but accepts parameters in the request body for convenience.
    """
    product = db.query(ProductORM).filter(ProductORM.id == payload.productId).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product '{payload.productId}' not found.")

    sales_history = _get_sales_history(payload.productId, db)

    return run_forecast(
        product_id=product.id,
        product_name=product.name,
        sku=product.sku,
        daily_demand_avg=product.daily_demand_average,
        reorder_point=product.reorder_point,
        lead_time_days=product.lead_time_days,
        current_stock=product.current_stock,
        cost_price=product.cost_price,
        model_name=payload.modelName,
        horizon_days=payload.horizonDays,
        sales_history=sales_history,
    )


# ============================================================
# STOCK ALERTS ENDPOINTS
# GET   /api/v1/alerts
# PATCH /api/v1/alerts/{alert_id}/resolve
# ============================================================

@app.get(
    "/api/v1/alerts",
    response_model=List[StockAlert],
    tags=["Inventory Alerts"],
    summary="List All Stock Alerts",
)
def get_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity: critical, warning, info"),
    resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
    db: Session = Depends(get_db),
):
    """
    Returns all stock alerts from MySQL.
    Optionally filtered by severity and resolved status.
    """
    query = db.query(StockAlertORM)

    if severity:
        query = query.filter(StockAlertORM.severity == severity)
    if resolved is not None:
        query = query.filter(StockAlertORM.resolved == resolved)

    rows = query.all()
    return [_orm_to_alert(r) for r in rows]


@app.patch(
    "/api/v1/alerts/{alert_id}/resolve",
    response_model=StockAlert,
    tags=["Inventory Alerts"],
    summary="Resolve / Dismiss an Alert",
)
def resolve_alert(
    alert_id: str,
    payload: AlertResolveRequest = AlertResolveRequest(),
    db: Session = Depends(get_db),
):
    """
    Marks a stock alert as resolved in MySQL.
    """
    row = db.query(StockAlertORM).filter(StockAlertORM.id == alert_id).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")

    row.resolved = payload.resolved
    db.commit()
    db.refresh(row)
    return _orm_to_alert(row)


# ============================================================
# PRODUCT INTELLIGENCE ENDPOINTS
# ============================================================

@app.get(
    "/api/v1/intelligence/abc",
    response_model=Union[ABCAnalysisResponse, List[ABCItem]],
    tags=["Product Intelligence"],
    summary="Get ABC Pareto Analysis",
)
def get_abc_analysis(
    classification: Optional[str] = Query(None, description="Filter by class: A, B, or C"),
    measure: str = Query("consumption_value", description="Measure: 'consumption_value' or 'revenue'"),
    threshold_a: float = Query(80.0, description="Cumulative % threshold for Class A"),
    threshold_b: float = Query(95.0, description="Cumulative % threshold for Class B"),
    legacy: bool = Query(False, description="Set True to return raw legacy seed table rows"),
    db: Session = Depends(get_db),
):
    """
    Returns Pareto ABC inventory classification.
    Calculates dynamic ranking and cumulative percentages based on
    Annual Consumption Value (Cost-based) or Annual Sales Revenue.
    """
    # Defensive unwrapping if called directly in Python tests without FastAPI DI
    is_legacy = legacy if isinstance(legacy, bool) else False
    filter_cls = classification if isinstance(classification, str) else None
    meas = measure if isinstance(measure, str) else "consumption_value"
    t_a = float(threshold_a) if isinstance(threshold_a, (int, float)) else 80.0
    t_b = float(threshold_b) if isinstance(threshold_b, (int, float)) else 95.0

    if is_legacy:
        query = db.query(ABCItemORM)
        if filter_cls:
            query = query.filter(ABCItemORM.classification == filter_cls.upper())
        rows = query.all()
        return [_orm_to_abc(r) for r in rows]

    return run_abc_analysis(
        db=db,
        measure=meas,
        threshold_a=t_a,
        threshold_b=t_b,
        filter_class=filter_cls,
    )


@app.get(
    "/api/v1/intelligence/segmentation",
    response_model=SegmentationResponse,
    tags=["Product Intelligence"],
    summary="Get K-Means Product Segmentation",
)
def get_product_segmentation(
    n_clusters: int = Query(3, ge=2, le=6, description="Number of clusters (k)"),
    use_benchmark: bool = Query(True, description="Whether to include benchmark demand variability"),
    retrain: bool = Query(False, description="Force retrain and bypass cache"),
    db: Session = Depends(get_db),
):
    """
    Executes K-Means unsupervised clustering on catalog products.
    Returns cluster profiles, centroid statistics, silhouette score, and assigned products.
    """
    k = int(n_clusters) if isinstance(n_clusters, int) else 3
    bm = bool(use_benchmark) if isinstance(use_benchmark, bool) else True
    rf = bool(retrain) if isinstance(retrain, bool) else False

    try:
        return run_product_segmentation(
            db=db,
            n_clusters=k,
            use_benchmark=bm,
            force_retrain=rf,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering error: {str(e)}")


@app.post(
    "/api/v1/intelligence/segmentation/retrain",
    response_model=SegmentationResponse,
    tags=["Product Intelligence"],
    summary="Retrain K-Means Product Segmentation",
)
def retrain_product_segmentation(
    body: SegmentationRetrainRequest,
    db: Session = Depends(get_db),
):
    """
    Explicitly retrains the K-Means product segmentation model.
    """
    try:
        return run_product_segmentation(
            db=db,
            n_clusters=body.nClusters,
            use_benchmark=body.useBenchmark,
            force_retrain=True,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering error: {str(e)}")


@app.get(
    "/api/v1/intelligence/anomalies",
    response_model=AnomalyDetectionResponse,
    tags=["Product Intelligence"],
    summary="Get Inventory Anomaly Detection",
)
def get_inventory_anomalies(
    contamination: float = Query(0.05, ge=0.01, le=0.25, description="Expected proportion of anomalies"),
    use_benchmark: bool = Query(True, description="Use benchmark time series vs organic data"),
    retrain: bool = Query(False, description="Force retrain and bypass cache"),
    db: Session = Depends(get_db),
):
    """
    Executes Isolation Forest anomaly detection on daily inventory demand events.
    Returns flagged operational outliers, normalized scores, and investigation reasons.
    """
    cont = float(contamination) if isinstance(contamination, (int, float)) else 0.05
    bm = bool(use_benchmark) if isinstance(use_benchmark, bool) else True
    rf = bool(retrain) if isinstance(retrain, bool) else False

    try:
        return run_anomaly_detection(
            db=db,
            contamination=cont,
            use_benchmark=bm,
            force_retrain=rf,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection error: {str(e)}")


@app.post(
    "/api/v1/intelligence/anomalies/detect",
    response_model=AnomalyDetectionResponse,
    tags=["Product Intelligence"],
    summary="Run Inventory Anomaly Detection",
)
def detect_inventory_anomalies(
    body: AnomalyDetectRequest,
    db: Session = Depends(get_db),
):
    """
    Explicitly runs Isolation Forest anomaly detection with specified parameters.
    """
    try:
        return run_anomaly_detection(
            db=db,
            contamination=body.contamination,
            use_benchmark=body.useBenchmark,
            force_retrain=True,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection error: {str(e)}")


# ============================================================
# ML MODEL LABORATORY ENDPOINTS
# ============================================================

@app.get(
    "/api/v1/laboratory/algorithms",
    response_model=List[AlgorithmCatalogItem],
    tags=["ML Model Laboratory"],
    summary="Get ML Algorithm Catalog & Educational Metadata",
)
def get_algorithm_catalog(
    task: Optional[str] = Query(None, description="Filter by task: regression, classification, clustering, etc."),
):
    """
    Returns the list of all supported algorithms with BCA Data Science educational
    descriptions, hyperparameters, advantages, limitations, and interpretation guides.
    """
    filter_task = task if isinstance(task, str) else None
    algos = list(ALGORITHM_CATALOG.values())
    if filter_task:
        algos = [a for a in algos if a.task == filter_task]
    return algos


@app.post(
    "/api/v1/laboratory/train",
    response_model=ExperimentResult,
    tags=["ML Model Laboratory"],
    summary="Train & Evaluate Single Algorithm Experiment",
)
def train_laboratory_experiment(
    body: TrainExperimentRequest,
    db: Session = Depends(get_db),
):
    """
    Trains and evaluates a specific algorithm experiment.
    Enforces safe preprocessing, chronological time-series splitting for regression,
    stratified splitting for classification, and prevents target leakage.
    """
    try:
        return train_and_evaluate_experiment(
            algorithm_id=body.algorithmId,
            parameters=body.parameters,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Experiment training failed: {str(e)}")


@app.get(
    "/api/v1/laboratory/compare",
    response_model=LeaderboardResponse,
    tags=["ML Model Laboratory"],
    summary="Run Multi-Model Tournament Leaderboard",
)
def get_model_leaderboard(
    task: str = Query("regression", description="Task: 'regression' or 'classification'"),
    refresh: bool = Query(False, description="Force retrain all models"),
    db: Session = Depends(get_db),
):
    """
    Executes a tournament comparing all algorithms for a given task,
    ranks them on standard evaluation metrics, and crowns the leaderboard champion.
    """
    t_val = task if isinstance(task, str) else "regression"
    rf_val = bool(refresh) if isinstance(refresh, bool) else False
    try:
        return run_model_leaderboard(task=t_val, db=db, force_refresh=rf_val)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Leaderboard evaluation failed: {str(e)}")


# ============================================================
# SMART INVENTORY RECOMMENDATIONS ENDPOINTS
# GET /api/v1/recommendations
# GET /api/v1/recommendations/{product_id}
# ============================================================

@app.get(
    "/api/v1/recommendations",
    response_model=InventoryRecommendationsResponse,
    tags=["Smart Recommendations"],
    summary="List Smart Inventory Recommendations",
)
def get_inventory_recommendations(
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status: critical, reorder_now, healthy, overstock"),
    target_coverage_days: Optional[int] = Query(None, ge=1, le=120, description="Replenishment coverage window in days"),
    default_lead_time_days: Optional[int] = Query(None, ge=1, le=90, description="Fallback supplier lead time"),
    default_safety_stock_days: Optional[int] = Query(None, ge=1, le=90, description="Fallback safety stock buffer days"),
    overstock_days_threshold: Optional[float] = Query(None, ge=10.0, le=365.0, description="Threshold days of stock for overstock classification"),
    service_level_z: Optional[float] = Query(None, ge=1.0, le=3.0, description="Cycle service level Z-multiplier"),
    use_ml_forecast: bool = Query(False, description="Whether to invoke ML forecasting inference pipeline"),
    db: Session = Depends(get_db),
):
    """
    Returns explainable inventory replenishment recommendations for all products.
    Evaluates reorder point, safety stock buffer, lead-time demand, days of supply,
    and suggested replenishment quantities with configurable thresholds.
    """
    target_cov = target_coverage_days if target_coverage_days is not None else 14
    lead_time_fb = default_lead_time_days if default_lead_time_days is not None else 7
    safety_days_fb = default_safety_stock_days if default_safety_stock_days is not None else _settings.defaultSafetyStockDays
    overstock_thresh = overstock_days_threshold if overstock_days_threshold is not None else 45.0
    z_factor = service_level_z if service_level_z is not None else 1.645

    return generate_all_recommendations(
        db=db,
        category=category,
        status_filter=status,
        target_coverage_days=target_cov,
        default_lead_time_days=lead_time_fb,
        default_safety_stock_days=safety_days_fb,
        overstock_days_threshold=overstock_thresh,
        service_level_z=z_factor,
        use_ml_forecast=use_ml_forecast,
    )


@app.get(
    "/api/v1/recommendations/{product_id}",
    response_model=InventoryRecommendation,
    tags=["Smart Recommendations"],
    summary="Get Detailed Inventory Recommendation for a Product",
)
def get_product_recommendation(
    product_id: str,
    target_coverage_days: Optional[int] = Query(None, ge=1, le=120),
    default_lead_time_days: Optional[int] = Query(None, ge=1, le=90),
    default_safety_stock_days: Optional[int] = Query(None, ge=1, le=90),
    overstock_days_threshold: Optional[float] = Query(None, ge=10.0, le=365.0),
    service_level_z: Optional[float] = Query(None, ge=1.0, le=3.0),
    use_ml_forecast: bool = Query(False, description="Run ML forecasting inference pipeline for daily demand"),
    db: Session = Depends(get_db),
):
    """
    Returns an in-depth, transparent inventory sizing recommendation for a specific product.
    Includes exact mathematical formulas, input values, and data reliability warnings.
    """
    product = db.query(ProductORM).filter(ProductORM.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found.")

    target_cov = target_coverage_days if target_coverage_days is not None else 14
    lead_time_fb = default_lead_time_days if default_lead_time_days is not None else 7
    safety_days_fb = default_safety_stock_days if default_safety_stock_days is not None else _settings.defaultSafetyStockDays
    overstock_thresh = overstock_days_threshold if overstock_days_threshold is not None else 45.0
    z_factor = service_level_z if service_level_z is not None else 1.645

    return compute_product_recommendation(
        product=product,
        db=db,
        target_coverage_days=target_cov,
        default_lead_time_days=lead_time_fb,
        default_safety_stock_days=safety_days_fb,
        overstock_days_threshold=overstock_thresh,
        service_level_z=z_factor,
        use_ml_forecast=use_ml_forecast,
    )


# ============================================================
# DASHBOARD KPI ENDPOINT
# GET /api/v1/dashboard
# ============================================================

@app.get(
    "/api/v1/dashboard",
    response_model=DashboardMetrics,
    tags=["Dashboard"],
    summary="Get Dashboard KPI Metrics",
)
def get_dashboard_metrics(db: Session = Depends(get_db)):
    """
    Returns aggregated KPI metrics for the main dashboard.
    Critical alerts count and inventory value are computed live from MySQL.
    """
    # Compute live from MySQL
    active_critical = (
        db.query(StockAlertORM)
        .filter(StockAlertORM.resolved == False, StockAlertORM.severity == "critical")  # noqa: E712
        .count()
    )

    products = db.query(ProductORM).all()
    total_inventory_value = sum(
        p.current_stock * p.cost_price for p in products
    )

    return DashboardMetrics(
        **{
            **_dashboard_metrics.model_dump(),
            "criticalAlertsCount": active_critical,
            "totalInventoryValue": round(total_inventory_value, 2),
            "totalActiveSkus": len(products),
        }
    )


# ============================================================
# SETTINGS ENDPOINTS
# GET   /api/v1/settings
# PATCH /api/v1/settings
# (Settings remain in-memory — stored in DB in a future phase)
# ============================================================

@app.get(
    "/api/v1/settings",
    response_model=AppSettings,
    tags=["Settings"],
    summary="Get Current System Settings",
)
def get_settings():
    """
    Returns the current system configuration.
    Settings are still held in-memory in Phase 2.
    """
    return _settings


@app.patch(
    "/api/v1/settings",
    response_model=AppSettings,
    tags=["Settings"],
    summary="Update System Settings",
)
def update_settings(payload: AppSettingsUpdate):
    """
    Partially updates system settings (PATCH semantics).
    """
    global _settings
    current = _settings.model_dump()
    updates = payload.model_dump(exclude_none=True)
    current.update(updates)
    _settings = AppSettings(**current)
    return _settings
