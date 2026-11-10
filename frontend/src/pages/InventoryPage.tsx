import React from 'react';
import { CrudPage, ColumnDef, FormFieldDef } from '../components/CrudPage';
import { useTenant } from '../context/TenantContext';
import { AlertCircle } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { isModuleEnabled, tenant } = useTenant();

  if (!isModuleEnabled('inventory')) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-card text-center max-w-xl mx-auto mt-12 animate-in fade-in">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-navy">Inventory Module Inactive</h2>
        <p className="text-xs text-navy-muted mt-2 leading-relaxed">
          <strong>{tenant.name}</strong> operates as a services consultancy firm. Physical inventory tracking is disabled and bypassed by configuration.
        </p>
      </div>
    );
  }

  const columns: ColumnDef[] = [
    { key: 'code', label: 'Warehouse Code', sortable: true, isMono: true },
    { key: 'name', label: 'Warehouse Name', sortable: true },
    { key: 'address', label: 'Physical Location / Address' },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${val ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {val ? 'Operational' : 'Inactive'}
        </span>
      ),
    },
  ];

  const formFields: FormFieldDef[] = [
    { name: 'code', label: 'Warehouse Code', type: 'text', required: true, placeholder: 'e.g. WH-EAST' },
    { name: 'name', label: 'Warehouse Name', type: 'text', required: true, placeholder: 'e.g. Eastern Distribution Hub' },
    { name: 'address', label: 'Physical Address', type: 'textarea', placeholder: 'Address line, City, State' },
    { name: 'is_active', label: 'Active Facility', type: 'boolean', defaultValue: true },
  ];

  return (
    <CrudPage
      title="Warehouses & Storage Locations"
      subtitle="Manage storage facilities, distribution centers, and stock balance points."
      endpoint="/api/inventory/warehouses/"
      moduleKey="inventory"
      columns={columns}
      formFields={formFields}
    />

  );
};
