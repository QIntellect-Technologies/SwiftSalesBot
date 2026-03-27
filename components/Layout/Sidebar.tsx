import React from 'react';
import {
    Home, Package, Users, ShoppingCart, BarChart3,
    Settings, HelpCircle, Layers, FileText, ChevronLeft, ChevronRight,
    LogOut, Menu
} from 'lucide-react';
import { DashboardView } from '../../types';

interface SidebarProps {
    activeView: DashboardView;
    setActiveView: (view: DashboardView) => void;
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    activeView,
    setActiveView,
    isCollapsed,
    setIsCollapsed
}) => {
    const menuItems = [
        { id: DashboardView.OVERVIEW, label: 'Overview', icon: Home },
        { id: DashboardView.INVENTORY, label: 'Inventory', icon: Package },
        { id: DashboardView.ORDERS, label: 'Orders', icon: ShoppingCart },
        { id: DashboardView.CUSTOMERS, label: 'Customers', icon: Users },
        { id: DashboardView.SUPPLIERS, label: 'Suppliers', icon: FileText },
        { id: DashboardView.CATEGORIES, label: 'Categories', icon: Layers },
        { id: DashboardView.ANALYTICS, label: 'Analytics', icon: BarChart3 },
        { id: DashboardView.SETTINGS, label: 'Settings', icon: Settings },
    ];

    return (
        <aside
            className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 ${isCollapsed ? 'w-20' : 'w-64'
                }`}
        >
            {/* Brand Section */}
            <div className="flex items-center justify-between h-20 px-6 border-b border-slate-100 dark:border-slate-800">
                {!isCollapsed && (
                    <div className="flex items-center gap-2 animate-in fade-in duration-300">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                            SC
                        </div>
                        <span className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
                            Swift<span className="text-blue-600">Connect</span>
                        </span>
                    </div>
                )}
                {isCollapsed && (
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mx-auto">
                        SC
                    </div>
                )}

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ${isCollapsed ? 'hidden' : 'block'}`}
                >
                    <ChevronLeft size={18} />
                </button>
            </div>

            {/* Navigation */}
            <nav className="p-4 space-y-2 mt-4">
                {menuItems.map((item) => {
                    const isActive = activeView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative ${isActive
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                        >
                            <item.icon
                                size={20}
                                className={`transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}
                            />

                            {!isCollapsed && (
                                <span className="text-sm tracking-wide">{item.label}</span>
                            )}

                            {/* Tooltip for collapsed mode */}
                            {isCollapsed && (
                                <div className="absolute left-full ml-4 px-3 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                    {item.label}
                                </div>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Footer / Logout */}
            <div className="absolute bottom-0 left-0 w-full p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all ${isCollapsed ? 'justify-center' : ''}`}>
                    <LogOut size={20} />
                    {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
