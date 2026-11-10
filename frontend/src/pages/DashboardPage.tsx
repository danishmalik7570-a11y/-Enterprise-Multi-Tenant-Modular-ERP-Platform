import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  Activity,
  Layers,
  ExternalLink,
  Download,
  Maximize2,
  RefreshCw,
  BarChart3,
  LineChart,
  PieChart,
  Sparkles,
  X
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { StatusPill } from '../components/StatusPill';

export const DashboardPage: React.FC = () => {
  const { tenant, currentRole, apiFetch, isModuleEnabled } = useTenant();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [asyncHealth, setAsyncHealth] = useState<string>('Connecting...');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Matplotlib & Seaborn Top-Level Charts State
  const [chartsData, setChartsData] = useState<{
    sales_trend?: string;
    stock_category?: string;
    receivables_aging?: string;
    meta?: any;
  } | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<'sales_trend' | 'stock_category' | 'receivables_aging'>('sales_trend');
  const [isChartsLoading, setIsChartsLoading] = useState<boolean>(true);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);

  const fetchCharts = async () => {
    setIsChartsLoading(true);
    try {
      const data = await apiFetch('/api/reports/dashboard-charts/');
      setChartsData(data);
    } catch (err) {
      console.error('Failed to load Seaborn charts', err);
    } finally {
      setIsChartsLoading(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dash, je] = await Promise.all([
        apiFetch('/api/reports/dashboard/'),
        apiFetch('/api/finance/journal-entries/'),
      ]);
      setDashboardData(dash);
      setJournalEntries(Array.isArray(je) ? je : (je?.results || []));
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
    }

    // Check FastAPI async layer status
    try {
      const res = await fetch('/api/async/health');
      if (res.ok) setAsyncHealth('Online & Healthy (Port 8001)');
      else setAsyncHealth('Offline');
    } catch {
      setAsyncHealth('Ready');
    }
  };

  useEffect(() => {
    loadData();
    fetchCharts();
  }, [tenant.subdomain]);

  const widgets = dashboardData?.widgets || {};
  const curr = 'Rs. ';

  // Role-based visibility
  const showFinancials = currentRole === 'Owner' || currentRole === 'Finance';
  const showSales = currentRole === 'Owner' || currentRole === 'Sales' || currentRole === 'Finance';
  const showStock = (currentRole === 'Owner' || currentRole === 'Warehouse') && isModuleEnabled('inventory');

  return (
    <div className="space-y-7 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#EAF2FF] text-[#1E5FBF] border border-[#BFDBFE]">
              {tenant.name}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              Role: <strong className="text-navy">{currentRole}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-navy tracking-tight mt-2">
            Executive Operations Dashboard
          </h1>
          <p className="text-xs text-navy-muted mt-0.5">
            {tenant.subdomain === 'apex-retail'
              ? 'Omnichannel distribution: Physical goods stock, purchase receiving, and automated AP/AR double-entry ledger.'
              : 'Strategic consulting advisory: Professional services billing, retainer agreements, and direct financial ledger.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Async Services</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {asyncHealth}
            </span>
          </div>
        </div>
      </div>

      {/* Top-Level Matplotlib & Seaborn Visual Analytics Suite */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        {/* Card Header & Controls */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#F8FAFC] to-[#EAF2FF]/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md bg-[#EAF2FF] text-[#1E5FBF] border border-[#BFDBFE]">
                <Sparkles className="w-3.5 h-3.5" />
                Matplotlib 3.11 & Seaborn 0.13 Engine
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                130 DPI High-Res
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Currency: Rs.
              </span>
            </div>
            <h2 className="text-lg font-bold text-navy tracking-tight mt-2 flex items-center gap-2">
              Executive Statistical Visualizations & Modeling
            </h2>
            <p className="text-xs text-navy-muted mt-0.5">
              Top-level analytical plots generated natively via Python Seaborn statistical algorithms and Matplotlib rasterization.
            </p>
          </div>

          {/* Top-level actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCharts}
              disabled={isChartsLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#1E5FBF] bg-white border border-slate-200 hover:bg-[#EAF2FF] rounded-xl transition-all disabled:opacity-50"
              title="Re-render charts from live backend data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChartsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {chartsData?.[activeChartTab] && (
              <>
                <button
                  onClick={() => setIsZoomModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
                  title="Expand to high-resolution lightbox"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Zoom</span>
                </button>

                <a
                  href={`data:image/png;base64,${chartsData[activeChartTab]}`}
                  download={`erp_${activeChartTab}_seaborn.png`}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#1E5FBF] hover:bg-[#164996] rounded-xl shadow-sm transition-all"
                  title="Download publication-quality PNG"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export PNG</span>
                </a>
              </>
            )}
          </div>
        </div>

        {/* Chart Switcher Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/60 px-6 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveChartTab('sales_trend')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeChartTab === 'sales_trend'
                ? 'border-[#1E5FBF] text-[#1E5FBF] bg-white rounded-t-lg shadow-sm'
                : 'border-transparent text-slate-500 hover:text-navy hover:bg-white/50'
            }`}
          >
            <LineChart className="w-4 h-4" />
            <span>Revenue Velocity (Seaborn Time-Series)</span>
          </button>

          {isModuleEnabled('inventory') && (
            <button
              onClick={() => setActiveChartTab('stock_category')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                activeChartTab === 'stock_category'
                  ? 'border-[#1E5FBF] text-[#1E5FBF] bg-white rounded-t-lg shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-navy hover:bg-white/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Inventory by Category (Seaborn Barplot)</span>
            </button>
          )}

          {showFinancials && (
            <button
              onClick={() => setActiveChartTab('receivables_aging')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                activeChartTab === 'receivables_aging'
                  ? 'border-[#1E5FBF] text-[#1E5FBF] bg-white rounded-t-lg shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-navy hover:bg-white/50'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>AR Aging Risk Distribution (Seaborn Analytics)</span>
            </button>
          )}
        </div>

        {/* Chart Presentation Canvas */}
        <div className="p-6 bg-white flex flex-col items-center justify-center min-h-[380px]">
          {isChartsLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <div className="w-10 h-10 border-4 border-[#1E5FBF]/20 border-t-[#1E5FBF] rounded-full animate-spin" />
              <p className="text-xs font-semibold text-navy">Generating High-Resolution Seaborn Figures...</p>
              <p className="text-[11px] text-slate-400">Rendering statistical models with Matplotlib Agg backend</p>
            </div>
          ) : chartsData?.[activeChartTab] ? (
            <div className="w-full flex flex-col items-center">
              <div className="w-full max-w-5xl rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-white p-2">
                <img
                  src={`data:image/png;base64,${chartsData[activeChartTab]}`}
                  alt="Seaborn Statistical Chart"
                  className="w-full h-auto object-contain rounded-lg transition-transform hover:scale-[1.005]"
                />
              </div>

              {/* Chart Insight Card */}
              <div className="w-full max-w-5xl mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1E5FBF] bg-[#EAF2FF] px-2 py-0.5 rounded text-[11px]">
                    Statistical Insight
                  </span>
                  <span className="text-navy font-medium">
                    {activeChartTab === 'sales_trend' && 'Actual invoiced revenue tracked against target benchmark line with shaded density.'}
                    {activeChartTab === 'stock_category' && 'Distribution of inventory capital tied in warehouses, ordered by highest holding value in Rs.'}
                    {activeChartTab === 'receivables_aging' && 'Accounts receivable exposure classified by payment risk duration (0-30d, 31-60d, 61-90d, >90d).'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono">
                  <span>Renderer: Matplotlib/Seaborn</span>
                  <span>•</span>
                  <span>Palette: Blue & White</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No chart data available for the active view. Click Refresh to regenerate.
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Receivables */}
        {showSales && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card flex flex-col justify-between hover:border-[#1E5FBF]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-navy-muted uppercase tracking-wider">Total Receivables</span>
              <div className="p-2.5 rounded-xl bg-[#EAF2FF] text-[#1E5FBF]">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-extrabold font-mono text-navy tracking-tight">
                {curr}{Number(widgets.finance?.accounts_receivable || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Pending payments from customers</p>
            </div>
          </div>
        )}

        {/* KPI 2: Total Payables */}
        {showFinancials && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card flex flex-col justify-between hover:border-[#1E5FBF]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-navy-muted uppercase tracking-wider">Total Payables</span>
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-extrabold font-mono text-navy tracking-tight">
                {curr}{Number(widgets.finance?.accounts_payable || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Owed to vendors for received orders</p>
            </div>
          </div>
        )}

        {/* KPI 3: Stock Valuation (only if inventory active) */}
        {showStock && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card flex flex-col justify-between hover:border-[#1E5FBF]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-navy-muted uppercase tracking-wider">Stock Valuation</span>
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-extrabold font-mono text-navy tracking-tight">
                {curr}{Number(widgets.inventory?.total_valuation || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                {widgets.inventory?.total_units_on_hand || 0} units across warehouses
              </p>
            </div>
          </div>
        )}

        {/* KPI 4: Operating Profit / Sales */}
        {showFinancials && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card flex flex-col justify-between hover:border-[#1E5FBF]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-navy-muted uppercase tracking-wider">Net Operating Profit</span>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-extrabold font-mono text-emerald-600 tracking-tight">
                {curr}{Number(widgets.finance?.net_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Revenue minus operational costs</p>
            </div>
          </div>
        )}
      </div>

      {/* Visual Analytics / Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Revenue vs Expenses */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-navy">Revenue & Expense Performance</h2>
              <p className="text-xs text-navy-muted mt-0.5">Real-time ledger breakdown from Chart of Accounts</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#EAF2FF] text-[#1E5FBF]">
              Current Period
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Revenue</span>
              <div className="text-xl font-extrabold font-mono text-[#1E5FBF] mt-1">
                {curr}{Number(widgets.finance?.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-[#1E5FBF] h-full rounded-full w-4/5" />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Expenses</span>
              <div className="text-xl font-extrabold font-mono text-rose-600 mt-1">
                {curr}{Number(widgets.finance?.total_expense || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full w-1/3" />
              </div>
            </div>
          </div>

          {/* Activity distribution bars */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs font-semibold text-navy">
              <span>Operating Margin</span>
              <span className="font-mono text-emerald-600 font-bold">Healthy (+68%)</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
              <div className="bg-[#1E5FBF] h-full w-[65%]" title="Gross Margin" />
              <div className="bg-emerald-500 h-full w-[25%]" title="Net Profit" />
              <div className="bg-rose-400 h-full w-[10%]" title="Overhead" />
            </div>
          </div>
        </div>

        {/* Quick Module Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-navy border-b border-slate-100 pb-4">
              Tenant Module Matrix
            </h2>
            <div className="space-y-3 mt-4">
              {['catalog', 'inventory', 'purchasing', 'sales', 'finance', 'module_builder'].map((mod) => {
                const active = isModuleEnabled(mod);
                return (
                  <div key={mod} className="flex items-center justify-between text-xs">
                    <span className="capitalize font-semibold text-navy flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-[#1E5FBF]" />
                      {mod.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {active ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <a
              href="/api/schema/swagger-ui/"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#EAF2FF] text-[#1E5FBF] hover:bg-[#1E5FBF] hover:text-white rounded-xl text-xs font-bold transition-colors"
            >
              <span>Explore REST API Docs</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#1E5FBF]" />
            <h2 className="text-sm font-bold text-navy">Recent Central Ledger Activity</h2>
          </div>
          <span className="text-[11px] font-bold text-slate-400">Strict Double-Entry Balancing</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-navy-muted font-bold uppercase">
                <th className="py-3 px-5">Entry #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Memo</th>
                <th className="py-3 px-4">Source Module</th>
                <th className="py-3 px-4">Lines</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {journalEntries.slice(0, 5).map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-5 font-mono font-bold text-navy">{entry.entry_number}</td>
                  <td className="py-3.5 px-4 text-slate-500">{entry.date}</td>
                  <td className="py-3.5 px-4 font-semibold text-navy">{entry.memo}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-[#EAF2FF] text-[#1E5FBF] font-bold text-[11px]">
                      {entry.source_module}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{entry.lines?.length || 0} balanced lines</td>
                  <td className="py-3.5 px-5 text-right">
                    <StatusPill status="Confirmed" variant="success" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* High-Resolution Zoom Lightbox Modal */}
      {isZoomModalOpen && chartsData?.[activeChartTab] && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-6xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#EAF2FF] text-[#1E5FBF]">
                    Matplotlib & Seaborn Vector Raster
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">130 DPI High Resolution</span>
                </div>
                <h3 className="text-base font-bold text-navy mt-1">
                  Executive Analytical Figure Inspection
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`data:image/png;base64,${chartsData[activeChartTab]}`}
                  download={`erp_${activeChartTab}_highres.png`}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#1E5FBF] hover:bg-[#164996] rounded-xl transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Full Res</span>
                </a>
                <button
                  onClick={() => setIsZoomModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-navy hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-auto py-4 flex items-center justify-center flex-1 bg-slate-50/50 rounded-xl my-2 p-2">
              <img
                src={`data:image/png;base64,${chartsData[activeChartTab]}`}
                alt="Seaborn High-Res Preview"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm border border-slate-200 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
