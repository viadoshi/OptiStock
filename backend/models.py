# ============================================================
# models.py — Pydantic Data Models for AI Inventory System
# Mirrors the TypeScript interfaces defined in frontend/src/types/index.ts
# ============================================================

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal, Dict, Any
from datetime import datetime


# ──────────────────────────────────────────────
# Enums / Literal Types (matching TypeScript unions)
# ──────────────────────────────────────────────

StockStatus = Literal["in_stock", "low_stock", "out_of_stock", "overstocked"]

InventoryStatus = Literal["critical", "reorder_now", "healthy", "overstock"]

DemandSource = Literal[
    "organic_sales",
    "ml_forecast",
    "catalog_velocity",
    "synthetic_benchmark",
]

ProductCategory = Literal[
    "Electronics",
    "Apparel",
    "Home & Kitchen",
    "Health & Personal Care",
    "Office Supplies",
    "Sports & Outdoors",
]

ForecastingModel = Literal[
    "Auto",
    "Auto (Best Model via Validation)",
    "Linear Regression",
    "Random Forest",
    "Gradient Boosting",
    "XGBoost Regressor",
    "Prophet",
]

SaleChannel = Literal["Online Store", "Retail POS", "Wholesale", "Marketplace"]

SaleStatus = Literal["Completed", "Pending", "Refunded"]

AlertSeverity = Literal["critical", "warning", "info"]

AlertType = Literal[
    "stockout_imminent",
    "reorder_point_reached",
    "overstocked",
    "delayed_lead_time",
]

ABCClassification = Literal["A", "B", "C"]


# ──────────────────────────────────────────────
# Product Models
# ──────────────────────────────────────────────

class ProductBase(BaseModel):
    """Fields required to create a new product."""
    sku: str = Field(..., description="Unique Stock Keeping Unit code")
    name: str = Field(..., description="Human-readable product name")
    category: ProductCategory
    currentStock: int = Field(..., ge=0, description="Current quantity in warehouse")
    incomingStock: int = Field(0, ge=0, description="Confirmed incoming stock on purchase order")
    minStockLevel: int = Field(..., ge=0, description="Minimum stock before low-stock alert")
    reorderPoint: int = Field(..., ge=0, description="Stock level that triggers reorder")
    safetyStock: int = Field(..., ge=0, description="Buffer stock to absorb demand variance")
    costPrice: float = Field(..., gt=0, description="Unit cost from supplier (USD)")
    sellingPrice: float = Field(..., gt=0, description="Unit retail selling price (USD)")
    leadTimeDays: int = Field(..., ge=1, description="Days for supplier to deliver stock")
    dailyDemandAverage: float = Field(..., gt=0, description="Average units sold per day")
    status: StockStatus
    supplier: str = Field(..., description="Supplier company name")
    imageUrl: Optional[str] = None


class Product(ProductBase):
    """Full product including server-generated fields."""
    id: str
    lastRestocked: str  # ISO date string e.g. "2026-09-12"

    model_config = ConfigDict(from_attributes=True)


class ProductCreate(ProductBase):
    """Request body when adding a new product."""
    pass


class ProductUpdate(BaseModel):
    """Partial update body — all fields optional (PATCH semantics)."""
    currentStock: Optional[int] = None
    incomingStock: Optional[int] = None
    minStockLevel: Optional[int] = None
    reorderPoint: Optional[int] = None
    safetyStock: Optional[int] = None
    costPrice: Optional[float] = None
    sellingPrice: Optional[float] = None
    status: Optional[StockStatus] = None
    supplier: Optional[str] = None
    leadTimeDays: Optional[int] = None
    dailyDemandAverage: Optional[float] = None
    lastRestocked: Optional[str] = None


# ──────────────────────────────────────────────
# Sales Transaction Models
# ──────────────────────────────────────────────

class SaleTransaction(BaseModel):
    """A single completed / pending sales order record."""
    id: str
    date: str                  # e.g. "2026-10-01 16:42"
    productId: str
    productName: str
    sku: str
    category: ProductCategory
    quantity: int = Field(..., ge=1)
    unitPrice: float = Field(..., gt=0)
    totalRevenue: float = Field(..., gt=0)
    channel: SaleChannel
    status: SaleStatus


