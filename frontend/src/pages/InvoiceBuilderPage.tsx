import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Palette,
  Eye,
  Save,
  Plus,
  Trash2,
  FileDown,
  Check,
  CheckCircle2,
  Sliders,
  Sparkles,
  Building,
  User,
  ListOrdered,
  DollarSign,
  FileText,
  ShieldAlert
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';

interface TemplateConfig {
  header: {
    company_name: string;
    company_address: string;
    tax_id: string;
    number_prefix: string;
  };
  party: {
    show_tax_id: boolean;
    show_ship_to: boolean;
    show_phone: boolean;
  };
  line_items: {
    show_sku: boolean;
    show_discount: boolean;
    show_tax: boolean;
  };
  totals: {
    amount_in_words: boolean;
    show_subtotal: boolean;
    show_tax_breakdown: boolean;
  };
  footer: {
    terms: string;
    bank_details: string;
    signature_block: boolean;
    custom_notes: string;
  };
  styling: {
    accent_color: string;
    font_family: string;
    show_borders: boolean;
    logo_placement: 'left' | 'center' | 'right';
  };
}

const DEFAULT_CONFIG: TemplateConfig = {
  header: {
    company_name: 'Apex Retail Gear',
    company_address: '450 Industrial Parkway, Sector 12\nKarachi / Mumbai',
    tax_id: 'GSTIN / NTN: 27AABCA1234A1Z5',
    number_prefix: 'INV-{year}-{seq}',
  },
  party: {
    show_tax_id: true,
    show_ship_to: true,
    show_phone: true,
  },
  line_items: {
    show_sku: true,
    show_discount: true,
    show_tax: true,
  },
  totals: {
    amount_in_words: true,
    show_subtotal: true,
    show_tax_breakdown: true,
  },
  footer: {
    terms: 'Goods once dispatched cannot be returned without Return Merchandise Authorization (RMA).\nInterest @ 1.5% per month charged on overdue balances.',
    bank_details: 'Bank: Standard Chartered Commercial\nA/C No: 01089291001\nIFSC/SWIFT: SCBL00021',
    signature_block: true,
    custom_notes: 'Authorized signature required on goods receipt.',
  },
  styling: {
    accent_color: '#1E5FBF',
    font_family: 'Helvetica',
    show_borders: true,
    logo_placement: 'left',
  },
};

