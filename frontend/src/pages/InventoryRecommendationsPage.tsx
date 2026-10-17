import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  Calculator,
  TrendingDown,
  TrendingUp,
  Package,
  Truck,
  Info,
  Search,
  ArrowUpDown,
  ChevronRight,
  X,
  ExternalLink,
  ShieldAlert,
  DollarSign,
  Clock,
  Sparkles,
  Boxes,
  ShoppingCart,
  Check,
} from 'lucide-react';
import {
  InventoryRecommendation,
  InventoryRecommendationsResponse,
  RecommendationParameters,
  ProductCategory,
  InventoryStatus,
} from '../types';
import { api } from '../services/api';

interface InventoryRecommendationsPageProps {
  onQuickReorder: (productId: string, qty: number) => void;
  onNavigateToForecast?: (productId: string) => void;
}

export const InventoryRecommendationsPage: React.FC<InventoryRecommendationsPageProps> = ({
  onQuickReorder,
  onNavigateToForecast,
}) => {
  // ── Server State ──────────────────────────────────────────────
  const [data, setData] = useState<InventoryRecommendationsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // ── Configurable Parameters (User Tuning) ─────────────────────
  const [params, setParams] = useState<RecommendationParameters>({
    targetCoverageDays: 14,
    defaultLeadTimeDays: 7,
    defaultSafetyStockDays: 7,
    overstockDaysThreshold: 45,
    serviceLevelZ: 1.645,
    useMlForecast: false,
  });
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);

  // ── UI Filter & Sort State ────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<keyof InventoryRecommendation | 'urgency'>('urgency');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // ── Detail Modal State ────────────────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState<InventoryRecommendation | null>(null);
  const [orderModalProduct, setOrderModalProduct] = useState<InventoryRecommendation | null>(null);
  const [customOrderQty, setCustomOrderQty] = useState<number>(0);

  // ── Fetch Recommendations from Backend ────────────────────────
  const fetchRecommendations = async (overrideParams?: RecommendationParameters) => {
    const p = overrideParams || params;
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await api.getRecommendations({
        targetCoverageDays: p.targetCoverageDays,
        defaultLeadTimeDays: p.defaultLeadTimeDays,
        defaultSafetyStockDays: p.defaultSafetyStockDays,
        overstockDaysThreshold: p.overstockDaysThreshold,
        serviceLevelZ: p.serviceLevelZ,
        useMlForecast: p.useMlForecast,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch inventory recommendations');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleApplyParams = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecommendations(params);
    setShowConfigPanel(false);
  };

  // ── Filter & Sort Logic ───────────────────────────────────────
  const filteredRecommendations = useMemo(() => {
    if (!data?.recommendations) return [];

    let list = [...data.recommendations];

    // Status filter
    if (statusFilter !== 'All') {
      list = list.filter((r) => r.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'All') {
      list = list.filter((r) => r.category === categoryFilter);
    }

    // Search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.supplier.toLowerCase().includes(q),
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortField === 'urgency') {
        const priority: Record<InventoryStatus, number> = {
          critical: 1,
          reorder_now: 2,
          healthy: 3,
          overstock: 4,
        };
        const pDiff = (priority[a.status] || 5) - (priority[b.status] || 5);
        if (pDiff !== 0) return sortAsc ? pDiff : -pDiff;
        return (a.daysOfStockRemaining ?? 999) - (b.daysOfStockRemaining ?? 999);
      }

      const valA = a[sortField];
      const valB = b[sortField];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (valA < valB) return sortAsc ? -1 : 1;
      return sortAsc ? 1 : -1;
    });

    return list;
  }, [data, statusFilter, categoryFilter, searchTerm, sortField, sortAsc]);

  const handleSort = (field: keyof InventoryRecommendation | 'urgency') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // ── Status Visual Badges ──────────────────────────────────────
  const renderStatusBadge = (status: InventoryStatus, label: string) => {
    switch (status) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            {label}
          </span>
        );
      case 'reorder_now':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {label}
          </span>
        );
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {label}
          </span>
        );
      case 'overstock':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            {label}
          </span>
        );
    }
  };

  const renderDemandSourceBadge = (source: string, label: string) => {
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
    if (source === 'organic_sales') {
      colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (source === 'synthetic_benchmark' || source === 'ml_forecast') {
      colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    } else if (source === 'catalog_velocity') {
      colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
    }

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${colorClass}`}
        title={label}
      >
        <Sparkles className="w-2.5 h-2.5" />
        {source === 'organic_sales'
          ? 'Organic Sales'
          : source === 'catalog_velocity'
          ? 'Catalog Velocity'
          : 'Benchmark ML Prior'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Actions Banner ───────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <Boxes className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Smart Inventory Recommendations
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Algorithmic Sizing
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Transparent reorder points, safety stock buffers, and lead-time coverage calculations
              designed to proactively prevent stockouts while preventing overstock capital lockup.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 shadow-xs ${
                showConfigPanel
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Configurable Thresholds</span>
            </button>

            <button
              onClick={() => fetchRecommendations()}
              disabled={isRefreshing}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Recommendations</span>
            </button>
          </div>
        </div>

        {/* ── Threshold Parameters Control Panel (Expandable) ─── */}
        {showConfigPanel && (
          <form
            onSubmit={handleApplyParams}
            className="mt-5 pt-4 border-t border-slate-100 bg-slate-50/70 -mx-5 -mb-5 p-5 rounded-b-xl border-x-0 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Configurable Sizing & Policy Parameters
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                Adjust calculation inputs live across all inventory algorithms
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Target Coverage (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={params.targetCoverageDays}
                  onChange={(e) =>
                    setParams({ ...params, targetCoverageDays: parseInt(e.target.value) || 14 })
                  }
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400">Order-up-to coverage target</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Fallback Safety Stock (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={params.defaultSafetyStockDays}
                  onChange={(e) =>
                    setParams({ ...params, defaultSafetyStockDays: parseInt(e.target.value) || 7 })
                  }
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400">Used if history &lt; 30 orders</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Fallback Lead Time (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={params.defaultLeadTimeDays}
                  onChange={(e) =>
                    setParams({ ...params, defaultLeadTimeDays: parseInt(e.target.value) || 7 })
                  }
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400">Applied if supplier days missing</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Overstock Threshold (Days)
                </label>
                <input
                  type="number"
                  min="15"
                  max="180"
                  value={params.overstockDaysThreshold}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      overstockDaysThreshold: parseFloat(e.target.value) || 45,
                    })
                  }
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400">Days of supply before overstock</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Cycle Service Level (Z)
                </label>
                <select
                  value={params.serviceLevelZ}
                  onChange={(e) =>
                    setParams({ ...params, serviceLevelZ: parseFloat(e.target.value) })
                  }
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value={1.28}>90% Service Level (Z = 1.28)</option>
                  <option value={1.645}>95% Service Level (Z = 1.645)</option>
                  <option value={1.96}>97.5% Service Level (Z = 1.96)</option>
                  <option value={2.326}>99% Service Level (Z = 2.326)</option>
                </select>
                <span className="text-[10px] text-slate-400">Statistical safety stock factor</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={params.useMlForecast}
                  onChange={(e) => setParams({ ...params, useMlForecast: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>
                  Augment with ML demand forecast inference (XGBoost Benchmark Prior)
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setParams({
                      targetCoverageDays: 14,
                      defaultLeadTimeDays: 7,
                      defaultSafetyStockDays: 7,
                      overstockDaysThreshold: 45,
                      serviceLevelZ: 1.645,
                      useMlForecast: false,
                    })
                  }
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  Reset Defaults
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Apply &amp; Recalculate
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* ── Summary KPI Cards ─────────────────────────────────── */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {/* Critical Card */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'critical' ? 'All' : 'critical')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              statusFilter === 'critical'
                ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20'
                : 'bg-white border-slate-200/90 hover:border-rose-200 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-rose-700">Critical Stock</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {data.summary.criticalCount}
              </span>
              <span className="text-[11px] text-rose-600 font-medium">SKUs</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Stockout before delivery</p>
          </div>

          {/* Reorder Now Card */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'reorder_now' ? 'All' : 'reorder_now')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              statusFilter === 'reorder_now'
                ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200/90 hover:border-amber-200 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-amber-700">Reorder Now</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {data.summary.reorderNowCount}
              </span>
              <span className="text-[11px] text-amber-600 font-medium">SKUs</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">At or below reorder point</p>
          </div>

          {/* Healthy Card */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'healthy' ? 'All' : 'healthy')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              statusFilter === 'healthy'
                ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200/90 hover:border-emerald-200 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-emerald-700">Healthy Stock</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {data.summary.healthyCount}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">SKUs</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Sufficient expected coverage</p>
          </div>

          {/* Overstock Card */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'overstock' ? 'All' : 'overstock')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              statusFilter === 'overstock'
                ? 'bg-sky-50/80 border-sky-300 ring-2 ring-sky-500/20'
                : 'bg-white border-slate-200/90 hover:border-sky-200 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-sky-700">Overstocked</span>
              <TrendingDown className="w-4 h-4 text-sky-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {data.summary.overstockedCount}
              </span>
              <span className="text-[11px] text-sky-600 font-medium">SKUs</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Exceeds coverage target</p>
          </div>

          {/* Total Replenishment Units */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-white">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Suggested Order</span>
              <Package className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {data.summary.totalSuggestedOrderUnits}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Units</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Total replenishment need</p>
          </div>

          {/* Total Replenishment Cost */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-white">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Estimated Cost</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">
                ${data.summary.totalEstimatedReplenishmentCost.toLocaleString()}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              At wholesale cost price
              {data.summary.hasMissingCosts && (
                <span className="block text-amber-600 font-medium">*Partial: some SKUs missing cost price</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── Filters & Search Bar ──────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search product, SKU or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="All">All Statuses</option>
              <option value="critical">Critical</option>
              <option value="reorder_now">Reorder Now</option>
              <option value="healthy">Healthy</option>
              <option value="overstock">Overstocked</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-slate-500">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="All">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Apparel">Apparel</option>
              <option value="Home & Kitchen">Home & Kitchen</option>
              <option value="Health & Personal Care">Health & Personal Care</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Sports & Outdoors">Sports & Outdoors</option>
            </select>
          </div>

          {(statusFilter !== 'All' || categoryFilter !== 'All' || searchTerm) && (
            <button
              onClick={() => {
                setStatusFilter('All');
                setCategoryFilter('All');
                setSearchTerm('');
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Loading State ─────────────────────────────────────── */}
      {loading && !data && (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-slate-200/90 gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-700">
            Running inventory replenishment calculations across all catalog SKUs...
          </p>
          <p className="text-xs text-slate-400">
            Querying MySQL sales velocity and calculating lead-time safety stock buffers
          </p>
        </div>
      )}

      {/* ── Error State ───────────────────────────────────────── */}
      {error && !loading && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center flex flex-col items-center justify-center gap-2">
          <AlertCircle className="w-8 h-8 text-rose-600" />
          <h3 className="text-sm font-bold text-rose-900">Failed to Load Recommendations</h3>
          <p className="text-xs text-rose-700 max-w-md">{error}</p>
          <button
            onClick={() => fetchRecommendations()}
            className="mt-2 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            Retry Calculation
          </button>
        </div>
      )}

      {/* ── Main Recommendation Table ─────────────────────────── */}
      {!loading && data && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold select-none">
                  <th
                    onClick={() => handleSort('productName')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/70"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Product / SKU</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('currentStock')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100/70 text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Stock Position</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('dailyDemand')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100/70"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Daily Demand</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3">
                    <span title="Expected Lead-Time Demand = Daily Demand × Supplier Lead Time">
                      Lead Time &amp; LTD
                    </span>
                  </th>
                  <th className="py-3 px-3">
                    <span title="Safety Stock Buffer (Statistical or Fallback Estimate)">
                      Safety Stock
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('reorderPoint')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100/70 text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>ROP</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('daysOfStockRemaining')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100/70 text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Days Left</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100/70 text-center"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('suggestedReplenishmentQty')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100/70 text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Suggested Order</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecommendations.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="w-8 h-8 text-slate-300" />
                        <p className="font-semibold text-sm text-slate-700">
                          No matching inventory recommendations
                        </p>
                        <p className="text-xs text-slate-400">
                          Try adjusting search keywords or status filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecommendations.map((rec) => {
                    const isUrgent = rec.status === 'critical' || rec.status === 'reorder_now';
                    return (
                      <tr
                        key={rec.productId}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          rec.status === 'critical'
                            ? 'bg-rose-50/20'
                            : rec.status === 'reorder_now'
                            ? 'bg-amber-50/15'
                            : ''
                        }`}
                      >
                        {/* Product / SKU */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 hover:text-emerald-700 cursor-pointer"
                               onClick={() => setSelectedProduct(rec)}>
                            {rec.productName}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span className="font-mono text-slate-500">{rec.sku}</span>
                            <span>•</span>
                            <span>{rec.category}</span>
                          </div>
                        </td>

                        {/* Stock Position (Current + Incoming) */}
                        <td className="py-3 px-3 text-right">
                          <div className="font-semibold text-slate-900">
                            {rec.currentStock} <span className="text-[10px] text-slate-400">on hand</span>
                          </div>
                          {rec.incomingStock > 0 ? (
                            <div className="text-[10px] text-emerald-600 font-medium flex items-center justify-end gap-1">
                              <Truck className="w-2.5 h-2.5" />
                              <span>+{rec.incomingStock} incoming</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400">0 incoming</div>
                          )}
                        </td>

                        {/* Daily Demand & Source */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">
                            {rec.dailyDemand.toFixed(1)} / day
                          </div>
                          <div className="mt-0.5">
                            {renderDemandSourceBadge(rec.demandSource, rec.demandSourceLabel)}
                          </div>
                        </td>

                        {/* Lead Time & LTD */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800 flex items-center gap-1">
                            <span>{rec.supplierLeadTimeDays} days</span>
                            {rec.isLeadTimeFallback && (
                              <span
                                title="Default lead time fallback applied"
                                className="text-[10px] text-amber-600 font-bold"
                              >
                                *
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            LTD: {rec.expectedLeadTimeDemand.toFixed(1)}
                          </div>
                        </td>

                        {/* Safety Stock */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800 flex items-center gap-1">
                            <span>{rec.safetyStock} units</span>
                            {rec.isSafetyStockEstimated && (
                              <span
                                title="Safety stock estimated via fallback buffer"
                                className="text-[10px] text-amber-600 font-bold"
                              >
                                ~
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[110px]" title={rec.calculationDetails.safetyStockMethod}>
                            {rec.isSafetyStockEstimated ? 'Fallback Buffer' : 'Statistical (Z×σ×√L)'}
                          </div>
                        </td>

                        {/* Reorder Point */}
                        <td className="py-3 px-3 text-right">
                          <div className="font-bold text-slate-900">
                            {rec.reorderPoint}
                          </div>
                          <div className="text-[10px] text-slate-400">trigger level</div>
                        </td>

                        {/* Days Remaining */}
                        <td className="py-3 px-3 text-right">
                          {rec.daysOfStockRemaining !== null ? (
                            <div>
                              <span
                                className={`font-bold ${
                                  rec.daysOfStockRemaining < rec.supplierLeadTimeDays
                                    ? 'text-rose-600'
                                    : rec.daysOfStockRemaining < rec.supplierLeadTimeDays * 1.5
                                    ? 'text-amber-600'
                                    : rec.daysOfStockRemaining > 45
                                    ? 'text-sky-600'
                                    : 'text-emerald-600'
                                }`}
                              >
                                {rec.daysOfStockRemaining.toFixed(1)}d
                              </span>
                              <div className="text-[10px] text-slate-400">burn rate</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Zero demand</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          {renderStatusBadge(rec.status, rec.statusLabel)}
                        </td>

                        {/* Suggested Order Qty & Cost */}
                        <td className="py-3 px-3 text-right">
                          {rec.suggestedReplenishmentQty > 0 ? (
                            <div>
                              <span className="font-bold text-emerald-700">
                                +{rec.suggestedReplenishmentQty} units
                              </span>
                              <div className="text-[10px] text-slate-500">
                                {rec.estimatedReplenishmentCost !== null && rec.estimatedReplenishmentCost !== undefined ? (
                                  `~$${rec.estimatedReplenishmentCost.toLocaleString()}`
                                ) : (
                                  <span className="text-amber-600 italic">Cost N/A</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-medium">None (0)</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedProduct(rec)}
                              title="Inspect math & formulas"
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                            >
                              <Calculator className="w-3 h-3 text-emerald-600" />
                              <span>Math</span>
                            </button>

                            {rec.suggestedReplenishmentQty > 0 && (
                              <button
                                onClick={() => {
                                  setOrderModalProduct(rec);
                                  setCustomOrderQty(rec.suggestedReplenishmentQty);
                                }}
                                title="Draft purchase replenishment"
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center gap-1 transition-colors shadow-xs"
                              >
                                <ShoppingCart className="w-3 h-3" />
                                <span>Order</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Governance Note */}
          <div className="p-3 bg-slate-50/70 border-t border-slate-200 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>
                <b>Legend:</b> <span className="font-bold">*</span> Fallback lead time used •{' '}
                <span className="font-bold">~</span> Safety stock buffer estimated due to limited organic history (&lt; 30 orders)
              </span>
            </div>
            <span>
              Showing {filteredRecommendations.length} of {data.summary.totalProducts} catalog products
            </span>
          </div>
        </div>
      )}

      {/* ── Detailed Explainability Modal (Mathematical Transparency) ── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedProduct.productName}
                  </h2>
                  {renderStatusBadge(selectedProduct.status, selectedProduct.statusLabel)}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="font-mono text-slate-700">SKU: {selectedProduct.sku}</span>
                  <span>•</span>
                  <span>Category: {selectedProduct.category}</span>
                  <span>•</span>
                  <span>Supplier: {selectedProduct.supplier}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Explanation Highlight */}
            <div className={`p-3.5 rounded-xl border text-xs ${
              selectedProduct.status === 'critical'
                ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                : selectedProduct.status === 'reorder_now'
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : selectedProduct.status === 'overstock'
                ? 'bg-sky-50/70 border-sky-200 text-sky-900'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}>
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <Info className="w-4 h-4" />
                <span>Inventory Status Assessment:</span>
              </div>
              <p>{selectedProduct.statusExplanation}</p>
            </div>

            {/* Warnings & Governance Alert Box */}
            {selectedProduct.warnings.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Data Reliability &amp; Estimation Warnings:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-amber-800">
                  {selectedProduct.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Exact Formula Breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>Step-by-Step Mathematical Calculation Breakdown</span>
              </h3>

              <div className="space-y-2.5 text-xs text-slate-700">
                {/* Step 1: Expected Lead-Time Demand */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>1. Expected Lead-Time Demand (LTD)</span>
                    <span className="font-mono text-emerald-700">
                      {selectedProduct.expectedLeadTimeDemand.toFixed(1)} units
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Formula: {selectedProduct.calculationDetails.expectedLeadTimeDemandFormula}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    = {selectedProduct.dailyDemand.toFixed(2)} units/day × {selectedProduct.supplierLeadTimeDays} lead days
                  </div>
                </div>

                {/* Step 2: Safety Stock */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>2. Safety Stock Buffer (SS)</span>
                    <span className="font-mono text-emerald-700">
                      {selectedProduct.safetyStock} units
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Method: {selectedProduct.calculationDetails.safetyStockMethod}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    {selectedProduct.isSafetyStockEstimated
                      ? `Estimated via configurable fallback buffer (${params.defaultSafetyStockDays} days of daily demand)`
                      : selectedProduct.calculationDetails.zScoreExplanation ||
                        `Sized with one-sided cycle service level multiplier Z = ${selectedProduct.calculationDetails.serviceLevelZ}`}
                  </div>
                </div>

                {/* Step 3: Reorder Point */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>3. Reorder Point (ROP)</span>
                    <span className="font-mono text-emerald-700">
                      {selectedProduct.reorderPoint} units
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Formula: {selectedProduct.calculationDetails.reorderPointFormula}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    = {selectedProduct.expectedLeadTimeDemand.toFixed(1)} (LTD) + {selectedProduct.safetyStock} (SS) = {selectedProduct.reorderPoint} units
                  </div>
                </div>

                {/* Step 4: Days of Stock Remaining */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>4. Days of Stock Remaining (Burn Rate)</span>
                    <span className="font-mono text-emerald-700">
                      {selectedProduct.daysOfStockRemaining !== null
                        ? `${selectedProduct.daysOfStockRemaining.toFixed(1)} days`
                        : 'Indefinite (0 demand)'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Formula: {selectedProduct.calculationDetails.daysOfStockRemainingFormula}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    = {selectedProduct.currentStock} current stock ÷ {selectedProduct.dailyDemand.toFixed(2)} daily demand
                  </div>
                </div>

                {/* Step 5: Suggested Replenishment Quantity */}
                <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>5. Suggested Replenishment Quantity</span>
                    <span className="font-mono text-emerald-700 text-sm">
                      +{selectedProduct.suggestedReplenishmentQty} units
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Target Stock Level: {selectedProduct.calculationDetails.targetStockLevel} units ({selectedProduct.calculationDetails.targetCoverageDays} days coverage)
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    Net Inventory = {selectedProduct.currentStock} (on hand) + {selectedProduct.incomingStock} (incoming) = {selectedProduct.netStock} units
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">
                    Suggested Order = max(0, {selectedProduct.calculationDetails.targetStockLevel} - {selectedProduct.netStock}) = {selectedProduct.suggestedReplenishmentQty} units
                    {selectedProduct.estimatedReplenishmentCost !== null && selectedProduct.estimatedReplenishmentCost !== undefined ? (
                      ` (est. cost: $${selectedProduct.estimatedReplenishmentCost.toLocaleString()})`
                    ) : (
                      ' (est. cost: N/A - wholesale cost missing)'
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Advisory Disclaimer */}
            <div className="text-[11px] text-slate-400 italic">
              Notice: Algorithmic inventory recommendations are calculated for decision-support and replenishment planning.
              They do not constitute automated or legally binding purchase orders.
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              {onNavigateToForecast && (
                <button
                  onClick={() => {
                    onNavigateToForecast(selectedProduct.productId);
                    setSelectedProduct(null);
                  }}
                  className="px-3.5 py-1.5 text-xs text-indigo-700 hover:text-indigo-800 font-semibold flex items-center gap-1.5 mr-auto"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>View Full ML Forecast</span>
                </button>
              )}

              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg"
              >
                Close
              </button>

              {selectedProduct.suggestedReplenishmentQty > 0 && (
                <button
                  onClick={() => {
                    const p = selectedProduct;
                    setSelectedProduct(null);
                    setOrderModalProduct(p);
                    setCustomOrderQty(p.suggestedReplenishmentQty);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Create Replenishment Order</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Replenishment Confirmation Modal ─────────────── */}
      {orderModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                <Truck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Simulate Purchase Order
                </h3>
                <p className="text-xs text-slate-500">
                  {orderModalProduct.productName} ({orderModalProduct.sku})
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-50">
                <span className="text-slate-500">Current Stock on Hand:</span>
                <span className="font-semibold">{orderModalProduct.currentStock} units</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-50">
                <span className="text-slate-500">Reorder Point (ROP):</span>
                <span className="font-semibold">{orderModalProduct.reorderPoint} units</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-50">
                <span className="text-slate-500">Supplier Unit Cost:</span>
                <span className="font-semibold">
                  {orderModalProduct.costPrice !== null && orderModalProduct.costPrice !== undefined
                    ? `$${orderModalProduct.costPrice.toFixed(2)}`
                    : 'Cost N/A (Missing from supplier catalog)'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Order Quantity (Units):
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={customOrderQty}
                  onChange={(e) => setCustomOrderQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
                <span>Total Estimated Cost:</span>
                <span className="text-emerald-700">
                  {orderModalProduct.costPrice !== null && orderModalProduct.costPrice !== undefined
                    ? `$${(customOrderQty * orderModalProduct.costPrice).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : 'Cost N/A'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setOrderModalProduct(null)}
                className="px-3.5 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (customOrderQty > 0) {
                    onQuickReorder(orderModalProduct.productId, customOrderQty);
                    setOrderModalProduct(null);
                    // Refresh recommendations after dispatch
                    setTimeout(() => fetchRecommendations(), 500);
                  }
                }}
                disabled={customOrderQty <= 0}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Purchase Dispatch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
