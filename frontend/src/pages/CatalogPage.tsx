import React from 'react';
import { CrudPage, ColumnDef, FormFieldDef, FilterDef } from '../components/CrudPage';
import { StatusPill } from '../components/StatusPill';
import { useTenant } from '../context/TenantContext';

export const CatalogPage: React.FC = () => {
  const { tenant, currentRole } = useTenant();

  // Role-aware columns: Hide cost_price if currentRole is 'Sales' or 'Warehouse'
  const isCostHidden = currentRole === 'Sales' || currentRole === 'Warehouse';

  const columns: ColumnDef[] = [
    { key: 'sku', label: 'SKU', sortable: true, isMono: true },
    { key: 'name', label: 'Item Name', sortable: true },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (val) => <StatusPill status={val === 'goods' ? 'Goods' : 'Service'} />,
    },
    {
      key: 'is_stock_tracked',
      label: 'Track Stock',
      render: (val) => (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${val ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {val ? 'Tracked' : 'Non-Tracked'}
        </span>
      ),
    },
    { key: 'selling_price', label: 'Selling Price', sortable: true, isMoney: true },
    ...(isCostHidden ? [] : [{ key: 'cost_price', label: 'Cost Price', sortable: true, isMoney: true }]),
    { key: 'unit_of_measure', label: 'UoM' },
    {
      key: 'total_stock',
      label: 'On Hand',
      sortable: true,
      render: (val, r) => (
        <span className="font-mono font-bold text-navy">
          {r.is_stock_tracked ? Number(val || 0).toLocaleString() : '—'}
        </span>
      ),
    },
  ];

  const formFields: FormFieldDef[] = [
    { name: 'sku', label: 'SKU / Item Code', type: 'text', required: true, placeholder: 'e.g. PRD-100' },
    { name: 'name', label: 'Item / Service Name', type: 'text', required: true, placeholder: 'e.g. Expedition Roof Tent' },
    {
      name: 'type',
      label: 'Catalog Type',
      type: 'select',
      required: true,
      options: [
        { label: 'Physical Product / Goods', value: 'goods' },
        { label: 'Service / Non-Physical', value: 'service' },
      ],
      defaultValue: 'goods',
    },
    { name: 'is_stock_tracked', label: 'Enable Physical Stock Tracking', type: 'boolean', defaultValue: true },
    { name: 'unit_of_measure', label: 'Unit of Measure', type: 'text', placeholder: 'pcs, hours, box, kg', defaultValue: 'pcs' },
    { name: 'selling_price', label: 'Selling Price', type: 'number', required: true, placeholder: '150.00' },
    { name: 'cost_price', label: 'Cost Price', type: 'number', placeholder: '80.00' },
    { name: 'tax_rate', label: 'Tax Rate (%)', type: 'number', placeholder: '0.00' },
  ];

  const filters: FilterDef[] = [
    {
      key: 'type',
      label: 'Type',
      options: [
        { label: 'Physical Goods', value: 'goods' },
        { label: 'Services', value: 'service' },
      ],
    },
  ];

  return (
    <CrudPage
      title="Catalog Items & Services"
      subtitle={`Manage your business catalog. Cost price is ${isCostHidden ? 'hidden (masked for ' + currentRole + ' role)' : 'visible to your role'}.`}
      endpoint="/api/catalog/items/"
      moduleKey="catalog"
      columns={columns}
      formFields={formFields}
      filters={filters}
    />

  );
};
