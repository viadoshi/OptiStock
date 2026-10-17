import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  Database,
  Cpu,
  Mail,
  Save,
  CheckCircle,
  Server,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsPageProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [apiStatus, setApiStatus] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestApi = async () => {
    setTestingApi(true);
    setApiStatus(null);
    try {
      const healthUrl = form.apiBaseUrl.replace(/\/api\/v1\/?$/, '') + '/health';
      const res = await fetch(healthUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setApiStatus(
        `Connected to Live FastAPI Backend! Status: ${data.status.toUpperCase()} • Database: ${data.database ?? 'MySQL 8.0'} • Products in DB: ${data.products_loaded ?? 0}`
      );
    } catch (err: any) {
      setApiStatus(
        `Connection failed at ${form.apiBaseUrl}: ${err?.message ?? 'Network unreachable'}. Verify FastAPI server is running.`
      );
    } finally {
      setTestingApi(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
            <SettingsIcon className="w-5 h-5" />
          </span>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Settings & Architecture</h2>
        </div>
        <p className="text-xs text-slate-500">
          Configure inventory reorder parameters, ML forecasting horizons, and backend integration mode.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-semibold text-emerald-800 transition-all">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          Settings saved successfully! Replenishment thresholds and forecasting parameters updated.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Backend & API Integration Settings */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              Backend Architecture & Data Source
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
              FastAPI Ready
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="font-semibold text-slate-800 block">Data Source Mode</span>
                <span className="text-slate-500 text-[11px]">
                  Use high-fidelity mock data (Current Step) or connect to live Python FastAPI server.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.useMockData}
                  onChange={(e) => setForm({ ...form, useMockData: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-2 text-xs font-semibold text-slate-700">
                  {form.useMockData ? 'Mock Data' : 'Live API'}
                </span>
              </label>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                FastAPI Base URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={form.apiBaseUrl}
                  onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value })}
                  placeholder="http://localhost:8000/api/v1"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={handleTestApi}
                  disabled={testingApi}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs whitespace-nowrap transition-colors"
                >
                  {testingApi ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
              {apiStatus && (
                <p className="mt-1.5 text-[11px] font-medium text-slate-600">
                  {apiStatus}
                </p>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-[11px] text-slate-500">
              <div className="font-semibold text-slate-700">Next Steps (Senior Developer Note):</div>
              <p>1. Frontend is self-contained with TypeScript interfaces & API service mock abstraction.</p>
              <p>2. Backend step will introduce FastAPI (`main.py`, routers, MySQL 8.0 SQLAlchemy models).</p>
              <p>3. ML step will introduce XGBoost training pipeline on sales transaction dataset.</p>
            </div>
          </div>
        </div>

        {/* Inventory Replenishment Thresholds */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              Inventory & Reorder Parameters
            </h3>
            <p className="text-xs text-slate-500">
              Global baseline thresholds applied when new SKUs are added
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Default Safety Stock Buffer (Days)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={form.defaultSafetyStockDays}
                onChange={(e) =>
                  setForm({ ...form, defaultSafetyStockDays: parseInt(e.target.value) || 7 })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <span className="text-[10px] text-slate-400">Buffer days added to supplier lead time</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Low Stock Warning Threshold (%)
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={form.lowStockThresholdPercent}
                onChange={(e) =>
                  setForm({ ...form, lowStockThresholdPercent: parseInt(e.target.value) || 20 })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <span className="text-[10px] text-slate-400">Triggers yellow warning when stock falls below % of reorder point</span>
            </div>
          </div>
        </div>

        {/* Machine Learning & Forecasting Tuning */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-600" />
              Machine Learning Model Tuning
            </h3>
            <p className="text-xs text-slate-500">
              Algorithm preferences for demand forecasting inference
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Primary Forecasting Engine
              </label>
              <select
                value={form.forecastingModel}
                onChange={(e) => setForm({ ...form, forecastingModel: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="XGBoost Regressor">XGBoost Regressor (Recommended)</option>
                <option value="Random Forest">Random Forest Regressor</option>
                <option value="Prophet">Meta Prophet Baseline</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Default Forecasting Horizon (Days)
              </label>
              <select
                value={form.defaultForecastHorizon}
                onChange={(e) =>
                  setForm({ ...form, defaultForecastHorizon: parseInt(e.target.value) || 30 })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value={7}>7 Days (Short-term)</option>
                <option value={14}>14 Days (Bi-weekly)</option>
                <option value={30}>30 Days (Monthly)</option>
                <option value={90}>90 Days (Quarterly)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600" />
              Automated Alert Dispatch
            </h3>
            <p className="text-xs text-slate-500">
              Notification endpoints for critical stockout emergencies
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Operations Alert Email
              </label>
              <input
                type="email"
                value={form.alertEmail}
                onChange={(e) => setForm({ ...form, alertEmail: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Configuration Changes
          </button>
        </div>
      </form>
    </div>
  );
};
