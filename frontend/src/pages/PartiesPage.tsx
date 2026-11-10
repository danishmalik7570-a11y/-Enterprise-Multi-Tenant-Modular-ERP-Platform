import React, { useState, useEffect } from 'react';
import { CrudPage, ColumnDef, FormFieldDef, FilterDef } from '../components/CrudPage';
import { StatusPill } from '../components/StatusPill';
import { useTenant } from '../context/TenantContext';

export const PartiesPage: React.FC = () => {
  const { tenant, apiFetch } = useTenant();

  const columns: ColumnDef[] = [
    { key: 'code', label: 'Code', sortable: true, isMono: true },
    { key: 'name', label: 'Party Name', sortable: true },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (val) => <StatusPill status={val} />,
    },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'tax_id', label: 'Tax ID', isMono: true },
    {
      key: 'current_balance',
      label: 'Ledger Balance',
      sortable: true,
      isMoney: true,
    },
  ];

  const formFields: FormFieldDef[] = [
    { name: 'name', label: 'Party / Company Name', type: 'text', required: true, placeholder: 'e.g. Acme Corp' },
    { name: 'code', label: 'Account Code', type: 'text', placeholder: 'e.g. CUST-010' },
    {
      name: 'type',
      label: 'Party Type',
      type: 'select',
      required: true,
      options: [
        { label: 'Customer', value: 'customer' },
        { label: 'Supplier', value: 'supplier' },
        { label: 'Customer & Supplier', value: 'both' },
        { label: 'Employee', value: 'employee' },
        { label: 'Custom / Other', value: 'custom' },
      ],
      defaultValue: 'customer',
    },
    { name: 'email', label: 'Email Address', type: 'email', placeholder: 'billing@company.com' },
    { name: 'phone', label: 'Phone Number', type: 'text', placeholder: '+1 (555) 000-0000' },
    { name: 'tax_id', label: 'Tax ID / VAT', type: 'text', placeholder: 'US-1234567' },
    { name: 'credit_limit', label: 'Credit Limit', type: 'number', placeholder: '5000.00' },
    { name: 'billing_address', label: 'Billing Address', type: 'textarea', placeholder: 'Street, City, State, ZIP' },
  ];

  const filters: FilterDef[] = [
    {
      key: 'type',
      label: 'Type',
      options: [
        { label: 'Customers', value: 'customer' },
        { label: 'Suppliers', value: 'supplier' },
        { label: 'Both', value: 'both' },
        { label: 'Employees', value: 'employee' },
      ],
    },
  ];

  const PartyStatementTab: React.FC<{ partyId: number }> = ({ partyId }) => {
    const [statement, setStatement] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      apiFetch(`/api/parties/${partyId}/ledger/`)
        .then((res) => setStatement(res.ledger_entries || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [partyId]);

    if (loading) return <div className="p-4 text-xs text-slate-400">Loading ledger statement...</div>;
    if (statement.length === 0) return <div className="p-4 text-xs text-slate-400">No transaction entries found for this party.</div>;

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-navy-muted font-bold uppercase">
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Entry #</th>
              <th className="py-2.5 px-3">Account</th>
              <th className="py-2.5 px-3">Debit</th>
              <th className="py-2.5 px-3">Credit</th>
              <th className="py-2.5 px-3">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {statement.map((line, idx) => (
              <tr key={idx}>
                <td className="py-2 px-3">{line.date}</td>
                <td className="py-2 px-3 font-mono">{line.entry_number}</td>
                <td className="py-2 px-3">{line.account}</td>
                <td className="py-2 px-3 font-mono text-emerald-600">Rs. {line.debit}</td>
                <td className="py-2 px-3 font-mono text-rose-600">Rs. {line.credit}</td>
                <td className="py-2 px-3 font-mono font-bold">Rs. {line.running_balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <CrudPage
      title="Parties & External CRM"
      subtitle="Universal entity registry for customers, suppliers, and contractor employees."
      endpoint="/api/parties/"
      moduleKey="parties"
      columns={columns}
      formFields={formFields}
      filters={filters}

      detailTabs={(party) => [
        {
          label: 'Overview',
          content: (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block font-bold">Party Type</span>
                  <span className="font-semibold text-navy capitalize">{party.type}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block font-bold">Outstanding Balance</span>
                  <span className="font-mono font-bold text-navy text-sm">
                    Rs. {party.current_balance}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block font-bold">Email</span>
                  <span className="font-semibold text-navy">{party.email || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block font-bold">Phone</span>
                  <span className="font-semibold text-navy">{party.phone || '—'}</span>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block font-bold">Billing Address</span>
                <p className="mt-1 text-slate-700">{party.billing_address || 'No billing address provided.'}</p>
              </div>
            </div>
          ),
        },
        {
          label: 'Ledger Statement',
          content: <PartyStatementTab partyId={party.id} />,
        },
      ]}
    />
  );
};
