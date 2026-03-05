import React, { useState, useEffect } from 'react';
import {
  BarChart3, PieChart as PieIcon, TrendingUp, TrendingDown,
  Calendar, FileText, Plus, Download, ChevronRight,
  Clock, RefreshCw, Layers, LayoutGrid, Zap, Info,
  Filter, Search, ArrowUpRight, ArrowDownRight,
  BarChart4, Activity, ShieldCheck, Mail, Send,
  Users, Package, DollarSign, Calculator, Target,
  BrainCircuit, Star, Timer, History, X,
  Globe, Truck, AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell,
  BarChart, Bar, LineChart, Line, Legend,
  ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { supabase } from '../../lib/supabase';

// --- ROBUST MOCK DATA (Fallback) ---
const MOCK_REVENUE = [
  { name: 'Mon', revenue: 4500, cost: 2800 },
  { name: 'Tue', revenue: 5200, cost: 3100 },
  { name: 'Wed', revenue: 4800, cost: 2900 },
  { name: 'Thu', revenue: 6100, cost: 3800 },
  { name: 'Fri', revenue: 7500, cost: 4200 },
  { name: 'Sat', revenue: 5800, cost: 3400 },
  { name: 'Sun', revenue: 3900, cost: 2100 },
];

const MOCK_CATEGORY = [
  { name: 'Antibiotics', value: 35, color: '#3B82F6' },
  { name: 'Pain Relief', value: 25, color: '#10B981' },
  { name: 'Vitamins', value: 20, color: '#F59E0B' },
  { name: 'Cardio', value: 15, color: '#6366F1' },
  { name: 'Topical', value: 5, color: '#EC4899' },
];

const MOCK_VELOCITY = [
  { day: 'W1', thisMonth: 120, lastMonth: 100 },
  { day: 'W2', thisMonth: 135, lastMonth: 110 },
  { day: 'W3', thisMonth: 110, lastMonth: 95 },
  { day: 'W4', thisMonth: 155, lastMonth: 125 },
];

const MOCK_REGIONAL = [
  { subject: 'North', A: 120, B: 110, fullMark: 150 },
  { subject: 'East', A: 98, B: 130, fullMark: 150 },
  { subject: 'West', A: 86, B: 130, fullMark: 150 },
  { subject: 'South', A: 99, B: 100, fullMark: 150 },
  { subject: 'Central', A: 85, B: 90, fullMark: 150 },
];

const MOCK_CUSTOMER_RETENTION = [
  { month: 'Jan', rate: 65 },
  { month: 'Feb', rate: 68 },
  { month: 'Mar', rate: 72 },
  { month: 'Apr', rate: 70 },
  { month: 'May', rate: 75 },
  { month: 'Jun', rate: 78 },
];

const MOCK_SUPPLIER_PERFORMANCE = [
  { name: 'Pfizer', score: 92, delivery: 1.2 },
  { name: 'Novartis', score: 88, delivery: 2.1 },
  { name: 'Roche', score: 95, delivery: 0.8 },
  { name: 'GSK', score: 84, delivery: 3.5 },
  { name: 'Sanofi', score: 90, delivery: 1.5 },
];

const MOCK_HOURLY = [
  { hour: '9AM', sales: 120 },
  { hour: '12PM', sales: 340 },
  { hour: '3PM', sales: 280 },
  { hour: '6PM', sales: 450 },
  { hour: '9PM', sales: 190 },
];

const MOCK_ORDER_STATUS = [
  { name: 'Delivered', value: 65, color: '#10B981' },
  { name: 'Pending', value: 15, color: '#F59E0B' },
  { name: 'Processing', value: 12, color: '#3B82F6' },
  { name: 'Cancelled', value: 8, color: '#EF4444' },
];


const AnalyticsReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [isInsightsOpen, setIsInsightsOpen] = useState(true);

  // Data States
  const [revenueData, setRevenueData] = useState<any[]>(MOCK_REVENUE);
  const [categorySales, setCategorySales] = useState<any[]>(MOCK_CATEGORY);
  const [velocityData, setVelocityData] = useState<any[]>(MOCK_VELOCITY);

  // New Chart States
  const [retentionData, setRetentionData] = useState<any[]>(MOCK_CUSTOMER_RETENTION);
  const [supplierPerfData, setSupplierPerfData] = useState<any[]>(MOCK_SUPPLIER_PERFORMANCE);
  const [hourlyData, setHourlyData] = useState<any[]>(MOCK_HOURLY);
  const [orderStatusData, setOrderStatusData] = useState<any[]>(MOCK_ORDER_STATUS);

  const [stats, setStats] = useState({ generated: '0', schedules: '0', sync: 'Just now', storage: '0%' });

  const fetchData = async () => {
    try {
      const [ordersRes, medicinesRes, categoriesRes] = await Promise.all([
        supabase.from('orders').select('total_amount, date, status'),
        supabase.from('medicines').select('sales_volume, category_name, price'),
        supabase.from('categories').select('name, color')
      ]);

      // If data exists, use it. Otherwise keep MOCK data.
      if (ordersRes.data && ordersRes.data.length > 0) {
        // Simple processing logic here if needed to override mocks
        // For now, we mix them or just use mocks if the logic is complex to derive from empty DB
        const orders = ordersRes.data;
        const totalRev = orders.reduce((acc: number, o: any) => acc + (o.total_amount || 0), 0);

        // Example: If we have real orders, try to map them to revenueData
        // (Simplified for this demo to ensure charts always show SOMETHING)
        setStats({
          generated: orders.length.toString(),
          schedules: (categoriesRes.data || []).length.toString(),
          sync: 'Live',
          storage: '45%'
        });
      }

    } catch (e) {
      console.error('Error analytics', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Stats for the header cards
  const headerStats = [
    { label: 'Reports Generated', value: stats.generated === '0' ? '1,248' : stats.generated, trend: '+12%', icon: FileText, color: 'blue' },
    { label: 'Active Schedules', value: stats.schedules === '0' ? '24' : stats.schedules, trend: 'Stable', icon: Clock, color: 'indigo' },
    { label: 'Last Data Sync', value: 'Live', trend: 'Just now', icon: RefreshCw, color: 'emerald' },
    { label: 'Storage Usage', value: '45%', trend: '9.2GB', icon: Layers, color: 'amber' }
  ];

  const tabs = ['Overview', 'Pre-built Reports', 'Report Builder', 'Scheduled', 'History'];

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-32 relative">

      {/* 1. Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div className="flex-1">
          <h1 className="text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20">
              <BarChart3 size={24} />
            </div>
            Analytics Reports
          </h1>
          <nav className="flex items-center gap-2 mt-4 ml-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dashboard</span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Business Intelligence</span>
          </nav>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1 max-w-4xl">
          {headerStats.map((s, i) => (
            <div key={s.label} className="glass p-5 rounded-[28px] border dark:border-white/5 transition-all hover:bg-white group">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white bg-${s.color}-600 shadow-lg group-hover:scale-110 transition-transform`}>
                  <s.icon size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white tracking-tighter">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Primary Actions Bar */}
      <div className="flex items-center justify-between gap-6">
        <div className="flex bg-slate-100/50 dark:bg-white/5 p-1.5 rounded-[32px] border border-slate-200/50 dark:border-white/5 shadow-inner">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3.5 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab
                ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xl shadow-indigo-500/10'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Analytics Content - GRID OF 8 CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Analytics Hub (Center) */}
        <div className={`transition-all duration-500 ${isInsightsOpen ? 'lg:col-span-9' : 'lg:col-span-12'} space-y-8`}>

          {/* ROW 1: Major Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* CHART 1: Market Dynamics (Area) */}
            <div className="glass p-8 rounded-[40px] border dark:border-white/5 h-[400px] flex flex-col relative overflow-hidden group">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-500" /> Market Dynamics
              </h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(203, 213, 225, 0.3)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94A3B8' }} dy={10} />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={3} fill="url(#colorRev)" />
                    <Area type="monotone" dataKey="cost" stroke="#10B981" strokeWidth={3} fill="url(#colorCost)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 2: Supply Velocity (Bar) */}
            <div className="glass p-8 rounded-[40px] border dark:border-white/5 h-[400px] flex flex-col">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <Package size={18} className="text-emerald-500" /> Supply Velocity
              </h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={velocityData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(203, 213, 225, 0.3)" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none' }} />
                    <Bar dataKey="thisMonth" fill="#10B981" radius={[6, 6, 0, 0]} barSize={20} />
                    <Bar dataKey="lastMonth" fill="#E2E8F0" radius={[6, 6, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* ROW 2: Categorization & Region */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* CHART 3: Channel Mix (Pie) */}
            <div className="glass p-8 rounded-[40px] border dark:border-white/5 h-[350px] flex flex-col">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <PieIcon size={18} className="text-indigo-500" /> Channel Mix
              </h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySales}
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categorySales.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 4: Regional Hub (Radar) */}
            <div className="glass p-8 rounded-[40px] border dark:border-white/5 h-[350px] flex flex-col">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <Globe size={18} className="text-blue-500" /> Regional Node
              </h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={MOCK_REGIONAL}>
                    <PolarGrid stroke="rgba(203, 213, 225, 0.3)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} />
                    <Radar name="Perf" dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 5: Order Status (Donut) */}
            <div className="glass p-8 rounded-[40px] border dark:border-white/5 h-[350px] flex flex-col">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={18} className="text-amber-500" /> Order Flow
              </h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ROW 3: Advanced Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* CHART 6: Customer Retention (Line) */}
            <div className="glass p-8 rounded-[40px] border dark:border-white/5 h-[300px] flex flex-col lg:col-span-1">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <Users size={18} className="text-rose-500" /> Retention Trend
              </h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={retentionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(203, 213, 225, 0.3)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none' }} />
                    <Line type="monotone" dataKey="rate" stroke="#F43F5E" strokeWidth={3} dot={{ r: 4, fill: '#F43F5E' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 7: Supplier Performance (Composed) */}
            <div className="glass p-8 rounded-[40px] border dark:border-white/5 h-[300px] flex flex-col lg:col-span-2">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <Truck size={18} className="text-indigo-500" /> Supplier Scorecard
              </h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={supplierPerfData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(203, 213, 225, 0.3)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none' }} />
                    <Bar yAxisId="left" dataKey="score" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={30} />
                    <Line yAxisId="right" type="monotone" dataKey="delivery" stroke="#10B981" strokeWidth={3} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 8: Hourly Traffic (Bar) */}
            <div className="glass p-8 rounded-[40px] border dark:border-white/5 h-[300px] flex flex-col lg:col-span-3">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock size={18} className="text-cyan-500" /> Peak Hour Activity
              </h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(203, 213, 225, 0.3)" />
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none' }} />
                    <Bar dataKey="sales" fill="#06B6D4" radius={[6, 6, 6, 6]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>

        {/* AI Insights Sidebar */}
        {isInsightsOpen && (
          <div className="lg:col-span-3 space-y-8 animate-in slide-in-from-right-10 duration-500">
            <div className="glass p-8 rounded-[40px] border dark:border-white/5 h-full flex flex-col sticky top-24">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                    <BrainCircuit size={20} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">AI Oracle</h3>
                </div>
                <button onClick={() => setIsInsightsOpen(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X size={18} /></button>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar">
                {[
                  {
                    type: 'success',
                    title: 'Revenue Surge',
                    desc: 'Antibiotic category sales increased 45% this week compared to last month average.',
                    icon: TrendingUp
                  },
                  {
                    type: 'warning',
                    title: 'Stock Alert',
                    desc: 'Paracetamol stock velocity has doubled; estimated stock-out in 4.2 days if no reorder.',
                    icon: Zap
                  },
                  {
                    type: 'info',
                    title: 'Customer Trend',
                    desc: 'Retail segments are shifting towards monthly bulk orders instead of weekly cycles.',
                    icon: Users
                  },
                  {
                    type: 'success',
                    title: 'Efficiency Gained',
                    desc: 'Average fulfillment time dropped by 18 hours following the last batch update.',
                    icon: ShieldCheck
                  }
                ].map((insight, idx) => (
                  <div key={idx} className={`p-6 rounded-3xl border transition-all hover:translate-x-1 ${insight.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/10' :
                    insight.type === 'warning' ? 'bg-amber-500/5 border-amber-500/10' : 'bg-blue-500/5 border-blue-500/10'
                    }`}>
                    <div className="flex items-center gap-3 mb-3">
                      <insight.icon size={16} className={
                        insight.type === 'success' ? 'text-emerald-500' :
                          insight.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
                      } />
                      <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest">{insight.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{insight.desc}</p>
                    <button className="mt-4 text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] hover:underline flex items-center gap-1">Detailed Logic <ChevronRight size={10} /></button>
                  </div>
                ))}
              </div>

              <div className="pt-8 mt-auto">
                <button className="w-full py-5 rounded-[28px] bg-slate-900 dark:bg-indigo-600 text-white text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Refresh Prediction Engine
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating toggle if sidebar is closed */}
        {!isInsightsOpen && (
          <button
            onClick={() => setIsInsightsOpen(true)}
            className="fixed bottom-10 right-10 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center animate-bounce hover:scale-110 transition-transform z-50"
          >
            <BrainCircuit size={24} />
          </button>
        )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .shadow-indigo-500/20 { box-shadow: 0 10px 30px -10px rgba(99, 102, 241, 0.4); }
        .ease-out-back { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
      `}</style>
    </div>
  );
};

export default AnalyticsReports;
