import React, { useState, useEffect } from 'react';
import {
  Cpu,
  TrendingUp,
  Target,
  Sparkles,
  BookOpen,
  Play,
  Trophy,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Info,
  HelpCircle,
  Database,
  ArrowRight,
  ShieldAlert,
  Search,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from 'recharts';
import {
  AlgorithmCatalogItem,
  ExperimentResult,
  LeaderboardResponse,
  TrainExperimentRequest,
} from '../types';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';

export const MlModelLaboratoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'regression' | 'classification' | 'unsupervised' | 'knowledge'>('regression');

  // Algorithm Catalog
  const [catalog, setCatalog] = useState<AlgorithmCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(true);

  // ────────────────────────────────────────────────────────────
  // Regression State
  // ────────────────────────────────────────────────────────────
  const [selectedRegAlgo, setSelectedRegAlgo] = useState<string>('gradient_boosting_regressor');
  const [regParams, setRegParams] = useState<Record<string, any>>({
    n_estimators: 100,
    learning_rate: 0.08,
    max_depth: 4,
    alpha: 1.0,
  });
  const [regResult, setRegResult] = useState<ExperimentResult | null>(null);
  const [regLoading, setRegLoading] = useState<boolean>(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regLeaderboard, setRegLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [regLbLoading, setRegLbLoading] = useState<boolean>(false);

  // ────────────────────────────────────────────────────────────
  // Classification State
  // ────────────────────────────────────────────────────────────
  const [selectedClfAlgo, setSelectedClfAlgo] = useState<string>('random_forest_classifier');
  const [clfParams, setClfParams] = useState<Record<string, any>>({
    n_estimators: 100,
    max_depth: 6,
    C: 1.0,
    n_neighbors: 3,
  });
  const [clfResult, setClfResult] = useState<ExperimentResult | null>(null);
  const [clfLoading, setClfLoading] = useState<boolean>(false);
  const [clfError, setClfError] = useState<string | null>(null);
  const [clfLeaderboard, setClfLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [clfLbLoading, setClfLbLoading] = useState<boolean>(false);

  // ────────────────────────────────────────────────────────────
  // Unsupervised State
  // ────────────────────────────────────────────────────────────
  const [selectedUnsupAlgo, setSelectedUnsupAlgo] = useState<string>('pca_decomposition');
  const [unsupParams, setUnsupParams] = useState<Record<string, any>>({
    n_clusters: 3,
    eps: 1.2,
    min_samples: 2,
    contamination: 0.05,
  });
  const [unsupResult, setUnsupResult] = useState<ExperimentResult | null>(null);
  const [unsupLoading, setUnsupLoading] = useState<boolean>(false);
  const [unsupError, setUnsupError] = useState<string | null>(null);

  // ────────────────────────────────────────────────────────────
  // Knowledge Hub State
  // ────────────────────────────────────────────────────────────
  const [hubSearch, setHubSearch] = useState<string>('');
  const [hubFilter, setHubFilter] = useState<'ALL' | 'regression' | 'classification' | 'clustering' | 'dimensionality_reduction' | 'anomaly_detection'>('ALL');

  // Load Catalog on mount
  useEffect(() => {
    setCatalogLoading(true);
    api.getLaboratoryAlgorithms()
      .then((data) => {
        setCatalog(data);
        setCatalogLoading(false);
      })
      .catch(() => setCatalogLoading(false));
  }, []);

  // Run Regression Experiment
  const handleRunRegression = () => {
    setRegLoading(true);
    setRegError(null);
    api.trainLaboratoryExperiment({
      algorithmId: selectedRegAlgo,
      task: 'regression',
      parameters: regParams,
    })
      .then((res) => {
        setRegResult(res);
        setRegLoading(false);
      })
      .catch((err) => {
        setRegError(err?.message || 'Regression experiment training failed.');
        setRegLoading(false);
      });
  };

  // Run Regression Tournament
  const handleRunRegLeaderboard = (refresh = true) => {
    setRegLbLoading(true);
    api.getLaboratoryLeaderboard('regression', refresh)
      .then((lb) => {
        setRegLeaderboard(lb);
        setRegLbLoading(false);
      })
      .catch(() => setRegLbLoading(false));
  };

  // Run Classification Experiment
  const handleRunClassification = () => {
    setClfLoading(true);
    setClfError(null);
    api.trainLaboratoryExperiment({
      algorithmId: selectedClfAlgo,
      task: 'classification',
      parameters: clfParams,
    })
      .then((res) => {
        setClfResult(res);
        setClfLoading(false);
      })
      .catch((err) => {
        setClfError(err?.message || 'Classification experiment training failed.');
        setClfLoading(false);
      });
  };

  // Run Classification Tournament
  const handleRunClfLeaderboard = (refresh = true) => {
    setClfLbLoading(true);
    api.getLaboratoryLeaderboard('classification', refresh)
      .then((lb) => {
        setClfLeaderboard(lb);
        setClfLbLoading(false);
      })
      .catch(() => setClfLbLoading(false));
  };

  // Run Unsupervised Experiment
  const handleRunUnsupervised = () => {
    setUnsupLoading(true);
    setUnsupError(null);
    api.trainLaboratoryExperiment({
      algorithmId: selectedUnsupAlgo,
      task: 'unsupervised',
      parameters: unsupParams,
    })
      .then((res) => {
        setUnsupResult(res);
        setUnsupLoading(false);
      })
      .catch((err) => {
        setUnsupError(err?.message || 'Unsupervised experiment failed.');
        setUnsupLoading(false);
      });
  };

  // Run initial experiments when tabs switch
  useEffect(() => {
    if (activeTab === 'regression' && !regResult && !regLoading) {
      handleRunRegression();
    } else if (activeTab === 'classification' && !clfResult && !clfLoading) {
      handleRunClassification();
    } else if (activeTab === 'unsupervised' && !unsupResult && !unsupLoading) {
      handleRunUnsupervised();
    }
  }, [activeTab]);

  // Current selected metadata
  const currentRegMeta = catalog.find((a) => a.id === selectedRegAlgo);
  const currentClfMeta = catalog.find((a) => a.id === selectedClfAlgo);
  const currentUnsupMeta = catalog.find((a) => a.id === selectedUnsupAlgo);

  const regressionAlgos = catalog.filter((a) => a.task === 'regression');
  const classificationAlgos = catalog.filter((a) => a.task === 'classification');
  const unsupervisedAlgos = catalog.filter((a) => a.category === 'unsupervised');

  // Colors for PCA and Cluster Scatters
  const CLUSTER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <Cpu className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                ML Model Laboratory & Experimental Suite
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-3xl mt-1">
              Interactive sandbox for 24 supervised and unsupervised machine learning algorithms tailored for data science education and supply chain experimentation.
            </p>
          </div>

          {/* Navigation Tab Bar */}
          <div className="flex flex-wrap items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('regression')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'regression'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Regression (10)
            </button>

            <button
              onClick={() => setActiveTab('classification')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'classification'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Target className="w-4 h-4" />
              Classification (9)
            </button>

            <button
              onClick={() => setActiveTab('unsupervised')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'unsupervised'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Unsupervised (5)
            </button>

            <button
              onClick={() => setActiveTab('knowledge')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'knowledge'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Knowledge Hub (24)
            </button>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. SUPERVISED REGRESSION EXPERIMENTS */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'regression' && (
        <div className="space-y-6">
          {/* Controls & Algorithm Selector */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-slate-700">Select Algorithm:</span>
                <select
                  value={selectedRegAlgo}
                  onChange={(e) => setSelectedRegAlgo(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {regressionAlgos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>

                {/* Hyperparameter adjustments if applicable */}
                {selectedRegAlgo.includes('ridge') || selectedRegAlgo.includes('lasso') ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500">alpha:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={regParams.alpha ?? 1.0}
                      onChange={(e) => setRegParams({ ...regParams, alpha: parseFloat(e.target.value) || 0.1 })}
                      className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800"
                    />
                  </div>
                ) : null}

                {selectedRegAlgo.includes('forest') || selectedRegAlgo.includes('boosting') || selectedRegAlgo.includes('xgboost') ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500">trees:</span>
                    <input
                      type="number"
                      step="10"
                      value={regParams.n_estimators ?? 100}
                      onChange={(e) => setRegParams({ ...regParams, n_estimators: parseInt(e.target.value) || 50 })}
                      className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800"
                    />
                  </div>
                ) : null}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunRegression}
                  disabled={regLoading}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Play className={`w-3.5 h-3.5 ${regLoading ? 'animate-spin' : ''}`} />
                  Train & Evaluate
                </button>

                <button
                  onClick={() => handleRunRegLeaderboard(true)}
                  disabled={regLbLoading}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
                >
                  <Trophy className={`w-3.5 h-3.5 text-amber-500 ${regLbLoading ? 'animate-spin' : ''}`} />
                  Run 10-Model Tournament
                </button>
              </div>
            </div>

            {/* Educational Synopsis Card for Selected Algorithm */}
            {currentRegMeta && (
              <div className="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-600" />
                    How {currentRegMeta.name} Works (BCA Data Science Notes)
                  </span>
                  <span className="text-[11px] font-mono text-emerald-700">Chronological Split: 70% Train / 30% Test</span>
                </div>
                <p className="text-slate-700 leading-relaxed">{currentRegMeta.whatItDoes}</p>
                <div className="flex flex-wrap gap-4 pt-1 text-[11px] text-slate-600">
                  <span><strong>Advantages:</strong> {currentRegMeta.advantages.join(', ')}</span>
                  <span><strong>Limitations:</strong> {currentRegMeta.limitations.join(', ')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Loading and Error States */}
          {regLoading && (
            <div className="p-8 bg-white rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
              <span className="text-xs font-medium text-slate-500">Fitting {currentRegMeta?.name} on chronological daily sales features...</span>
            </div>
          )}

          {regError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{regError}</span>
            </div>
          )}

          {/* Single Experiment Results */}
          {regResult && regResult.regressionMetrics && (
            <div className="space-y-4">
              {/* Metrics KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Mean Absolute Error (MAE)
                  </span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    ±{regResult.regressionMetrics.mae.toFixed(2)}{' '}
                    <span className="text-xs font-normal text-slate-500">units/day</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Average absolute prediction deviation</div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Root Mean Squared Error (RMSE)
                  </span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {regResult.regressionMetrics.rmse.toFixed(2)}{' '}
                    <span className="text-xs font-normal text-slate-500">units</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Penalizes large outlier forecasting errors</div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    R² Determination Score
                  </span>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">
                    {regResult.regressionMetrics.r2.toFixed(3)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Percentage of demand variance captured</div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    WAPE Error Rate
                  </span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {regResult.regressionMetrics.wape ?? 0}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Weighted absolute percentage error</div>
                </div>
              </div>

              {/* Plain-English Interpretation */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 text-xs shadow-xs space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Plain-English Interpretation of Results
                </div>
                <p className="text-slate-600 leading-relaxed">{regResult.plainEnglishExplanation}</p>
                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-100 flex items-center gap-3">
                  <span>Execution Time: <strong>{regResult.executionTimeMs} ms</strong></span>
                  <span>Training Samples: <strong>{regResult.trainSampleCount}</strong></span>
                  <span>Out-of-sample Test Samples: <strong>{regResult.testSampleCount}</strong></span>
                </div>
              </div>

              {/* Actual vs Predicted Visual Chart */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Out-of-Sample Predictions vs Actual Daily Demand (First 30 Test Days)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Comparing genuine test observations with {regResult.algorithmName} forecasts
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-900" /> Actual
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Predicted
                    </span>
                  </div>
                </div>

                <div className="h-64 mt-4 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={regResult.sampleVisualData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit=" u" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                      <Line type="monotone" dataKey="actual" name="Actual Demand" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="predicted" name="Predicted Demand" stroke="#10b981" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Tournament Leaderboard Table */}
          {regLeaderboard && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Supervised Regression 10-Model Tournament Leaderboard
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ranked strictly by out-of-sample Mean Absolute Error (MAE). Champion: <strong>{regLeaderboard.championAlgorithm}</strong>
                  </p>
                </div>
                <Badge variant="blue" size="sm">
                  {regLeaderboard.totalModelsEvaluated} Models Evaluated
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Algorithm</th>
                      <th className="py-3 px-4">MAE (Units)</th>
                      <th className="py-3 px-4">R² Score</th>
                      <th className="py-3 px-4">Status Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {regLeaderboard.leaderboard.map((item, idx) => (
                      <tr key={item.algorithmId} className={item.isChampion ? 'bg-amber-50/40 font-semibold' : 'hover:bg-slate-50/70'}>
                        <td className="py-3 px-4">
                          {item.isChampion ? '🏆 #1' : `#${idx + 1}`}
                        </td>
                        <td className="py-3 px-4 text-slate-900">
                          {item.algorithmName}
                        </td>
                        <td className="py-3 px-4 text-emerald-700 font-bold">
                          ±{item.primaryMetricValue.toFixed(2)} units
                        </td>
                        <td className="py-3 px-4 text-slate-800">
                          {item.secondaryMetricValue.toFixed(3)}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {item.summaryVerdict}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. SUPERVISED CLASSIFICATION EXPERIMENTS */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'classification' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-slate-700">Select Classifier:</span>
                <select
                  value={selectedClfAlgo}
                  onChange={(e) => setSelectedClfAlgo(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {classificationAlgos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>

                {/* Hyperparameter adjustments */}
                {selectedClfAlgo.includes('knn') ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500">k neighbors:</span>
                    <input
                      type="number"
                      value={clfParams.n_neighbors ?? 3}
                      onChange={(e) => setClfParams({ ...clfParams, n_neighbors: parseInt(e.target.value) || 3 })}
                      className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800"
                    />
                  </div>
                ) : null}

                {selectedClfAlgo.includes('svm') || selectedClfAlgo.includes('logistic') ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500">C parameter:</span>
                    <input
                      type="number"
                      step="0.5"
                      value={clfParams.C ?? 1.0}
                      onChange={(e) => setClfParams({ ...clfParams, C: parseFloat(e.target.value) || 1.0 })}
                      className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800"
                    />
                  </div>
                ) : null}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunClassification}
                  disabled={clfLoading}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Play className={`w-3.5 h-3.5 ${clfLoading ? 'animate-spin' : ''}`} />
                  Train & Evaluate
                </button>

                <button
                  onClick={() => handleRunClfLeaderboard(true)}
                  disabled={clfLbLoading}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
                >
                  <Trophy className={`w-3.5 h-3.5 text-amber-500 ${clfLbLoading ? 'animate-spin' : ''}`} />
                  Run 9-Model Tournament
                </button>
              </div>
            </div>

            {/* Target Explanation Card */}
            <div className="p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-100 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-600" />
                  Classification Problem: Stockout Vulnerability Prediction (Binary)
                </span>
                <span className="text-[11px] font-mono text-indigo-700">Target Leakage Prevented</span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                Classifiers predict whether an inventory state is prone to stockout risk (surge demand exceeding buffer coverage).
                To strictly eliminate target leakage, feature inputs exclude current stock and reorder point, forcing the models
                to learn vulnerability from demand velocity, lead time, price elasticity, and variability.
              </p>
            </div>
          </div>

          {/* Loading and Error States */}
          {clfLoading && (
            <div className="p-8 bg-white rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              <span className="text-xs font-medium text-slate-500">Fitting {currentClfMeta?.name} with stratified train/test split...</span>
            </div>
          )}

          {clfError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{clfError}</span>
            </div>
          )}

          {/* Classification Results */}
          {clfResult && clfResult.classificationMetrics && (
            <div className="space-y-4">
              {/* Metrics KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Accuracy
                  </span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {(clfResult.classificationMetrics.accuracy * 100).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Overall correct classifications</div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Precision
                  </span>
                  <div className="text-2xl font-bold text-indigo-700 mt-1">
                    {(clfResult.classificationMetrics.precision * 100).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Reliability of flagged risk alerts</div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Recall (Sensitivity)
                  </span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {(clfResult.classificationMetrics.recall * 100).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Actual risk states caught</div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    F1-Score
                  </span>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">
                    {clfResult.classificationMetrics.f1Score.toFixed(3)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Harmonic mean of precision & recall</div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    ROC-AUC Score
                  </span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {typeof clfResult.classificationMetrics.rocAuc === 'number' ? clfResult.classificationMetrics.rocAuc.toFixed(3) : 'N/A'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Discrimination power</div>
                </div>
              </div>

              {/* 2x2 Interactive Confusion Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-indigo-600" />
                    2 × 2 Evaluation Confusion Matrix
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <span className="text-[11px] font-semibold text-emerald-800 block">True Negatives (TN)</span>
                      <div className="text-xl font-extrabold text-emerald-900 mt-1">
                        {clfResult.classificationMetrics.confusionMatrix.tn}
                      </div>
                      <span className="text-[10px] text-emerald-600">Correctly identified safe stock</span>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <span className="text-[11px] font-semibold text-amber-800 block">False Positives (FP)</span>
                      <div className="text-xl font-extrabold text-amber-900 mt-1">
                        {clfResult.classificationMetrics.confusionMatrix.fp}
                      </div>
                      <span className="text-[10px] text-amber-600">False alarms (over-caution)</span>
                    </div>

                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                      <span className="text-[11px] font-semibold text-rose-800 block">False Negatives (FN)</span>
                      <div className="text-xl font-extrabold text-rose-900 mt-1">
                        {clfResult.classificationMetrics.confusionMatrix.fn}
                      </div>
                      <span className="text-[10px] text-rose-600">Missed stockout risks</span>
                    </div>

                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <span className="text-[11px] font-semibold text-indigo-800 block">True Positives (TP)</span>
                      <div className="text-xl font-extrabold text-indigo-900 mt-1">
                        {clfResult.classificationMetrics.confusionMatrix.tp}
                      </div>
                      <span className="text-[10px] text-indigo-600">Correctly flagged risk states</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between text-xs space-y-2">
                  <div>
                    <span className="font-bold text-slate-800 block mb-1">Interpretation Verdict</span>
                    <p className="text-slate-600 leading-relaxed">{clfResult.plainEnglishExplanation}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    Execution Time: <strong>{clfResult.executionTimeMs} ms</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Classification Tournament Leaderboard */}
          {clfLeaderboard && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Supervised Classification 9-Model Tournament Leaderboard
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ranked strictly by F1-Score on test split. Champion: <strong>{clfLeaderboard.championAlgorithm}</strong>
                  </p>
                </div>
                <Badge variant="blue" size="sm">
                  {clfLeaderboard.totalModelsEvaluated} Classifiers Evaluated
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Classifier</th>
                      <th className="py-3 px-4">F1-Score</th>
                      <th className="py-3 px-4">Accuracy</th>
                      <th className="py-3 px-4">Status Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clfLeaderboard.leaderboard.map((item, idx) => (
                      <tr key={item.algorithmId} className={item.isChampion ? 'bg-amber-50/40 font-semibold' : 'hover:bg-slate-50/70'}>
                        <td className="py-3 px-4">
                          {item.isChampion ? '🏆 #1' : `#${idx + 1}`}
                        </td>
                        <td className="py-3 px-4 text-slate-900">
                          {item.algorithmName}
                        </td>
                        <td className="py-3 px-4 text-indigo-700 font-bold">
                          {item.primaryMetricValue.toFixed(3)}
                        </td>
                        <td className="py-3 px-4 text-slate-800">
                          {(item.secondaryMetricValue * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {item.summaryVerdict}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. UNSUPERVISED LEARNING EXPERIMENTS */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'unsupervised' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-slate-700">Select Pipeline:</span>
                <select
                  value={selectedUnsupAlgo}
                  onChange={(e) => setSelectedUnsupAlgo(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  {unsupervisedAlgos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>

                {/* Hyperparameter controls */}
                {selectedUnsupAlgo === 'kmeans_clustering' || selectedUnsupAlgo === 'hierarchical_clustering' ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500">Clusters (k):</span>
                    <input
                      type="number"
                      min={2}
                      max={5}
                      value={unsupParams.n_clusters ?? 3}
                      onChange={(e) => setUnsupParams({ ...unsupParams, n_clusters: parseInt(e.target.value) || 3 })}
                      className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800"
                    />
                  </div>
                ) : null}

                {selectedUnsupAlgo === 'dbscan_clustering' ? (
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">eps:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={unsupParams.eps ?? 1.2}
                        onChange={(e) => setUnsupParams({ ...unsupParams, eps: parseFloat(e.target.value) || 1.2 })}
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">min_samples:</span>
                      <input
                        type="number"
                        value={unsupParams.min_samples ?? 2}
                        onChange={(e) => setUnsupParams({ ...unsupParams, min_samples: parseInt(e.target.value) || 2 })}
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800"
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Action Button */}
              <button
                onClick={handleRunUnsupervised}
                disabled={unsupLoading}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Play className={`w-3.5 h-3.5 ${unsupLoading ? 'animate-spin' : ''}`} />
                Run Unsupervised Pipeline
              </button>
            </div>

            {/* Educational Synopsis Card */}
            {currentUnsupMeta && (
              <div className="p-3.5 rounded-lg bg-sky-50/50 border border-sky-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-900 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-sky-600" />
                    Educational Mechanics: {currentUnsupMeta.name}
                  </span>
                  <span className="text-[11px] font-mono text-sky-700">Catalog Product Attributes (Scaled)</span>
                </div>
                <p className="text-slate-700 leading-relaxed">{currentUnsupMeta.whatItDoes}</p>
              </div>
            )}
          </div>

          {/* Loading and Error States */}
          {unsupLoading && (
            <div className="p-8 bg-white rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-sky-600 animate-spin" />
              <span className="text-xs font-medium text-slate-500">Executing {currentUnsupMeta?.name}...</span>
            </div>
          )}

          {unsupError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{unsupError}</span>
            </div>
          )}

          {/* Unsupervised Experiment Results */}
          {unsupResult && (
            <div className="space-y-4">
              {/* Warnings / Educational Guards */}
              {unsupResult.warnings.length > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-600" />
                    Important Mathematical Guard
                  </div>
                  {unsupResult.warnings.map((w, idx) => (
                    <p key={idx}>{w}</p>
                  ))}
                </div>
              )}

              {/* PCA Metrics Cards */}
              {unsupResult.pcaMetrics && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Principal Component 1 (PC1)
                    </span>
                    <div className="text-2xl font-bold text-sky-700 mt-1">
                      {unsupResult.pcaMetrics.pc1VariancePercent}% Variance
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Primary axis of catalog variance</div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Principal Component 2 (PC2)
                    </span>
                    <div className="text-2xl font-bold text-sky-700 mt-1">
                      {unsupResult.pcaMetrics.pc2VariancePercent}% Variance
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Orthogonal secondary variance axis</div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Cumulative 2D Explained Variance
                    </span>
                    <div className="text-2xl font-bold text-emerald-700 mt-1">
                      {unsupResult.pcaMetrics.cumulativeExplainedVariance}%
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Information retained in 2D projection</div>
                  </div>
                </div>
              )}

              {/* Clustering Metrics Cards */}
              {unsupResult.clusteringMetrics && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Cluster Count (k)
                    </span>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {unsupResult.clusteringMetrics.nClusters} Clusters
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Discrete groupings formed</div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Silhouette Score
                    </span>
                    <div className="text-2xl font-bold text-sky-700 mt-1">
                      {typeof unsupResult.clusteringMetrics.silhouetteScore === 'number' ? unsupResult.clusteringMetrics.silhouetteScore.toFixed(3) : 'N/A'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Cluster cohesion vs separation</div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Noise / Outliers Flagged
                    </span>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {unsupResult.clusteringMetrics.noisePoints} SKUs
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Low-density atypical products</div>
                  </div>
                </div>
              )}

              {/* 2D Scatter Chart of Real Transformed Data */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      2D Feature Space Projection (Actual Transformed Product Coordinates)
                    </h3>
                    <p className="text-xs text-slate-500">
                      {unsupResult.pcaMetrics
                        ? `PC1 (${unsupResult.pcaMetrics.pc1VariancePercent}% variance) vs PC2 (${unsupResult.pcaMetrics.pc2VariancePercent}% variance)`
                        : 'Products plotted by their principal coordinate projections'}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">12 Catalog SKUs</span>
                </div>

                <div className="h-72 mt-4 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name={unsupResult.pcaMetrics ? `PC1 (${unsupResult.pcaMetrics.pc1VariancePercent}%)` : 'Dimension 1'}
                        stroke="#94a3b8"
                        fontSize={11}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name={unsupResult.pcaMetrics ? `PC2 (${unsupResult.pcaMetrics.pc2VariancePercent}%)` : 'Dimension 2'}
                        stroke="#94a3b8"
                        fontSize={11}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-lg text-xs space-y-1">
                              <div className="font-bold text-slate-900">{d.label} ({d.id})</div>
                              <div className="text-slate-500">Coord: ({d.x}, {d.y})</div>
                              {d.cluster !== undefined && (
                                <div className="text-sky-700 font-semibold">
                                  {d.cluster === -1 ? 'Noise Outlier (-1)' : `Cluster ${d.cluster + 1}`}
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Scatter data={unsupResult.sampleVisualData}>
                        {unsupResult.sampleVisualData.map((entry, index) => {
                          const clusterIdx = entry.cluster !== undefined && entry.cluster >= 0 ? entry.cluster % CLUSTER_COLORS.length : 0;
                          const color = entry.isAnomaly || entry.cluster === -1 ? '#ef4444' : CLUSTER_COLORS[clusterIdx];
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Educational Explanation */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 text-xs shadow-xs space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-sky-600" />
                  Plain-English Explanation of Output
                </div>
                <p className="text-slate-600 leading-relaxed">{unsupResult.plainEnglishExplanation}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. ALGORITHM KNOWLEDGE HUB (EDUCATIONAL CHEATSHEET) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          {/* Search & Filter Header */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Algorithm Library (24 Models)
              </span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search algorithms..."
                  value={hubSearch}
                  onChange={(e) => setHubSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              {(['ALL', 'regression', 'classification', 'clustering', 'dimensionality_reduction', 'anomaly_detection'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setHubFilter(t)}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    hubFilter === t
                      ? 'bg-white text-purple-700 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t === 'ALL' ? 'All (24)' : t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catalog
              .filter((a) => {
                const matchesSearch = a.name.toLowerCase().includes(hubSearch.toLowerCase()) || a.whatItDoes.toLowerCase().includes(hubSearch.toLowerCase());
                const matchesTask = hubFilter === 'ALL' || a.task === hubFilter;
                return matchesSearch && matchesTask;
              })
              .map((algo) => (
                <div key={algo.id} className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-purple-600" />
                        {algo.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          algo.category === 'supervised'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}>
                          {algo.category}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {algo.task.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {algo.whatItDoes}
                    </p>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                      <div>
                        <strong className="text-emerald-700">Advantages:</strong>{' '}
                        <span className="text-slate-600">{algo.advantages.join(', ')}</span>
                      </div>
                      <div>
                        <strong className="text-rose-700">Limitations:</strong>{' '}
                        <span className="text-slate-600">{algo.limitations.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-500">
                    <strong className="text-slate-700">Interpretation Guide:</strong> {algo.interpretationGuide}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MlModelLaboratoryPage;
