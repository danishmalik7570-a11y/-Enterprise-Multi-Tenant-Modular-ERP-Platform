import React, { useState } from 'react';
import { CrudPage, ColumnDef, FormFieldDef } from '../components/CrudPage';
import { StatusPill } from '../components/StatusPill';
import { useTenant } from '../context/TenantContext';

export const FinancePage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'journals'>('accounts');
  const { tenant } = useTenant();

  const accountColumns: ColumnDef[] = [
    { key: 'code', label: 'Account Code', sortable: true, isMono: true },
    { key: 'name', label: 'Account Name', sortable: true },
    {
      key: 'type',
      label: 'Category',
      sortable: true,
      render: (val) => <StatusPill status={val} />,
    },
    {
      key: 'type',
      label: 'Normal Balance',
      render: (val) => (val === 'asset' || val === 'expense' ? 'Debit' : 'Credit'),
    },
    { key: 'balance', label: 'Current Balance', sortable: true, isMoney: true },
  ];

  const accountFormFields: FormFieldDef[] = [
    { name: 'code', label: 'Account Code', type: 'text', required: true, placeholder: 'e.g. 1050' },
    { name: 'name', label: 'Account Name', type: 'text', required: true, placeholder: 'e.g. Petty Cash' },
    {
      name: 'type',
      label: 'Account Category',
      type: 'select',
      required: true,
      options: [
        { label: 'Asset', value: 'asset' },
        { label: 'Liability', value: 'liability' },
        { label: 'Equity', value: 'equity' },
        { label: 'Revenue', value: 'revenue' },
        { label: 'Expense', value: 'expense' },
      ],
      defaultValue: 'asset',
    },
    { name: 'description', label: 'Account Description', type: 'textarea', placeholder: 'Purpose of this account' },
  ];

  const journalColumns: ColumnDef[] = [
    { key: 'entry_number', label: 'Entry #', sortable: true, isMono: true },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'memo', label: 'Memo / Description', sortable: true },
    {
      key: 'source_module',
      label: 'Origin Module',
      render: (val) => (
        <span className="font-mono bg-[#EAF2FF] text-[#1E5FBF] px-2 py-0.5 rounded text-[11px] font-bold">
          {val}
        </span>
      ),
    },
    {
      key: 'lines',
      label: 'Balanced Lines',
      render: (val) => (
        <span className="text-slate-600 font-medium">
          {val?.length || 0} ledger lines (Balanced)
        </span>
      ),
    },
    {
      key: 'is_posted',
      label: 'Posting Status',
      render: () => <StatusPill status="Posted" variant="success" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab('accounts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'accounts'
              ? 'bg-[#1E5FBF] text-white shadow-subtle'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Chart of Accounts (COA)
        </button>

        <button
          onClick={() => setActiveSubTab('journals')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'journals'
              ? 'bg-[#1E5FBF] text-white shadow-subtle'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          General Journal Entries
        </button>
      </div>

      {activeSubTab === 'accounts' ? (
        <CrudPage
          title="Chart of Accounts"
          subtitle="Tenant-configurable Chart of Accounts driving the central double-entry ledger."
          endpoint="/api/finance/accounts/"
          moduleKey="finance"
          columns={accountColumns}
          formFields={accountFormFields}
        />
      ) : (
        <CrudPage
          title="Journal Entries"
          subtitle="Immutable double-entry transaction records with strict debit/credit equality."
          endpoint="/api/finance/journal-entries/"
          moduleKey="finance"
          columns={journalColumns}
          formFields={[]}

          detailTabs={(entry) => [
            {
              label: 'Double-Entry Lines',
              content: (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-navy-muted">
                        <th className="py-2.5 px-3">Account</th>
                        <th className="py-2.5 px-3">Party</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Debit</th>
                        <th className="py-2.5 px-3 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(entry.lines || []).map((line: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-semibold text-navy">
                            {line.account_code} - {line.account_name}
                          </td>
                          <td className="py-2 px-3 text-slate-500">{line.party_name || '—'}</td>
                          <td className="py-2 px-3 text-slate-600">{line.description}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                            {Number(line.debit) > 0 ? `Rs. ${line.debit}` : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                            {Number(line.credit) > 0 ? `Rs. ${line.credit}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
};