class SaleTransactionCreate(BaseModel):
    """Request body for recording a new sale."""
    productId: str
    quantity: int = Field(..., ge=1)
    channel: SaleChannel


# ──────────────────────────────────────────────
# Forecasting Models
# ──────────────────────────────────────────────

class ForecastDataPoint(BaseModel):
    """A single day in the forecast timeline."""
    date: str
    actualDemand: Optional[float] = None    # None for future dates
    predictedDemand: float
    upperConfidence: float
    lowerConfidence: float
    reorderThreshold: int


class FeatureImportance(BaseModel):
    feature: str
    weight: float


class ModelComparisonMetric(BaseModel):
    modelName: str
    valMae: Optional[float] = None
    valWape: Optional[float] = None
    mae: float
    rmse: float
    wape: float
    r2: float
    isChampion: bool = False


class DataSummaryInfo(BaseModel):
    totalSamples: int
    trainSamples: int
    valSamples: int
    testSamples: int
    splitMethod: str
    datasetType: str
    realTransactionsCount: int
    hasInsufficientHistory: bool = True
    selectionCriterion: str = "Lowest Validation MAE"
    selectedModelReason: str
    uncertaintyMethod: str = "Empirical residual standard deviation scaled with horizon"
    limitationsNote: str


class ProductForecast(BaseModel):
    """Full ML forecast result for one product."""
    productId: str
    productName: str
    sku: str
    model: str
    accuracyR2: float
    mae: float
    rmse: float
    wape: Optional[float] = None
    baselineMae: Optional[float] = None
    baselineRmse: Optional[float] = None
    baselineWape: Optional[float] = None
    horizonDays: int
    predictedSurgeDate: Optional[str] = None
    recommendedReorderQty: int
    confidenceScore: float
    forecastPoints: List[ForecastDataPoint]
    featureImportance: List[FeatureImportance]
    modelComparisons: Optional[List[ModelComparisonMetric]] = None
    dataSummary: Optional[DataSummaryInfo] = None
    selectedModelReason: Optional[str] = None
    hasInsufficientHistory: bool = True
    reliabilityWarning: Optional[str] = None


class ForecastRequest(BaseModel):
    """Request to run a fresh model inference."""
    productId: str
    modelName: ForecastingModel = "XGBoost Regressor"
    horizonDays: int = Field(30, ge=7, le=90)


# ──────────────────────────────────────────────
# Stock Alert Models
# ──────────────────────────────────────────────

class StockAlert(BaseModel):
    """A triggered inventory alert event."""
    id: str
    productId: str
    productName: str
    sku: str
    severity: AlertSeverity
    type: AlertType
    message: str
    daysRemaining: int
    currentStock: int
    recommendedOrder: int
    timestamp: str
    resolved: bool = False


class AlertResolveRequest(BaseModel):
    """Request body to mark an alert as resolved."""
    resolved: bool = True


# ──────────────────────────────────────────────
# ABC Analysis / Product Intelligence Models
# ──────────────────────────────────────────────

class ABCItem(BaseModel):
    """Pareto ABC classification record for one SKU."""
    id: str
    sku: str
    name: str
    classification: ABCClassification
    annualRevenue: float
    revenueSharePercent: float
    cumulativeRevenueSharePercent: float
    turnoverRatio: float
    daysSalesInventory: int
    recommendation: str


# ──────────────────────────────────────────────
# Dashboard Metrics Model
# ──────────────────────────────────────────────

class DashboardMetrics(BaseModel):
    """Aggregated KPI snapshot for the dashboard."""
    totalInventoryValue: float
    inventoryValueChangePercent: float
    totalActiveSkus: int
    activeSkusChange: int
    criticalAlertsCount: int
    totalMonthlyRevenue: float
    monthlyRevenueChangePercent: float
    forecastModelAccuracy: float
    stockoutPreventionRate: float


# ──────────────────────────────────────────────
# Settings Model
# ──────────────────────────────────────────────

class AppSettings(BaseModel):
    """System-wide configuration settings."""
    storeName: str
    currency: str
    currencySymbol: str
    timezone: str
    defaultSafetyStockDays: int = Field(..., ge=1, le=60)
    lowStockThresholdPercent: int = Field(..., ge=5, le=50)
    forecastingModel: ForecastingModel
    defaultForecastHorizon: int = Field(..., ge=7, le=90)
    autoReorderEnabled: bool
    emailAlertsEnabled: bool
    alertEmail: str
    useMockData: bool
    apiBaseUrl: str


