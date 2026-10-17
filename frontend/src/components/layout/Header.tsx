import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  CheckCircle,
  AlertTriangle,
  Database,
  User,
  ExternalLink,
} from 'lucide-react';
import { PageId, StockAlert } from '../../types';

interface HeaderProps {
  currentPage: PageId;
  onOpenMobileSidebar: () => void;
  alerts: StockAlert[];
  onSelectPage: (page: PageId) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onOpenMobileSidebar,
  alerts,
  onSelectPage,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const pageTitles: Record<PageId, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Executive Inventory Dashboard',
      subtitle: 'Real-time stock valuation, demand forecasts, and critical replenishment alerts.',
    },
    products: {
      title: 'Product Catalog & Inventory Levels',
      subtitle: 'Manage active SKUs, reorder thresholds, safety stock, and supplier details.',
    },
    sales: {
      title: 'Sales & Demand Analytics',
      subtitle: 'Track order transactions, revenue velocity, and sales channel distribution.',
    },
    forecasting: {
      title: 'AI Demand Forecasting Engine',
      subtitle: 'Machine learning demand predictions powered by XGBoost with 95% confidence intervals.',
    },
    inventory: {
      title: 'Inventory Health & Stockout Alerts',
      subtitle: 'Prevent stockouts with automated reorder calculations and lead-time tracking.',
    },
    recommendations: {
      title: 'Smart Inventory Recommendations',
      subtitle: 'Algorithmic lead-time demand, safety stock buffers, and explainable replenishment quantities.',
    },
    intelligence: {
      title: 'Product Intelligence & ABC Analysis',
      subtitle: 'Pareto 80/20 inventory classification, Economic Order Quantity (EOQ), and turnover rates.',
    },
    laboratory: {
      title: 'ML Model Laboratory & Experimental Suite',
      subtitle: 'Compare 24 supervised and unsupervised machine learning algorithms for demand forecasting and inventory classification.',
    },
    settings: {
      title: 'System Preferences & Model Tuning',
      subtitle: 'Configure replenishment thresholds, forecasting horizons, and backend API connection.',
    },
  };

  const activeAlerts = alerts.filter((a) => !a.resolved);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight leading-tight">
              {pageTitles[currentPage]?.title || 'OptiStock AI'}
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block mt-0.5">
              {pageTitles[currentPage]?.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Quick Controls, Notifications, Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Mock Mode Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-800">
            <Database className="w-3 h-3 text-emerald-600" />
            <span>Mock Mode (Ready for FastAPI)</span>
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {activeAlerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-50">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">Inventory Alerts</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-medium">
                      {activeAlerts.length} Active
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      onSelectPage('inventory');
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5"
                  >
                    View All <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto mt-2">
                  {activeAlerts.slice(0, 4).map((alert) => (
                    <div key={alert.id} className="py-2.5 flex items-start gap-2.5">
                      <div
                        className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                          alert.severity === 'critical'
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {alert.productName}
                        </p>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {alert.message}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span>Stock: {alert.currentStock} units</span>
                          <span>{alert.daysRemaining === 0 ? 'Out of Stock' : `${alert.daysRemaining}d left`}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-semibold text-xs shadow-xs">
              RT
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-semibold text-slate-800 leading-tight">Admin Demo</div>
              <div className="text-[10px] text-slate-400">Inventory Lead</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
