import {
  Product,
  SaleTransaction,
  ProductForecast,
  StockAlert,
  ABCItem,
  DashboardMetrics,
  AppSettings,
  InventoryRecommendation,
  InventoryRecommendationsResponse,
  ABCAnalysisResponse,
  SegmentationResponse,
  AnomalyDetectionResponse,
  AlgorithmCatalogItem,
  ExperimentResult,
  TrainExperimentRequest,
  LeaderboardResponse,
} from '../types';

// ── Backend base URL ──────────────────────────────────────────
// Falls back gracefully if the backend is not running
const BASE_URL = 'http://localhost:8000/api/v1';

// ── Network helpers ──────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── API Service Class ────────────────────────────────────────

class InventoryApiService {
  // ── Health Check ────────────────────────────────────────
  async checkHealth(): Promise<{ status: string; database?: string; products_loaded?: number }> {
    const res = await fetch('http://localhost:8000/health');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // ── Dashboard ────────────────────────────────────────────
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return apiFetch<DashboardMetrics>('/dashboard');
  }

  // ── Products ─────────────────────────────────────────────
  async getProducts(filters?: {
    category?: string;
    status?: string;
    search?: string;
  }): Promise<Product[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.status)   params.set('status', filters.status);
    if (filters?.search)   params.set('search', filters.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<Product[]>(`/products${qs}`);
  }

  async getProductById(id: string): Promise<Product> {
    return apiFetch<Product>(`/products/${id}`);
  }

