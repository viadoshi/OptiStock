export type PageId =
  | 'dashboard'
  | 'products'
  | 'sales'
  | 'forecasting'
  | 'inventory'
  | 'recommendations'
  | 'intelligence'
  | 'laboratory'
  | 'settings';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked';

export type ProductCategory =
  | 'Electronics'
  | 'Apparel'
  | 'Home & Kitchen'
  | 'Health & Personal Care'
  | 'Office Supplies'
  | 'Sports & Outdoors';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  currentStock: number;
  incomingStock?: number;
  minStockLevel: number;
  reorderPoint: number;
  safetyStock: number;
  costPrice: number;
  sellingPrice: number;
  leadTimeDays: number;
  dailyDemandAverage: number;
  status: StockStatus;
  supplier: string;
  imageUrl?: string;
  lastRestocked: string;
}

export interface SaleTransaction {
  id: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  category: ProductCategory;
  quantity: number;
  unitPrice: number;
  totalRevenue: number;
  channel: 'Online Store' | 'Retail POS' | 'Wholesale' | 'Marketplace';
  status: 'Completed' | 'Pending' | 'Refunded';
}

export interface ForecastDataPoint {
  date: string;
  actualDemand?: number;
  predictedDemand: number;
  upperConfidence: number;
  lowerConfidence: number;
  reorderThreshold: number;
}

export interface ModelComparisonMetric {
  modelName: string;
  valMae?: number;
  valWape?: number;
  mae: number;
  rmse: number;
  wape: number;
  r2: number;
  isChampion?: boolean;
}

export interface ProductForecast {
  productId: string;
  productName: string;
  sku: string;
  model: string;
  accuracyR2: number;
  mae: number;
  rmse: number;
  wape?: number;
  baselineMae?: number;
  baselineRmse?: number;
  baselineWape?: number;
  horizonDays: number;
  predictedSurgeDate?: string;
  recommendedReorderQty: number;
  confidenceScore: number;
  forecastPoints: ForecastDataPoint[];
  featureImportance: {
    feature: string;
    weight: number;
  }[];
  modelComparisons?: ModelComparisonMetric[];
  dataSummary?: {
    totalSamples: number;
    trainSamples: number;
    valSamples: number;
    testSamples: number;
    splitMethod: string;
    datasetType: string;
    realTransactionsCount: number;
    hasInsufficientHistory?: boolean;
    selectionCriterion?: string;
    selectedModelReason?: string;
    uncertaintyMethod?: string;
    limitationsNote: string;
  };
  selectedModelReason?: string;
  hasInsufficientHistory?: boolean;
  reliabilityWarning?: string;
}

export interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'stockout_imminent' | 'reorder_point_reached' | 'overstocked' | 'delayed_lead_time';
  message: string;
  daysRemaining: number;
  currentStock: number;
  recommendedOrder: number;
  timestamp: string;
  resolved: boolean;
}

export interface ABCItem {
  id: string;
  sku: string;
  name: string;
  classification: 'A' | 'B' | 'C';
  annualRevenue: number;
  revenueSharePercent: number;
  cumulativeRevenueSharePercent: number;
  turnoverRatio: number;
  daysSalesInventory: number;
  recommendation: string;
}

export interface DashboardMetrics {
  totalInventoryValue: number;
  inventoryValueChangePercent: number;
  totalActiveSkus: number;
  activeSkusChange: number;
  criticalAlertsCount: number;
  totalMonthlyRevenue: number;
  monthlyRevenueChangePercent: number;
  forecastModelAccuracy: number;
  stockoutPreventionRate: number;
}

export interface AppSettings {
  storeName: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  defaultSafetyStockDays: number;
  lowStockThresholdPercent: number;
  forecastingModel: 'XGBoost Regressor' | 'Random Forest' | 'Prophet';
  defaultForecastHorizon: number;
  autoReorderEnabled: boolean;
  emailAlertsEnabled: boolean;
  alertEmail: string;
  useMockData: boolean;
  apiBaseUrl: string;
}

// ── Smart Inventory Recommendations ─────────────────────────

export type InventoryStatus = 'critical' | 'reorder_now' | 'healthy' | 'overstock';

export type DemandSource =
  | 'organic_sales'
  | 'ml_forecast'
  | 'catalog_velocity'
  | 'synthetic_benchmark';

