import React from 'react';
import {
  Search, Bell, User, HelpCircle, ChevronDown,
  Sun, Moon, Command
} from 'lucide-react';

interface NavbarProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  isSidebarCollapsed: boolean;
  searchValue: string;
  setSearchValue: (value: string) => void;
  filterDate: string;
  setFilterDate: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  toggleDarkMode,
  isSidebarCollapsed,
  searchValue,
  setSearchValue
}) => {
  return (
    <header className={`fixed top-0 right-0 z-30 h-20 px-8 flex items-center justify-between bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 transition-all duration-300 shadow-sm ${isSidebarCollapsed ? 'left-20' : 'left-64'
      }`}>

      {/* Search Bar - Global for Dashboard */}
      <div className="flex-1 max-w-xl relative hidden md:block group ml-16 lg:ml-0">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
        <input
          type="text"
          placeholder="Search medicines, orders, or suppliers..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-medium dark:text-white placeholder:text-slate-400"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs text-slate-400 font-medium">
          <span className="px-2 py-1 bg-white dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600 flex items-center gap-1">
            <Command size={10} /> K
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        {/* Support & Help */}
        <button className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all relative group hidden sm:block">
          <HelpCircle size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></span>
        </button>

        {/* Notifications */}
        <button className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all relative group">
          <Bell size={20} className="group-hover:text-amber-500 transition-colors" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
        >
          {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-slate-600" />}
        </button>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

        {/* Profile Dropdown */}
        <button className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5">
            <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
              <User size={20} className="text-slate-400" />
            </div>
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">Dr. Admin</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Head Distributor</p>
          </div>
          <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform group-hover:rotate-180 hidden md:block" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