  async addProduct(
    newProduct: Omit<Product, 'id' | 'lastRestocked'>,
  ): Promise<Product> {
    return apiFetch<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(newProduct),
    });
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    return apiFetch<Product>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteProduct(id: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // ── Sales ─────────────────────────────────────────────────
  async getSales(filters?: {
    channel?: string;
    status?: string;
    productId?: string;
  }): Promise<SaleTransaction[]> {
    const params = new URLSearchParams();
    if (filters?.channel)   params.set('channel', filters.channel);
    if (filters?.status)    params.set('status', filters.status);
    if (filters?.productId) params.set('productId', filters.productId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<SaleTransaction[]>(`/sales${qs}`);
  }

  // ── Demand Forecasting (Phase 3 — Real ML) ───────────────
  /**
   * Fetches a real ML forecast for a product.
   * The backend trains XGBoost/RF/LinearRegression on 365 days of
   * synthetic + real sales data and returns genuine R², RMSE, MAE.
   */
  async getForecast(
    productId: string,
    model = 'XGBoost Regressor',
    horizon = 30,
  ): Promise<ProductForecast> {
    const params = new URLSearchParams({
      model,
      horizon: String(horizon),
    });
    return apiFetch<ProductForecast>(
      `/forecasts/${productId}?${params.toString()}`,
    );
  }

  /**
   * Run a fresh model inference explicitly (POST body version).
   */
  async runModelInference(
    productId: string,
    modelName: string,
    horizonDays: number,
  ): Promise<ProductForecast> {
    return apiFetch<ProductForecast>('/forecasts/run', {
      method: 'POST',
      body: JSON.stringify({ productId, modelName, horizonDays }),
    });
  }

  // ── Alerts ───────────────────────────────────────────────
  async getAlerts(filters?: {
    severity?: string;
    resolved?: boolean;
  }): Promise<StockAlert[]> {
    const params = new URLSearchParams();
    if (filters?.severity !== undefined) params.set('severity', filters.severity);
    if (filters?.resolved !== undefined) params.set('resolved', String(filters.resolved));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<StockAlert[]>(`/alerts${qs}`);
  }

  async resolveAlert(alertId: string): Promise<void> {
    await apiFetch<StockAlert>(`/alerts/${alertId}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ resolved: true }),
    });
  }

  // ── Product Intelligence (Phase 4 — ABC, Segmentation, Anomalies) ──
  async getABCAnalysis(params?: {
    classification?: 'A' | 'B' | 'C';
    measure?: 'consumption_value' | 'revenue';
    thresholdA?: number;
    thresholdB?: number;
    legacy?: boolean;
  }): Promise<ABCAnalysisResponse> {
    const searchParams = new URLSearchParams();
    if (params?.classification) searchParams.set('classification', params.classification);
    if (params?.measure) searchParams.set('measure', params.measure);
    if (params?.thresholdA !== undefined) searchParams.set('threshold_a', String(params.thresholdA));
    if (params?.thresholdB !== undefined) searchParams.set('threshold_b', String(params.thresholdB));
    if (params?.legacy !== undefined) searchParams.set('legacy', String(params.legacy));
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiFetch<ABCAnalysisResponse>(`/intelligence/abc${qs}`);
  }

  async getSegmentation(params?: {
    nClusters?: number;
    useBenchmark?: boolean;
    retrain?: boolean;
  }): Promise<SegmentationResponse> {
    const searchParams = new URLSearchParams();
    if (params?.nClusters !== undefined) searchParams.set('n_clusters', String(params.nClusters));
    if (params?.useBenchmark !== undefined) searchParams.set('use_benchmark', String(params.useBenchmark));
    if (params?.retrain !== undefined) searchParams.set('retrain', String(params.retrain));
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiFetch<SegmentationResponse>(`/intelligence/segmentation${qs}`);
  }

  async retrainSegmentation(body: {
    nClusters: number;
    useBenchmark: boolean;
  }): Promise<SegmentationResponse> {
    return apiFetch<SegmentationResponse>('/intelligence/segmentation/retrain', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getAnomalies(params?: {
    contamination?: number;
    useBenchmark?: boolean;
    retrain?: boolean;
  }): Promise<AnomalyDetectionResponse> {
    const searchParams = new URLSearchParams();
    if (params?.contamination !== undefined) searchParams.set('contamination', String(params.contamination));
    if (params?.useBenchmark !== undefined) searchParams.set('use_benchmark', String(params.useBenchmark));
    if (params?.retrain !== undefined) searchParams.set('retrain', String(params.retrain));
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiFetch<AnomalyDetectionResponse>(`/intelligence/anomalies${qs}`);
  }

  async detectAnomalies(body: {
    contamination: number;
    useBenchmark: boolean;
  }): Promise<AnomalyDetectionResponse> {
    return apiFetch<AnomalyDetectionResponse>('/intelligence/anomalies/detect', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // ── Settings ──────────────────────────────────────────────
  async getSettings(): Promise<AppSettings> {
    return apiFetch<AppSettings>('/settings');
  }

  async updateSettings(
    newSettings: Partial<AppSettings>,
  ): Promise<AppSettings> {
    return apiFetch<AppSettings>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(newSettings),
    });
  }

  // ── Smart Inventory Recommendations ────────────────────────
  async getRecommendations(params?: {
    category?: string;
    status?: string;
    targetCoverageDays?: number;
    defaultLeadTimeDays?: number;
    defaultSafetyStockDays?: number;
    overstockDaysThreshold?: number;
    serviceLevelZ?: number;
    useMlForecast?: boolean;
  }): Promise<InventoryRecommendationsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.targetCoverageDays !== undefined) searchParams.set('target_coverage_days', String(params.targetCoverageDays));
    if (params?.defaultLeadTimeDays !== undefined) searchParams.set('default_lead_time_days', String(params.defaultLeadTimeDays));
    if (params?.defaultSafetyStockDays !== undefined) searchParams.set('default_safety_stock_days', String(params.defaultSafetyStockDays));
    if (params?.overstockDaysThreshold !== undefined) searchParams.set('overstock_days_threshold', String(params.overstockDaysThreshold));
    if (params?.serviceLevelZ !== undefined) searchParams.set('service_level_z', String(params.serviceLevelZ));
    if (params?.useMlForecast !== undefined) searchParams.set('use_ml_forecast', String(params.useMlForecast));
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiFetch<InventoryRecommendationsResponse>(`/recommendations${qs}`);
  }

  async getProductRecommendation(
    productId: string,
    params?: {
      targetCoverageDays?: number;
      defaultLeadTimeDays?: number;
      defaultSafetyStockDays?: number;
      overstockDaysThreshold?: number;
      serviceLevelZ?: number;
      useMlForecast?: boolean;
    },
  ): Promise<InventoryRecommendation> {
    const searchParams = new URLSearchParams();
    if (params?.targetCoverageDays !== undefined) searchParams.set('target_coverage_days', String(params.targetCoverageDays));
    if (params?.defaultLeadTimeDays !== undefined) searchParams.set('default_lead_time_days', String(params.defaultLeadTimeDays));
    if (params?.defaultSafetyStockDays !== undefined) searchParams.set('default_safety_stock_days', String(params.defaultSafetyStockDays));
    if (params?.overstockDaysThreshold !== undefined) searchParams.set('overstock_days_threshold', String(params.overstockDaysThreshold));
    if (params?.serviceLevelZ !== undefined) searchParams.set('service_level_z', String(params.serviceLevelZ));
    if (params?.useMlForecast !== undefined) searchParams.set('use_ml_forecast', String(params.useMlForecast));
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiFetch<InventoryRecommendation>(`/recommendations/${productId}${qs}`);
  }

  // ── ML Model Laboratory (Phase 5) ──────────────────────────
  async getLaboratoryAlgorithms(task?: string): Promise<AlgorithmCatalogItem[]> {
    const qs = task ? `?task=${task}` : '';
    return apiFetch<AlgorithmCatalogItem[]>(`/laboratory/algorithms${qs}`);
  }

  async trainLaboratoryExperiment(body: TrainExperimentRequest): Promise<ExperimentResult> {
    return apiFetch<ExperimentResult>('/laboratory/train', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getLaboratoryLeaderboard(task = 'regression', refresh = false): Promise<LeaderboardResponse> {
    const params = new URLSearchParams({
      task,
      refresh: String(refresh),
    });
    return apiFetch<LeaderboardResponse>(`/laboratory/compare?${params.toString()}`);
  }
}

export const api = new InventoryApiService();
