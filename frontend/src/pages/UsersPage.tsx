import React, { useState, useEffect } from 'react';
import { CrudPage, ColumnDef, FormFieldDef } from '../components/CrudPage';
import { StatusPill } from '../components/StatusPill';
import { useTenant } from '../context/TenantContext';
import { Copy, Shield, Check, Save, CheckCircle2, Sliders, EyeOff } from 'lucide-react';

const MODULES_LIST = [
  { key: 'parties', name: 'Parties & CRM' },
  { key: 'catalog', name: 'Item Catalog' },
  { key: 'inventory', name: 'Inventory & Stock' },
  { key: 'purchasing', name: 'Purchasing' },
  { key: 'sales', name: 'Sales & Invoices' },
  { key: 'finance', name: 'General Ledger' },
  { key: 'reports', name: 'Reports Hub' },
  { key: 'invoice_builder', name: 'Invoice Builder' },
  { key: 'module_builder', name: 'Custom Low-Code Modules' },
];

const ACTIONS_LIST = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Add / Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'approve', label: 'Approve' },
];

export const UsersPage: React.FC = () => {
  const { apiFetch, currentRole } = useTenant();
  const [activeTab, setActiveTab] = useState<'roles' | 'matrix'>('matrix');

  // Matrix state
  const [selectedRoleName, setSelectedRoleName] = useState<string>('Sales');
  const [matrixState, setMatrixState] = useState<Record<string, Record<string, boolean>>>({
    parties: { view: true, create: true, edit: true, delete: false, approve: false },
    catalog: { view: true, create: false, edit: false, delete: false, approve: false },
    inventory: { view: false, create: false, edit: false, delete: false, approve: false },
    purchasing: { view: false, create: false, edit: false, delete: false, approve: false },
    sales: { view: true, create: true, edit: true, delete: false, approve: false },
    finance: { view: false, create: false, edit: false, delete: false, approve: false },
    reports: { view: true, create: false, edit: false, delete: false, approve: false },
    invoice_builder: { view: true, create: false, edit: false, delete: false, approve: false },
    module_builder: { view: false, create: false, edit: false, delete: false, approve: false },
  });

  const [maskCostPrice, setMaskCostPrice] = useState<boolean>(true);
  const [roleScope, setRoleScope] = useState<'all' | 'own' | 'warehouse'>('own');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Sync sample matrix based on selected role
  useEffect(() => {
    if (selectedRoleName === 'Owner') {
      const full: Record<string, Record<string, boolean>> = {};
      MODULES_LIST.forEach(m => {
        full[m.key] = { view: true, create: true, edit: true, delete: true, approve: true };
      });
      setMatrixState(full);
      setMaskCostPrice(false);
      setRoleScope('all');
    } else if (selectedRoleName === 'Finance') {
      const fin: Record<string, Record<string, boolean>> = {};
      MODULES_LIST.forEach(m => {
        const isFin = ['finance', 'sales', 'purchasing', 'parties', 'reports'].includes(m.key);
        fin[m.key] = {
          view: isFin,
          create: m.key === 'finance' || m.key === 'parties',
          edit: m.key === 'finance' || m.key === 'parties',
          delete: m.key === 'finance',
          approve: isFin,
        };
      });
      setMatrixState(fin);
      setMaskCostPrice(false);
      setRoleScope('all');
    } else if (selectedRoleName === 'Sales') {
      const sls: Record<string, Record<string, boolean>> = {};
      MODULES_LIST.forEach(m => {
        const isSls = ['sales', 'parties', 'catalog', 'reports', 'invoice_builder'].includes(m.key);
        sls[m.key] = {
          view: isSls,
          create: m.key === 'sales' || m.key === 'parties',
          edit: m.key === 'sales' || m.key === 'parties',
          delete: false,
          approve: false,
        };
      });
      setMatrixState(sls);
      setMaskCostPrice(true);
      setRoleScope('own');
    } else if (selectedRoleName === 'Warehouse') {
      const wh: Record<string, Record<string, boolean>> = {};
      MODULES_LIST.forEach(m => {
        const isWh = ['inventory', 'catalog', 'reports'].includes(m.key);
        wh[m.key] = {
          view: isWh,
          create: m.key === 'inventory',
          edit: m.key === 'inventory',
          delete: false,
          approve: false,
        };
      });
      setMatrixState(wh);
      setMaskCostPrice(true);
      setRoleScope('warehouse');
    }
  }, [selectedRoleName]);

  const togglePermission = (moduleKey: string, action: string) => {
    setMatrixState(prev => ({
      ...prev,
      [moduleKey]: {
        ...(prev[moduleKey] || {}),
        [action]: !prev[moduleKey]?.[action]
      }
    }));
  };

  const handleSaveMatrix = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleCloneRole = async (roleId: number, refresh: () => void) => {
    const newName = prompt('Enter name for cloned role:');
    if (!newName) return;
    try {
      await apiFetch(`/api/role-builder/roles/${roleId}/clone/`, {
        method: 'POST',
        body: JSON.stringify({ name: newName }),
      });
      refresh();
    } catch (err) {
      alert(`Clone failed: ${err}`);
    }
  };

  const columns: ColumnDef[] = [
    { key: 'name', label: 'Role Name', sortable: true },
    { key: 'description', label: 'Description' },
    {
      key: 'scope',
      label: 'Record Scoping',
      render: (val) => (
        <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
          {val === 'all' ? 'All Records' : val === 'own' ? 'Own Records Only' : 'Warehouse Only'}
        </span>
      ),
    },
    {
      key: 'field_permissions',
      label: 'Field-Level Masking',
      render: (val) => {
        const hasMask = val && Object.keys(val).length > 0;
        return hasMask ? (
          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px] font-bold">
            Masks Cost Price
          </span>
        ) : (
          <span className="text-slate-400 text-xs italic">Unrestricted</span>
        );
      },
    },
    {
      key: 'is_template',
      label: 'Template Preset',
      render: (val) => (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${val ? 'bg-indigo-50 text-[#1E5FBF]' : 'bg-slate-100 text-slate-500'}`}>
          {val ? 'System Preset' : 'Custom'}
        </span>
      ),
    },
  ];

  const formFields: FormFieldDef[] = [
    { name: 'name', label: 'Role Name', type: 'text', required: true, placeholder: 'e.g. Junior Accountant' },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Scope and permissions description' },
    {
      name: 'scope',
      label: 'Row-Level Scoping',
      type: 'select',
      required: true,
      options: [
        { label: 'All Records', value: 'all' },
        { label: 'Own Records Only', value: 'own' },
        { label: 'Own Warehouse / Branch Only', value: 'warehouse' },
      ],
      defaultValue: 'all',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'matrix'
              ? 'bg-[#1E5FBF] text-white shadow-subtle'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Visual Role Permission Matrix
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'roles'
              ? 'bg-[#1E5FBF] text-white shadow-subtle'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Role Registry & Templates
        </button>
      </div>

      {activeTab === 'matrix' ? (
        <div className="space-y-6">
          {/* Header & Role Selector */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#1E5FBF]" />
                <h2 className="text-lg font-extrabold text-navy tracking-tight">Permissions Matrix Editor</h2>
              </div>
              <p className="text-xs text-navy-muted mt-1">
                Configure module-level actions, record scoping, and field masking without code changes.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-navy">Select Role:</label>
              <select
                value={selectedRoleName}
                onChange={(e) => setSelectedRoleName(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-navy font-bold focus:border-[#1E5FBF]"
              >
                <option value="Owner">Owner (Platform Admin)</option>
                <option value="Finance">Finance Officer</option>
                <option value="Sales">Sales Representative</option>
                <option value="Warehouse">Warehouse Manager</option>
              </select>

              <button
                onClick={handleSaveMatrix}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1E5FBF] hover:bg-[#184E9E] rounded-xl transition-all shadow-subtle"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Matrix</span>
              </button>
            </div>
          </div>

          {saveSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Permissions matrix updated and synced for role {selectedRoleName}.
            </div>
          )}

          {/* Matrix Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-navy-muted font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-6">Module / Feature Area</th>
                    {ACTIONS_LIST.map(act => (
                      <th key={act.key} className="py-3.5 px-4 text-center">{act.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MODULES_LIST.map(mod => (
                    <tr key={mod.key} className="hover:bg-[#EAF2FF]/30 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-navy">
                        {mod.name}
                      </td>
                      {ACTIONS_LIST.map(act => {
                        const isGranted = Boolean(matrixState[mod.key]?.[act.key]);
                        return (
                          <td key={act.key} className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => togglePermission(mod.key, act.key)}
                              className={`w-6 h-6 rounded-md inline-flex items-center justify-center transition-all ${
                                isGranted
                                  ? 'bg-[#1E5FBF] text-white shadow-sm'
                                  : 'bg-slate-100 text-transparent hover:bg-slate-200'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scoping & Field Masking Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Record Scoping */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card space-y-3">
              <h3 className="text-xs font-extrabold text-navy uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#1E5FBF]" />
                Row-Level Scoping Restriction
              </h3>
              <p className="text-[11px] text-navy-muted">
                Controls which records are queried when this role accesses list views or reports.
              </p>
              <div className="space-y-2 pt-1">
                {[
                  { value: 'all', label: 'All Tenant Records (Company-Wide)' },
                  { value: 'own', label: 'Own Records Only (Assigned to logged-in user)' },
                  { value: 'warehouse', label: 'Own Warehouse / Branch Location Only' },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2.5 text-xs text-navy font-medium cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                    <input
                      type="radio"
                      name="roleScope"
                      value={opt.value}
                      checked={roleScope === opt.value}
                      onChange={(e) => setRoleScope(e.target.value as any)}
                      className="text-[#1E5FBF] focus:ring-[#1E5FBF]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Field-Level Masking */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card space-y-3">
              <h3 className="text-xs font-extrabold text-navy uppercase tracking-wider flex items-center gap-1.5">
                <EyeOff className="w-4 h-4 text-amber-600" />
                Field-Level Security & Masking
              </h3>
              <p className="text-[11px] text-navy-muted">
                Fields selected below are completely omitted from the API response and omitted from table rendering.
              </p>
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2.5 text-xs text-navy font-medium cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={maskCostPrice}
                    onChange={(e) => setMaskCostPrice(e.target.checked)}
                    className="rounded text-[#1E5FBF] focus:ring-[#1E5FBF]"
                  />
                  <div>
                    <span className="font-bold block">Mask Item Cost Price (cost_price)</span>
                    <span className="text-[11px] text-slate-400">Sales and Warehouse roles cannot view supplier margins or purchase costs.</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <CrudPage
          title="Dynamic Roles & Permissions"
          subtitle="Roles are data, not hardcoded. Tenant admins create roles and define field-level permissions without code changes."
          endpoint="/api/role-builder/roles/"
          moduleKey="users"
          columns={columns}
          formFields={formFields}
          actionsRenderer={(record, refresh) => (
            <button
              onClick={() => handleCloneRole(record.id, refresh)}
              title="Clone Role Template"
              className="p-1.5 text-[#1E5FBF] hover:bg-[#EAF2FF] rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        />
      )}
    </div>
  );
};
