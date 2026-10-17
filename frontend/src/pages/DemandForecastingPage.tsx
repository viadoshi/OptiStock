import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Cpu,
  BrainCircuit,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  Loader2,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Product, ProductForecast } from '../types';
import { api } from '../services/api';

interface DemandForecastingPageProps {
  products: Product[];
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
  onRunReorder: (productId: string, quantity: number) => void;
}

type FetchState = 'idle' | 'loading' | 'success' | 'error';

export const DemandForecastingPage: React.FC<DemandForecastingPageProps> = ({
  products,
  selectedProductId,
  onSelectProduct,
  onRunReorder,
}) => {
  const [selectedModel, setSelectedModel] = useState<string>('Auto');
  const [selectedHorizon, setSelectedHorizon] = useState<number>(30);
  const [forecast, setForecast] = useState<ProductForecast | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [inferenceMs, setInferenceMs] = useState<number>(0);

  const activeProduct =
    products.find((p) => p.id === selectedProductId) || products[0];

  // ── Fetch real ML forecast from the backend ──────────────────
  const fetchForecast = useCallback(
    async (productId: string, model: string, horizon: number) => {
      if (!productId) return;
      setFetchState('loading');
      setErrorMessage('');
      const t0 = performance.now();
      try {
        const result = await api.getForecast(productId, model, horizon);
        setForecast(result);
        setInferenceMs(Math.round(performance.now() - t0));
        setFetchState('success');
      } catch (err: any) {
        setErrorMessage(err.message ?? 'Failed to connect to backend');
        setFetchState('error');
      }
    },
    [],
  );

  // Trigger on mount and whenever selection changes
  useEffect(() => {
    fetchForecast(selectedProductId, selectedModel, selectedHorizon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId, selectedModel, selectedHorizon]);

  const handleRetrain = () => {
    fetchForecast(selectedProductId, selectedModel, selectedHorizon);
  };

  const isLoading = fetchState === 'loading';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 mb-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-600" />
            Machine Learning Forecasting Module — Phase 3 (XGBoost · RandomForest · Scikit-Learn)
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Predictive Demand &amp; Stockout Prevention
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl">
            Live ML inference: models are trained on 365 days of demand data with calendar
            seasonality, lag features, and Fourier terms. R², RMSE, and MAE are computed
            on a true 20% hold-out split.
          </p>
        </div>

        {/* Retrain / Re-run Button */}
        <button
          onClick={handleRetrain}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-xs shadow-xs transition-colors self-start md:self-auto"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {isLoading ? 'Training Model...' : 'Re-run ML Pipeline'}
        </button>
      </div>

      {/* Control Bar: Product Selector, Model Switcher, Horizon */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Product SKU Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Target Product SKU
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => onSelectProduct(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} - {p.name} (Stock: {p.currentStock})
              </option>
            ))}
          </select>
        </div>

        {/* Model Algorithm Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ML Forecasting Algorithm
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
          >
            <option value="Auto">Auto (Best Model via Validation MAE)</option>
            <option value="Linear Regression">Ridge Regression (L2 Regularized)</option>
            <option value="XGBoost Regressor">XGBoost Regressor (Gradient Boosting)</option>
            <option value="Gradient Boosting">Gradient Boosting Regressor (Scikit-Learn)</option>
            <option value="Random Forest">Random Forest Regressor (Ensemble)</option>
          </select>
        </div>

        {/* Prediction Horizon */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Prediction Horizon
          </label>
          <select
            value={selectedHorizon}
            onChange={(e) => setSelectedHorizon(parseInt(e.target.value))}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
          >
            <option value={7}>Next 7 Days (Short-term)</option>
            <option value={14}>Next 14 Days (Bi-weekly Reorder)</option>
            <option value={30}>Next 30 Days (Monthly Horizon)</option>
            <option value={90}>Next 90 Days (Quarterly Plan)</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {fetchState === 'error' && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-800">Backend connection failed</p>
            <p className="text-xs text-rose-600 mt-0.5">{errorMessage}</p>
            <p className="text-xs text-rose-500 mt-1">
              Make sure the FastAPI server is running:{' '}
              <code className="bg-rose-100 px-1 rounded">uvicorn main:app --reload</code>
            </p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8 shadow-xs flex flex-col items-center justify-center gap-3 min-h-[320px]">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-100" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-800">Training {selectedModel}...</p>
            <p className="text-xs text-slate-400 mt-1">
              Engineering features · Fitting model · Computing confidence intervals
            </p>
          </div>
        </div>
      )}

      {/* Main content — shown once forecast is available */}
      {!isLoading && forecast && (
        <>
          {/* Inference latency badge */}
          {fetchState === 'success' && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                Model trained and inference completed in{' '}
                <strong className="text-slate-700">{inferenceMs} ms</strong>
                {' '}— evaluated on chronological validation &amp; hold-out test splits
              </span>
            </div>
          )}

          {/* Main Forecasting Interactive Chart */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">
                    Demand Trajectory &amp; Empirical Prediction Interval: {activeProduct?.name}
                  </h3>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {activeProduct?.sku}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Historical daily sales (solid emerald) overlaid with {forecast.model} predicted demand &amp; empirical residual prediction interval (widening over forecast horizon)
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  Actual
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                  Forecast
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Reorder Point ({activeProduct?.reorderPoint})
                </span>
              </div>
            </div>

            <div className="h-80 mt-4 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecast.forecastPoints}>
                  <defs>
                    <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0284c7" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    interval={Math.ceil(forecast.forecastPoints.length / 10)}
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                  {/* Shaded Upper Empirical Prediction Band */}
                  <Area
                    type="monotone"
                    dataKey="upperConfidence"
                    name="Empirical Upper Bound (Residual Interval)"
                    stroke="transparent"
                    fill="url(#confidenceGrad)"
                  />

                  {/* Actual Sales Line */}
                  <Line
                    type="monotone"
                    dataKey="actualDemand"
                    name="Historical Actual Demand"
                    stroke="#16a34a"
                    strokeWidth={2.5}
                    dot={{ r: 2, fill: '#16a34a' }}
                    connectNulls={false}
                  />

                  {/* Predicted Demand Line */}
                  <Line
                    type="monotone"
                    dataKey="predictedDemand"
                    name="AI Predicted Demand"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#0284c7' }}
                  />

                  {/* Reorder Threshold Reference */}
                  {activeProduct && (
                    <ReferenceLine
                      y={activeProduct.reorderPoint}
                      stroke="#f43f5e"
                      strokeDasharray="3 3"
                      label={{
                        value: `Reorder Threshold (${activeProduct.reorderPoint})`,
                        fill: '#e11d48',
                        fontSize: 11,
                        position: 'insideBottomRight',
                      }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Model Diagnostic Metrics & Feature Importance Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Model Performance Cards */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-emerald-600" />
                  Model Diagnostics
                </h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  forecast.accuracyR2 >= 0.85
                    ? 'bg-emerald-50 text-emerald-700'
                    : forecast.accuracyR2 >= 0.70
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-rose-50 text-rose-700'
                }`}>
                  {forecast.accuracyR2 >= 0.85 ? 'High Confidence' : forecast.accuracyR2 >= 0.70 ? 'Moderate Confidence' : 'Low Confidence'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">R² Score</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {(forecast.accuracyR2 * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">Variance Explained</div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">WAPE Error</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {forecast.wape !== undefined ? `${forecast.wape}%` : '—'}
                  </div>
                  <div className="text-[10px] text-sky-600 font-medium">Weighted Abs % Error</div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">RMSE Error</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {forecast.rmse.toFixed(2)} <span className="text-xs font-normal text-slate-400">units</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">Root Mean Squared</div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">MAE Error</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {forecast.mae.toFixed(2)} <span className="text-xs font-normal text-slate-400">units</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">Mean Absolute Error</div>
                </div>
              </div>

              {forecast.baselineWape !== undefined && (
                <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>7-Day Moving Avg Baseline:</span>
                  <span className="font-semibold text-slate-700">
                    WAPE {forecast.baselineWape}% · MAE {forecast.baselineMae?.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="pt-1 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Info className="w-3 h-3 text-slate-400" />
                  <span>Trained on 365-day synthetic + real sales data</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Current stock:{' '}
                  <strong className="text-slate-800">{activeProduct?.currentStock} units</strong>
                  . Lead time:{' '}
                  <strong className="text-slate-800">{activeProduct?.leadTimeDays} days</strong>.
                </div>
              </div>
            </div>

            {/* Feature Importance Vector */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  {forecast.model} Feature Importance
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Relative contribution of each feature to the demand prediction
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {forecast.featureImportance.map((feat) => (
                  <div key={feat.feature} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium font-mono text-[11px] truncate max-w-[200px]">
                        {feat.feature}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {(feat.weight * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${feat.weight * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Action Recommendation Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-xl border border-emerald-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  AI Replenishment Recommendation
                </div>

                <p className="text-xs text-slate-700 mt-2.5 leading-relaxed">
                  Based on the <strong>{forecast.model}</strong> projection
                  {forecast.predictedSurgeDate ? (
                    <>
                      , demand for <strong>{activeProduct?.name}</strong> is predicted to surge around{' '}
                      <strong>{forecast.predictedSurgeDate}</strong>.
                    </>
                  ) : (
                    <>
                      , demand for <strong>{activeProduct?.name}</strong> is expected to remain stable over the next{' '}
                      <strong>{forecast.horizonDays} days</strong>.
                    </>
                  )}
                </p>

                <div className="mt-4 p-3 bg-white rounded-lg border border-emerald-100 space-y-1.5">
                  <div className="text-[11px] text-slate-500">Recommended Purchase Order Quantity:</div>
                  <div className="text-2xl font-bold text-emerald-700">
                    {forecast.recommendedReorderQty}{' '}
                    <span className="text-xs font-normal text-slate-500">units</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Estimated Order Cost: $
                    {activeProduct
                      ? (forecast.recommendedReorderQty * activeProduct.costPrice).toFixed(2)
                      : '—'}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">
                    Includes safety stock buffer (95% service level)
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  activeProduct &&
                  onRunReorder(activeProduct.id, forecast.recommendedReorderQty)
                }
                disabled={!activeProduct}
                className="mt-4 w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                Authorize Purchase Order for {forecast.recommendedReorderQty} Units
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Model Comparisons & Benchmark Table */}
          {forecast.modelComparisons && forecast.modelComparisons.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Model Benchmark &amp; Cross-Algorithm Evaluation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Strict chronological evaluation (70% Train / 15% Validation / 15% Test, un-shuffled). Selection criterion: Lowest Validation MAE.
                  </p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/50 self-start sm:self-auto">
                  Split: 70% Train / 15% Val / 15% Test
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Algorithm</th>
                      <th className="py-2.5 px-3">Val MAE (Units)</th>
                      <th className="py-2.5 px-3">Test MAE (Units)</th>
                      <th className="py-2.5 px-3">Test RMSE (Units)</th>
                      <th className="py-2.5 px-3">Test WAPE (%)</th>
                      <th className="py-2.5 px-3">Test R² Score</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {forecast.modelComparisons.map((m) => {
                      const isCurrent = m.modelName === forecast.model;
                      const isBaseline = m.modelName.includes('Baseline');
                      return (
                        <tr
                          key={m.modelName}
                          className={m.isChampion ? 'bg-emerald-50/60 font-medium' : isCurrent ? 'bg-sky-50/40' : isBaseline ? 'bg-slate-50/30 text-slate-500' : ''}
                        >
                          <td className="py-2.5 px-3 flex items-center gap-2 font-mono text-[11px]">
                            {m.isChampion ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            ) : isCurrent ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            ) : null}
                            {m.modelName}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {m.valMae !== undefined ? m.valMae.toFixed(2) : '—'}
                          </td>
                          <td className="py-2.5 px-3">{m.mae.toFixed(2)}</td>
                          <td className="py-2.5 px-3">{m.rmse.toFixed(2)}</td>
                          <td className="py-2.5 px-3">
                            <span className={m.wape <= 20 ? 'text-emerald-700 font-semibold' : 'text-slate-600'}>
                              {m.wape.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono">{(m.r2 * 100).toFixed(1)}%</td>
                          <td className="py-2.5 px-3 text-right">
                            {m.isChampion ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold inline-flex items-center gap-1">
                                ★ Validation Champion
                              </span>
                            ) : isCurrent ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-semibold">
                                Active Model
                              </span>
                            ) : isBaseline ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                Naive Benchmark
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                Evaluated
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dataset Governance & Limitations Transparency Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Dataset Governance &amp; Machine Learning Limitations
            </div>
            {forecast.reliabilityWarning && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <span>{forecast.reliabilityWarning}</span>
              </div>
            )}
            <p className="leading-relaxed">
              {forecast.dataSummary?.limitationsNote ??
                'Models are trained using strict chronological splitting (70% train / 15% validation / 15% test) with shifted lag and rolling features to prevent lookahead data leakage.'}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px] text-slate-500 font-mono">
              <span>Total: {forecast.dataSummary?.totalSamples ?? 700} days</span>
              <span>•</span>
              <span>Train: {forecast.dataSummary?.trainSamples ?? 490}</span>
              <span>•</span>
              <span>Val: {forecast.dataSummary?.valSamples ?? 105}</span>
              <span>•</span>
              <span>Test: {forecast.dataSummary?.testSamples ?? 105}</span>
              <span>•</span>
              <span>Organic MySQL Overlaid: {forecast.dataSummary?.realTransactionsCount ?? 0}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
