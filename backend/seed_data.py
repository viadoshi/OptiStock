# ============================================================
# seed_data.py — In-Memory Seed Data for AI Inventory System
# Mirrors the mock data from frontend/src/data/mockData.ts
# This will later be replaced by a MySQL database + SQLAlchemy.
# ============================================================

from models import (
    Product, SaleTransaction, StockAlert, ABCItem,
    DashboardMetrics, AppSettings, ProductForecast,
    ForecastDataPoint, FeatureImportance,
)

# ──────────────────────────────────────────────
# Initial Application Settings
# ──────────────────────────────────────────────

initial_settings = AppSettings(
    storeName="Nexus Global Retail & Warehouse",
    currency="USD",
    currencySymbol="$",
    timezone="America/New_York (EST)",
    defaultSafetyStockDays=7,
    lowStockThresholdPercent=20,
    forecastingModel="XGBoost Regressor",
    defaultForecastHorizon=30,
    autoReorderEnabled=False,
    emailAlertsEnabled=True,
    alertEmail="inventory.ops@nexusretail.com",
    useMockData=True,
    apiBaseUrl="http://localhost:8000/api/v1",
)


# ──────────────────────────────────────────────
# Products Seed Data (12 SKUs across 6 categories)
# ──────────────────────────────────────────────

seed_products: list[Product] = [
    Product(
        id="prod-001", sku="TECH-LOG-01", name="Pro Wireless Mechanical Keyboard",
        category="Electronics", currentStock=14, minStockLevel=25, reorderPoint=35,
        safetyStock=15, costPrice=65.0, sellingPrice=129.99, leadTimeDays=5,
        dailyDemandAverage=5.2, status="low_stock",
        supplier="KeyTech Logistics Ltd.", lastRestocked="2026-09-12",
    ),
    Product(
        id="prod-002", sku="TECH-AUD-02", name="Noise-Cancelling Over-Ear Headphones",
        category="Electronics", currentStock=82, minStockLevel=30, reorderPoint=45,
        safetyStock=20, costPrice=110.0, sellingPrice=249.5, leadTimeDays=7,
        dailyDemandAverage=6.8, status="in_stock",
        supplier="Acoustic Labs Inc.", lastRestocked="2026-09-24",
    ),
    Product(
        id="prod-003", sku="TECH-MOU-03", name="Ergonomic Vertical Bluetooth Mouse",
        category="Electronics", currentStock=3, minStockLevel=20, reorderPoint=30,
        safetyStock=12, costPrice=22.5, sellingPrice=59.99, leadTimeDays=4,
        dailyDemandAverage=4.1, status="low_stock",
        supplier="KeyTech Logistics Ltd.", lastRestocked="2026-09-02",
    ),
    Product(
        id="prod-004", sku="OFF-CHR-04", name="Lumbar Support Executive Mesh Chair",
        category="Office Supplies", currentStock=28, minStockLevel=15, reorderPoint=22,
        safetyStock=8, costPrice=145.0, sellingPrice=320.0, leadTimeDays=10,
        dailyDemandAverage=2.1, status="in_stock",
        supplier="ErgoComfort Global", lastRestocked="2026-09-18",
    ),
    Product(
        id="prod-005", sku="HOM-KTC-05", name="Cold-Brew Precision Coffee Machine",
        category="Home & Kitchen", currentStock=46, minStockLevel=25, reorderPoint=35,
        safetyStock=14, costPrice=55.0, sellingPrice=119.0, leadTimeDays=6,
        dailyDemandAverage=3.9, status="in_stock",
        supplier="BaristaCraft Corp", lastRestocked="2026-09-20",
    ),
    Product(
        id="prod-006", sku="APP-JCK-06", name="All-Weather Waterproof Shell Jacket",
        category="Apparel", currentStock=0, minStockLevel=20, reorderPoint=30,
        safetyStock=10, costPrice=42.0, sellingPrice=95.0, leadTimeDays=8,
        dailyDemandAverage=3.5, status="out_of_stock",
        supplier="Nordic Apparel Works", lastRestocked="2026-08-28",
    ),
    Product(
        id="prod-007", sku="HLT-AIR-07", name="Smart HEPA Room Air Purifier",
        category="Health & Personal Care", currentStock=64, minStockLevel=20, reorderPoint=32,
        safetyStock=12, costPrice=78.0, sellingPrice=169.99, leadTimeDays=7,
        dailyDemandAverage=4.4, status="in_stock",
        supplier="PureAir Innovations", lastRestocked="2026-09-26",
    ),
    Product(
        id="prod-008", sku="SPT-MAT-08", name="High-Density Non-Slip Yoga Mat",
        category="Sports & Outdoors", currentStock=135, minStockLevel=30, reorderPoint=40,
        safetyStock=15, costPrice=14.0, sellingPrice=38.0, leadTimeDays=5,
        dailyDemandAverage=2.8, status="overstocked",
        supplier="FlexFit Athletics", lastRestocked="2026-09-15",
    ),
    Product(
        id="prod-009", sku="TECH-HUB-09", name="8-in-1 USB-C Thunderbolt Docking Station",
        category="Electronics", currentStock=19, minStockLevel=25, reorderPoint=35,
        safetyStock=15, costPrice=38.0, sellingPrice=84.99, leadTimeDays=6,
        dailyDemandAverage=4.8, status="low_stock",
        supplier="KeyTech Logistics Ltd.", lastRestocked="2026-09-10",
    ),
    Product(
        id="prod-010", sku="HOM-ROB-10", name="Laser-Navigated Robotic Vacuum Cleaner",
        category="Home & Kitchen", currentStock=34, minStockLevel=15, reorderPoint=25,
        safetyStock=10, costPrice=180.0, sellingPrice=389.0, leadTimeDays=9,
        dailyDemandAverage=2.6, status="in_stock",
        supplier="RoboClean Tech", lastRestocked="2026-09-21",
    ),
    Product(
        id="prod-011", sku="OFF-DSK-11", name="Dual-Motor Electric Standing Desk Frame",
        category="Office Supplies", currentStock=12, minStockLevel=10, reorderPoint=18,
        safetyStock=6, costPrice=210.0, sellingPrice=449.0, leadTimeDays=12,
        dailyDemandAverage=1.4, status="in_stock",
        supplier="ErgoComfort Global", lastRestocked="2026-09-08",
    ),
    Product(
        id="prod-012", sku="SPT-BTL-12", name="Vacuum-Insulated 32oz Water Bottle",
        category="Sports & Outdoors", currentStock=92, minStockLevel=35, reorderPoint=50,
        safetyStock=20, costPrice=9.5, sellingPrice=27.99, leadTimeDays=4,
        dailyDemandAverage=5.9, status="in_stock",
        supplier="FlexFit Athletics", lastRestocked="2026-09-27",
    ),
]


