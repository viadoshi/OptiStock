import React, { useState, useEffect, useCallback } from 'react';
import { PageId, Product, SaleTransaction, StockAlert, AppSettings, DashboardMetrics } from './types';
import { api } from './services/api';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { SalesPage } from './pages/SalesPage';
import { DemandForecastingPage } from './pages/DemandForecastingPage';
import { InventoryAlertsPage } from './pages/InventoryAlertsPage';
import { InventoryRecommendationsPage } from './pages/InventoryRecommendationsPage';
import { ProductIntelligencePage } from './pages/ProductIntelligencePage';
import { MlModelLaboratoryPage } from './pages/MlModelLaboratoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedProductForForecast, setSelectedProductForForecast] = useState<string>('prod-001');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [fetchedProducts, fetchedSales, fetchedAlerts, fetchedSettings, fetchedMetrics] =
        await Promise.all([
          api.getProducts(),
          api.getSales(),
          api.getAlerts(),
          api.getSettings(),
          api.getDashboardMetrics().catch(() => null),
        ]);
      setProducts(fetchedProducts);
      setSales(fetchedSales);
      setAlerts(fetchedAlerts);
      setSettings(fetchedSettings);
      setMetrics(fetchedMetrics);
    } catch (err: any) {
      setLoadError(err?.message ?? 'Failed to connect to backend');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleAddProduct = async (newProduct: Omit<Product, 'id' | 'lastRestocked'>) => {
    const created = await api.addProduct(newProduct);
    setProducts((prev) => [created, ...prev]);
    showToast(`Added SKU: ${created.sku} (${created.name})`);
  };

  const handleUpdateStock = async (productId: string, newStock: number) => {
    let computedStatus: Product['status'] = 'in_stock';
    const existing = products.find((p) => p.id === productId);
    if (!existing) return;

    if (newStock <= 0) computedStatus = 'out_of_stock';
    else if (newStock <= existing.minStockLevel) computedStatus = 'low_stock';
    else if (newStock > existing.reorderPoint * 3) computedStatus = 'overstocked';

    const updated = await api.updateProduct(productId, {
      currentStock: newStock,
      status: computedStatus,
    });

    setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
    api.getDashboardMetrics().then(setMetrics).catch(() => {});
    showToast(`Updated stock for ${updated.name} to ${newStock} units`);
  };

  const handleResolveAlert = async (alertId: string) => {
    await api.resolveAlert(alertId);
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, resolved: true } : a))
    );
    showToast('Alert resolved and dismissed from active feed', 'info');
  };

  const handleQuickReorder = (productId: string, quantity?: number) => {
    const product = products.find((p) => p.id === productId);
    const orderQty = quantity || (product ? product.reorderPoint * 2 : 50);

    if (product) {
      handleUpdateStock(productId, product.currentStock + orderQty);
      // Also mark matching alerts as resolved
      setAlerts((prev) =>
        prev.map((a) => (a.productId === productId ? { ...a, resolved: true } : a))
      );
      showToast(`Purchase Order created: Dispatched +${orderQty} units of ${product.name}`);
    }
  };

  const handleNavigateToForecast = (productId: string) => {
    setSelectedProductForForecast(productId);
    setCurrentPage('forecasting');
  };

  return (
    <Layout
      currentPage={currentPage}
      onSelectPage={setCurrentPage}
      alerts={alerts}
    >
      {/* Dynamic Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Loading & Global Error States */}
      {isLoading && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Connecting to FastAPI backend & loading MySQL inventory...</p>
        </div>
      )}

      {loadError && products.length === 0 && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center flex flex-col items-center justify-center gap-3 my-8">
          <AlertCircle className="w-8 h-8 text-rose-600" />
          <h3 className="text-base font-semibold text-rose-900">Backend Connection Error</h3>
          <p className="text-xs text-rose-700 max-w-md">{loadError}</p>
          <button
            onClick={loadInitialData}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
          </button>
        </div>
      )}

      {/* Dynamic View Router */}
      {(!isLoading || products.length > 0) && (
        <>
          {currentPage === 'dashboard' && (
            <DashboardPage
              products={products}
              alerts={alerts}
              metrics={metrics}
              onNavigate={setCurrentPage}
              onQuickReorder={handleQuickReorder}
            />
          )}

          {currentPage === 'products' && (
            <ProductsPage
              products={products}
              onAddProduct={handleAddProduct}
              onNavigateToForecast={handleNavigateToForecast}
              onUpdateStock={handleUpdateStock}
            />
          )}

          {currentPage === 'sales' && (
            <SalesPage sales={sales} />
          )}

          {currentPage === 'forecasting' && (
            <DemandForecastingPage
              products={products}
              selectedProductId={selectedProductForForecast}
              onSelectProduct={setSelectedProductForForecast}
              onRunReorder={handleQuickReorder}
            />
          )}

          {currentPage === 'inventory' && (
            <InventoryAlertsPage
              products={products}
              alerts={alerts}
              onResolveAlert={handleResolveAlert}
              onQuickReorder={handleQuickReorder}
              onNavigateToRecommendations={() => setCurrentPage('recommendations')}
            />
          )}

          {currentPage === 'recommendations' && (
            <InventoryRecommendationsPage
              onQuickReorder={handleQuickReorder}
              onNavigateToForecast={handleNavigateToForecast}
            />
          )}

          {currentPage === 'intelligence' && (
            <ProductIntelligencePage />
          )}

          {currentPage === 'laboratory' && (
            <MlModelLaboratoryPage />
          )}

          {currentPage === 'settings' && (
            <SettingsPage
              settings={settings ?? {
                storeName: 'OptiStock AI',
                currency: 'USD',
                currencySymbol: '$',
                timezone: 'UTC',
                defaultSafetyStockDays: 7,
                lowStockThresholdPercent: 20,
                forecastingModel: 'XGBoost Regressor',
                defaultForecastHorizon: 30,
                autoReorderEnabled: false,
                emailAlertsEnabled: true,
                alertEmail: 'admin@optistock.ai',
                useMockData: false,
                apiBaseUrl: 'http://localhost:8000/api/v1',
              }}
              onUpdateSettings={async (newSet) => {
                const updated = await api.updateSettings(newSet);
                setSettings(updated);
                showToast('Settings successfully updated');
              }}
            />
          )}
        </>
      )}
    </Layout>
  );
}

export default App;
