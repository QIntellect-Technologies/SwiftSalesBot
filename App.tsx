
import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import Sidebar from './components/Layout/Sidebar';
import Navbar from './components/Layout/Navbar';
import Overview from './components/Dashboard/Overview';
import MedicineTable from './components/Inventory/MedicineTable';
import ExcelUpload from './components/Upload/ExcelUpload';
import OrdersManagement from './components/Orders/OrdersManagement';
import AnalyticsReports from './components/Analytics/AnalyticsReports';
import SuppliersDirectory from './components/Suppliers/SuppliersDirectory';
import CategoriesManagement from './components/Categories/CategoriesManagement';
import UserSettings from './components/Settings/UserSettings';
import { DashboardView } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<DashboardView>(DashboardView.OVERVIEW);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });
  const [globalSearch, setGlobalSearch] = useState('');
  const [filterDate, setFilterDate] = useState('Last 30 Days');
  const [startDate, setStartDate] = useState('2024-02-01');
  const [endDate, setEndDate] = useState('2024-02-15');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const renderContent = () => {
    switch (activeView) {
      case DashboardView.OVERVIEW:
        return (
          <Overview
            initialSearch={globalSearch}
            darkMode={darkMode}
            filterDate={filterDate}
            startDate={startDate}
            endDate={endDate}
          />
        );
      case DashboardView.INVENTORY:
        return <MedicineTable initialSearch={globalSearch} onUploadClick={() => setActiveView(DashboardView.UPLOAD)} />;
      case DashboardView.UPLOAD:
        return <ExcelUpload />;
      case DashboardView.ORDERS:
        return <OrdersManagement initialSearch={globalSearch} />;
      case DashboardView.ANALYTICS:
        return <AnalyticsReports />;
      case DashboardView.SUPPLIERS:
        return <SuppliersDirectory />;
      case DashboardView.CATEGORIES:
        return <CategoriesManagement />;
      case DashboardView.SETTINGS:
        return <UserSettings />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[70vh] glass rounded-[40px] text-center p-12 dark:bg-slate-900/40">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center mb-6">
              <Settings className="animate-spin-slow" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{activeView} is coming soon!</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm">
              We are currently finalizing the interface for this section. Stay tuned for advanced pharmaceutical analytics.
            </p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 transition-colors">
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 border-4 border-blue-100 dark:border-blue-900/30 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-blue-600">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-ping"></div>
          </div>
        </div>
        <div className="mt-8 text-slate-800 dark:text-white font-bold text-xl tracking-tight">SwiftSales Panel</div>
        <div className="mt-2 text-slate-400 dark:text-slate-500 text-sm font-medium">Powering global health logistics...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      <main className={`transition-all duration-300 pt-20 ${isSidebarCollapsed ? 'pl-20' : 'pl-64'
        }`}>
        <Navbar
          darkMode={darkMode}
          toggleDarkMode={() => setDarkMode(!darkMode)}
          isSidebarCollapsed={isSidebarCollapsed}
          searchValue={globalSearch}
          setSearchValue={setGlobalSearch}
          filterDate={filterDate}
          setFilterDate={setFilterDate}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
        />

        <div className="p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-80px)]">
          {renderContent()}
        </div>
      </main>

      <style>{`
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default App;
