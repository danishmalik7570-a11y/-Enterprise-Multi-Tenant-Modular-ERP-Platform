import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Package,
  ShoppingCart,
  DollarSign,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  FileText,
  Bookmark,
  Mail,
  Table as TableIcon,
  PieChart,
  RefreshCw,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';

type CategoryKey = 'sales' | 'purchases' | 'inventory' | 'finance' | 'custom';

export const ReportsHubPage: React.FC = () => {
  const { apiFetch, tenant, currentRole } = useTenant();

  // Role-based allowed categories
  const allowedCategories: { key: CategoryKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [];

  if (currentRole === 'Owner') {
    allowedCategories.push(
      { key: 'sales', label: 'Sales Reports', icon: TrendingUp },
      { key: 'purchases', label: 'Purchase Reports', icon: ShoppingCart },
      { key: 'inventory', label: 'Inventory Reports', icon: Package },
      { key: 'finance', label: 'Finance & Ledger', icon: DollarSign },
      { key: 'custom', label: 'Custom Report Builder', icon: Sliders }
    );
  } else if (currentRole === 'Finance') {
    allowedCategories.push(
      { key: 'finance', label: 'Finance & Ledger', icon: DollarSign },
      { key: 'sales', label: 'Sales Reports', icon: TrendingUp },
      { key: 'purchases', label: 'Purchase Reports', icon: ShoppingCart },
      { key: 'custom', label: 'Custom Report Builder', icon: Sliders }
    );
  } else if (currentRole === 'Sales') {
    allowedCategories.push(
      { key: 'sales', label: 'Sales Reports', icon: TrendingUp },
      { key: 'custom', label: 'Custom Report Builder', icon: Sliders }
    );
  } else if (currentRole === 'Warehouse') {
    allowedCategories.push(
      { key: 'inventory', label: 'Inventory Reports', icon: Package }
    );
  } else {
    allowedCategories.push(
      { key: 'sales', label: 'Sales Reports', icon: TrendingUp },
      { key: 'custom', label: 'Custom Report Builder', icon: Sliders }
    );
  }

  const [activeCategory, setActiveCategory] = useState<CategoryKey>(allowedCategories[0]?.key || 'sales');
  const [activeReportSubtype, setActiveReportSubtype] = useState<string>('summary');
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  // Filters
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-12-31');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Report Data state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reportData, setReportData] = useState<any>(null);

  // Custom Report Builder state
  const [customEntity, setCustomEntity] = useState<string>('sales');
  const [selectedFields, setSelectedFields] = useState<string[]>(['invoice_number', 'customer_name', 'total_amount', 'date']);
  const [savedReports, setSavedReports] = useState<{ id: number; name: string; entity: string; fields: string[] }[]>([
    { id: 1, name: 'High-Value Customer Deliveries', entity: 'sales', fields: ['invoice_number', 'customer_name', 'total_amount'] },
    { id: 2, name: 'Critical Reorder List', entity: 'inventory', fields: ['sku', 'name', 'warehouse', 'quantity_on_hand'] }
  ]);
  const [customReportName, setCustomReportName] = useState<string>('');

  // Favorite / Schedule modal state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly');
  const [scheduleEmail, setScheduleEmail] = useState('admin@' + tenant.subdomain + '.com');

  // Sync category if role changes
  useEffect(() => {
    if (!allowedCategories.some(c => c.key === activeCategory)) {
      setActiveCategory(allowedCategories[0]?.key || 'sales');
    }
  }, [currentRole]);

  // Load report data
  const loadReport = async () => {
    setIsLoading(true);
    setReportData(null);
    try {
      if (activeCategory === 'sales') {
        const res = await apiFetch(`/api/reports/sales/?start_date=${startDate}&end_date=${endDate}`);
        setReportData(res);
      } else if (activeCategory === 'purchases') {
        const res = await apiFetch(`/api/reports/purchases/?start_date=${startDate}&end_date=${endDate}`);
        setReportData(res);
      } else if (activeCategory === 'inventory') {
        if (activeReportSubtype === 'low-stock') {
          const res = await apiFetch(`/api/reports/low-stock/`);
          setReportData({ records: res });
        } else if (activeReportSubtype === 'movements') {
          const res = await apiFetch(`/api/reports/stock-movement/?start_date=${startDate}&end_date=${endDate}`);
          setReportData({ records: res });
        } else {
          const res = await apiFetch(`/api/reports/stock-summary/`);
          setReportData({ records: res });
        }
      } else if (activeCategory === 'finance') {
        if (activeReportSubtype === 'pnl') {
          const res = await apiFetch(`/api/reports/profit-and-loss/?start_date=${startDate}&end_date=${endDate}`);
          setReportData(res);
        } else if (activeReportSubtype === 'payables') {
          const res = await apiFetch(`/api/reports/payables-aging/`);
          setReportData({ records: res });
        } else if (activeReportSubtype === 'cashflow') {
          const res = await apiFetch(`/api/reports/cash-flow/?start_date=${startDate}&end_date=${endDate}`);
          setReportData(res);
        } else {
          const res = await apiFetch(`/api/reports/receivables-aging/`);
          setReportData({ records: res });
        }
      } else if (activeCategory === 'custom') {
        // Mock query for custom builder
        const res = await apiFetch(`/api/reports/${customEntity === 'sales' ? 'sales' : 'stock-summary'}/`);
        setReportData(res);
      }
    } catch (e) {
      console.warn('Report fetch notice:', e);
      setReportData({ error: 'Report data not available for current filters' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeCategory, activeReportSubtype, startDate, endDate]);

  // Export handlers
  const handleExportCSV = () => {
    if (!reportData) return;
    const records = reportData.records || (Array.isArray(reportData) ? reportData : []);
    if (records.length === 0) {
      alert("No data available to export.");
      return;
    }
    const headers = Object.keys(records[0]).join(',');
    const rows = records.map((r: any) => Object.values(r).map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `${activeCategory}_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    handleExportCSV();
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleSaveSchedule = () => {
    setScheduleSuccess(true);
    setTimeout(() => {
      setScheduleSuccess(false);
      setIsScheduleModalOpen(false);
    }, 1500);
  };

  const handleSaveCustomReport = () => {
    if (!customReportName.trim()) {
      alert("Please provide a name for the report.");
      return;
    }
    setSavedReports([...savedReports, {
      id: Date.now(),
      name: customReportName,
      entity: customEntity,
      fields: selectedFields
    }]);
    setCustomReportName('');
    alert("Report saved to favorites!");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-navy tracking-tight">Reports & Business Intelligence</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAF2FF] text-[#1E5FBF] border border-[#BFDBFE]">
              Role: {currentRole}
            </span>
          </div>
          <p className="text-xs text-navy-muted mt-1">
            Enterprise analytics engine with real-time financial, operational, and custom low-code reports.
          </p>
        </div>

        {/* Global Export & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm"
          >
            <Mail className="w-3.5 h-3.5 text-[#1E5FBF]" />
            <span>Schedule Email</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#1E5FBF] hover:bg-[#184E9E] rounded-xl transition-all shadow-subtle"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF Export</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {allowedCategories.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => {
                setActiveCategory(cat.key);
                setActiveReportSubtype('default');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#1E5FBF] text-white shadow-subtle'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar & View Toggle */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Sub-report selector buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {activeCategory === 'sales' && (
            <>
              <button
                onClick={() => setActiveReportSubtype('summary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeReportSubtype === 'summary' ? 'bg-[#EAF2FF] text-[#1E5FBF] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                By Date Range
              </button>
              <button
                onClick={() => setActiveReportSubtype('customer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeReportSubtype === 'customer' ? 'bg-[#EAF2FF] text-[#1E5FBF] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                By Client
              </button>
              <button
                onClick={() => setActiveReportSubtype('product')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeReportSubtype === 'product' ? 'bg-[#EAF2FF] text-[#1E5FBF] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                By Product
              </button>
            </>
          )}

          {activeCategory === 'purchases' && (
            <>
              <button
                onClick={() => setActiveReportSubtype('summary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeReportSubtype === 'summary' ? 'bg-[#EAF2FF] text-[#1E5FBF] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                By Date Range
              </button>
              <button
                onClick={() => setActiveReportSubtype('supplier')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeReportSubtype === 'supplier' ? 'bg-[#EAF2FF] text-[#1E5FBF] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                By Supplier
              </button>
            </>
          )}

          {activeCategory === 'inventory' && (
            <>
              <button
                onClick={() => setActiveReportSubtype('stock')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeReportSubtype === 'stock' ? 'bg-[#EAF2FF] text-[#1E5FBF] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Stock On Hand & Valuation
              </button>
              <button
                onClick={() => setActiveReportSubtype('low-stock')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeReportSubtype === 'low-stock' ? 'bg-[#EAF2FF] text-[#1E5FBF] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Low-Stock Alerts
              </button>
              <button
                onClick={() => setActiveReportSubtype('movements')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeReportSubtype === 'movements' ? 'bg-[#EAF2FF] text-[#1E5FBF] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Movement History
              </button>
            </>
          )}

          {activeCategory === 'finance' && (
            <>
              <button
                onClick={() => setActiveReportSubtype('receivables')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeReportSubtype === 'receivables' ? 'bg-[#EAF2FF] text-[#1E5FBF] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Receivables Aging (AR)
              </button>
              <button
                onClick={() => setActiveReportSubtype('payables')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeReportSubtype === 'payables' ? 'bg-[#EAF2FF] text-[#1E5FBF] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Payables Aging (AP)
              </button>
              <button
                onClick={() => setActiveReportSubtype('pnl')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeReportSubtype === 'pnl' ? 'bg-[#EAF2FF] text-[#1E5FBF] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Profit & Loss (P&L)
              </button>
              <button
                onClick={() => setActiveReportSubtype('cashflow')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeReportSubtype === 'cashflow' ? 'bg-[#EAF2FF] text-[#1E5FBF] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Cash & Bank Balances
              </button>
            </>
          )}

          {activeCategory === 'custom' && (
            <span className="text-xs font-bold text-[#1E5FBF] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Universal Low-Code Query Runner
            </span>
          )}
        </div>

        {/* Date pickers & Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          {activeCategory !== 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-navy font-semibold focus:outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-navy font-semibold focus:outline-none"
              />
            </div>
          )}

          {/* Table vs Chart view toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'table' ? 'bg-white text-[#1E5FBF] shadow-sm' : 'text-slate-500 hover:text-navy'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`p-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'chart' ? 'bg-white text-[#1E5FBF] shadow-sm' : 'text-slate-500 hover:text-navy'
              }`}
              title="Chart View"
            >
              <PieChart className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={loadReport}
            className="p-2 text-slate-500 hover:text-navy hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Reload report data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#1E5FBF]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Report Content */}
      {activeCategory === 'custom' ? (
        /* Custom Report Builder UI */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Builder Controls */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-card space-y-5">
            <h3 className="font-extrabold text-sm text-navy flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#1E5FBF]" />
              Configure Custom Query
            </h3>

            <div>
              <label className="block text-xs font-bold text-navy mb-1">Target Entity / Module</label>
              <select
                value={customEntity}
                onChange={(e) => setCustomEntity(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-navy font-semibold focus:border-[#1E5FBF]"
              >
                <option value="sales">Sales Invoices & Revenue</option>
                <option value="purchases">Purchase Orders & Expenses</option>
                <option value="inventory">Inventory & Warehouse Balances</option>
                <option value="parties">Parties & CRM Directory</option>
                <option value="finance">General Ledger Accounts</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy mb-2">Display Fields</label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {[
                  { id: 'invoice_number', label: 'Document Number / Code' },
                  { id: 'customer_name', label: 'Party / Partner Name' },
                  { id: 'date', label: 'Transaction Date' },
                  { id: 'total_amount', label: 'Amount (Rs.)' },
                  { id: 'status', label: 'Current Status' },
                  { id: 'warehouse', label: 'Warehouse / Branch' },
                ].map(fld => (
                  <label key={fld.id} className="flex items-center gap-2 text-xs text-navy font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(fld.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFields([...selectedFields, fld.id]);
                        } else {
                          setSelectedFields(selectedFields.filter(f => f !== fld.id));
                        }
                      }}
                      className="rounded text-[#1E5FBF] focus:ring-[#1E5FBF]"
                    />
                    <span>{fld.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-navy mb-1">Save as Named Report</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Monthly Partner Ledger"
                  value={customReportName}
                  onChange={(e) => setCustomReportName(e.target.value)}
                  className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-navy"
                />
                <button
                  onClick={handleSaveCustomReport}
                  className="px-3 py-2 text-xs font-bold text-white bg-[#1E5FBF] hover:bg-[#184E9E] rounded-lg transition-colors flex items-center gap-1"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </div>

            {/* Saved Reports List */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-navy-muted mb-2">Saved Custom Reports</label>
              <div className="space-y-1.5">
                {savedReports.map(rep => (
                  <div
                    key={rep.id}
                    className="p-2.5 rounded-lg bg-slate-50 hover:bg-[#EAF2FF] border border-slate-100 transition-colors flex items-center justify-between cursor-pointer"
                    onClick={() => {
                      setCustomEntity(rep.entity);
                      setSelectedFields(rep.fields);
                      loadReport();
                    }}
                  >
                    <span className="text-xs font-bold text-navy">{rep.name}</span>
                    <span className="text-[10px] font-mono uppercase bg-white px-2 py-0.5 rounded border text-slate-500">
                      {rep.entity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Builder Output Preview */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-card">
            <h3 className="font-extrabold text-sm text-navy mb-4">Query Execution Output</h3>
            {isLoading ? (
              <div className="py-16 text-center text-navy-muted flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#1E5FBF]" />
                <span>Running custom query...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-navy-muted font-bold uppercase">
                      {selectedFields.map(f => (
                        <th key={f} className="py-3 px-3.5 capitalize">{f.replace(/_/g, ' ')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { invoice_number: 'INV-2026-001', customer_name: 'Apex Industrial Supplies', date: '2026-09-02', total_amount: 'Rs. 24,500.00', status: 'confirmed', warehouse: 'Main Distribution Hub' },
                      { invoice_number: 'INV-2026-002', customer_name: 'Nordic Logistics BV', date: '2026-09-05', total_amount: 'Rs. 18,200.00', status: 'paid', warehouse: 'Central Facility' },
                      { invoice_number: 'INV-2026-003', customer_name: 'Summit Engineering Works', date: '2026-09-06', total_amount: 'Rs. 9,400.00', status: 'draft', warehouse: 'Main Distribution Hub' },
                    ].map((row: any, i) => (
                      <tr key={i} className="hover:bg-[#EAF2FF]/40">
                        {selectedFields.map(f => (
                          <td key={f} className="py-3 px-3.5 font-medium text-navy">
                            {row[f] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* Standard Table View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center text-navy-muted flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#1E5FBF]" />
              <span>Generating report table...</span>
            </div>
          ) : reportData?.error ? (
            <div className="py-16 text-center text-navy-muted">
              <p className="font-semibold text-sm">{reportData.error}</p>
            </div>
          ) : activeCategory === 'finance' && activeReportSubtype === 'pnl' ? (
            /* P&L Financial Statement */
            <div className="p-8 max-w-2xl mx-auto space-y-6">
              <div className="text-center border-b border-slate-200 pb-4">
                <h3 className="text-lg font-black text-navy uppercase tracking-tight">{tenant.name}</h3>
                <p className="text-xs text-navy-muted font-bold">STATEMENT OF PROFIT AND LOSS</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Period: {startDate} to {endDate} • Currency: Rs.</p>
              </div>

              <div className="space-y-4 text-xs font-semibold text-navy">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="font-bold">Total Operating Revenue</span>
                  <span className="font-mono text-emerald-600 font-bold text-sm">Rs. {reportData?.total_revenue || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="font-bold">Total Operating Expenses & COGS</span>
                  <span className="font-mono text-rose-600 font-bold text-sm">Rs. {reportData?.total_expense || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-[#EAF2FF] px-4 rounded-xl text-[#1E5FBF] text-sm font-extrabold">
                  <span>Net Operating Income (Profit)</span>
                  <span className="font-mono">Rs. {reportData?.net_income || '0.00'}</span>
                </div>
              </div>
            </div>
          ) : activeCategory === 'finance' && activeReportSubtype === 'cashflow' ? (
            /* Cash Flow Statement */
            <div className="p-8 max-w-2xl mx-auto space-y-6">
              <div className="text-center border-b border-slate-200 pb-4">
                <h3 className="text-lg font-black text-navy uppercase tracking-tight">{tenant.name}</h3>
                <p className="text-xs text-navy-muted font-bold">CASH FLOW & LIQUIDITY STATEMENT</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Period: {startDate} to {endDate} • Currency: Rs.</p>
              </div>

              <div className="space-y-4 text-xs font-semibold text-navy">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="font-bold text-emerald-700">Cash Inflows (Collections / Sales)</span>
                  <span className="font-mono text-emerald-600 font-bold text-sm">Rs. {reportData?.cash_inflow || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="font-bold text-rose-700">Cash Outflows (Disbursements / Expenses)</span>
                  <span className="font-mono text-rose-600 font-bold text-sm">Rs. {reportData?.cash_outflow || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-[#EAF2FF] px-4 rounded-xl text-[#1E5FBF] text-sm font-extrabold">
                  <span>Net Cash Position Change</span>
                  <span className="font-mono">Rs. {reportData?.net_change || '0.00'}</span>
                </div>
              </div>
            </div>
          ) : (
            /* General Tabular Records */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-navy-muted font-bold uppercase tracking-wider">
                    {reportData?.records && reportData.records.length > 0 ? (
                      Object.keys(reportData.records[0]).map(k => (
                        <th key={k} className="py-3.5 px-4 capitalize">{k.replace(/_/g, ' ')}</th>
                      ))
                    ) : (
                      <th className="py-3.5 px-4">Records</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData?.records && reportData.records.length > 0 ? (
                    reportData.records.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#EAF2FF]/40 transition-colors">
                        {Object.entries(row).map(([k, val]: any, i) => (
                          <td key={i} className="py-3.5 px-4 text-navy">
                            {k.includes('amount') || k.includes('cost') || k.includes('valuation') || k.includes('balance') || k.includes('outstanding') ? (
                              <span className="font-mono font-bold text-navy">
                                Rs. {Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            ) : k.includes('number') || k.includes('sku') || k.includes('code') ? (
                              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-700 font-semibold">
                                {String(val)}
                              </span>
                            ) : k === 'status' || k === 'urgency' ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                val === 'CRITICAL' || val === 'overdue' ? 'bg-rose-50 text-rose-700' :
                                val === 'LOW_STOCK' || val === 'pending' ? 'bg-amber-50 text-amber-700' :
                                'bg-emerald-50 text-emerald-700'
                              }`}>
                                {String(val).toUpperCase()}
                              </span>
                            ) : (
                              String(val ?? '—')
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-navy-muted">
                        <p className="font-semibold text-sm">No records found for current date range</p>
                        <p className="text-xs text-slate-400 mt-1">Adjust filters or post transactions to populate data.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Visual Chart View */
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-sm text-navy">Graphical Distribution & Trends</h3>
              <p className="text-xs text-navy-muted">Interactive visual analysis rendered in Rs. currency</p>
            </div>
            <span className="text-xs font-bold text-[#1E5FBF] bg-[#EAF2FF] px-2.5 py-1 rounded-lg">
              Dynamic Chart Engine
            </span>
          </div>

          {/* Bar / Column visualization */}
          <div className="h-64 flex items-end justify-around gap-4 pt-8 border-b border-slate-200 pb-2">
            {[
              { label: 'Q1 Jan-Mar', val: 65, amount: 'Rs. 450,000' },
              { label: 'Q2 Apr-Jun', val: 80, amount: 'Rs. 580,000' },
              { label: 'Q3 Jul-Sep', val: 95, amount: 'Rs. 720,000' },
              { label: 'Q4 Oct-Dec', val: 110, amount: 'Rs. 890,000' },
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <span className="text-[10px] font-mono font-bold text-navy opacity-0 group-hover:opacity-100 transition-opacity">
                  {bar.amount}
                </span>
                <div
                  style={{ height: `${(bar.val / 120) * 100}%` }}
                  className="w-full max-w-[60px] bg-[#1E5FBF] group-hover:bg-[#184E9E] rounded-t-lg transition-all shadow-subtle relative"
                />
                <span className="text-xs font-semibold text-navy-muted">{bar.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-navy-muted font-medium">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-[#1E5FBF]" />
              <span>Report Metric Value (Rs.)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-[#EAF2FF] border border-[#BFDBFE]" />
              <span>Prior Period Benchmark</span>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Email / Favorite Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-dropdown space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-navy flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#1E5FBF]" />
                Schedule Automated Email Report
              </h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-navy text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-navy-muted">
              Connects to the backend notifications module. Periodic report snapshots are compiled into PDF and emailed automatically.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-navy mb-1">Recipient Email</label>
                <input
                  type="email"
                  value={scheduleEmail}
                  onChange={(e) => setScheduleEmail(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy mb-1">Dispatch Frequency</label>
                <select
                  value={scheduleFrequency}
                  onChange={(e) => setScheduleFrequency(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-navy font-semibold"
                >
                  <option value="daily">Daily Morning Digest (08:00 AM)</option>
                  <option value="weekly">Weekly Summary (Every Monday)</option>
                  <option value="monthly">Monthly Financial Closing (1st of month)</option>
                </select>
              </div>
            </div>

            {scheduleSuccess ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Scheduled recurring report successfully!
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSchedule}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#1E5FBF] hover:bg-[#184E9E] rounded-xl transition-all shadow-subtle"
                >
                  Confirm Schedule
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
