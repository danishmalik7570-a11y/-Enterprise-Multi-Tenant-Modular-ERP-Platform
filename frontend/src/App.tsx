import React, { useState } from 'react';
import { TenantProvider, useTenant } from './context/TenantContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';

import { DashboardPage } from './pages/DashboardPage';
import { PartiesPage } from './pages/PartiesPage';
import { CatalogPage } from './pages/CatalogPage';
import { InventoryPage } from './pages/InventoryPage';
import { SalesPage } from './pages/SalesPage';
import { PurchasingPage } from './pages/PurchasingPage';
import { FinancePage } from './pages/FinancePage';
import { UsersPage } from './pages/UsersPage';
import { DynamicModulePage } from './pages/DynamicModulePage';
import { ReportsHubPage } from './pages/ReportsHubPage';
import { InvoiceBuilderPage } from './pages/InvoiceBuilderPage';
import { LoginPage } from './pages/LoginPage';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'parties':
        return <PartiesPage />;
      case 'catalog':
        return <CatalogPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'sales':
        return <SalesPage />;
      case 'purchasing':
        return <PurchasingPage />;
      case 'finance':
        return <FinancePage />;
      case 'reports':
        return <ReportsHubPage />;
      case 'invoice_builder':
        return <InvoiceBuilderPage />;
      case 'module_builder':
        return <DynamicModulePage />;
      case 'users':
        return <UsersPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans">
      {/* Collapsible Lucide Icon Sidebar */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation Bar */}
        <TopBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useTenant();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <MainLayout />;
};

export function App() {
  return (
    <TenantProvider>
      <AppContent />
    </TenantProvider>
  );
}

export default App;