class AppSettingsUpdate(BaseModel):
    """Partial settings update (PATCH)."""
    storeName: Optional[str] = None
    defaultSafetyStockDays: Optional[int] = None
    lowStockThresholdPercent: Optional[int] = None
    forecastingModel: Optional[ForecastingModel] = None
    defaultForecastHorizon: Optional[int] = None
    autoReorderEnabled: Optional[bool] = None
    emailAlertsEnabled: Optional[bool] = None
    alertEmail: Optional[str] = None
    useMockData: Optional[bool] = None
    apiBaseUrl: Optional[str] = None


# ──────────────────────────────────────────────
# Generic API Response Wrappers
# ──────────────────────────────────────────────

class MessageResponse(BaseModel):
    """Generic success message response."""
    message: str
    status: str = "success"


# ──────────────────────────────────────────────
# Smart Inventory Recommendations Models
# ──────────────────────────────────────────────

class CalculationDetails(BaseModel):
    """Detailed explainable inputs and math formulas for inventory sizing."""
    expectedLeadTimeDemandFormula: str = "dailyDemand × leadTimeDays"
    safetyStockFormula: str = "Z × σ_d × √L (or dailyDemand × fallbackSafetyDays)"
    reorderPointFormula: str = "expectedLeadTimeDemand + safetyStock"
    daysOfStockRemainingFormula: str = "currentStock ÷ dailyDemand"
    targetStockLevelFormula: str = "reorderPoint + (dailyDemand × targetCoverageDays)"
    suggestedReplenishmentFormula: str = "max(0, ceil(targetStockLevel - (currentStock + incomingStock)))"

    dailyDemand: float
    supplierLeadTimeDays: int
    isLeadTimeFallback: bool = False
    safetyStock: int
    isSafetyStockEstimated: bool = False
    safetyStockMethod: str
    expectedLeadTimeDemand: float
    reorderPoint: int
    currentStock: int
    incomingStock: int = 0
    netStock: int
    targetCoverageDays: int
    targetStockLevel: int
    overstockThreshold: float
    serviceLevelZ: float = 1.645
    serviceLevelType: str = "One-sided Cycle Service Level (CSL) non-stockout probability"
    zScoreExplanation: str = (
        "Z = 1.645 represents the one-sided standard normal quantile for 95% non-stockout probability "
        "during lead time (P(D <= ROP) = 0.95), strictly distinguished from two-sided ±1.96 prediction intervals."
    )


class InventoryRecommendation(BaseModel):
    """Explainable smart replenishment recommendation for a single product."""
    productId: str
    productName: str
    sku: str
    category: ProductCategory
    currentStock: int
    incomingStock: int = 0
    netStock: int
    dailyDemand: float
    demandSource: DemandSource
    demandSourceLabel: str
    supplierLeadTimeDays: int
    isLeadTimeFallback: bool = False
    expectedLeadTimeDemand: float
    safetyStock: int
    isSafetyStockEstimated: bool = False
    reorderPoint: int
    suggestedReplenishmentQty: int
    daysOfStockRemaining: Optional[float] = None
    status: InventoryStatus
    statusLabel: str
    statusExplanation: str
    warnings: List[str] = Field(default_factory=list)
    calculationDetails: CalculationDetails
    costPrice: Optional[float] = None
    estimatedReplenishmentCost: Optional[float] = None
    isCostMissing: bool = False
    supplier: str


class RecommendationSummary(BaseModel):
    """Aggregated portfolio metrics across all inventory recommendations."""
    totalProducts: int
    criticalCount: int
    reorderNowCount: int
    healthyCount: int
    overstockedCount: int
    totalSuggestedOrderUnits: int
    totalEstimatedReplenishmentCost: float
    hasMissingCosts: bool = False


class RecommendationParameters(BaseModel):
    """Configurable threshold parameters applied to recommendation calculations."""
    targetCoverageDays: int = 14
    defaultLeadTimeDays: int = 7
    defaultSafetyStockDays: int = 7
    overstockDaysThreshold: float = 45.0
    serviceLevelZ: float = 1.645
    useMlForecast: bool = False


