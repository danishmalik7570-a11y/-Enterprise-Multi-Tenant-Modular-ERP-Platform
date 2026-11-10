import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  Warehouse,
  ShoppingCart,
  Receipt,
  BookOpen,
  BarChart3,
  Boxes,
  ShieldCheck,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey?: string;
  badge?: string;
}

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { canAccessModule } = useTenant();

  const allNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'parties', label: 'Parties & CRM', icon: Users, moduleKey: 'parties' },
    { id: 'catalog', label: 'Item Catalog', icon: Package, moduleKey: 'catalog' },
    { id: 'inventory', label: 'Inventory & Stock', icon: Warehouse, moduleKey: 'inventory' },
    { id: 'purchasing', label: 'Purchasing', icon: ShoppingCart, moduleKey: 'purchasing' },
    { id: 'sales', label: 'Sales & Invoices', icon: Receipt, moduleKey: 'sales' },
    { id: 'finance', label: 'General Ledger', icon: BookOpen, moduleKey: 'finance' },
    { id: 'reports', label: 'Reports Hub', icon: BarChart3, moduleKey: 'reports' },
    { id: 'invoice_builder', label: 'Invoice Builder', icon: FileSpreadsheet, moduleKey: 'invoice_builder' },
    { id: 'module_builder', label: 'Custom Modules', icon: Boxes, moduleKey: 'module_builder', badge: 'Low-Code' },
    { id: 'users', label: 'Roles & Access', icon: ShieldCheck, moduleKey: 'users' },
  ];

  // Role-based visibility: only show modules the role has access to
  const navItems = allNavItems.filter((item) => {
    if (item.id === 'dashboard') return true;
    return canAccessModule(item.moduleKey || item.id);
  });

  return (
    <aside
      className={`relative bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col z-30 ${
        isExpanded ? 'w-60' : 'w-[70px]'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-100 gap-3 overflow-hidden">
        <div className="w-10 h-10 rounded-xl bg-[#1E5FBF] flex-shrink-0 flex items-center justify-center text-white shadow-subtle">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        {isExpanded && (
          <div className="flex flex-col truncate animate-in fade-in duration-200">
            <span className="font-extrabold text-navy text-sm tracking-tight">NEXUS // ERP</span>
            <span className="text-[10px] text-navy-muted font-medium uppercase tracking-wider">Universal Engine</span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-2.5 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={!isExpanded ? item.label : undefined}
              className={`w-full group flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative ${
                isActive
                  ? 'bg-[#1E5FBF] text-white shadow-subtle'
                  : 'text-slate-600 hover:bg-[#EAF2FF] hover:text-[#1E5FBF]'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {isExpanded && (
                <span className="truncate text-left flex-1 font-semibold text-xs tracking-tight">
                  {item.label}
                </span>
              )}
              {isExpanded && item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-[#EAF2FF] text-[#1E5FBF]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>


      {/* Expand/Collapse Toggle Button */}
      <div className="p-3 border-t border-slate-100 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center py-2 text-slate-400 hover:text-navy hover:bg-slate-50 rounded-lg transition-colors"
        >
          {isExpanded ? (
            <div className="flex items-center gap-2 text-xs font-semibold">
              <ChevronLeft className="w-4 h-4" /> Collapse
            </div>
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
};
