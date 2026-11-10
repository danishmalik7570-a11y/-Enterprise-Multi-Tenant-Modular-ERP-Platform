import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Pencil,
  Trash2,
  Download,
  CheckSquare,
  Square,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { SideDrawer } from './SideDrawer';
import { ConfirmModal } from './ConfirmModal';
import { StatusPill } from './StatusPill';

export interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  isMono?: boolean;
  isMoney?: boolean;
  render?: (val: any, record: any) => React.ReactNode;
}

export interface FormFieldDef {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'boolean' | 'textarea';
  required?: boolean;
  options?: string[] | { label: string; value: any }[];
  placeholder?: string;
  defaultValue?: any;
}

export interface FilterDef {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

export interface CrudPageProps {
  title: string;
  subtitle?: string;
  endpoint: string;
  moduleKey?: string;
  columns: ColumnDef[];
  formFields: FormFieldDef[];
  filters?: FilterDef[];
  detailTabs?: (record: any) => { label: string; content: React.ReactNode }[];
  softDeleteField?: string;
  actionsRenderer?: (record: any, refresh: () => void) => React.ReactNode;
}

export const CrudPage: React.FC<CrudPageProps> = ({
  title,
  subtitle,
  endpoint,
  moduleKey,
  columns,
  formFields,
  filters = [],
  detailTabs,
  softDeleteField = 'is_active',
  actionsRenderer,
}) => {
  const { apiFetch, tenant, canPerformAction, isFieldHidden, getRoleScope } = useTenant();

  const canCreate = moduleKey ? canPerformAction(moduleKey, 'create') : true;
  const canEdit = moduleKey ? canPerformAction(moduleKey, 'edit') : true;
  const canDelete = moduleKey ? canPerformAction(moduleKey, 'delete') : true;

  // Filter out any fields marked restricted/hidden for the role
  const activeColumns = useMemo(() => {
    if (!moduleKey) return columns;
    return columns.filter(col => !isFieldHidden(moduleKey, col.key));
  }, [columns, moduleKey, isFieldHidden]);

  const activeFormFields = useMemo(() => {
    if (!moduleKey) return formFields;
    return formFields.filter(fld => !isFieldHidden(moduleKey, fld.name));
  }, [formFields, moduleKey, isFieldHidden]);

  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');


  // Multi-selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Detail Modal / Drawer state
  const [viewingRecord, setViewingRecord] = useState<any | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<number>(0);

  // Delete modal state
  const [deletingRecord, setDeletingRecord] = useState<any | null>(null);
  const [isBulkDelete, setIsBulkDelete] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(endpoint);
      const list = Array.isArray(res) ? res : (res?.results || []);
      // Filter out soft-deleted records if applicable
      const activeList = list.filter((item: any) => item[softDeleteField] !== false);
      setData(activeList);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(`Failed to fetch from ${endpoint}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [endpoint, tenant.subdomain]);

  // Form handling
  const handleOpenCreate = () => {
    const initial: Record<string, any> = {};
    formFields.forEach(f => {
      initial[f.name] = f.defaultValue !== undefined ? f.defaultValue : (f.type === 'boolean' ? true : '');
    });
    setFormData(initial);
    setFormErrors({});
    setEditingRecord(null);
    setDrawerMode('create');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (record: any) => {
    const initial: Record<string, any> = {};
    formFields.forEach(f => {
      initial[f.name] = record[f.name] !== undefined ? record[f.name] : '';
    });
    setFormData(initial);
    setFormErrors({});
    setEditingRecord(record);
    setDrawerMode('edit');
    setIsDrawerOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    formFields.forEach(f => {
      const val = formData[f.name];
      if (f.required && (val === undefined || val === null || val === '')) {
        errors[f.name] = `${f.label} is required`;
      }
      if (f.type === 'number' && val !== '' && isNaN(Number(val))) {
        errors[f.name] = `${f.label} must be a valid number`;
      }
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      if (drawerMode === 'create') {
        await apiFetch(endpoint, {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      } else if (drawerMode === 'edit' && editingRecord) {
        await apiFetch(`${endpoint}${editingRecord.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
      }
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      setFormErrors({ _general: err.message || 'Failed to save record' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handling (Soft-delete)
  const handleDeleteConfirm = async () => {
    if (isBulkDelete) {
      // Bulk soft-delete
      try {
        for (const id of Array.from(selectedIds)) {
          await apiFetch(`${endpoint}${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ [softDeleteField]: false }),
          }).catch(async () => {
            // fallback to DELETE
            await apiFetch(`${endpoint}${id}/`, { method: 'DELETE' });
          });
        }
        setDeletingRecord(null);
        setIsBulkDelete(false);
        loadData();
      } catch (err) {
        console.error('Bulk delete failed', err);
      }
    } else if (deletingRecord) {
      try {
        await apiFetch(`${endpoint}${deletingRecord.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ [softDeleteField]: false }),
        }).catch(async () => {
          // fallback to DELETE
          await apiFetch(`${endpoint}${deletingRecord.id}/`, { method: 'DELETE' });
        });
        setDeletingRecord(null);
        loadData();
      } catch (err) {
        console.error('Delete failed', err);
      }
    }
  };

  // Filter & Sort
  const filteredData = useMemo(() => {
    return data.filter(record => {
      // Search query across all text fields
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches = Object.values(record).some(val =>
          typeof val === 'string' && val.toLowerCase().includes(query)
        );
        if (!matches) return false;
      }
      // Dropdown filters
      for (const [filterKey, filterVal] of Object.entries(activeFilters)) {
        if (filterVal && record[filterKey] !== filterVal) {
          return false;
        }
      }
      return true;
    });
  }, [data, searchQuery, activeFilters]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      const compare = valA > valB ? 1 : -1;
      return sortOrder === 'asc' ? compare : -compare;
    });
  }, [filteredData, sortKey, sortOrder]);

  // Paginated records
  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map(d => d.id)));
    }
  };

  const toggleSelectRow = (id: number | string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const headerRow = columns.map(c => `"${c.label}"`).join(',');
    const rows = filteredData.map(r =>
      columns.map(c => `"${r[c.key] ?? ''}"`).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-navy-muted mt-1">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            title="Refresh Data"
            className="p-2 text-slate-500 hover:text-navy hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#1E5FBF]' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {canCreate && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#1E5FBF] hover:bg-[#184E9E] rounded-xl transition-all shadow-subtle hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search in ${title.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-navy placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#1E5FBF] transition-all"
            />
          </div>

          {/* Filter Dropdowns */}
          {filters.map(filter => (
            <div key={filter.key} className="relative">
              <select
                value={activeFilters[filter.key] || ''}
                onChange={(e) => {
                  setActiveFilters({ ...activeFilters, [filter.key]: e.target.value });
                  setCurrentPage(1);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-navy font-semibold focus:outline-none focus:border-[#1E5FBF] cursor-pointer"
              >
                <option value="">All {filter.label}s</option>
                {filter.options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Bulk Actions Indicator */}
        {canDelete && selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-[#EAF2FF] text-[#1E5FBF] px-3.5 py-1.5 rounded-lg text-xs font-semibold animate-in fade-in">
            <span>{selectedIds.size} selected</span>
            <button
              onClick={() => {
                setIsBulkDelete(true);
                setDeletingRecord({ name: `${selectedIds.size} records` });
              }}
              className="ml-2 text-rose-600 hover:text-rose-700 flex items-center gap-1 font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-navy-muted font-bold uppercase tracking-wider">
                <th className="p-3.5 pl-5 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-navy">
                    {selectedIds.size > 0 && selectedIds.size === paginatedData.length ? (
                      <CheckSquare className="w-4 h-4 text-[#1E5FBF]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>

                {activeColumns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`py-3.5 px-4 select-none ${col.sortable ? 'cursor-pointer hover:text-navy' : ''}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.label}</span>
                      {col.sortable && (
                        sortKey === col.key ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#1E5FBF]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#1E5FBF]" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )
                      )}
                    </div>
                  </th>
                ))}

                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={activeColumns.length + 2} className="py-12 text-center text-navy-muted">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#1E5FBF]" />
                      <span>Loading records...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length + 2} className="py-12 text-center text-navy-muted">
                    <p className="font-semibold text-sm">No records found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting search filters or create a new entry.</p>
                  </td>
                </tr>
              ) : (
                paginatedData.map((record, idx) => {
                  const isSelected = selectedIds.has(record.id);

                  return (
                    <tr
                      key={record.id || idx}
                      className={`hover:bg-[#EAF2FF]/40 transition-colors ${isSelected ? 'bg-[#EAF2FF]/60' : ''}`}
                    >
                      <td className="p-3.5 pl-5">
                        <button onClick={() => toggleSelectRow(record.id)} className="text-slate-400 hover:text-navy">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#1E5FBF]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {activeColumns.map(col => {
                        const val = record[col.key];
                        return (
                          <td key={col.key} className="py-3.5 px-4 text-navy">
                            {col.render ? (
                              col.render(val, record)
                            ) : col.isMoney ? (
                              <span className="font-mono font-bold text-navy">
                                Rs. {Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            ) : col.isMono ? (
                              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-700 border border-slate-200">
                                {val}
                              </span>
                            ) : (
                              <span className="truncate max-w-[240px] block">{val !== undefined && val !== null ? String(val) : '—'}</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Row Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {detailTabs && (
                            <button
                              onClick={() => {
                                setViewingRecord(record);
                                setActiveDetailTab(0);
                              }}
                              title="View Details"
                              className="p-1.5 text-slate-400 hover:text-[#1E5FBF] hover:bg-[#EAF2FF] rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(record)}
                              title="Edit Record"
                              className="p-1.5 text-slate-400 hover:text-[#1E5FBF] hover:bg-[#EAF2FF] rounded-lg transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}

                          {actionsRenderer && actionsRenderer(record, loadData)}

                          {canDelete && (
                            <button
                              onClick={() => {
                                setIsBulkDelete(false);
                                setDeletingRecord(record);
                              }}
                              title="Delete Record"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>


        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-navy-muted">
          <div>
            Showing <span className="font-bold text-navy">{paginatedData.length}</span> of{' '}
            <span className="font-bold text-navy">{sortedData.length}</span> total entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-navy transition-colors"
            >
              Previous
            </button>
            <span className="font-semibold text-navy px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-navy transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Side-Drawer */}
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={drawerMode === 'create' ? `New ${title.replace(/s$/, '')}` : `Edit ${title.replace(/s$/, '')}`}
        subtitle="Fill in the required fields below. Click save when ready."
        footer={
          <>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-white bg-[#1E5FBF] hover:bg-[#184E9E] disabled:opacity-50 rounded-lg transition-colors shadow-subtle"
            >
              {isSubmitting ? 'Saving...' : 'Save Record'}
            </button>
          </>
        }
      >
        {formErrors._general && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {formErrors._general}
          </div>
        )}

        <div className="space-y-4">
          {activeFormFields.map(field => {
            const error = formErrors[field.name];


            return (
              <div key={field.name} className="space-y-1.5">
                <label className="block text-xs font-bold text-navy">
                  {field.label} {field.required && <span className="text-rose-500">*</span>}
                </label>

                {field.type === 'select' ? (
                  <select
                    value={formData[field.name] ?? ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg text-navy focus:outline-none focus:bg-white focus:border-[#1E5FBF] ${
                      error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                    }`}
                  >
                    <option value="">Select an option...</option>
                    {field.options?.map((opt: any) => {
                      const label = typeof opt === 'object' ? opt.label : opt;
                      const val = typeof opt === 'object' ? opt.value : opt;
                      return <option key={val} value={val}>{label}</option>;
                    })}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    placeholder={field.placeholder}
                    value={formData[field.name] ?? ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg text-navy focus:outline-none focus:bg-white focus:border-[#1E5FBF] ${
                      error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                    }`}
                  />
                ) : field.type === 'boolean' ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id={`check-${field.name}`}
                      checked={Boolean(formData[field.name])}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })}
                      className="w-4 h-4 rounded text-[#1E5FBF] focus:ring-[#1E5FBF]"
                    />
                    <label htmlFor={`check-${field.name}`} className="text-xs text-navy font-medium cursor-pointer">
                      Enable {field.label}
                    </label>
                  </div>
                ) : (
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={formData[field.name] ?? ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg text-navy focus:outline-none focus:bg-white focus:border-[#1E5FBF] ${
                      error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                    }`}
                  />
                )}

                {error && (
                  <p className="text-[11px] text-rose-500 font-semibold">{error}</p>
                )}
              </div>
            );
          })}
        </div>
      </SideDrawer>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingRecord)}
        title={isBulkDelete ? 'Confirm Bulk Delete' : 'Confirm Record Deletion'}
        message={
          isBulkDelete
            ? `Are you sure you want to archive ${deletingRecord?.name}? This action soft-deletes the records.`
            : `Are you sure you want to delete ${deletingRecord?.name || 'this item'}? It will be archived and removed from active listings.`
        }
        confirmText="Yes, Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingRecord(null)}
      />

      {/* Detail / View Drawer with Tabs */}
      {detailTabs && viewingRecord && (
        <SideDrawer
          isOpen={Boolean(viewingRecord)}
          onClose={() => setViewingRecord(null)}
          title={viewingRecord.name || viewingRecord.sku || viewingRecord.invoice_number || `Record #${viewingRecord.id}`}
          subtitle="Record details and associated ledger statements"
          width="max-w-2xl"
          footer={
            <button
              onClick={() => setViewingRecord(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Close
            </button>
          }
        >
          <div className="border-b border-slate-200 flex items-center gap-4 mb-4">
            {detailTabs(viewingRecord).map((tab, idx) => (
              <button
                key={tab.label}
                onClick={() => setActiveDetailTab(idx)}
                className={`pb-2.5 text-xs font-bold transition-all border-b-2 ${
                  activeDetailTab === idx
                    ? 'border-[#1E5FBF] text-[#1E5FBF]'
                    : 'border-transparent text-slate-400 hover:text-navy'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div>
            {detailTabs(viewingRecord)[activeDetailTab]?.content}
          </div>
        </SideDrawer>
      )}
    </div>
  );
};
