import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calculator,
  PieChart as PieChartIcon,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Layers,
  Award,
  Loader2,
  RefreshCw,
  Search,
  Sliders,
  Database,
  Cpu,
  ShieldAlert,
  Info,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  ABCAnalysisResponse,
  ABCItemDetail,
  SegmentationResponse,
  ClusterProfile,
  SegmentedProduct,
  AnomalyDetectionResponse,
  AnomalyObservation,
} from '../types';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';

export const ProductIntelligencePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'abc' | 'segmentation' | 'anomalies' | 'eoq'>('abc');

  // ────────────────────────────────────────────────────────────
  // 1. ABC Analysis State
  // ────────────────────────────────────────────────────────────
  const [abcResponse, setAbcResponse] = useState<ABCAnalysisResponse | null>(null);
  const [abcLoading, setAbcLoading] = useState<boolean>(true);
  const [abcError, setAbcError] = useState<string | null>(null);
  const [abcMeasure, setAbcMeasure] = useState<'consumption_value' | 'revenue'>('consumption_value');
  const [thresholdA, setThresholdA] = useState<number>(80);
  const [thresholdB, setThresholdB] = useState<number>(95);
  const [abcSearch, setAbcSearch] = useState<string>('');
  const [abcClassFilter, setAbcClassFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');

  const loadAbcData = () => {
    setAbcLoading(true);
    setAbcError(null);
    api.getABCAnalysis({
      measure: abcMeasure,
      thresholdA,
      thresholdB,
    })
      .then((data) => {
        setAbcResponse(data);
        setAbcLoading(false);
      })
      .catch((err) => {
        setAbcError(err?.message || 'Failed to load ABC classification analysis');
        setAbcLoading(false);
      });
  };

  useEffect(() => {
    loadAbcData();
  }, [abcMeasure, thresholdA, thresholdB]);

  // ────────────────────────────────────────────────────────────
  // 2. K-Means Segmentation State
  // ────────────────────────────────────────────────────────────
  const [segResponse, setSegResponse] = useState<SegmentationResponse | null>(null);
  const [segLoading, setSegLoading] = useState<boolean>(false);
  const [segError, setSegError] = useState<string | null>(null);
  const [nClusters, setNClusters] = useState<number>(3);
  const [useBenchmarkSeg, setUseBenchmarkSeg] = useState<boolean>(true);
  const [segSearch, setSegSearch] = useState<string>('');

  const loadSegmentation = (forceRetrain = false) => {
    setSegLoading(true);
    setSegError(null);
    api.getSegmentation({
      nClusters,
      useBenchmark: useBenchmarkSeg,
      retrain: forceRetrain,
    })
      .then((data) => {
        setSegResponse(data);
        setSegLoading(false);
      })
      .catch((err) => {
        setSegError(err?.message || 'Failed to execute K-Means segmentation');
        setSegLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'segmentation' && !segResponse && !segLoading) {
      loadSegmentation(false);
    }
  }, [activeTab]);

  // ────────────────────────────────────────────────────────────
  // 3. Anomaly Detection State
  // ────────────────────────────────────────────────────────────
  const [anomResponse, setAnomResponse] = useState<AnomalyDetectionResponse | null>(null);
  const [anomLoading, setAnomLoading] = useState<boolean>(false);
  const [anomError, setAnomError] = useState<string | null>(null);
  const [contamination, setContamination] = useState<number>(0.05);
  const [useBenchmarkAnom, setUseBenchmarkAnom] = useState<boolean>(true);
  const [anomSearch, setAnomSearch] = useState<string>('');

  const loadAnomalies = (forceRetrain = false) => {
    setAnomLoading(true);
    setAnomError(null);
    api.getAnomalies({
      contamination,
      useBenchmark: useBenchmarkAnom,
      retrain: forceRetrain,
    })
      .then((data) => {
        setAnomResponse(data);
        setAnomLoading(false);
      })
      .catch((err) => {
        setAnomError(err?.message || 'Failed to run Isolation Forest anomaly detection');
        setAnomLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'anomalies' && !anomResponse && !anomLoading) {
      loadAnomalies(false);
    }
  }, [activeTab]);

  // ────────────────────────────────────────────────────────────
  // 4. EOQ Calculator Interactive State
  // ────────────────────────────────────────────────────────────
  const [annualDemand, setAnnualDemand] = useState<number>(3600);
  const [orderCost, setOrderCost] = useState<number>(45);
  const [holdingCost, setHoldingCost] = useState<number>(8.5);

  const eoq = Math.round(Math.sqrt((2 * annualDemand * orderCost) / (holdingCost || 1)));
  const totalOrdersPerYear = (annualDemand / (eoq || 1)).toFixed(1);
  const annualOrderCost = parseFloat(totalOrdersPerYear) * orderCost;
  const annualCarryingCost = (eoq / 2) * holdingCost;
  const totalInventoryCost = annualOrderCost + annualCarryingCost;

  // ────────────────────────────────────────────────────────────
  // Filtered Items for Tables & Charts
  // ────────────────────────────────────────────────────────────
  const allAbcItems = abcResponse?.items || [];
  const filteredAbcItems = allAbcItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(abcSearch.toLowerCase()) ||
      item.sku.toLowerCase().includes(abcSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(abcSearch.toLowerCase());
    const matchesClass = abcClassFilter === 'ALL' || item.classification === abcClassFilter;
    return matchesSearch && matchesClass;
  });

  const paretoChartData = allAbcItems.map((item) => ({
    name: item.sku,
    fullName: item.name,
    share: item.valueSharePercent,
    cumulative: item.cumulativeValueSharePercent,
    classification: item.classification,
    contribution: item.contributionValue,
  }));

  const allSegProducts = segResponse?.products || [];
  const filteredSegProducts = allSegProducts.filter((p) => {
    return (
      p.name.toLowerCase().includes(segSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(segSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(segSearch.toLowerCase())
    );
  });

  const allAnomalies = anomResponse?.anomalies || [];
  const filteredAnomalies = allAnomalies.filter((a) => {
    return (
      a.productName.toLowerCase().includes(anomSearch.toLowerCase()) ||
      a.sku.toLowerCase().includes(anomSearch.toLowerCase()) ||
      a.date.includes(anomSearch)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Product Intelligence & Unsupervised ML Cockpit
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-3xl mt-1">
              Multi-dimensional inventory analysis: Pareto ABC classification, K-Means behavioral clustering, and Isolation Forest anomaly detection.
            </p>
          </div>

          {/* Navigation Tab Bar */}
          <div className="flex flex-wrap items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('abc')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'abc'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4" />
              ABC Pareto
            </button>

            <button
              onClick={() => setActiveTab('segmentation')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'segmentation'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cpu className="w-4 h-4" />
              K-Means Clusters
            </button>

            <button
              onClick={() => setActiveTab('anomalies')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'anomalies'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Anomaly Detection
            </button>

            <button
              onClick={() => setActiveTab('eoq')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'eoq'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-4 h-4" />
              EOQ Optimizer
            </button>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 1: ABC PARETO ANALYSIS */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'abc' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {/* Measure Toggle */}
              <div>
                <span className="font-semibold text-slate-700 mr-2">Evaluation Measure:</span>
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                  <button
                    onClick={() => setAbcMeasure('consumption_value')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      abcMeasure === 'consumption_value'
                        ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Consumption Value (Cost-based)
                  </button>
                  <button
                    onClick={() => setAbcMeasure('revenue')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      abcMeasure === 'revenue'
                        ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Annual Revenue
                  </button>
                </div>
              </div>

              {/* Thresholds Input */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Thresholds:</span>
                <span className="text-slate-700 font-semibold">A ≤ {thresholdA}%</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-700 font-semibold">B ≤ {thresholdB}%</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-700 font-semibold">C &gt; {thresholdB}%</span>
              </div>
            </div>

            {/* Data Provenance Badge & Refresh */}
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
                <Database className="w-3 h-3" />
                MySQL Organic Catalog
              </span>
              <button
                onClick={loadAbcData}
                disabled={abcLoading}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-colors"
                title="Refresh ABC Analysis"
              >
                <RefreshCw className={`w-4 h-4 ${abcLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Warnings & Notices */}
          {abcResponse?.summary.warnings && abcResponse.summary.warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                {abcResponse.summary.warnings.map((w, idx) => (
                  <p key={idx}>{w}</p>
                ))}
              </div>
            </div>
          )}

          {abcLoading && (
            <div className="p-8 bg-white rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
              <span className="text-xs font-medium text-slate-500">Computing Pareto distribution across catalog...</span>
            </div>
          )}

          {abcError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{abcError}</span>
              </div>
              <button
                onClick={loadAbcData}
                className="px-3 py-1 bg-white border border-rose-300 rounded-lg font-semibold text-rose-700 hover:bg-rose-100 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          )}

          {/* ABC Summary Cards */}
          {abcResponse && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Class A */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-600" />
                    Category A (High Value)
                  </span>
                  <Badge variant="green" size="sm">
                    {abcResponse.summary.classAValueSharePercent}% Value
                  </Badge>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900">
                    {abcResponse.summary.classACount} SKUs{' '}
                    <span className="text-xs font-normal text-slate-500">
                      ({abcResponse.summary.classAItemSharePercent}% of catalog)
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-emerald-700 mt-1">
                    ${abcResponse.summary.classAValue.toLocaleString()} total contribution
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    Top-tier contributors. Tight perpetual inventory control, daily cycle counts, and buffer protection.
                  </p>
                </div>
              </div>

              {/* Class B */}
              <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/40 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-sky-100">
                  <span className="text-xs font-bold text-sky-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-sky-600" />
                    Category B (Moderate Velocity)
                  </span>
                  <Badge variant="blue" size="sm">
                    {abcResponse.summary.classBValueSharePercent}% Value
                  </Badge>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900">
                    {abcResponse.summary.classBCount} SKUs{' '}
                    <span className="text-xs font-normal text-slate-500">
                      ({abcResponse.summary.classBItemSharePercent}% of catalog)
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-sky-700 mt-1">
                    ${abcResponse.summary.classBValue.toLocaleString()} total contribution
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    Moderate turnover items. Managed via standard bi-weekly periodic reviews and automated replenishment.
                  </p>
                </div>
              </div>

              {/* Class C */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-slate-500" />
                    Category C (Low Value / Bulk)
                  </span>
                  <Badge variant="slate" size="sm">
                    {abcResponse.summary.classCValueSharePercent}% Value
                  </Badge>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900">
                    {abcResponse.summary.classCCount} SKUs{' '}
                    <span className="text-xs font-normal text-slate-500">
                      ({abcResponse.summary.classCItemSharePercent}% of catalog)
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 mt-1">
                    ${abcResponse.summary.classCValue.toLocaleString()} total contribution
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    Low individual value. Order in larger batches with relaxed policies to minimize purchase order overhead.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pareto Chart */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Pareto Cumulative Distribution Curve
                </h3>
                <p className="text-xs text-slate-500">
                  {abcResponse?.summary.measureLabel}: Individual share % (Bars) alongside cumulative contribution curve (Line)
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  Item Share %
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Cumulative %
                </span>
              </div>
            </div>

            <div className="h-64 mt-4 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={paretoChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} unit="%" />
                  <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={11} tickLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-lg text-xs space-y-1">
                          <div className="font-bold text-slate-900">{d.fullName} ({d.name})</div>
                          <div className="text-slate-600">Class: <strong>Class {d.classification}</strong></div>
                          <div className="text-slate-600">Contribution: <strong>${d.contribution.toLocaleString()}</strong></div>
                          <div className="text-emerald-600">Share: <strong>{d.share}%</strong></div>
                          <div className="text-amber-600">Cumulative: <strong>{d.cumulative}%</strong></div>
                        </div>
                      );
                    }}
                  />
                  <Bar yAxisId="left" dataKey="share" name="Item Share %" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative %" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Searchable Product Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  ABC Inventory Classification Matrix & Action Policies
                </h3>
                <p className="text-xs text-slate-500">
                  Detailed SKU breakdown with assigned strategic governance logic
                </p>
              </div>

              {/* Table Search & Filter Controls */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search SKU or name..."
                    value={abcSearch}
                    onChange={(e) => setAbcSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                  {(['ALL', 'A', 'B', 'C'] as const).map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setAbcClassFilter(cls)}
                      className={`px-2 py-1 rounded font-medium transition-all ${
                        abcClassFilter === cls
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">SKU / Item</th>
                    <th className="py-3 px-4">Annual Units</th>
                    <th className="py-3 px-4">Rate ({abcMeasure === 'consumption_value' ? 'Cost' : 'Price'})</th>
                    <th className="py-3 px-4">Contribution</th>
                    <th className="py-3 px-4">Share %</th>
                    <th className="py-3 px-4">Turnover</th>
                    <th className="py-3 px-4">DSI</th>
                    <th className="py-3 px-4">Strategic Governance Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAbcItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-400">
                        #{item.rank}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block font-bold text-xs px-2.5 py-0.5 rounded-full ${
                            item.classification === 'A'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : item.classification === 'B'
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          Class {item.classification}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{item.sku}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-800 font-medium">
                        {item.annualQuantity.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {item.isCostMissing && abcMeasure === 'consumption_value' ? (
                          <span className="text-amber-600 font-medium">Cost N/A</span>
                        ) : (
                          `$${item.unitMeasureRate.toFixed(2)}`
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        ${item.contributionValue.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900">{item.valueSharePercent}%</span>
                        <span className="text-[10px] text-slate-400 block">cum. {item.cumulativeValueSharePercent}%</span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {item.turnoverRatio}x / yr
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {item.daysSalesInventory} days
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-sm">
                        <div className="line-clamp-2" title={item.reason}>
                          {item.reason}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAbcItems.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No products match the selected search or classification filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 2: K-MEANS PRODUCT SEGMENTATION */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'segmentation' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {/* Cluster Count Selector */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Clusters (k):</span>
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                  {[2, 3, 4, 5].map((kVal) => (
                    <button
                      key={kVal}
                      onClick={() => {
                        setNClusters(kVal);
                        api.getSegmentation({ nClusters: kVal, useBenchmark: useBenchmarkSeg, retrain: true })
                          .then(setSegResponse);
                      }}
                      className={`px-2.5 py-1 rounded font-medium transition-all ${
                        nClusters === kVal
                          ? 'bg-white text-sky-700 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      k={kVal}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Provenance Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Variability Source:</span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useBenchmarkSeg}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setUseBenchmarkSeg(val);
                      api.getSegmentation({ nClusters, useBenchmark: val, retrain: true })
                        .then(setSegResponse);
                    }}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-slate-700">Include Benchmark Demand CV</span>
                </label>
              </div>
            </div>

            {/* Actions & Badges */}
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                segResponse?.isSyntheticDevelopment
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                <Database className="w-3 h-3" />
                {segResponse?.isSyntheticDevelopment ? 'Benchmark Dev Data' : 'MySQL Organic Data'}
              </span>

              <button
                onClick={() => loadSegmentation(true)}
                disabled={segLoading}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${segLoading ? 'animate-spin' : ''}`} />
                Retrain Model
              </button>
            </div>
          </div>

          {/* Developmental Warning Banner */}
          {segResponse?.isSyntheticDevelopment && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Developmental Results:</strong> Clustering incorporates synthetic benchmark demand variability (CV) for multi-dimensional segmentation prototyping. These represent exploratory operational groupings, not verified real-world customer segments.
              </div>
            </div>
          )}

          {segLoading && (
            <div className="p-8 bg-white rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-sky-600 animate-spin" />
              <span className="text-xs font-medium text-slate-500">Standardizing feature matrix and fitting K-Means...</span>
            </div>
          )}

          {segError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{segError}</span>
              </div>
              <button
                onClick={() => loadSegmentation(true)}
                className="px-3 py-1 bg-white border border-rose-300 rounded-lg font-semibold text-rose-700 hover:bg-rose-100 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          )}

          {segResponse && (
            <>
              {/* Silhouette Score & Pipeline Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Silhouette Score Evaluation
                    </span>
                    <div className="text-3xl font-extrabold text-sky-700 mt-2">
                      {typeof segResponse.silhouetteScore === 'number' ? segResponse.silhouetteScore.toFixed(3) : 'N/A'}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    {segResponse.silhouetteEvaluation}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Clustering Features
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {segResponse.featuresUsed.map((feat) => (
                        <span key={feat} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono">
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                    Preprocessed via scikit-learn StandardScaler (zero mean, unit variance).
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Model Persistence
                    </span>
                    <div className="text-xs font-mono text-slate-800 mt-2 break-all bg-slate-50 p-2 rounded border border-slate-100">
                      saved_models/kmeans_product_segmentation.joblib
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Pipeline serialised with joblib
                  </div>
                </div>
              </div>

              {/* Cluster Profile Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {segResponse.clusterProfiles.map((cp) => (
                  <div key={cp.clusterId} className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-sky-500" />
                        {cp.clusterLabel}
                      </span>
                      <Badge variant="blue" size="sm">
                        {cp.size} SKUs ({cp.itemSharePercent}%)
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Avg Daily Demand:</span>
                        <span className="font-semibold text-slate-800">{cp.avgDailyDemand} units/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Avg Demand CV:</span>
                        <span className="font-semibold text-slate-800">{cp.avgDemandVariabilityCv}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Avg Stock Level:</span>
                        <span className="font-semibold text-slate-800">{cp.avgCurrentStock} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Avg Days Remaining:</span>
                        <span className="font-semibold text-slate-800">{cp.avgDaysOfStockRemaining} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Stock / ROP Ratio:</span>
                        <span className="font-semibold text-slate-800">{cp.avgStockoutRiskRatio}x</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-lg">
                      {cp.description}
                    </div>
                  </div>
                ))}
              </div>

              {/* Product Cluster Membership Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Product Cluster Assignments & Feature Profiles
                    </h3>
                    <p className="text-xs text-slate-500">
                      Standardized feature attributes and assigned behavioral cluster
                    </p>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search SKU or name..."
                      value={segSearch}
                      onChange={(e) => setSegSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Cluster</th>
                        <th className="py-3 px-4">SKU / Item</th>
                        <th className="py-3 px-4">Daily Demand</th>
                        <th className="py-3 px-4">Demand CV</th>
                        <th className="py-3 px-4">Current Stock</th>
                        <th className="py-3 px-4">Days Remaining</th>
                        <th className="py-3 px-4">Stockout Ratio</th>
                        <th className="py-3 px-4">Wholesale Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSegProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="inline-block font-bold text-xs px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                              {p.clusterLabel}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{p.name}</div>
                            <div className="text-[11px] font-mono text-slate-400">{p.sku}</div>
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {p.dailyDemand} u/day
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            {p.demandVariabilityCv}
                          </td>

                          <td className="py-3.5 px-4 font-medium text-slate-800">
                            {p.currentStock} units
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            {p.daysOfStockRemaining} days
                          </td>

                          <td className="py-3.5 px-4 font-medium text-slate-700">
                            {p.stockoutRiskRatio}x
                          </td>

                          <td className="py-3.5 px-4 text-slate-700">
                            {p.costPrice !== null && p.costPrice !== undefined ? `$${p.costPrice.toFixed(2)}` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 3: ANOMALY DETECTION (ISOLATION FOREST) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'anomalies' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {/* Contamination Slider */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Contamination:</span>
                <input
                  type="range"
                  min="0.01"
                  max="0.15"
                  step="0.01"
                  value={contamination}
                  onChange={(e) => setContamination(parseFloat(e.target.value))}
                  className="w-24 accent-rose-600 cursor-pointer"
                />
                <span className="font-mono font-semibold text-slate-800">
                  {(contamination * 100).toFixed(0)}%
                </span>
              </div>

              {/* Data Origin Selector */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Data Origin:</span>
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                  <button
                    onClick={() => {
                      setUseBenchmarkAnom(true);
                      api.getAnomalies({ contamination, useBenchmark: true, retrain: true }).then(setAnomResponse);
                    }}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      useBenchmarkAnom
                        ? 'bg-white text-rose-700 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Benchmark Dev (730d)
                  </button>
                  <button
                    onClick={() => {
                      setUseBenchmarkAnom(false);
                      api.getAnomalies({ contamination, useBenchmark: false, retrain: true }).then(setAnomResponse);
                    }}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      !useBenchmarkAnom
                        ? 'bg-white text-rose-700 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Organic MySQL (Sales)
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                useBenchmarkAnom
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                <Database className="w-3 h-3" />
                {useBenchmarkAnom ? 'Benchmark Development Data' : 'MySQL Organic Sales'}
              </span>

              <button
                onClick={() => loadAnomalies(true)}
                disabled={anomLoading}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${anomLoading ? 'animate-spin' : ''}`} />
                Run Detection
              </button>
            </div>
          </div>

          {/* Insufficient Organic Data Guard Alert */}
          {anomResponse?.status === 'insufficient_organic_data' && (
            <div className="p-5 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-900">
                    Mathematically Insufficient Organic Data for Isolation Forest
                  </h4>
                  <p className="text-xs text-rose-700 mt-1">
                    {anomResponse.warnings[0]}
                  </p>
                  <p className="text-xs text-rose-600 mt-2">
                    An Isolation Forest requires at least 30 independent observations to fit multidimensional path lengths without generating spurious artifacts.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-rose-200/80 flex items-center gap-3">
                <button
                  onClick={() => {
                    setUseBenchmarkAnom(true);
                    api.getAnomalies({ contamination, useBenchmark: true, retrain: true }).then(setAnomResponse);
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5"
                >
                  Switch to Synthetic Benchmark (730 Days) <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {anomLoading && (
            <div className="p-8 bg-white rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-rose-600 animate-spin" />
              <span className="text-xs font-medium text-slate-500">Constructing observation tree matrix and computing Isolation Forest scores...</span>
            </div>
          )}

          {anomError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{anomError}</span>
              </div>
              <button
                onClick={() => loadAnomalies(true)}
                className="px-3 py-1 bg-white border border-rose-300 rounded-lg font-semibold text-rose-700 hover:bg-rose-100 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          )}

          {anomResponse && anomResponse.status === 'success' && (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Observations
                  </span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {anomResponse.totalObservations.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Recent 180 days across 12 SKUs
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-rose-200 bg-rose-50/20 shadow-xs">
                  <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                    Flagged Outliers
                  </span>
                  <div className="text-2xl font-bold text-rose-600 mt-1">
                    {anomResponse.anomalyCount}
                  </div>
                  <div className="text-[11px] text-rose-600 font-medium mt-1">
                    {anomResponse.anomalyRatePercent}% outlier rate
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Normal Events
                  </span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {anomResponse.normalCount.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Within expected variance
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Contamination Prior
                  </span>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    {(anomResponse.contamination * 100).toFixed(0)}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Expected statistical quantile
                  </div>
                </div>
              </div>

              {/* Explanatory Policy Alert */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <strong>Investigation Guidance:</strong> Flagged anomalies are unusual statistical events requiring operational inspection. They do not automatically signify fraud or data corruption, but may indicate bulk sales, delayed reporting, or sudden demand shocks.
                </div>
              </div>

              {/* Anomalies Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Flagged Operational Anomalies
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ranked by normalized anomaly severity score (highest deviance first)
                    </p>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search SKU or date..."
                      value={anomSearch}
                      onChange={(e) => setAnomSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Severity</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">SKU / Item</th>
                        <th className="py-3 px-4">Daily Qty</th>
                        <th className="py-3 px-4">Baseline</th>
                        <th className="py-3 px-4">Deviation</th>
                        <th className="py-3 px-4">Operational Explanation</th>
                        <th className="py-3 px-4">Investigation Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAnomalies.map((anom) => (
                        <tr key={anom.observationId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block font-bold text-xs px-2.5 py-0.5 rounded-full ${
                                anom.anomalyScore >= 0.7
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {(anom.anomalyScore * 100).toFixed(0)}% Score
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {anom.date}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{anom.productName}</div>
                            <div className="text-[11px] font-mono text-slate-400">{anom.sku}</div>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {anom.dailyQuantity} units
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            {anom.baselineDailyDemand} u/day
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-rose-600">
                            {anom.demandDeviation > 0 ? `+${anom.demandDeviation}` : anom.demandDeviation}
                          </td>

                          <td className="py-3.5 px-4 text-slate-700 max-w-sm">
                            {anom.explanation}
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 max-w-xs text-[11px]">
                            {anom.recommendedInvestigation}
                          </td>
                        </tr>
                      ))}
                      {filteredAnomalies.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No anomalies match the current search filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 4: INTERACTIVE EOQ CALCULATOR */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'eoq' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                Economic Order Quantity (EOQ) Tactical Optimizer
              </h3>
              <p className="text-xs text-slate-500">
                Determines order size that minimizes the sum of annual ordering and holding expenses
              </p>
            </div>
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700">
              EOQ = √[(2 · D · S) / H]
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Inputs */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Annual Demand (D) — Units/Year
                </label>
                <input
                  type="number"
                  value={annualDemand}
                  onChange={(e) => setAnnualDemand(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                />
                <span className="text-[10px] text-slate-400">Anticipated sales demand for 12 months</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ordering / Setup Cost (S) — $ / Order
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={orderCost}
                  onChange={(e) => setOrderCost(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                />
                <span className="text-[10px] text-slate-400">Fixed shipping, handling, and PO admin expense</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Annual Holding Cost per Unit (H) — $ / Unit / Year
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={holdingCost}
                  onChange={(e) => setHoldingCost(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                />
                <span className="text-[10px] text-slate-400">Warehouse storage, insurance, capital interest, shrinkage</span>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Optimal Order Quantity
                  </span>
                  <div className="text-3xl font-extrabold text-emerald-700 mt-2">
                    {eoq} <span className="text-sm font-medium text-emerald-600">units / order</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    Ordering in batches of {eoq} units balances procurement and warehouse storage expense at absolute minimum total cost.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-200/60 text-xs text-emerald-800 font-medium">
                  Orders per Year: <strong>{totalOrdersPerYear} cycles</strong>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block pb-1 border-b border-slate-200">
                  Annual Cost Breakdown
                </span>

                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Annual Ordering Cost:</span>
                  <span className="font-semibold text-slate-800">${annualOrderCost.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Annual Carrying Cost:</span>
                  <span className="font-semibold text-slate-800">${annualCarryingCost.toFixed(2)}</span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                  <span>Total Annual Inventory Cost:</span>
                  <span className="text-emerald-700">${totalInventoryCost.toFixed(2)}</span>
                </div>

                <p className="text-[11px] text-slate-400 pt-1">
                  At the EOQ sweet spot, annual ordering cost equals annual carrying cost.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductIntelligencePage;
