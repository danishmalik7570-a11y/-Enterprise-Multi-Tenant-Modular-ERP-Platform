import React from 'react';
import { Search, Bell, Building2, ExternalLink, Shield, LogOut } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ searchQuery, onSearchChange }) => {
  const { tenant, setTenantBySubdomain, availableTenants, currentRole, setCurrentRole, userEmail, logout } = useTenant();


  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      {/* Left: Tenant Selector with Company Logo */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[#EAF2FF] border border-[#BFDBFE] rounded-xl text-[#1E5FBF]">
          <Building2 className="w-4 h-4 text-[#1E5FBF]" />
          <select
            value={tenant.subdomain}
            onChange={(e) => setTenantBySubdomain(e.target.value)}
            className="bg-transparent text-xs font-bold text-[#1E5FBF] focus:outline-none cursor-pointer pr-2"
          >
            {availableTenants.map((t) => (
              <option key={t.subdomain} value={t.subdomain} className="bg-white text-navy font-semibold">
                {t.name} (Rs.)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search records, items, invoices, customers..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#1E5FBF] focus:ring-2 focus:ring-[#EAF2FF] transition-all"
          />
        </div>
      </div>

      {/* Right: Notification bell + Swagger link + User avatar/role */}
      <div className="flex items-center gap-3.5">
        <a
          href="/api/schema/swagger-ui/"
          target="_blank"
          rel="noreferrer"
          title="Open Swagger OpenAPI Docs"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1E5FBF] hover:bg-[#EAF2FF] rounded-lg transition-colors border border-transparent hover:border-[#BFDBFE]"
        >
          <span>Swagger API</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <button
          className="p-2 text-slate-500 hover:text-navy hover:bg-slate-100 rounded-lg relative transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 ring-2 ring-white" />
        </button>

        <div className="h-6 w-[1px] bg-slate-200" />

        {/* User Info & Role Switcher */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1E5FBF] text-white flex items-center justify-center font-bold text-xs shadow-subtle">
            {userEmail[0].toUpperCase()}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-navy leading-tight truncate max-w-[130px]">
              {userEmail.split('@')[0]}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <Shield className="w-3 h-3 text-[#1E5FBF]" />
              <select
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                className="text-[10px] font-bold text-navy-muted bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="Owner">Owner</option>
                <option value="Finance">Finance</option>
                <option value="Sales">Sales</option>
                <option value="Warehouse">Warehouse</option>
              </select>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out to Login Panel"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>

  );
};