# ──────────────────────────────────────────────
# Sales Transactions Seed Data (12 recent transactions)
# ──────────────────────────────────────────────

seed_sales: list[SaleTransaction] = [
    SaleTransaction(
        id="TXN-9021", date="2026-10-01 16:42", productId="prod-002",
        productName="Noise-Cancelling Over-Ear Headphones", sku="TECH-AUD-02",
        category="Electronics", quantity=2, unitPrice=249.5, totalRevenue=499.0,
        channel="Online Store", status="Completed",
    ),
    SaleTransaction(
        id="TXN-9020", date="2026-10-01 15:18", productId="prod-001",
        productName="Pro Wireless Mechanical Keyboard", sku="TECH-LOG-01",
        category="Electronics", quantity=1, unitPrice=129.99, totalRevenue=129.99,
        channel="Marketplace", status="Completed",
    ),
    SaleTransaction(
        id="TXN-9019", date="2026-10-01 14:05", productId="prod-005",
        productName="Cold-Brew Precision Coffee Machine", sku="HOM-KTC-05",
        category="Home & Kitchen", quantity=1, unitPrice=119.0, totalRevenue=119.0,
        channel="Retail POS", status="Completed",
    ),
    SaleTransaction(
        id="TXN-9018", date="2026-10-01 12:30", productId="prod-004",
        productName="Lumbar Support Executive Mesh Chair", sku="OFF-CHR-04",
        category="Office Supplies", quantity=4, unitPrice=320.0, totalRevenue=1280.0,
        channel="Wholesale", status="Completed",
    ),
    SaleTransaction(
        id="TXN-9017", date="2026-10-01 11:15", productId="prod-003",
        productName="Ergonomic Vertical Bluetooth Mouse", sku="TECH-MOU-03",
        category="Electronics", quantity=3, unitPrice=59.99, totalRevenue=179.97,
        channel="Online Store", status="Completed",
    ),
    SaleTransaction(
        id="TXN-9016", date="2026-09-30 18:50", productId="prod-007",
        productName="Smart HEPA Room Air Purifier", sku="HLT-AIR-07",
        category="Health & Personal Care", quantity=2, unitPrice=169.99, totalRevenue=339.98,
        channel="Online Store", status="Completed",
    ),
    SaleTransaction(
        id="TXN-9015", date="2026-09-30 17:22", productId="prod-010",
        productName="Laser-Navigated Robotic Vacuum Cleaner", sku="HOM-ROB-10",
        category="Home & Kitchen", quantity=1, unitPrice=389.0, totalRevenue=389.0,
        channel="Marketplace", status="Completed",
    ),
    SaleTransaction(
        id="TXN-9014", date="2026-09-30 14:10", productId="prod-012",
        productName="Vacuum-Insulated 32oz Water Bottle", sku="SPT-BTL-12",
        category="Sports & Outdoors", quantity=6, unitPrice=27.99, totalRevenue=167.94,
        channel="Retail POS", status="Completed",
    ),
    SaleTransaction(
        id="TXN-9013", date="2026-09-30 11:40", productId="prod-009",
        productName="8-in-1 USB-C Thunderbolt Docking Station", sku="TECH-HUB-09",
        category="Electronics", quantity=2, unitPrice=84.99, totalRevenue=169.98,
        channel="Online Store", status="Completed",
    ),
    SaleTransaction(
        id="TXN-9012", date="2026-09-29 16:05", productId="prod-008",
        productName="High-Density Non-Slip Yoga Mat", sku="SPT-MAT-08",
        category="Sports & Outdoors", quantity=5, unitPrice=38.0, totalRevenue=190.0,
        channel="Online Store", status="Completed",
    ),
    SaleTransaction(
        id="TXN-9011", date="2026-09-29 13:20", productId="prod-011",
        productName="Dual-Motor Electric Standing Desk Frame", sku="OFF-DSK-11",
        category="Office Supplies", quantity=1, unitPrice=449.0, totalRevenue=449.0,
        channel="Wholesale", status="Pending",
    ),
    SaleTransaction(
        id="TXN-9010", date="2026-09-29 09:45", productId="prod-002",
        productName="Noise-Cancelling Over-Ear Headphones", sku="TECH-AUD-02",
        category="Electronics", quantity=3, unitPrice=249.5, totalRevenue=748.5,
        channel="Marketplace", status="Completed",
    ),
]


