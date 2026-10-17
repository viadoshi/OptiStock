import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  Package,
  TrendingDown,
  CheckCircle,
  Truck,
  ExternalLink,
  ChevronRight,
  X,
  Boxes,
} from 'lucide-react';
import { Product, StockAlert } from '../types';
import { Badge, StockStatusBadge } from '../components/common/Badge';

interface InventoryAlertsPageProps {
  products: Product[];
  alerts: StockAlert[];
  onResolveAlert: (alertId: string) => void;
  onQuickReorder: (productId: string, qty: number) => void;
  onNavigateToRecommendations?: () => void;
}

export const InventoryAlertsPage: React.FC<InventoryAlertsPageProps> = ({
  products,
  alerts,
  onResolveAlert,
  onQuickReorder,
  onNavigateToRecommendations,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<Product | null>(null);
  const [orderQuantity, setOrderQuantity] = useState<number>(50);

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'All') return true;
    return a.severity === filterSeverity;
  });

  const totalItems = products.length || 1;
  const inStockCount = products.filter((p) => p.status === 'in_stock').length;
  const lowStockCount = products.filter((p) => p.status === 'low_stock').length;
  const outOfStockCount = products.filter((p) => p.status === 'out_of_stock').length;
  const overstockedCount = products.filter((p) => p.status === 'overstocked').length;

  const handleOpenOrderModal = (product: Product, defaultQty: number = 50) => {
    setSelectedProductForOrder(product);
    setOrderQuantity(defaultQty);
  };

  const handleConfirmOrder = () => {
    if (!selectedProductForOrder) return;
    onQuickReorder(selectedProductForOrder.id, orderQuantity);
    setSelectedProductForOrder(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Inventory Health & Early Warning System
            </h2>
            <p className="text-xs text-slate-500">
              Automated lead time tracking, daily burn rate calculation, and proactive stockout prevention
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {alerts.filter((a) => !a.resolved && a.severity === 'critical').length} Critical Stockouts
            </span>
            {onNavigateToRecommendations && (
              <button
                onClick={onNavigateToRecommendations}
                className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 transition-colors"
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Smart Recommendations &rarr;</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Stock Status Distribution Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
            <span className="font-semibold">Overall Stock Distribution Ratio</span>
            <span>{products.length} Total SKUs Tracked</span>
          </div>

          <div className="h-3 w-full bg-slate-100 rounded-full flex overflow-hidden">
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${(inStockCount / totalItems) * 100}%` }}
              title={`In Stock: ${inStockCount}`}
            />
            <div
              className="bg-amber-500 h-full"
              style={{ width: `${(lowStockCount / totalItems) * 100}%` }}
              title={`Low Stock: ${lowStockCount}`}
            />
            <div
              className="bg-rose-500 h-full"
              style={{ width: `${(outOfStockCount / totalItems) * 100}%` }}
              title={`Out of Stock: ${outOfStockCount}`}
            />
            <div
              className="bg-sky-500 h-full"
              style={{ width: `${(overstockedCount / totalItems) * 100}%` }}
              title={`Overstocked: ${overstockedCount}`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Healthy ({inStockCount})
            </span>
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Low Stock ({lowStockCount})
            </span>
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Depleted ({outOfStockCount})
            </span>
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              Overstocked ({overstockedCount})
            </span>
          </div>
        </div>
      </div>

      {/* Active Stock Alerts Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Live Inventory Alerts Feed
          </h3>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Filter Severity:</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="All">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="warning">Warning Only</option>
              <option value="info">Info / Overstock</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAlerts.map((alert) => {
            const product = products.find((p) => p.id === alert.productId);
            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border bg-white shadow-xs flex flex-col justify-between transition-all ${
                  alert.resolved
                    ? 'opacity-60 border-slate-200'
                    : isCritical
                    ? 'border-rose-200 bg-rose-50/20'
                    : isWarning
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-sky-200 bg-sky-50/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-mono text-[11px] text-slate-400">{alert.sku}</span>
                    <Badge
                      variant={
                        alert.resolved
                          ? 'slate'
                          : isCritical
                          ? 'red'
                          : isWarning
                          ? 'amber'
                          : 'blue'
                      }
                      size="sm"
                      dot
                    >
                      {alert.resolved ? 'Resolved' : alert.severity.toUpperCase()}
                    </Badge>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-2">
                    {alert.productName}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {alert.message}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <span className="text-slate-400 block">Current Stock:</span>
                      <strong className={alert.currentStock === 0 ? 'text-rose-600' : 'text-slate-800'}>
                        {alert.currentStock} units
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Est. Runout Time:</span>
                      <strong className={alert.daysRemaining <= 1 ? 'text-rose-600' : 'text-slate-800'}>
                        {alert.daysRemaining === 0 ? 'Depleted' : `${alert.daysRemaining} days left`}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">{alert.timestamp}</span>

                  <div className="flex items-center gap-2">
                    {!alert.resolved && (
                      <button
                        onClick={() => onResolveAlert(alert.id)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium"
                      >
                        Dismiss
                      </button>
                    )}

                    {product && !alert.resolved && alert.recommendedOrder > 0 && (
                      <button
                        onClick={() => handleOpenOrderModal(product, alert.recommendedOrder)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs"
                      >
                        Reorder {alert.recommendedOrder} Units
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Days of Inventory Remaining (DOIR) Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">
            Days of Inventory Remaining (DOIR) & Replenishment Matrix
          </h3>
          <p className="text-xs text-slate-500">
            Calculated as Current Stock ÷ Daily Average Demand Rate
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Product Name / SKU</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Daily Burn Rate</th>
                <th className="py-3 px-4">Est. Runout (DOIR)</th>
                <th className="py-3 px-4">Lead Time</th>
                <th className="py-3 px-4">Buffer Margin</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => {
                const doir = (p.currentStock / (p.dailyDemandAverage || 1)).toFixed(1);
                const isUrgent = parseFloat(doir) <= p.leadTimeDays;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{p.sku}</div>
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-800">
                      {p.currentStock} units
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {p.dailyDemandAverage} units/day
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          p.currentStock === 0
                            ? 'text-rose-600'
                            : isUrgent
                            ? 'text-rose-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {p.currentStock === 0 ? '0 Days (Stockout)' : `${doir} Days`}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {p.leadTimeDays} days
                    </td>

                    <td className="py-3 px-4">
                      <StockStatusBadge status={p.status} />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenOrderModal(p, p.reorderPoint * 2)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 font-medium text-xs transition-colors"
                      >
                        Purchase Order
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Purchase Order Modal */}
      {selectedProductForOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Authorize Purchase Order</h3>
              </div>
              <button
                onClick={() => setSelectedProductForOrder(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block">Product:</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {selectedProductForOrder.name}
                </span>
                <span className="font-mono text-slate-500 block">
                  {selectedProductForOrder.sku}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplier:</span>
                  <span className="font-medium text-slate-800">{selectedProductForOrder.supplier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery Lead Time:</span>
                  <span className="font-medium text-slate-800">{selectedProductForOrder.leadTimeDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Unit Cost:</span>
                  <span className="font-medium text-slate-800">${selectedProductForOrder.costPrice.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Order Quantity (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="pt-2 flex justify-between text-sm font-bold text-slate-900 border-t border-slate-100">
                <span>Total PO Cost:</span>
                <span className="text-emerald-700">
                  ${(orderQuantity * selectedProductForOrder.costPrice).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-slate-100 text-xs font-semibold">
              <button
                onClick={() => setSelectedProductForOrder(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOrder}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                Confirm & Dispatch PO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
