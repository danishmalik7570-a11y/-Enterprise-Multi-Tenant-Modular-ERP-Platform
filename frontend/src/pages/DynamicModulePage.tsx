import React, { useState, useEffect } from 'react';
import { CrudPage, ColumnDef, FormFieldDef } from '../components/CrudPage';
import { useTenant } from '../context/TenantContext';
import { Boxes, Sparkles } from 'lucide-react';

export const DynamicModulePage: React.FC = () => {
  const { apiFetch, tenant } = useTenant();
  const [modules, setModules] = useState<any[]>([]);
  const [activeModule, setActiveModule] = useState<any | null>(null);
  const [moduleSchema, setModuleSchema] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadModules = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/module-builder/modules/');
      const list = Array.isArray(res) ? res : (res?.results || []);
      setModules(list);
      if (list.length > 0) {
        selectModule(list[0]);
      } else {
        setActiveModule(null);
        setModuleSchema(null);
      }
    } catch (err) {
      console.error('Failed to load dynamic modules', err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectModule = async (mod: any) => {
    setActiveModule(mod);
    try {
      const schema = await apiFetch(`/api/module-builder/modules/${mod.id}/schema/`);
      setModuleSchema(schema);
    } catch (err) {
      console.error('Failed to load module schema', err);
    }
  };

  useEffect(() => {
    loadModules();
  }, [tenant.subdomain]);

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading dynamic modules...</div>;
  }

  if (modules.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 border border-slate-200 shadow-card text-center max-w-md mx-auto mt-12 animate-in fade-in">
        <Boxes className="w-10 h-10 text-[#1E5FBF] mx-auto mb-3" />
        <h2 className="text-base font-bold text-navy">No Custom Modules Defined</h2>
        <p className="text-xs text-navy-muted mt-1 leading-relaxed">
          Use the low-code engine to create custom business entities (e.g. Fleet, Equipment, Tickets) without writing backend code.
        </p>
      </div>
    );
  }

  if (!activeModule || !moduleSchema) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading module configuration...</div>;
  }

  // Generate dynamic columns from FieldDefinition schema
  const dynamicColumns: ColumnDef[] = [
    { key: 'id', label: 'ID', sortable: true, isMono: true },
    ...(moduleSchema.fields || []).map((f: any) => ({
      key: f.field_name,
      label: f.label,
      sortable: true,
      render: (_: any, record: any) => {
        const val = record.data?.[f.field_name];
        if (f.type === 'dropdown') {
          return <span className="font-semibold px-2 py-0.5 rounded text-[11px] bg-[#EAF2FF] text-[#1E5FBF]">{val || '—'}</span>;
        }
        return <span className="text-xs text-navy">{val !== undefined && val !== null ? String(val) : '—'}</span>;
      },
    })),
    {
      key: 'created_at',
      label: 'Created',
      render: (val: any) => <span className="text-[11px] text-slate-400">{val ? new Date(val).toLocaleDateString() : '—'}</span>,
    },
  ];

  // Generate dynamic form fields from FieldDefinition schema
  const dynamicFormFields: FormFieldDef[] = (moduleSchema.fields || []).map((f: any) => {
    let type: FormFieldDef['type'] = 'text';
    if (f.type === 'number') type = 'number';
    else if (f.type === 'date') type = 'date';
    else if (f.type === 'dropdown') type = 'select';
    else if (f.type === 'boolean') type = 'boolean';

    return {
      name: f.field_name,
      label: f.label,
      type,
      required: f.required,
      options: f.options || [],
      placeholder: `Enter ${f.label.toLowerCase()}`,
    };
  });

  return (
    <div className="space-y-6">
      {/* Module Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <span className="text-xs font-bold text-navy-muted uppercase mr-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#1E5FBF]" />
          Custom Modules:
        </span>
        {modules.map((mod) => (
          <button
            key={mod.id}
            onClick={() => selectModule(mod)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeModule.id === mod.id
                ? 'bg-[#1E5FBF] text-white shadow-subtle'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {mod.display_name}
          </button>
        ))}
      </div>

      {/* Render Universal CrudPage driven dynamically by the schema! */}
      <CrudPage
        key={activeModule.id}
        title={activeModule.display_name}
        subtitle={`${activeModule.description || 'Low-code custom business module.'} Backed by JSONB document store.`}
        endpoint={`/api/module-builder/records/?module_id=${activeModule.id}`}
        columns={dynamicColumns}
        formFields={dynamicFormFields}
      />
    </div>
  );
};