class InventoryRecommendationsResponse(BaseModel):
    """Full API response for portfolio inventory recommendations."""
    summary: RecommendationSummary
    parameters: RecommendationParameters
    recommendations: List[InventoryRecommendation]


# ──────────────────────────────────────────────
# Product Intelligence / Enhanced ABC Analysis Models
# ──────────────────────────────────────────────

class ABCItemDetail(BaseModel):
    """Detailed ABC Pareto item record."""
    id: str
    sku: str
    name: str
    category: str
    classification: ABCClassification  # "A" | "B" | "C"
    annualQuantity: float
    unitCostPrice: Optional[float] = None
    unitSellingPrice: float
    unitMeasureRate: float  # Rate used (cost or selling price)
    contributionValue: float  # Quantity * Unit Rate
    valueSharePercent: float  # (contribution / total) * 100
    cumulativeValueSharePercent: float
    rank: int
    turnoverRatio: float
    daysSalesInventory: int
    currentStock: int
    reason: str  # Human-readable explanation of why in class A/B/C
    isCostMissing: bool = False


class ABCAnalysisSummary(BaseModel):
    """Summary of ABC portfolio distribution."""
    totalItems: int
    totalContributionValue: float
    measure: str  # "consumption_value" | "revenue"
    measureLabel: str
    thresholdA: float  # e.g. 80.0
    thresholdB: float  # e.g. 95.0
    classACount: int
    classBCount: int
    classCCount: int
    classAValue: float
    classBValue: float
    classCValue: float
    classAValueSharePercent: float
    classBValueSharePercent: float
    classCValueSharePercent: float
    classAItemSharePercent: float
    classBItemSharePercent: float
    classCItemSharePercent: float
    dataProvenance: str
    warnings: List[str] = Field(default_factory=list)


class ABCAnalysisResponse(BaseModel):
    """Full ABC Pareto analysis response."""
    summary: ABCAnalysisSummary
    items: List[ABCItemDetail]


# ──────────────────────────────────────────────
# Product Segmentation (K-Means) Models
# ──────────────────────────────────────────────

class SegmentedProduct(BaseModel):
    """Product assigned to a K-Means cluster."""
    id: str
    sku: str
    name: str
    category: str
    clusterId: int  # 0, 1, 2...
    clusterLabel: str  # "Cluster 1", "Cluster 2"...
    dailyDemand: float
    demandVariabilityCv: float
    currentStock: int
    daysOfStockRemaining: float
    stockoutRiskRatio: float
    costPrice: Optional[float] = None
    sellingPrice: float


class ClusterProfile(BaseModel):
    """Centroid and profile metrics for one cluster."""
    clusterId: int
    clusterLabel: str
    size: int
    itemSharePercent: float
    avgDailyDemand: float
    avgDemandVariabilityCv: float
    avgCurrentStock: float
    avgDaysOfStockRemaining: float
    avgStockoutRiskRatio: float
    avgCostPrice: Optional[float] = None
    avgSellingPrice: float
    description: str  # Data-grounded description


class SegmentationResponse(BaseModel):
    """Full K-Means product segmentation response."""
    nClusters: int
    silhouetteScore: Optional[float] = None
    silhouetteEvaluation: str
    featuresUsed: List[str]
    clusterProfiles: List[ClusterProfile]
    products: List[SegmentedProduct]
    dataProvenance: str
    isSyntheticDevelopment: bool
    warnings: List[str] = Field(default_factory=list)
    modelSavedPath: Optional[str] = None


class SegmentationRetrainRequest(BaseModel):
    """Payload to trigger retrain of K-Means clustering."""
    nClusters: int = 3
    useBenchmark: bool = True


# ──────────────────────────────────────────────
# Inventory Anomaly Detection (Isolation Forest) Models
# ──────────────────────────────────────────────

class AnomalyObservation(BaseModel):
    """One observed sales/inventory record with anomaly score."""
    observationId: str
    productId: str
    sku: str
    productName: str
    category: str
    date: str
    dailyQuantity: float
    baselineDailyDemand: float
    demandDeviation: float
    relativeDemandRatio: float
    stockLevel: int
    daysRemaining: float
    anomalyScore: float  # Normalized severity (0.0 = normal, 1.0 = extreme anomaly)
    rawDecisionScore: float
    isAnomaly: bool  # True if flagged as outlier by Isolation Forest
    explanation: str  # Human-readable explanation of unusual observation
    recommendedInvestigation: str