export const InvoiceBuilderPage: React.FC = () => {
  const { apiFetch, tenant, currentRole } = useTenant();

  // Role check: Only Owner/Admin can edit templates; Sales role can view/select
  const canEditTemplate = currentRole === 'Owner' || currentRole === 'Admin';

  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState<string>('Standard Commercial Invoice');
  const [isDefault, setIsDefault] = useState<boolean>(true);
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_CONFIG);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<'header' | 'party' | 'items' | 'totals' | 'footer' | 'styling'>('header');

  // Load existing templates from backend
  const loadTemplates = async () => {
    try {
      const data = await apiFetch('/api/sales/templates/');
      if (Array.isArray(data) && data.length > 0) {
        setTemplates(data);
        const def = data.find(t => t.is_default) || data[0];
        setSelectedTemplateId(def.id);
        setTemplateName(def.name);
        setIsDefault(def.is_default);
        if (def.config && Object.keys(def.config).length > 0) {
          setConfig({ ...DEFAULT_CONFIG, ...def.config });
        }
      }
    } catch (e) {
      console.warn('Could not load invoice templates', e);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleSelectTemplate = (tpl: any) => {
    setSelectedTemplateId(tpl.id);
    setTemplateName(tpl.name);
    setIsDefault(tpl.is_default);
    if (tpl.config && Object.keys(tpl.config).length > 0) {
      setConfig({ ...DEFAULT_CONFIG, ...tpl.config });
    }
  };

  const handleSaveTemplate = async () => {
    if (!canEditTemplate) return;
    setIsSaving(true);
    try {
      if (selectedTemplateId) {
        await apiFetch(`/api/sales/templates/${selectedTemplateId}/`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: templateName,
            is_default: isDefault,
            config: config,
          }),
        });
      } else {
        const created = await apiFetch('/api/sales/templates/', {
          method: 'POST',
          body: JSON.stringify({
            name: templateName,
            is_default: isDefault,
            config: config,
          }),
        });
        setSelectedTemplateId(created.id);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      loadTemplates();
    } catch (err) {
      alert(`Save failed: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewTemplate = () => {
    setSelectedTemplateId(null);
    setTemplateName('New Custom Template');
    setIsDefault(false);
    setConfig(DEFAULT_CONFIG);
  };

  const handleDownloadSamplePDF = async () => {
    try {
      const res = await fetch('/api/sales/templates/render-pdf/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Subdomain': tenant.subdomain,
        },
        body: JSON.stringify({
          config: config,
        }),
      });
      if (!res.ok) throw new Error("Server error generating PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateName.replace(/\s+/g, '_')}_Sample.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`Download PDF failed: ${err}`);
    }
  };

  // Sample data for live preview
  const sampleItems = [
    { sku: 'PRD-101', name: 'Precision Industrial Bearings (Pack of 10)', qty: 5, unitPrice: 1400.0, disc: 0, tax: 18, total: 7000.0 },
    { sku: 'PRD-102', name: 'High-Tensile Structural Fasteners', qty: 25, unitPrice: 280.0, disc: 5, tax: 18, total: 6650.0 },
  ];
  const sampleSubtotal = sampleItems.reduce((acc, itm) => acc + itm.total, 0);
  const sampleTax = sampleSubtotal * 0.18;
  const sampleGrandTotal = sampleSubtotal + sampleTax;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-navy tracking-tight">Invoice Format Builder</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAF2FF] text-[#1E5FBF] border border-[#BFDBFE]">
              {canEditTemplate ? 'Full Design Mode (Owner)' : 'View & Selection Mode (Sales)'}
            </span>
          </div>
          <p className="text-xs text-navy-muted mt-1">
            Design document and invoice layouts with live real-time preview and instant PDF rendering.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {canEditTemplate && (
            <button
              onClick={handleCreateNewTemplate}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-[#1E5FBF]" />
              <span>+ New Format</span>
            </button>
          )}

          <button
            onClick={handleDownloadSamplePDF}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download Sample PDF</span>
          </button>

          {canEditTemplate && (
            <button
              onClick={handleSaveTemplate}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1E5FBF] hover:bg-[#184E9E] rounded-xl transition-all shadow-subtle disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Template'}</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Template configuration successfully saved to tenant database.
        </div>
      )}

      {/* Role access banner for Sales role */}
      {!canEditTemplate && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            You are logged in with the <strong>Sales</strong> role. You can select and preview templates, but only Owner/Admin roles can edit layout configurations.
          </span>
        </div>
      )}

      {/* Template Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-card flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-navy whitespace-nowrap">Active Template:</label>
          <div className="flex items-center gap-2 flex-wrap">
            {templates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => handleSelectTemplate(tpl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedTemplateId === tpl.id
                    ? 'bg-[#1E5FBF] text-white shadow-subtle'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tpl.name} {tpl.is_default && '★'}
              </button>
            ))}
          </div>
        </div>

        {canEditTemplate && (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-navy font-bold focus:border-[#1E5FBF]"
              placeholder="Template name"
            />
            <label className="flex items-center gap-1.5 text-xs text-navy font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded text-[#1E5FBF]"
              />
              <span>Default for Tenant</span>
            </label>
          </div>
        )}
      </div>

      {/* Main Split Canvas: Builder Controls (Left) vs Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Structured Form Editor (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Section Selector Tabs */}
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-card flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'header', label: 'Header', icon: Building },
              { id: 'party', label: 'Party Block', icon: User },
              { id: 'items', label: 'Line Items', icon: ListOrdered },
              { id: 'totals', label: 'Totals', icon: DollarSign },
              { id: 'footer', label: 'Footer', icon: FileText },
              { id: 'styling', label: 'Theme & Style', icon: Palette },
            ].map(sec => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    isActive ? 'bg-[#1E5FBF] text-white shadow-subtle' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>

          {/* Section Config Panel */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card space-y-4">
            {activeSection === 'header' && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-navy uppercase tracking-wider">Company & Document Header</h3>
                <div>
                  <label className="block text-xs font-bold text-navy mb-1">Company Display Name</label>
                  <input
                    type="text"
                    disabled={!canEditTemplate}
                    value={config.header.company_name}
                    onChange={(e) => setConfig({ ...config, header: { ...config.header, company_name: e.target.value } })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-navy font-semibold focus:border-[#1E5FBF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy mb-1">Company Address</label>
                  <textarea
                    rows={2}
                    disabled={!canEditTemplate}
                    value={config.header.company_address}
                    onChange={(e) => setConfig({ ...config, header: { ...config.header, company_address: e.target.value } })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-navy focus:border-[#1E5FBF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy mb-1">Tax ID / GSTIN / NTN</label>
                  <input
                    type="text"
                    disabled={!canEditTemplate}
                    value={config.header.tax_id}
                    onChange={(e) => setConfig({ ...config, header: { ...config.header, tax_id: e.target.value } })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-navy font-mono focus:border-[#1E5FBF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy mb-1">Invoice Numbering Pattern</label>
                  <input
                    type="text"
                    disabled={!canEditTemplate}
                    value={config.header.number_prefix}
                    onChange={(e) => setConfig({ ...config, header: { ...config.header, number_prefix: e.target.value } })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-navy font-mono focus:border-[#1E5FBF]"
                    placeholder="INV-{year}-{seq}"
                  />
                </div>
              </div>
            )}

            {activeSection === 'party' && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-navy uppercase tracking-wider">Party / Customer Details Block</h3>
                <label className="flex items-center gap-2 text-xs text-navy font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEditTemplate}
                    checked={config.party.show_tax_id}
                    onChange={(e) => setConfig({ ...config, party: { ...config.party, show_tax_id: e.target.checked } })}
                    className="rounded text-[#1E5FBF]"
                  />
                  <span>Show Customer Tax ID / NTN</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-navy font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEditTemplate}
                    checked={config.party.show_ship_to}
                    onChange={(e) => setConfig({ ...config, party: { ...config.party, show_ship_to: e.target.checked } })}
                    className="rounded text-[#1E5FBF]"
                  />
                  <span>Include Separate Shipping Address (Ship-To)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-navy font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEditTemplate}
                    checked={config.party.show_phone}
                    onChange={(e) => setConfig({ ...config, party: { ...config.party, show_phone: e.target.checked } })}
                    className="rounded text-[#1E5FBF]"
                  />
                  <span>Display Contact Phone Number</span>
                </label>
              </div>
            )}

            {activeSection === 'items' && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-navy uppercase tracking-wider">Line Items Columns Configuration</h3>
                <p className="text-[11px] text-navy-muted">Choose which data fields appear in the itemized table.</p>
                <label className="flex items-center gap-2 text-xs text-navy font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEditTemplate}
                    checked={config.line_items.show_sku}
                    onChange={(e) => setConfig({ ...config, line_items: { ...config.line_items, show_sku: e.target.checked } })}
                    className="rounded text-[#1E5FBF]"
                  />
                  <span>Include SKU / Product Code column</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-navy font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEditTemplate}
                    checked={config.line_items.show_discount}
                    onChange={(e) => setConfig({ ...config, line_items: { ...config.line_items, show_discount: e.target.checked } })}
                    className="rounded text-[#1E5FBF]"
                  />
                  <span>Show Line Discount % column</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-navy font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEditTemplate}
                    checked={config.line_items.show_tax}
                    onChange={(e) => setConfig({ ...config, line_items: { ...config.line_items, show_tax: e.target.checked } })}
                    className="rounded text-[#1E5FBF]"
                  />
                  <span>Show Tax Rate % column</span>
                </label>
              </div>
            )}

            {activeSection === 'totals' && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-navy uppercase tracking-wider">Totals & Breakdown</h3>
                <label className="flex items-center gap-2 text-xs text-navy font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEditTemplate}
                    checked={config.totals.show_subtotal}
                    onChange={(e) => setConfig({ ...config, totals: { ...config.totals, show_subtotal: e.target.checked } })}
                    className="rounded text-[#1E5FBF]"
                  />
                  <span>Show Net Subtotal</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-navy font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEditTemplate}
                    checked={config.totals.show_tax_breakdown}
                    onChange={(e) => setConfig({ ...config, totals: { ...config.totals, show_tax_breakdown: e.target.checked } })}
                    className="rounded text-[#1E5FBF]"
                  />
                  <span>Display Tax Amount Line</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-navy font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEditTemplate}
                    checked={config.totals.amount_in_words}
                    onChange={(e) => setConfig({ ...config, totals: { ...config.totals, amount_in_words: e.target.checked } })}
                    className="rounded text-[#1E5FBF]"
                  />
                  <span>Convert Total to Amount in Words (Rupees)</span>
                </label>
              </div>
            )}

            {activeSection === 'footer' && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-navy uppercase tracking-wider">Footer Terms & Bank Details</h3>
                <div>
                  <label className="block text-xs font-bold text-navy mb-1">Standard Terms & Conditions</label>
                  <textarea
                    rows={2}
                    disabled={!canEditTemplate}
                    value={config.footer.terms}
                    onChange={(e) => setConfig({ ...config, footer: { ...config.footer, terms: e.target.value } })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-navy focus:border-[#1E5FBF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy mb-1">Bank Payment Instructions</label>
                  <textarea
                    rows={2}
                    disabled={!canEditTemplate}
                    value={config.footer.bank_details}
                    onChange={(e) => setConfig({ ...config, footer: { ...config.footer, bank_details: e.target.value } })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-navy focus:border-[#1E5FBF]"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-navy font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEditTemplate}
                    checked={config.footer.signature_block}
                    onChange={(e) => setConfig({ ...config, footer: { ...config.footer, signature_block: e.target.checked } })}
                    className="rounded text-[#1E5FBF]"
                  />
                  <span>Include Authorized Signature / Stamp Line</span>
                </label>
              </div>
            )}

            {activeSection === 'styling' && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-navy uppercase tracking-wider">Visual Theme Controls</h3>
                <div>
                  <label className="block text-xs font-bold text-navy mb-1">Primary Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      disabled={!canEditTemplate}
                      value={config.styling.accent_color}
                      onChange={(e) => setConfig({ ...config, styling: { ...config.styling, accent_color: e.target.value } })}
                      className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      disabled={!canEditTemplate}
                      value={config.styling.accent_color}
                      onChange={(e) => setConfig({ ...config, styling: { ...config.styling, accent_color: e.target.value } })}
                      className="w-28 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-navy font-mono font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy mb-1">Logo Placement</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['left', 'center', 'right'] as const).map(pos => (
                      <button
                        key={pos}
                        disabled={!canEditTemplate}
                        onClick={() => setConfig({ ...config, styling: { ...config.styling, logo_placement: pos } })}
                        className={`py-1.5 text-xs font-bold rounded-lg border capitalize ${
                          config.styling.logo_placement === pos
                            ? 'bg-[#1E5FBF] text-white border-[#1E5FBF]'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-navy font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEditTemplate}
                    checked={config.styling.show_borders}
                    onChange={(e) => setConfig({ ...config, styling: { ...config.styling, show_borders: e.target.checked } })}
                    className="rounded text-[#1E5FBF]"
                  />
                  <span>Show Grid Borders on Line Items Table</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Live Interactive Invoice Canvas Preview (7 cols) */}
        <div className="lg:col-span-7">
          <div className="sticky top-24 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-8 font-sans">
            {/* Live Indicator */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-navy-muted">
                  Live Render Preview ({templateName})
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Letter Page Size • 72 DPI</span>
            </div>

            {/* 1. Header Section */}
            <div className={`flex items-start justify-between gap-6 pb-6 border-b border-slate-100 ${
              config.styling.logo_placement === 'right' ? 'flex-row-reverse' : ''
            }`}>
              <div>
                <h2 className="text-xl font-black tracking-tight" style={{ color: config.styling.accent_color }}>
                  {config.header.company_name}
                </h2>
                <p className="text-xs text-slate-600 whitespace-pre-line mt-1">
                  {config.header.company_address}
                </p>
                <p className="text-xs font-mono font-bold text-navy mt-1">
                  {config.header.tax_id}
                </p>
              </div>

              <div className="text-right">
                <span className="text-lg font-black tracking-wider uppercase" style={{ color: config.styling.accent_color }}>
                  TAX INVOICE
                </span>
                <div className="mt-2 space-y-0.5 text-xs text-navy font-medium">
                  <p><span className="text-slate-400">Invoice #:</span> <span className="font-mono font-bold">INV-2026-0001</span></p>
                  <p><span className="text-slate-400">Date:</span> 2026-09-07</p>
                  <p><span className="text-slate-400">Due Date:</span> 2026-09-21</p>
                </div>
              </div>
            </div>

            {/* 2. Party Block */}
            <div className="my-6 grid grid-cols-2 gap-4 bg-[#EAF2FF]/50 p-4 rounded-xl">
              <div className="text-xs text-navy">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Bill To:</span>
                <p className="font-bold text-sm text-navy">Apex Industrial Supplies Ltd</p>
                <p className="text-slate-600">Plot 42, Port Qasim Industrial Area, Karachi</p>
                {config.party.show_tax_id && <p className="font-mono text-slate-700 mt-1">Tax ID: NTN-8822334</p>}
                {config.party.show_phone && <p className="text-slate-500 mt-0.5">+92 (21) 3456-7890</p>}
              </div>

              {config.party.show_ship_to && (
                <div className="text-xs text-navy">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Ship To:</span>
                  <p className="font-bold text-navy">Apex Distribution Center #2</p>
                  <p className="text-slate-600">Warehouse Complex B, Hub River Road</p>
                </div>
              )}
            </div>

            {/* 3. Line Items Table */}
            <div className="my-6 overflow-hidden rounded-xl">
              <table className={`w-full text-left text-xs ${config.styling.show_borders ? 'border border-slate-200' : ''}`}>
                <thead>
                  <tr style={{ backgroundColor: config.styling.accent_color }} className="text-white font-bold uppercase">
                    {config.line_items.show_sku && <th className="py-2.5 px-3">SKU</th>}
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    {config.line_items.show_discount && <th className="py-2.5 px-3 text-center">Disc %</th>}
                    {config.line_items.show_tax && <th className="py-2.5 px-3 text-center">Tax %</th>}
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sampleItems.map((itm, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {config.line_items.show_sku && (
                        <td className="py-2.5 px-3 font-mono text-slate-600 font-semibold">{itm.sku}</td>
                      )}
                      <td className="py-2.5 px-3 font-semibold text-navy">{itm.name}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{itm.qty}</td>
                      <td className="py-2.5 px-3 text-right font-mono">Rs. {itm.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      {config.line_items.show_discount && <td className="py-2.5 px-3 text-center font-mono">{itm.disc}%</td>}
                      {config.line_items.show_tax && <td className="py-2.5 px-3 text-center font-mono">{itm.tax}%</td>}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-navy">
                        Rs. {itm.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. Totals Block */}
            <div className="my-6 flex items-start justify-between gap-6">
              <div className="flex-1 text-xs text-navy-muted">
                {config.totals.amount_in_words && (
                  <div>
                    <span className="font-bold text-navy block text-[11px] uppercase tracking-wider">Amount in Words:</span>
                    <p className="font-semibold text-slate-700 mt-1 italic">
                      Rupees {Math.round(sampleGrandTotal).toLocaleString()} Only
                    </p>
                  </div>
                )}
              </div>

              <div className="w-64 space-y-2 text-xs font-semibold text-navy">
                {config.totals.show_subtotal && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-mono font-bold">Rs. {sampleSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {config.totals.show_tax_breakdown && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Tax Breakdown (18%):</span>
                    <span className="font-mono font-bold">Rs. {sampleTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div
                  className="flex justify-between py-2 text-sm font-extrabold border-t-2"
                  style={{ color: config.styling.accent_color, borderColor: config.styling.accent_color }}
                >
                  <span>Grand Total:</span>
                  <span className="font-mono">Rs. {sampleGrandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* 5. Footer Section */}
            <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <div>
                  <span className="font-bold text-navy block text-[10px] uppercase tracking-wider">Terms & Conditions:</span>
                  <p className="text-slate-500 text-[11px] whitespace-pre-line mt-0.5">{config.footer.terms}</p>
                </div>
                <div>
                  <span className="font-bold text-navy block text-[10px] uppercase tracking-wider">Bank Details:</span>
                  <p className="font-mono text-slate-600 text-[11px] whitespace-pre-line mt-0.5">{config.footer.bank_details}</p>
                </div>
              </div>

              {config.footer.signature_block && (
                <div className="flex flex-col justify-end items-end text-right">
                  <div className="w-48 border-b border-slate-300 pb-1 mb-1" />
                  <span className="text-xs font-bold text-navy">Authorized Signature & Stamp</span>
                  <span className="text-[10px] text-slate-400">For {config.header.company_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
