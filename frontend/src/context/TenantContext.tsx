import React, { createContext, useContext, useState, useEffect } from 'react';

export interface TenantInfo {
  id: number;
  name: string;
  subdomain: string;
  plan: string;
  currency: string;
  enabled_modules: string[];
}

interface TenantContextType {
  tenant: TenantInfo;
  setTenantBySubdomain: (subdomain: string) => void;
  availableTenants: TenantInfo[];
  token: string | null;
  isAuthenticated: boolean;
  currentRole: string;
  setCurrentRole: (role: string) => void;
  userEmail: string;
  login: (email: string, pass: string, subdomain: string) => Promise<void>;
  logout: () => void;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
  isModuleEnabled: (moduleName: string) => boolean;
  canAccessModule: (moduleKey: string) => boolean;
  canPerformAction: (moduleKey: string, action: 'view' | 'create' | 'edit' | 'delete' | 'approve') => boolean;
  isFieldHidden: (moduleKey: string, fieldName: string) => boolean;
  getRoleScope: () => 'all' | 'own' | 'warehouse';
}


// Role permission definitions matching backend role_builder models
const ROLE_PERMISSIONS: Record<string, {
  modules: string[];
  actions: Record<string, string[]>; // moduleKey -> allowed actions
  hidden_fields: Record<string, string[]>; // moduleKey -> hidden field names
  scope: 'all' | 'own' | 'warehouse';
}> = {
  Owner: {
    modules: ['dashboard', 'parties', 'catalog', 'inventory', 'purchasing', 'sales', 'finance', 'reports', 'invoice_builder', 'module_builder', 'users'],
    actions: {
      parties: ['view', 'create', 'edit', 'delete', 'approve'],
      catalog: ['view', 'create', 'edit', 'delete', 'approve'],
      inventory: ['view', 'create', 'edit', 'delete', 'approve'],
      purchasing: ['view', 'create', 'edit', 'delete', 'approve'],
      sales: ['view', 'create', 'edit', 'delete', 'approve'],
      finance: ['view', 'create', 'edit', 'delete', 'approve'],
      reports: ['view', 'create', 'edit', 'delete', 'approve'],
      invoice_builder: ['view', 'create', 'edit', 'delete', 'approve'],
      module_builder: ['view', 'create', 'edit', 'delete', 'approve'],
      users: ['view', 'create', 'edit', 'delete', 'approve'],
    },
    hidden_fields: {},
    scope: 'all',
  },
  Finance: {
    modules: ['dashboard', 'parties', 'purchasing', 'sales', 'finance', 'reports'],
    actions: {
      parties: ['view', 'create', 'edit'],
      purchasing: ['view', 'approve'],
      sales: ['view', 'approve'],
      finance: ['view', 'create', 'edit', 'delete', 'approve'],
      reports: ['view'],
    },
    hidden_fields: {},
    scope: 'all',
  },
  Sales: {
    modules: ['dashboard', 'parties', 'catalog', 'sales', 'reports', 'invoice_builder'],
    actions: {
      parties: ['view', 'create', 'edit'],
      catalog: ['view'], // View-only: no create/edit/delete
      sales: ['view', 'create', 'edit'],
      reports: ['view'],
      invoice_builder: ['view'], // Can view/select templates, cannot edit
    },
    hidden_fields: {
      catalog: ['cost_price'], // Masked from sales!
    },
    scope: 'own',
  },
  Warehouse: {
    modules: ['dashboard', 'inventory', 'catalog', 'reports'],
    actions: {
      inventory: ['view', 'create', 'edit'],
      catalog: ['view'], // View-only
      reports: ['view'],
    },
    hidden_fields: {
      catalog: ['cost_price'], // Masked from warehouse!
    },
    scope: 'warehouse',
  },
};


