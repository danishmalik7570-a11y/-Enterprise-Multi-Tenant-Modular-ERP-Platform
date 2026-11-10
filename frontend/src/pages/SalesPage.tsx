import React from 'react';
import { CrudPage, ColumnDef, FormFieldDef } from '../components/CrudPage';
import { StatusPill } from '../components/StatusPill';
import { useTenant } from '../context/TenantContext';
import { CheckCircle2, FileDown } from 'lucide-react';

export const SalesPage: React.FC = () => {
  const { apiFetch, tenant } = useTenant();

  const handleConfirmInvoice = async (invoiceId: number, refresh: () => void) => {
    try {
      await apiFetch(`/api/sales/invoices/${invoiceId}/confirm/`, { method: 'POST' });
      refresh();
    } catch (err) {
      alert(`Confirm failed: ${err}`);
    }
  };

  const handleDownloadPDF = async (invoiceId: number, invoiceNum: string) => {
    try {
      const response = await fetch(`/api/sales/invoices/${invoiceId}/pdf/`, {
        headers: {
          'X-Tenant-Subdomain': tenant.subdomain,
        }
      });
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`PDF download failed: ${err}`);
    }
  };

  const columns: ColumnDef[] = [
    { key: 'invoice_number', label: 'Invoice #', sortable: true, isMono: true },
    { key: 'customer_name', label: 'Customer', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'due_date', label: 'Due Date' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusPill status={val} />,
    },
    { key: 'total_amount', label: 'Total Amount', sortable: true, isMoney: true },
    {
      key: 'journal_entry',
      label: 'Ledger Posting',
      render: (val, r) => val ? (
        <span className="font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-bold">
          JE-{r.invoice_number}
        </span>
      ) : (
        <span className="text-slate-400 text-xs italic">Unposted Draft</span>
      ),
    },
  ];

  const formFields: FormFieldDef[] = [
    { name: 'invoice_number', label: 'Invoice Number', type: 'text', required: true, placeholder: 'INV-2026-010' },
    { name: 'customer', label: 'Customer ID', type: 'number', required: true, placeholder: 'e.g. 1' },
    { name: 'date', label: 'Invoice Date', type: 'date', required: true },
    { name: 'due_date', label: 'Due Date', type: 'date', required: true },
    { name: 'notes', label: 'Invoice Memo / Description', type: 'textarea', placeholder: 'Project milestones or delivery notes' },
  ];

  return (
    <CrudPage
      title="Sales Orders & Invoices"
      subtitle="Issue customer invoices for products or services. Confirmed invoices auto-post to the ledger."
      endpoint="/api/sales/invoices/"
      moduleKey="sales"
      columns={columns}
      formFields={formFields}
      actionsRenderer={(record, refresh) => (
        <div className="flex items-center gap-1">
          {record.status === 'draft' && (
            <button
              onClick={() => handleConfirmInvoice(record.id, refresh)}
              title="Confirm & Post to Ledger"
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleDownloadPDF(record.id, record.invoice_number)}
            title="Download Template PDF"
            className="p-1.5 text-[#1E5FBF] hover:bg-[#EAF2FF] rounded-lg transition-colors"
          >
            <FileDown className="w-4 h-4" />
          </button>
        </div>
      )}
    />
  );
};