export interface CalculationDetails {
  expectedLeadTimeDemandFormula: string;
  safetyStockFormula: string;
  reorderPointFormula: string;
  daysOfStockRemainingFormula: string;
  targetStockLevelFormula: string;
  suggestedReplenishmentFormula: string;
  dailyDemand: number;
  supplierLeadTimeDays: number;
  isLeadTimeFallback: boolean;
  safetyStock: number;
  isSafetyStockEstimated: boolean;
  safetyStockMethod: string;
  expectedLeadTimeDemand: number;
  reorderPoint: number;
  currentStock: number;
  incomingStock: number;
  netStock: number;
  targetCoverageDays: number;
  targetStockLevel: number;
  overstockThreshold: number;
  serviceLevelZ: number;
  serviceLevelType?: string;
  zScoreExplanation?: string;
}

export interface InventoryRecommendation {
  productId: string;
  productName: string;
  sku: string;
  category: ProductCategory;
  currentStock: number;
  incomingStock: number;
  netStock: number;
  dailyDemand: number;
  demandSource: DemandSource;
  demandSourceLabel: string;
  supplierLeadTimeDays: number;
  isLeadTimeFallback: boolean;
  expectedLeadTimeDemand: number;
  safetyStock: number;
  isSafetyStockEstimated: boolean;
  reorderPoint: number;
  suggestedReplenishmentQty: number;
  daysOfStockRemaining: number | null;
  status: InventoryStatus;
  statusLabel: string;
  statusExplanation: string;
  warnings: string[];
  calculationDetails: CalculationDetails;
  costPrice?: number | null;
  estimatedReplenishmentCost?: number | null;
  isCostMissing?: boolean;
  supplier: string;
}

export interface RecommendationSummary {
  totalProducts: number;
  criticalCount: number;
  reorderNowCount: number;
  healthyCount: number;
  overstockedCount: number;
  totalSuggestedOrderUnits: number;
  totalEstimatedReplenishmentCost: number;
  hasMissingCosts?: boolean;
}

export interface RecommendationParameters {
  targetCoverageDays: number;
  defaultLeadTimeDays: number;
  defaultSafetyStockDays: number;
  overstockDaysThreshold: number;
  serviceLevelZ: number;
  useMlForecast: boolean;
}

export interface InventoryRecommendationsResponse {
  summary: RecommendationSummary;
  parameters: RecommendationParameters;
  recommendations: InventoryRecommendation[];
}

// ── Product Intelligence (Phase 4 — ABC, Clustering, Anomalies) ──

export interface ABCItemDetail {
  id: string;
  sku: string;
  name: string;
  category: string;
  classification: 'A' | 'B' | 'C';
  annualQuantity: number;
  unitCostPrice?: number | null;
  unitSellingPrice: number;
  unitMeasureRate: number;
  contributionValue: number;
  valueSharePercent: number;
  cumulativeValueSharePercent: number;
  rank: number;
  turnoverRatio: number;
  daysSalesInventory: number;
  currentStock: number;
  reason: string;
  isCostMissing?: boolean;
}

export interface ABCAnalysisSummary {
  totalItems: number;
  totalContributionValue: number;
  measure: 'consumption_value' | 'revenue';
  measureLabel: string;
  thresholdA: number;
  thresholdB: number;
  classACount: number;
  classBCount: number;
  classCCount: number;
  classAValue: number;
  classBValue: number;
  classCValue: number;
  classAValueSharePercent: number;
  classBValueSharePercent: number;
  classCValueSharePercent: number;
  classAItemSharePercent: number;
  classBItemSharePercent: number;
  classCItemSharePercent: number;
  dataProvenance: string;
  warnings: string[];
}

export interface ABCAnalysisResponse {
  summary: ABCAnalysisSummary;
  items: ABCItemDetail[];
}

export interface SegmentedProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  clusterId: number;
  clusterLabel: string;
  dailyDemand: number;
  demandVariabilityCv: number;
  currentStock: number;
  daysOfStockRemaining: number;
  stockoutRiskRatio: number;
  costPrice?: number | null;
  sellingPrice: number;
}

export interface ClusterProfile {
  clusterId: number;
  clusterLabel: string;
  size: number;
  itemSharePercent: number;
  avgDailyDemand: number;
  avgDemandVariabilityCv: number;
  avgCurrentStock: number;
  avgDaysOfStockRemaining: number;
  avgStockoutRiskRatio: number;
  avgCostPrice?: number | null;
  avgSellingPrice: number;
  description: string;
}