# ──────────────────────────────────────────────
# Stock Alerts Seed Data (5 active alerts)
# ──────────────────────────────────────────────

seed_alerts: list[StockAlert] = [
    StockAlert(
        id="alt-001", productId="prod-003", productName="Ergonomic Vertical Bluetooth Mouse",
        sku="TECH-MOU-03", severity="critical", type="stockout_imminent",
        message="Current stock (3 units) is critically below safety margin. Predicted stockout in 18 hours at average daily burn rate of 4.1 units.",
        daysRemaining=1, currentStock=3, recommendedOrder=45,
        timestamp="2026-10-01 10:15", resolved=False,
    ),
    StockAlert(
        id="alt-002", productId="prod-006", productName="All-Weather Waterproof Shell Jacket",
        sku="APP-JCK-06", severity="critical", type="stockout_imminent",
        message="Stock level reached 0 units. 14 customer backorders recorded in the last 48 hours.",
        daysRemaining=0, currentStock=0, recommendedOrder=60,
        timestamp="2026-09-30 08:30", resolved=False,
    ),
    StockAlert(
        id="alt-003", productId="prod-001", productName="Pro Wireless Mechanical Keyboard",
        sku="TECH-LOG-01", severity="warning", type="reorder_point_reached",
        message="Stock level (14 units) has breached reorder threshold (35 units). Lead time is 5 days from supplier.",
        daysRemaining=3, currentStock=14, recommendedOrder=85,
        timestamp="2026-10-01 07:00", resolved=False,
    ),
    StockAlert(
        id="alt-004", productId="prod-009", productName="8-in-1 USB-C Thunderbolt Docking Station",
        sku="TECH-HUB-09", severity="warning", type="reorder_point_reached",
        message="Inventory down to 19 units. Approaching minimum safety threshold before weekend sales peak.",
        daysRemaining=4, currentStock=19, recommendedOrder=50,
        timestamp="2026-09-30 14:20", resolved=False,
    ),
    StockAlert(
        id="alt-005", productId="prod-008", productName="High-Density Non-Slip Yoga Mat",
        sku="SPT-MAT-08", severity="info", type="overstocked",
        message="Current inventory (135 units) exceeds optimal 45-day sales demand by 140%. Holding cost penalty accumulating.",
        daysRemaining=48, currentStock=135, recommendedOrder=0,
        timestamp="2026-09-28 11:00", resolved=False,
    ),
]