class AnomalyDetectionResponse(BaseModel):
    """Full Isolation Forest anomaly detection response."""
    status: str  # "success" | "insufficient_organic_data"
    totalObservations: int
    anomalyCount: int
    normalCount: int
    anomalyRatePercent: float
    contamination: float
    contaminationExplanation: str
    featuresUsed: List[str]
    anomalies: List[AnomalyObservation]
    recentObservations: List[AnomalyObservation] = Field(default_factory=list)
    dataProvenance: str
    isSyntheticDevelopment: bool
    warnings: List[str] = Field(default_factory=list)


class AnomalyDetectRequest(BaseModel):
    """Payload to configure anomaly detection."""
    contamination: float = 0.05
    useBenchmark: bool = True


# ──────────────────────────────────────────────
# ML Model Laboratory Models
# ──────────────────────────────────────────────

class ParameterInfo(BaseModel):
    name: str
    type: str  # "float" | "int" | "str" | "bool"
    defaultValue: Any
    description: str


class AlgorithmCatalogItem(BaseModel):
    id: str
    name: str
    category: str  # "supervised" | "unsupervised"
    task: str  # "regression" | "classification" | "clustering" | "dimensionality_reduction" | "anomaly_detection"
    shortDescription: str
    whatItDoes: str
    keyParameters: List[ParameterInfo]
    advantages: List[str]
    limitations: List[str]
    interpretationGuide: str


class RegressionMetrics(BaseModel):
    mae: float
    rmse: float
    r2: float
    wape: Optional[float] = None


class ConfusionMatrix(BaseModel):
    tn: int
    fp: int
    fn: int
    tp: int
    labels: List[str] = Field(default_factory=lambda: ["Safe / Adequate Stock", "Stockout Risk"])


class ClassificationMetrics(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1Score: float
    rocAuc: Optional[float] = None
    confusionMatrix: ConfusionMatrix


class ClusteringMetrics(BaseModel):
    nClusters: int
    noisePoints: int = 0
    silhouetteScore: Optional[float] = None
    silhouetteEvaluation: str


class PCAMetrics(BaseModel):
    explainedVarianceRatio: List[float]  # [PC1, PC2]
    cumulativeExplainedVariance: float
    pc1VariancePercent: float
    pc2VariancePercent: float


class DataPoint2D(BaseModel):
    id: str
    label: str
    x: float
    y: float
    cluster: Optional[int] = None
    isAnomaly: Optional[bool] = None
    actual: Optional[float] = None
    predicted: Optional[float] = None


class ExperimentResult(BaseModel):
    experimentId: str
    algorithmId: str
    algorithmName: str
    task: str
    datasetName: str
    targetColumn: Optional[str] = None
    featuresUsed: List[str]
    trainSampleCount: int
    testSampleCount: int
    parametersApplied: Dict[str, Any]
    regressionMetrics: Optional[RegressionMetrics] = None
    classificationMetrics: Optional[ClassificationMetrics] = None
    clusteringMetrics: Optional[ClusteringMetrics] = None
    pcaMetrics: Optional[PCAMetrics] = None
    sampleVisualData: List[DataPoint2D] = Field(default_factory=list)
    plainEnglishExplanation: str
    executionTimeMs: float
    dataProvenance: str
    warnings: List[str] = Field(default_factory=list)


class ModelLeaderboardItem(BaseModel):
    algorithmId: str
    algorithmName: str
    task: str
    primaryMetricName: str
    primaryMetricValue: float
    secondaryMetricName: str
    secondaryMetricValue: float
    isChampion: bool
    summaryVerdict: str


class LeaderboardResponse(BaseModel):
    task: str  # "regression" | "classification"
    targetColumn: str
    totalModelsEvaluated: int
    championAlgorithm: str
    leaderboard: List[ModelLeaderboardItem]
    datasetName: str
    dataProvenance: str
    warnings: List[str] = Field(default_factory=list)


class TrainExperimentRequest(BaseModel):
    algorithmId: str
    task: str  # "regression" | "classification" | "unsupervised"
    dataset: str = "inventory_demand"
    target: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)