const DEMO_TENANTS: TenantInfo[] = [
  {
    id: 1,
    name: 'Apex Retail Gear',
    subdomain: 'apex-retail',
    plan: 'enterprise',
    currency: 'Rs.',
    enabled_modules: ['catalog', 'inventory', 'parties', 'purchasing', 'sales', 'finance', 'reports', 'notifications', 'role_builder', 'module_builder', 'extensions'],
  },
  {
    id: 2,
    name: 'Nexus Advisory Group',
    subdomain: 'nexus-advisory',
    plan: 'growth',
    currency: 'Rs.',
    enabled_modules: ['catalog', 'parties', 'sales', 'finance', 'reports', 'notifications', 'role_builder', 'module_builder'],
  },
];

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('nexus_token'));
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('nexus_user_email') || 'admin@apexretail.com');
  const [currentRole, setCurrentRole] = useState<string>(() => localStorage.getItem('nexus_user_role') || 'Owner');

  const [tenant, setTenant] = useState<TenantInfo>(() => {
    const savedSub = localStorage.getItem('nexus_tenant_subdomain');
    return DEMO_TENANTS.find(t => t.subdomain === savedSub) || DEMO_TENANTS[0];
  });

  const isAuthenticated = Boolean(token);

  const login = async (email: string, pass: string, subdomain: string) => {
    const targetTenant = DEMO_TENANTS.find(t => t.subdomain === subdomain) || {
      id: 99,
      name: subdomain,
      subdomain: subdomain,
      plan: 'enterprise',
      currency: 'Rs.',
      enabled_modules: ['catalog', 'inventory', 'parties', 'purchasing', 'sales', 'finance', 'reports', 'notifications', 'role_builder', 'module_builder', 'extensions'],
    };

    const res = await fetch('/api/auth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, tenant_subdomain: subdomain }),
    });

    if (!res.ok) {
      let errDetail = 'Invalid credentials or tenant mismatch.';
      try {
        const errJson = await res.json();
        if (errJson.detail) errDetail = errJson.detail;
        else if (errJson.non_field_errors) errDetail = errJson.non_field_errors.join(' ');
      } catch (_) {}
      throw new Error(errDetail);
    }

    const data = await res.json();
    setToken(data.access);
    setUserEmail(email);

    // Derive role based on response or email pattern
    const role = data.role || (
      email.includes('sales') ? 'Sales' :
      email.includes('warehouse') ? 'Warehouse' :
      email.includes('finance') ? 'Finance' : 'Owner'
    );
    setCurrentRole(role);
    setTenant(targetTenant);

    localStorage.setItem('nexus_token', data.access);
    localStorage.setItem('nexus_user_email', email);
    localStorage.setItem('nexus_user_role', role);
    localStorage.setItem('nexus_tenant_subdomain', subdomain);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user_email');
    localStorage.removeItem('nexus_user_role');
    localStorage.removeItem('nexus_tenant_subdomain');
  };

  const setTenantBySubdomain = (subdomain: string) => {
    const found = DEMO_TENANTS.find(t => t.subdomain === subdomain);
    if (found) {
      setTenant(found);
      localStorage.setItem('nexus_tenant_subdomain', subdomain);
    }
  };

  const isModuleEnabled = (moduleName: string) => {
    return tenant.enabled_modules.includes(moduleName);
  };


  const canAccessModule = (moduleKey: string) => {
    const roleConfig = ROLE_PERMISSIONS[currentRole] || ROLE_PERMISSIONS['Owner'];
    if (!roleConfig.modules.includes(moduleKey)) return false;
    // Also check tenant enabled modules
    if (['parties', 'catalog', 'inventory', 'purchasing', 'sales', 'finance', 'reports'].includes(moduleKey)) {
      return isModuleEnabled(moduleKey);
    }
    return true;
  };

  const canPerformAction = (moduleKey: string, action: 'view' | 'create' | 'edit' | 'delete' | 'approve') => {
    const roleConfig = ROLE_PERMISSIONS[currentRole] || ROLE_PERMISSIONS['Owner'];
    const allowed = roleConfig.actions[moduleKey];
    if (!allowed) return false;
    return allowed.includes(action);
  };

  const isFieldHidden = (moduleKey: string, fieldName: string) => {
    const roleConfig = ROLE_PERMISSIONS[currentRole] || ROLE_PERMISSIONS['Owner'];
    const hidden = roleConfig.hidden_fields[moduleKey];
    if (!hidden) return false;
    return hidden.includes(fieldName);
  };

  const getRoleScope = () => {
    const roleConfig = ROLE_PERMISSIONS[currentRole] || ROLE_PERMISSIONS['Owner'];
    return roleConfig.scope;
  };

  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-Tenant-Subdomain': tenant.subdomain,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    };

    if (options.body && typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        errorDetail = JSON.stringify(errJson);
      } catch (_) {}
      throw new Error(errorDetail);
    }

    // Return json if content-type is json
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return null;
  };

  return (
    <TenantContext.Provider
      value={{
        tenant,
        setTenantBySubdomain,
        availableTenants: DEMO_TENANTS,
        token,
        isAuthenticated,
        currentRole,
        setCurrentRole,
        userEmail,
        login,
        logout,
        apiFetch,
        isModuleEnabled,
        canAccessModule,
        canPerformAction,
        isFieldHidden,
        getRoleScope,
      }}
    >
      {children}
    </TenantContext.Provider>

  );
};


export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