# ──────────────────────────────────────────────
# ABC Analysis Seed Data (Pareto Classification)
# ──────────────────────────────────────────────

seed_abc_items: list[ABCItem] = [
    ABCItem(
        id="prod-002", sku="TECH-AUD-02", name="Noise-Cancelling Over-Ear Headphones",
        classification="A", annualRevenue=512000, revenueSharePercent=32.4,
        cumulativeRevenueSharePercent=32.4, turnoverRatio=8.4, daysSalesInventory=43,
        recommendation="Priority Item: Maintain high service level (98%), daily automated inventory audits, negotiate volume tier with supplier.",
    ),
    ABCItem(
        id="prod-004", sku="OFF-CHR-04", name="Lumbar Support Executive Mesh Chair",
        classification="A", annualRevenue=348000, revenueSharePercent=22.0,
        cumulativeRevenueSharePercent=54.4, turnoverRatio=6.2, daysSalesInventory=58,
        recommendation="Priority Item: High capital lock-in. Implement just-in-time order batching with supplier ErgoComfort.",
    ),
    ABCItem(
        id="prod-010", sku="HOM-ROB-10", name="Laser-Navigated Robotic Vacuum Cleaner",
        classification="A", annualRevenue=284000, revenueSharePercent=18.0,
        cumulativeRevenueSharePercent=72.4, turnoverRatio=7.1, daysSalesInventory=51,
        recommendation="Priority Item: Ensure buffer stock remains above 10 units to capitalize on high margin ($209/unit).",
    ),
    ABCItem(
        id="prod-001", sku="TECH-LOG-01", name="Pro Wireless Mechanical Keyboard",
        classification="B", annualRevenue=182000, revenueSharePercent=11.5,
        cumulativeRevenueSharePercent=83.9, turnoverRatio=9.8, daysSalesInventory=37,
        recommendation="Moderate Control: Standard bi-weekly reordering cycle. High turnover rate compensates for lower unit price.",
    ),
    ABCItem(
        id="prod-007", sku="HLT-AIR-07", name="Smart HEPA Room Air Purifier",
        classification="B", annualRevenue=126000, revenueSharePercent=8.0,
        cumulativeRevenueSharePercent=91.9, turnoverRatio=5.5, daysSalesInventory=66,
        recommendation="Moderate Control: Winter seasonal ramp expected. Monitor seasonal lead times.",
    ),
    ABCItem(
        id="prod-005", sku="HOM-KTC-05", name="Cold-Brew Precision Coffee Machine",
        classification="C", annualRevenue=52000, revenueSharePercent=3.3,
        cumulativeRevenueSharePercent=95.2, turnoverRatio=4.1, daysSalesInventory=89,
        recommendation="Low Attention: Periodic monthly replenishment. Automate purchase order generation.",
    ),
    ABCItem(
        id="prod-012", sku="SPT-BTL-12", name="Vacuum-Insulated 32oz Water Bottle",
        classification="C", annualRevenue=44000, revenueSharePercent=2.8,
        cumulativeRevenueSharePercent=98.0, turnoverRatio=3.8, daysSalesInventory=96,
        recommendation="Low Attention: High margin low revenue. Keep minimal safety stock.",
    ),
    ABCItem(
        id="prod-008", sku="SPT-MAT-08", name="High-Density Non-Slip Yoga Mat",
        classification="C", annualRevenue=31000, revenueSharePercent=2.0,
        cumulativeRevenueSharePercent=100.0, turnoverRatio=2.2, daysSalesInventory=165,
        recommendation="Excess Stock Warning: Low turnover velocity. Consider bundling or promotional flash sales.",
    ),
]


