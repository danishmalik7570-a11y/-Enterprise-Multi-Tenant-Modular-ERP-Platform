import React from 'react';
import { CrudPage, ColumnDef, FormFieldDef } from '../components/CrudPage';
import { StatusPill } from '../components/StatusPill';
import { useTenant } from '../context/TenantContext';
import { PackageCheck } from 'lucide-react';

export const PurchasingPage: React.FC = () => {
  const { apiFetch } = useTenant();

  const handleReceiveOrder = async (poId: number, refresh: () => void) => {
    try {
      await apiFetch(`/api/purchasing/orders/${poId}/receive/`, { method: 'POST' });
      refresh();
    } catch (err) {
      alert(`Receive failed: ${err}`);
    }
  };

  const columns: ColumnDef[] = [
    { key: 'order_number', label: 'PO #', sortable: true, isMono: true },
    { key: 'supplier_name', label: 'Supplier', sortable: true },
    { key: 'warehouse_name', label: 'Target Warehouse' },
    { key: 'order_date', label: 'Order Date', sortable: true },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusPill status={val} />,
    },
    { key: 'total_amount', label: 'Total Billed', sortable: true, isMoney: true },
  ];

  const formFields: FormFieldDef[] = [
    { name: 'order_number', label: 'PO Number', type: 'text', required: true, placeholder: 'PO-2026-020' },
    { name: 'supplier', label: 'Supplier ID', type: 'number', required: true, placeholder: 'e.g. 1' },
    { name: 'warehouse', label: 'Destination Warehouse ID', type: 'number', placeholder: 'e.g. 1' },
    { name: 'order_date', label: 'Order Date', type: 'date', required: true },
    { name: 'notes', label: 'PO Notes / Terms', type: 'textarea', placeholder: 'Shipping or FOB terms' },
  ];

  return (
    <CrudPage
      title="Purchasing & Vendor Bills"
      subtitle="Issue purchase orders to suppliers. Receiving updates stock and posts Accounts Payable."
      endpoint="/api/purchasing/orders/"
      moduleKey="purchasing"
      columns={columns}
      formFields={formFields}

      actionsRenderer={(record, refresh) => {
        if (record.status === 'draft') {
          return (
            <button
              onClick={() => handleReceiveOrder(record.id, refresh)}
              title="Receive Goods & Post to AP"
              className="p-1.5 text-[#1E5FBF] hover:bg-[#EAF2FF] rounded-lg transition-colors"
            >
              <PackageCheck className="w-4 h-4" />
            </button>
          );
        }
        return null;
      }}
    />
  );
};