export interface SegmentationResponse {
  nClusters: number;
  silhouetteScore?: number | null;
  silhouetteEvaluation: string;
  featuresUsed: string[];
  clusterProfiles: ClusterProfile[];
  products: SegmentedProduct[];
  dataProvenance: string;
  isSyntheticDevelopment: boolean;
  warnings: string[];
  modelSavedPath?: string | null;
}

export interface AnomalyObservation {
  observationId: string;
  productId: string;
  sku: string;
  productName: string;
  category: string;
  date: string;
  dailyQuantity: number;
  baselineDailyDemand: number;
  demandDeviation: number;
  relativeDemandRatio: number;
  stockLevel: number;
  daysRemaining: number;
  anomalyScore: number;
  rawDecisionScore: number;
  isAnomaly: boolean;
  explanation: string;
  recommendedInvestigation: string;
}

export interface AnomalyDetectionResponse {
  status: 'success' | 'insufficient_organic_data';
  totalObservations: number;
  anomalyCount: number;
  normalCount: number;
  anomalyRatePercent: number;
  contamination: number;
  contaminationExplanation: string;
  featuresUsed: string[];
  anomalies: AnomalyObservation[];
  recentObservations: AnomalyObservation[];
  dataProvenance: string;
  isSyntheticDevelopment: boolean;
  warnings: string[];
}

// ── ML Model Laboratory (Phase 5) ──────────────────────────

export interface ParameterInfo {
  name: string;
  type: 'float' | 'int' | 'str' | 'bool';
  defaultValue: any;
  description: string;
}

export interface AlgorithmCatalogItem {
  id: string;
  name: string;
  category: 'supervised' | 'unsupervised';
  task: 'regression' | 'classification' | 'clustering' | 'dimensionality_reduction' | 'anomaly_detection';
  shortDescription: string;
  whatItDoes: string;
  keyParameters: ParameterInfo[];
  advantages: string[];
  limitations: string[];
  interpretationGuide: string;
}

export interface RegressionMetrics {
  mae: number;
  rmse: number;
  r2: number;
  wape?: number;
}

export interface ConfusionMatrix {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
  labels: string[];
}

export interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc?: number | null;
  confusionMatrix: ConfusionMatrix;
}

export interface ClusteringMetrics {
  nClusters: number;
  noisePoints: number;
  silhouetteScore?: number | null;
  silhouetteEvaluation: string;
}

export interface PCAMetrics {
  explainedVarianceRatio: number[];
  cumulativeExplainedVariance: number;
  pc1VariancePercent: number;
  pc2VariancePercent: number;
}

export interface DataPoint2D {
  id: string;
  label: string;
  x: number;
  y: number;
  cluster?: number;
  isAnomaly?: boolean;
  actual?: number;
  predicted?: number;
}

export interface ExperimentResult {
  experimentId: string;
  algorithmId: string;
  algorithmName: string;
  task: string;
  datasetName: string;
  targetColumn?: string;
  featuresUsed: string[];
  trainSampleCount: number;
  testSampleCount: number;
  parametersApplied: Record<string, any>;
  regressionMetrics?: RegressionMetrics;
  classificationMetrics?: ClassificationMetrics;
  clusteringMetrics?: ClusteringMetrics;
  pcaMetrics?: PCAMetrics;
  sampleVisualData: DataPoint2D[];
  plainEnglishExplanation: string;
  executionTimeMs: number;
  dataProvenance: string;
  warnings: string[];
}

export interface ModelLeaderboardItem {
  algorithmId: string;
  algorithmName: string;
  task: string;
  primaryMetricName: string;
  primaryMetricValue: number;
  secondaryMetricName: string;
  secondaryMetricValue: number;
  isChampion: boolean;
  summaryVerdict: string;
}

export interface LeaderboardResponse {
  task: string;
  targetColumn: string;
  totalModelsEvaluated: number;
  championAlgorithm: string;
  leaderboard: ModelLeaderboardItem[];
  datasetName: string;
  dataProvenance: string;
  warnings: string[];
}

export interface TrainExperimentRequest {
  algorithmId: string;
  task: string;
  dataset?: string;
  target?: string;
  parameters?: Record<string, any>;
}



