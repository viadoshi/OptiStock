import React from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Settings,
  Boxes,
  Cpu,
  ChevronRight,
} from 'lucide-react';
import { PageId } from '../../types';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  alertCount: number;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  alertCount,
  isOpen,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard' as PageId,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'products' as PageId,
      label: 'Products',
      icon: Package,
      badge: '12 SKUs',
    },
    {
      id: 'sales' as PageId,
      label: 'Sales',
      icon: ShoppingCart,
      badge: null,
    },
    {
      id: 'forecasting' as PageId,
      label: 'Demand Forecasting',
      icon: TrendingUp,
      badge: 'AI ML',
      badgeColor: 'bg-emerald-100 text-emerald-800 font-semibold',
    },
    {
      id: 'inventory' as PageId,
      label: 'Inventory & Alerts',
      icon: AlertTriangle,
      badge: alertCount > 0 ? `${alertCount}` : null,
      badgeColor: 'bg-rose-100 text-rose-700 font-semibold',
    },
    {
      id: 'recommendations' as PageId,
      label: 'Smart Recs',
      icon: Boxes,
      badge: 'AI',
      badgeColor: 'bg-emerald-100 text-emerald-800 font-semibold',
    },
    {
      id: 'intelligence' as PageId,
      label: 'Product Intelligence',
      icon: Sparkles,
      badge: 'ABC',
    },
    {
      id: 'laboratory' as PageId,
      label: 'ML Model Lab',
      icon: Cpu,
      badge: '24 ML',
      badgeColor: 'bg-purple-100 text-purple-800 font-semibold',
    },
    {
      id: 'settings' as PageId,
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-200/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              OptiStock <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">AI</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-none">Smart Inventory SaaS</p>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Main Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectPage(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50/90 text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      item.badgeColor || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* AI Model Status Card */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/60">
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                ML Engine
              </span>
              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                Online
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              XGBoost Regressor • 94.6% R²
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: '94.6%' }} />
            </div>
          </div>

          <div className="mt-2.5 px-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>BCA Final Year Project</span>
            <span className="font-mono">v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};