# ──────────────────────────────────────────────
# Dashboard KPI Metrics Seed
# ──────────────────────────────────────────────

seed_dashboard_metrics = DashboardMetrics(
    totalInventoryValue=148920.50,
    inventoryValueChangePercent=8.4,
    totalActiveSkus=142,
    activeSkusChange=4,
    criticalAlertsCount=3,
    totalMonthlyRevenue=84310.0,
    monthlyRevenueChangePercent=14.2,
    forecastModelAccuracy=94.6,
    stockoutPreventionRate=98.2,
)


# ──────────────────────────────────────────────
# Demand Forecast Seed Data (2 products pre-computed)
# ──────────────────────────────────────────────

seed_forecast_data: dict[str, ProductForecast] = {
    "prod-001": ProductForecast(
        productId="prod-001",
        productName="Pro Wireless Mechanical Keyboard",
        sku="TECH-LOG-01",
        model="XGBoost Regressor",
        accuracyR2=0.946,
        mae=0.82,
        rmse=1.14,
        horizonDays=30,
        predictedSurgeDate="2026-10-18",
        recommendedReorderQty=85,
        confidenceScore=95.2,
        featureImportance=[
            FeatureImportance(feature="Historical 7-Day Rolling Avg", weight=0.38),
            FeatureImportance(feature="Day of Week Seasonality", weight=0.24),
            FeatureImportance(feature="Price Elasticity & Promotions", weight=0.18),
            FeatureImportance(feature="Category Trend Vector", weight=0.12),
            FeatureImportance(feature="Supply Lead Time Variance", weight=0.08),
        ],
        forecastPoints=[
            ForecastDataPoint(date="Sep 24", actualDemand=5, predictedDemand=5.1, upperConfidence=6.2, lowerConfidence=4.1, reorderThreshold=35),
            ForecastDataPoint(date="Sep 25", actualDemand=6, predictedDemand=5.8, upperConfidence=7.0, lowerConfidence=4.5, reorderThreshold=35),
            ForecastDataPoint(date="Sep 26", actualDemand=4, predictedDemand=4.9, upperConfidence=6.0, lowerConfidence=3.8, reorderThreshold=35),
            ForecastDataPoint(date="Sep 27", actualDemand=7, predictedDemand=6.7, upperConfidence=8.0, lowerConfidence=5.2, reorderThreshold=35),
            ForecastDataPoint(date="Sep 28", actualDemand=6, predictedDemand=6.2, upperConfidence=7.4, lowerConfidence=4.9, reorderThreshold=35),
            ForecastDataPoint(date="Sep 29", actualDemand=5, predictedDemand=5.4, upperConfidence=6.6, lowerConfidence=4.2, reorderThreshold=35),
            ForecastDataPoint(date="Sep 30", actualDemand=8, predictedDemand=7.5, upperConfidence=8.8, lowerConfidence=6.1, reorderThreshold=35),
            ForecastDataPoint(date="Oct 01", actualDemand=7, predictedDemand=7.1, upperConfidence=8.4, lowerConfidence=5.8, reorderThreshold=35),
            ForecastDataPoint(date="Oct 02", predictedDemand=7.4, upperConfidence=8.9, lowerConfidence=5.9, reorderThreshold=35),
            ForecastDataPoint(date="Oct 03", predictedDemand=8.1, upperConfidence=9.8, lowerConfidence=6.4, reorderThreshold=35),
            ForecastDataPoint(date="Oct 04", predictedDemand=9.0, upperConfidence=10.9, lowerConfidence=7.1, reorderThreshold=35),
            ForecastDataPoint(date="Oct 05", predictedDemand=8.6, upperConfidence=10.4, lowerConfidence=6.8, reorderThreshold=35),
            ForecastDataPoint(date="Oct 06", predictedDemand=7.8, upperConfidence=9.5, lowerConfidence=6.1, reorderThreshold=35),
            ForecastDataPoint(date="Oct 07", predictedDemand=8.2, upperConfidence=10.0, lowerConfidence=6.5, reorderThreshold=35),
            ForecastDataPoint(date="Oct 08", predictedDemand=9.5, upperConfidence=11.6, lowerConfidence=7.5, reorderThreshold=35),
            ForecastDataPoint(date="Oct 09", predictedDemand=10.2, upperConfidence=12.5, lowerConfidence=8.0, reorderThreshold=35),
            ForecastDataPoint(date="Oct 10", predictedDemand=11.0, upperConfidence=13.5, lowerConfidence=8.6, reorderThreshold=35),
        ],
    ),
    "prod-002": ProductForecast(
        productId="prod-002",
        productName="Noise-Cancelling Over-Ear Headphones",
        sku="TECH-AUD-02",
        model="XGBoost Regressor",
        accuracyR2=0.938,
        mae=1.05,
        rmse=1.42,
        horizonDays=30,
        predictedSurgeDate="2026-10-25",
        recommendedReorderQty=60,
        confidenceScore=94.1,
        featureImportance=[
            FeatureImportance(feature="Historical 7-Day Rolling Avg", weight=0.42),
            FeatureImportance(feature="Day of Week Seasonality", weight=0.21),
            FeatureImportance(feature="Competitor Price Index", weight=0.16),
            FeatureImportance(feature="Website Traffic Velocity", weight=0.14),
            FeatureImportance(feature="Holiday Distance Metric", weight=0.07),
        ],
        forecastPoints=[
            ForecastDataPoint(date="Sep 24", actualDemand=7, predictedDemand=6.8, upperConfidence=8.2, lowerConfidence=5.4, reorderThreshold=45),
            ForecastDataPoint(date="Sep 25", actualDemand=8, predictedDemand=7.6, upperConfidence=9.1, lowerConfidence=6.1, reorderThreshold=45),
            ForecastDataPoint(date="Sep 26", actualDemand=6, predictedDemand=6.4, upperConfidence=7.8, lowerConfidence=5.0, reorderThreshold=45),
            ForecastDataPoint(date="Sep 27", actualDemand=9, predictedDemand=8.7, upperConfidence=10.4, lowerConfidence=7.0, reorderThreshold=45),
            ForecastDataPoint(date="Sep 28", actualDemand=8, predictedDemand=8.1, upperConfidence=9.8, lowerConfidence=6.4, reorderThreshold=45),
            ForecastDataPoint(date="Sep 29", actualDemand=7, predictedDemand=7.2, upperConfidence=8.6, lowerConfidence=5.8, reorderThreshold=45),
            ForecastDataPoint(date="Sep 30", actualDemand=9, predictedDemand=8.9, upperConfidence=10.6, lowerConfidence=7.2, reorderThreshold=45),
            ForecastDataPoint(date="Oct 01", actualDemand=10, predictedDemand=9.4, upperConfidence=11.2, lowerConfidence=7.6, reorderThreshold=45),
            ForecastDataPoint(date="Oct 02", predictedDemand=9.8, upperConfidence=11.7, lowerConfidence=7.9, reorderThreshold=45),
            ForecastDataPoint(date="Oct 03", predictedDemand=10.4, upperConfidence=12.5, lowerConfidence=8.3, reorderThreshold=45),
            ForecastDataPoint(date="Oct 04", predictedDemand=11.2, upperConfidence=13.4, lowerConfidence=9.0, reorderThreshold=45),
            ForecastDataPoint(date="Oct 05", predictedDemand=10.7, upperConfidence=12.9, lowerConfidence=8.5, reorderThreshold=45),
            ForecastDataPoint(date="Oct 06", predictedDemand=9.9, upperConfidence=12.0, lowerConfidence=7.8, reorderThreshold=45),
            ForecastDataPoint(date="Oct 07", predictedDemand=10.5, upperConfidence=12.7, lowerConfidence=8.3, reorderThreshold=45),
            ForecastDataPoint(date="Oct 08", predictedDemand=11.8, upperConfidence=14.2, lowerConfidence=9.4, reorderThreshold=45),
            ForecastDataPoint(date="Oct 09", predictedDemand=12.4, upperConfidence=14.9, lowerConfidence=9.9, reorderThreshold=45),
            ForecastDataPoint(date="Oct 10", predictedDemand=13.1, upperConfidence=15.8, lowerConfidence=10.4, reorderThreshold=45),
        ],
    ),
}
