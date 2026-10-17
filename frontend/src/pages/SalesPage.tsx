import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  DollarSign,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Clock,
  CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { SaleTransaction } from '../types';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';

interface SalesPageProps {
  sales: SaleTransaction[];
}

export const SalesPage: React.FC<SalesPageProps> = ({ sales }) => {
  const [selectedChannel, setSelectedChannel] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  const filteredSales = sales.filter((s) => {
    const matchesChannel = selectedChannel === 'All' || s.channel === selectedChannel;
    const matchesStatus = selectedStatus === 'All' || s.status === selectedStatus;
    return matchesChannel && matchesStatus;
  });

  const totalRevenue = sales.reduce((acc, s) => acc + s.totalRevenue, 0);
  const totalUnits = sales.reduce((acc, s) => acc + s.quantity, 0);
  const avgOrderValue = totalRevenue / (sales.length || 1);

  // Group daily revenue for chart from real sales transactions
  const salesChartData = useMemo(() => {
    if (!sales.length) {
      return [
        { date: 'Sep 27', Online: 320, POS: 180, Wholesale: 450, Marketplace: 210 },
        { date: 'Sep 28', Online: 410, POS: 230, Wholesale: 0, Marketplace: 340 },
        { date: 'Sep 29', Online: 590, POS: 310, Wholesale: 640, Marketplace: 420 },
        { date: 'Sep 30', Online: 680, POS: 290, Wholesale: 1200, Marketplace: 510 },
        { date: 'Oct 01', Online: 780, POS: 420, Wholesale: 1280, Marketplace: 650 },
      ];
    }
    const map = new Map<string, { date: string; Online: number; POS: number; Wholesale: number; Marketplace: number }>();
    sales.forEach((s) => {
      // Format date label (e.g., '10-01' or 'Oct 01')
      const rawDate = s.date.split(' ')[0] || s.date;
      const cur = map.get(rawDate) || { date: rawDate, Online: 0, POS: 0, Wholesale: 0, Marketplace: 0 };
      if (s.channel === 'Online Store') cur.Online += s.totalRevenue;
      else if (s.channel === 'Retail POS') cur.POS += s.totalRevenue;
      else if (s.channel === 'Wholesale') cur.Wholesale += s.totalRevenue;
      else if (s.channel === 'Marketplace') cur.Marketplace += s.totalRevenue;
      map.set(rawDate, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [sales]);

  const handleExportCSV = () => {
    const headers = ['Transaction ID,Date,SKU,Product Name,Category,Quantity,Unit Price,Total Revenue,Channel,Status\n'];
    const rows = filteredSales.map((s) =>
      `"${s.id}","${s.date}","${s.sku}","${s.productName}","${s.category}",${s.quantity},${s.unitPrice},${s.totalRevenue},"${s.channel}","${s.status}"\n`
    );
    const blob = new Blob([...headers, ...rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `OptiStock_Sales_Log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sales & Demand Velocity</h2>
          <p className="text-xs text-slate-500">
            Real-time transaction activity, revenue metrics, and channel breakdown
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-slate-500" />
          Export Sales CSV
        </button>
      </div>

      {/* Sales KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Recorded Sales"
          value={`$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          change={14.8}
          changeLabel="vs last period"
          icon={DollarSign}
          iconColor="green"
        />
        <StatCard
          title="Units Dispatched"
          value={`${totalUnits} Units`}
          subtitle="Across all orders"
          change={8.3}
          icon={ShoppingBag}
          iconColor="blue"
        />
        <StatCard
          title="Average Order Value (AOV)"
          value={`$${avgOrderValue.toFixed(2)}`}
          change={6.1}
          icon={CreditCard}
          iconColor="amber"
        />
        <StatCard
          title="Fulfillment Rate"
          value="98.5%"
          subtitle="Completed without returns"
          icon={CheckCircle}
          iconColor="green"
        />
      </div>

      {/* Sales Velocity by Channel Chart */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Multi-Channel Revenue Velocity (Last 5 Days)
            </h3>
            <p className="text-xs text-slate-500">
              Breakdown across Online Webstore, Retail POS, Wholesale Accounts, and Marketplaces
            </p>
          </div>
        </div>

        <div className="h-72 mt-4 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(val: any) => [`$${val}`, '']}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar dataKey="Online" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Wholesale" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Marketplace" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="POS" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters and Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Filter By Channel:</span>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="All">All Channels</option>
              <option value="Online Store">Online Store</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Marketplace">Marketplace</option>
              <option value="Retail POS">Retail POS</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Filter By Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Txn ID / Date</th>
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Qty</th>
                <th className="py-3 px-4">Unit Price</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 font-mono">{sale.id}</div>
                    <div className="text-[11px] text-slate-400">{sale.date}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{sale.productName}</div>
                    <div className="text-[11px] font-mono text-slate-400">{sale.sku}</div>
                  </td>

                  <td className="py-3 px-4 text-slate-600">
                    {sale.category}
                  </td>

                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {sale.quantity}x
                  </td>

                  <td className="py-3 px-4 text-slate-600">
                    ${sale.unitPrice.toFixed(2)}
                  </td>

                  <td className="py-3 px-4 font-bold text-slate-900">
                    ${sale.totalRevenue.toFixed(2)}
                  </td>

                  <td className="py-3 px-4">
                    <Badge variant={sale.channel === 'Wholesale' ? 'blue' : sale.channel === 'Online Store' ? 'green' : 'slate'} size="sm">
                      {sale.channel}
                    </Badge>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <Badge
                      variant={sale.status === 'Completed' ? 'green' : sale.status === 'Pending' ? 'amber' : 'red'}
                      size="sm"
                      dot
                    >
                      {sale.status}
                    </Badge>
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
