import React, { useState, useMemo, useEffect } from 'react';
import {
  History, User, MapPin, Mail, ExternalLink, X, Star, Undo2, ShoppingCart,
  DollarSign, Package, AlertTriangle, Users, TrendingUp, TrendingDown, Activity, Clock, CheckCircle2,
  XCircle, Truck, Layers, BarChart3, PieChart as PieIcon, ArrowUpRight, ArrowDownRight, Calendar, Search, Filter,
  RefreshCw, MousePointer2, Box, Wallet, UserPlus, Percent, AlertOctagon
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, ComposedChart, Line
} from 'recharts';

interface OverviewProps {
  initialSearch: string;
  darkMode: boolean;
  filterDate: string;
  startDate: string;
  endDate: string;
}

// --- Types for Dashboard Data ---
interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalMedicines: number;
  lowStock: number;
  outOfStock: number;
  expiringSoon: number;
  totalSuppliers: number;
  activeSuppliers: number;
  totalCategories: number;
  avgOrderValue: number;
  profitMargin: number;
  returns: number;
  topSellingItem: string;
  topCategory: string;
  newCustomers: number;
  salesGrowth: number;
  inventoryValue: number;
  stockIn: number;
  stockOut: number;
}

const Overview: React.FC<OverviewProps> = ({ darkMode, filterDate }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0, totalOrders: 0, pendingOrders: 0, completedOrders: 0,
    totalMedicines: 0, lowStock: 0, outOfStock: 0, expiringSoon: 0,
    totalSuppliers: 0, activeSuppliers: 0, totalCategories: 0,
    avgOrderValue: 0, profitMargin: 0, returns: 0,
    topSellingItem: '-', topCategory: '-', newCustomers: 0,
    salesGrowth: 0, inventoryValue: 0, stockIn: 0, stockOut: 0
  });

  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [stockFlowData, setStockFlowData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Fetch Data ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch Today's Stats from local API
        const statRes = await fetch('/api/admin/analytics/today');
        const todayStats = await statRes.json();

        // Fetch Total Orders for overall metrics
        const resOrders = await fetch('/api/admin/orders');
        const orders: any[] = await resOrders.json();

        // Fetch Medicines for inventory metrics
        const medRes = await fetch('/api/medicines');
        const medicines = await medRes.json();

        const totalRevenue = orders.reduce((sum: any, o: any) => sum + (o.total_amount || 0), 0);
        const totalOrders = orders.length;
        const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;
        const totalMedicines = medicines.length;

        setMetrics(prev => ({
          ...prev,
          totalRevenue: todayStats.revenue || 0, // Showing TODAY'S revenue in main card
          totalOrders: todayStats.order_count || 0,
          pendingOrders,
          totalMedicines,
          avgOrderValue: todayStats.order_count > 0 ? (todayStats.revenue / todayStats.order_count) : 0,
          inventoryValue: totalRevenue // Total lifetime for scale
        }));

        // Revenue Trend (Mocking daily distribution)
        const revTrend = [
          { name: 'Mon', value: 4000 },
          { name: 'Tue', value: 3000 },
          { name: 'Wed', value: 2000 },
          { name: 'Thu', value: todayStats.revenue * 0.8 },
          { name: 'Fri', value: todayStats.revenue },
          { name: 'Sat', value: 2390 },
          { name: 'Sun', value: 3490 },
        ];
        setRevenueData(revTrend);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [filterDate]);

  // --- Components ---

  const MetricCard = ({ title, value, subValue, icon: Icon, color, trend, index }: any) => (
    <div
      className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-[24px] border border-white/50 dark:border-white/5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 dark:bg-opacity-20 text-opacity-100`}>
          <Icon size={20} className={color.replace('bg-', 'text-')} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
            {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{value}</h3>
        {subValue && <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{subValue}</p>}
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex h-96 items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">

      {/* SECTION 1: KEY FINANCIALS & OPERATIONS */}
      <div>
        <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 pl-2">Financial & Operational Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <MetricCard title="Total Revenue" value={`$${metrics.totalRevenue.toLocaleString()}`} subValue="Gross Income" icon={DollarSign} color="bg-blue-500" trend={12.5} index={0} />
          <MetricCard title="Total Orders" value={metrics.totalOrders} subValue={`${metrics.pendingOrders} Pending`} icon={ShoppingCart} color="bg-indigo-500" trend={8.2} index={1} />
          <MetricCard title="Profit Margin" value={`${metrics.profitMargin.toFixed(1)}%`} subValue="Estimated" icon={Activity} color="bg-emerald-500" trend={2.4} index={2} />
          <MetricCard title="Avg Order Value" value={`$${metrics.avgOrderValue.toFixed(0)}`} subValue="Per Transaction" icon={Wallet} color="bg-violet-500" trend={-1.5} index={3} />
          <MetricCard title="Inventory Value" value={`$${metrics.inventoryValue.toLocaleString()}`} subValue="Total Assets" icon={Box} color="bg-amber-500" trend={5.0} index={4} />
        </div>
      </div>

      {/* SECTION 2: INVENTORY & LOGISTICS */}
      <div>
        <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 pl-2">Inventory Intelligence</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <MetricCard title="Total Medicines" value={metrics.totalMedicines} subValue="SKUs" icon={Package} color="bg-cyan-500" index={5} />
          <MetricCard title="Low Stock" value={metrics.lowStock} subValue="Restock Needed" icon={AlertTriangle} color="bg-orange-500" trend={-5} index={6} />
          <MetricCard title="Out of Stock" value={metrics.outOfStock} subValue="Critical" icon={XCircle} color="bg-rose-500" index={7} />
          <MetricCard title="Expiring Soon" value={metrics.expiringSoon} subValue="Next 30 Days" icon={Clock} color="bg-yellow-500" index={8} />
          <MetricCard title="Top Category" value={metrics.topCategory} subValue="Highest Volume" icon={Layers} color="bg-teal-500" index={9} />
        </div>
      </div>

      {/* SECTION 3: CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-[32px] border border-white/50 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Revenue Trends</h3>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Daily Performance</p>
            </div>
            <button className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
              <BarChart3 size={18} className="text-slate-500" />
            </button>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)', backgroundColor: darkMode ? '#0F172A' : '#FFF' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-[32px] border border-white/50 dark:border-white/5 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-8">Sales by Category</h3>
          <div className="h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <span className="text-2xl font-black text-slate-800 dark:text-white">{metrics.totalCategories}</span>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Cats</p>
            </div>
          </div>
          <div className="mt-4 space-y-2 max-h-[100px] overflow-y-auto no-scrollbar">
            {categoryData.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }}></div>
                  <span className="font-medium text-slate-600 dark:text-slate-300">{c.name}</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-white">{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4: NETWORK & PARTNERS */}
      <div>
        <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 pl-2">Network & Logistics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <MetricCard title="Total Suppliers" value={metrics.totalSuppliers} subValue="Global Partners" icon={Users} color="bg-blue-600" index={10} />
          <MetricCard title="Active Suppliers" value={metrics.activeSuppliers} subValue="Currently Contributing" icon={CheckCircle2} color="bg-emerald-600" index={11} />
          <MetricCard title="New Customers" value={metrics.newCustomers} subValue="This Month" icon={UserPlus} color="bg-pink-500" trend={15} index={12} />
          <MetricCard title="Top Product" value={metrics.topSellingItem} subValue="Most Popular" icon={Star} color="bg-yellow-500" index={13} />
          <MetricCard title="Returns" value={metrics.returns} subValue="Refunded Orders" icon={Undo2} color="bg-rose-500" index={14} />
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

    </div>
  );
};

export default Overview;
