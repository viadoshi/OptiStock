import React, { useMemo } from 'react';
import {
  DollarSign,
  Package,
  TrendingUp,
  Cpu,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Zap,
  Clock,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Product, StockAlert, PageId, DashboardMetrics } from '../types';
import { StatCard } from '../components/common/StatCard';
import { StockStatusBadge } from '../components/common/Badge';
import {
  mockWeeklySalesDemandChart,
  mockCategoryBreakdown,
  mockDashboardMetrics,
} from '../data/mockData';

interface DashboardPageProps {
  products: Product[];
  alerts: StockAlert[];
  metrics?: DashboardMetrics | null;
  onNavigate: (page: PageId) => void;
  onQuickReorder: (productId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  products,
  alerts,
  metrics,
  onNavigate,
  onQuickReorder,
}) => {
  const criticalAlerts = alerts.filter((a) => !a.resolved);
  const lowStockItems = products.filter(
    (p) => p.status === 'low_stock' || p.status === 'out_of_stock'
  );

  // Compute live metrics from FastAPI / MySQL or fallback gracefully
  const effectiveMetrics = useMemo(() => {
    const computedInvValue = products.reduce((acc, p) => acc + p.currentStock * p.costPrice, 0);
    return {
      totalInventoryValue: metrics?.totalInventoryValue ?? (computedInvValue > 0 ? computedInvValue : mockDashboardMetrics.totalInventoryValue),
      inventoryValueChangePercent: metrics?.inventoryValueChangePercent ?? mockDashboardMetrics.inventoryValueChangePercent,
      totalActiveSkus: metrics?.totalActiveSkus ?? (products.length > 0 ? products.length : mockDashboardMetrics.totalActiveSkus),
      totalMonthlyRevenue: metrics?.totalMonthlyRevenue ?? mockDashboardMetrics.totalMonthlyRevenue,
      monthlyRevenueChangePercent: metrics?.monthlyRevenueChangePercent ?? mockDashboardMetrics.monthlyRevenueChangePercent,
      forecastModelAccuracy: metrics?.forecastModelAccuracy ?? mockDashboardMetrics.forecastModelAccuracy,
      criticalAlertsCount: metrics?.criticalAlertsCount ?? criticalAlerts.length,
      stockoutPreventionRate: metrics?.stockoutPreventionRate ?? mockDashboardMetrics.stockoutPreventionRate,
    };
  }, [metrics, products, criticalAlerts.length]);

  // Compute live category value breakdown from actual products
  const categoryBreakdown = useMemo(() => {
    if (!products.length) return mockCategoryBreakdown;
    const totalVal = products.reduce((acc, p) => acc + p.currentStock * p.costPrice, 0) || 1;
    const categoryTotals: Record<string, number> = {};
    products.forEach((p) => {
      categoryTotals[p.category] = (categoryTotals[p.category] || 0) + (p.currentStock * p.costPrice);
    });
    const colors: Record<string, string> = {
      'Electronics': '#16a34a',
      'Office Supplies': '#3b82f6',
      'Home & Kitchen': '#f59e0b',
      'Health & Personal Care': '#8b5cf6',
      'Sports & Outdoors': '#06b6d4',
      'Apparel': '#ec4899',
    };
    return Object.entries(categoryTotals).map(([name, val]) => ({
      name,
      value: Math.round((val / totalVal) * 100),
      color: colors[name] || '#64748b',
    }));
  }, [products]);

  return (
    <div className="space-y-6">
      {/* Top Banner Notice: Welcome & AI Model Health */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-400/30 mb-2">
            <Zap className="w-3.5 h-3.5" />
            AI Demand Engine Active • Daily Retraining Completed
          </div>
          <h2 className="text-xl lg:text-2xl font-bold tracking-tight">
            Inventory Health & Predictive Demand Overview
          </h2>
          <p className="text-sm text-emerald-100/80 mt-1 max-w-2xl">
            OptiStock AI uses an XGBoost regressor trained on seasonal trends, lead times, and sales velocity to prevent stockouts and cut holding costs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('forecasting')}
            className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
          >
            Explore AI Forecasts <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigate('inventory')}
            className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/20 transition-colors"
          >
            View {criticalAlerts.length} Alerts
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Inventory Value"
          value={`$${effectiveMetrics.totalInventoryValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
          })}`}
          change={effectiveMetrics.inventoryValueChangePercent}
          changeLabel="vs last month"
          icon={DollarSign}
          iconColor="green"
        />
        <StatCard
          title="Active Catalog SKUs"
          value={effectiveMetrics.totalActiveSkus}
          subtitle="Across active categories"
          change={2.8}
          changeLabel="Live MySQL catalog"
          icon={Package}
          iconColor="blue"
        />
        <StatCard
          title="Monthly Sales Volume"
          value={`$${effectiveMetrics.totalMonthlyRevenue.toLocaleString('en-US', {
            minimumFractionDigits: 0,
          })}`}
          change={effectiveMetrics.monthlyRevenueChangePercent}
          changeLabel="vs last month"
          icon={TrendingUp}
          iconColor="green"
        />
        <StatCard
          title="ML Forecast Accuracy (R²)"
          value={`${effectiveMetrics.forecastModelAccuracy}%`}
          subtitle="Model: XGBoost (RMSE: 1.14)"
          icon={Cpu}
          iconColor="purple"
        />
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Demand & Sales Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Weekly Demand Velocity: Actual vs Predicted
              </h3>
              <p className="text-xs text-slate-500">
                Comparing actual sales orders with ML predicted demand trajectory
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                Actual Sales
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Predicted Demand
              </span>
            </div>
          </div>

          <div className="h-72 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockWeeklySalesDemandChart}>
                <defs>
                  <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="actualSales"
                  name="Actual Sales"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#emeraldGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="predictedDemand"
                  name="Predicted Demand"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#amberGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Donut Chart */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">Inventory Distribution</h3>
            <p className="text-xs text-slate-500">Value share across product categories</p>
          </div>

          <div className="h-56 mt-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Share']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom legend */}
          <div className="mt-auto space-y-1.5 pt-2 border-t border-slate-100">
            {categoryBreakdown.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-semibold text-slate-800">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critical Stock Alert / Replenishment Queue */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Critical Replenishment Queue
              </h3>
              <p className="text-xs text-slate-500">
                Items currently breaching reorder point with high stockout probability
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('inventory')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 self-start sm:self-auto"
          >
            Manage All Alerts ({alerts.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Product Name / SKU</th>
                <th className="py-2.5 px-3">Current Stock</th>
                <th className="py-2.5 px-3">Reorder Point</th>
                <th className="py-2.5 px-3">Lead Time</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lowStockItems.slice(0, 4).map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{product.name}</div>
                    <div className="text-[11px] font-mono text-slate-400">{product.sku}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-rose-600 text-sm">{product.currentStock}</span>
                    <span className="text-slate-400 text-[11px] ml-1">units</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {product.reorderPoint} units
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {product.leadTimeDays} days
                  </td>
                  <td className="py-3 px-3">
                    <StockStatusBadge status={product.status} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onQuickReorder(product.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors inline-flex items-center gap-1 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Create PO
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
