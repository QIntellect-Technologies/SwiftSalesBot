
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Filter, Plus, Download, Users, Star,
  ChevronRight, ArrowUpRight, ArrowDownRight,
  DollarSign, Package, Clock, ShieldCheck, MapPin,
  Phone, Mail, Globe, LayoutGrid, List, Map,
  CheckCircle2, XCircle, AlertCircle, Trash2,
  Edit2, Eye, MoreVertical, X, Save, ArrowRight,
  FileText, FileSpreadsheet, Heart, Zap, History,
  TrendingUp, CreditCard, ShoppingCart, Target,
  ExternalLink, BarChart3, Building2, UserCircle,
  Briefcase, Activity, Calendar
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  LineChart, Line, AreaChart, Area,
  CartesianGrid
} from 'recharts';
// import { MOCK_SUPPLIERS } from '../../constants';
import { Supplier, SupplierPerformance } from '../../types';
import { supabase } from '../../lib/supabase';

const ViewMode = { GRID: 'grid', LIST: 'list', MAP: 'map' };

const SuppliersDirectory: React.FC = () => {
  const [viewMode, setViewMode] = useState(ViewMode.GRID);
  const [searchTerm, setSearchTerm] = useState('');

  // const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS); // Removed mock
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // --- Supabase Integration ---
  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase.from('suppliers').select('*').order('name', { ascending: true });
      if (error) throw error;

      const transformed: Supplier[] = data.map((s: any) => ({
        id: s.id,
        name: s.name,
        logoUrl: s.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`,
        description: s.description,
        contactPerson: s.contact_person,
        email: s.email,
        phone: s.phone,
        location: s.location || { city: 'Unknown', country: 'Unknown', address: '' },
        status: s.status,
        paymentTerms: s.payment_terms,
        contractStatus: s.contract_status,
        contractEndDate: s.contract_end_date,
        tags: s.tags || [],
        rating: 4.5, // Mock rating or derive from performance
        reviewCount: 0,
        medicinesSupplied: 0, // Need to count medicines? 
        purchaseValue: 0, // Need to sum orders?
        onTimeRate: s.performance?.delivery || 0,
        performance: s.performance || { quality: 0, delivery: 0, pricing: 0, communication: 0, fulfillment: 0 },
        preferred: s.preferred,
        categories: s.categories || [],
        avgDeliveryTime: 0, // Mock
        lastOrderDate: s.updated_at // Use updated_at as proxy or today
      }));
      setSuppliers(transformed);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);
  // ---------------------------
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [step, setStep] = useState(1);
  const [filterStatus, setFilterStatus] = useState('All');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Derived Stats
  const stats = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter(s => s.status === 'Active').length;
    const avgRating = suppliers.reduce((sum, s) => sum + s.rating, 0) / total;
    const totalValue = suppliers.reduce((sum, s) => sum + s.purchaseValue, 0);
    const critical = suppliers.filter(s => s.contractStatus === 'Expiring' || s.contractStatus === 'Expired').length;
    return { total, active, avgRating, totalValue, critical };
  }, [suppliers]);

  // Filtering
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const matchesSearch = !searchTerm ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'All' || s.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchTerm, filterStatus]);

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const getStatusStyle = (status: Supplier['status']) => {
    switch (status) {
      case 'Active': return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30';
      case 'On Hold': return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30';
      case 'Suspended': return 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/30';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            size={12}
            className={`${i <= Math.floor(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
          />
        ))}
      </div>
    );
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {filteredSuppliers.map((s, i) => (
        <div
          key={s.id}
          className="glass-card p-8 rounded-[40px] border dark:border-white/5 relative group animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(s.status)}`}>
              {s.status}
            </span>
          </div>

          <div className="flex items-start gap-6 mb-8">
            <div className="w-20 h-20 rounded-[28px] overflow-hidden bg-white dark:bg-slate-800 border-4 border-slate-50 dark:border-white/5 shadow-2xl shadow-blue-500/10 group-hover:scale-110 transition-transform">
              <img src={s.logoUrl} alt={s.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{s.name}</h3>
                {s.preferred && <ShieldCheck size={16} className="text-blue-500" />}
              </div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                <MapPin size={10} /> {s.location.city}, {s.location.country}
              </p>
              <div className="flex items-center gap-2 mt-3">
                {renderStars(s.rating)}
                <span className="text-[10px] font-black text-slate-800 dark:text-white">{s.rating}</span>
                <span className="text-[9px] font-bold text-slate-400">({s.reviewCount} Reviews)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-[24px] bg-slate-50 dark:bg-white/5 border dark:border-white/5 text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Orders</p>
              <p className="text-sm font-black text-slate-800 dark:text-white">{s.medicinesSupplied}+</p>
            </div>
            <div className="p-4 rounded-[24px] bg-slate-50 dark:bg-white/5 border dark:border-white/5 text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Value</p>
              <p className="text-sm font-black text-emerald-500">${(s.purchaseValue / 1000).toFixed(1)}k</p>
            </div>
            <div className="p-4 rounded-[24px] bg-slate-50 dark:bg-white/5 border dark:border-white/5 text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">On-Time</p>
              <p className="text-sm font-black text-blue-600">{s.onTimeRate}%</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {s.categories.slice(0, 2).map((cat, ci) => (
                  <div key={ci} className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-black text-blue-600 dark:text-blue-400" title={cat}>
                    {cat.charAt(0)}
                  </div>
                ))}
                {s.categories.length > 2 && (
                  <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 border border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-black text-slate-500">
                    +{s.categories.length - 2}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedSupplier(s)}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-blue-600 transition-all"
              >
                <Eye size={18} />
              </button>
              <button className="px-6 py-3 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.05] active:scale-[0.95] transition-all">
                Procurement
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="glass rounded-[48px] border dark:border-white/5 overflow-hidden shadow-2xl relative">
      <div className="overflow-x-auto min-h-[500px]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 dark:border-white/5">
              <th className="px-8 py-8 w-10">
                <button onClick={() => { }} className="p-2 rounded-lg text-slate-300"><LayoutGrid size={18} /></button>
              </th>
              <th className="px-8 py-8">Supplier Hub</th>
              <th className="px-8 py-8">Procurement Manager</th>
              <th className="px-8 py-8 text-center">Efficiency Rating</th>
              <th className="px-8 py-8 text-right">Net Value</th>
              <th className="px-8 py-8">Lifecycle State</th>
              <th className="px-8 py-8 text-center">Command</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {filteredSuppliers.map((s) => (
              <tr key={s.id} className="group hover:bg-white/90 dark:hover:bg-white/5 transition-all">
                <td className="px-8 py-6">
                  <button onClick={() => toggleSelectOne(s.id)} className={`p-2 rounded-lg ${selectedIds.has(s.id) ? 'text-blue-600' : 'text-slate-300'}`}>
                    {selectedIds.has(s.id) ? <CheckCircle2 size={18} /> : <div className="w-[18px] h-[18px] border-2 border-slate-200 rounded-md"></div>}
                  </button>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 overflow-hidden border border-slate-200 dark:border-white/10 p-1">
                      <img src={s.logoUrl} alt={s.name} className="w-full h-full object-cover rounded-lg" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{s.name}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-1">{s.location.city}, {s.location.country}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-black text-blue-600">
                      {s.contactPerson.charAt(0)}
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase">{s.contactPerson}</div>
                      <div className="text-[8px] text-slate-400 font-bold uppercase">{s.phone}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 text-center">
                  <div className="flex flex-col items-center">
                    <div className="text-sm font-black text-slate-800 dark:text-white">{s.onTimeRate}%</div>
                    <div className="w-16 h-1 bg-slate-100 dark:bg-white/5 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${s.onTimeRate}%` }}></div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="text-sm font-black text-emerald-500 font-mono">${s.purchaseValue.toLocaleString()}</div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(s.status)}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setSelectedSupplier(s)} className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-blue-600 transition-all"><Eye size={18} /></button>
                    <button className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-amber-500 transition-all"><Edit2 size={18} /></button>
                    <button className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-slate-800 dark:hover:text-white"><MoreVertical size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-32 relative">

      {/* 1. Header & Stats Component */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10">
        <div className="flex-1">
          <h1 className="text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-600 rounded-[28px] flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 animate-pulse-slow">
              <Users size={32} />
            </div>
            Supplier Hub
          </h1>
          <nav className="flex items-center gap-2 mt-6 ml-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Dashboard</span>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Directory</span>
          </nav>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 flex-1 max-w-5xl">
          {[
            { label: 'Network nodes', val: stats.total, icon: Globe, color: 'blue' },
            { label: 'Active uplink', val: stats.active, icon: Zap, color: 'emerald' },
            { label: 'Avg reputation', val: stats.avgRating.toFixed(1), icon: Star, color: 'amber' },
            { label: 'Net procurement', val: `$${(stats.totalValue / 1000).toFixed(0)}k`, icon: DollarSign, color: 'indigo' },
            { label: 'Critical alert', val: stats.critical, icon: ShieldCheck, color: 'rose' }
          ].map((s, i) => (
            <div key={s.label} className="glass p-5 rounded-[32px] border dark:border-white/5 hover:bg-white group transition-all duration-500">
              <div className="flex flex-col items-center text-center">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white bg-${s.color}-600 shadow-lg group-hover:scale-110 transition-transform mb-3`}>
                  <s.icon size={18} />
                </div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate w-full">{s.label}</p>
                <p className="text-xl font-black text-slate-800 dark:text-white tracking-tighter">{s.val}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Command & Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-slate-100/40 dark:bg-white/5 p-8 rounded-[48px] border border-slate-200/50 dark:border-white/5 shadow-inner">
        <div className="flex-1 max-w-2xl relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search network: company, manager, or territory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-8 py-5 rounded-[32px] bg-white dark:bg-slate-900/50 border border-transparent focus:border-blue-500 outline-none transition-all text-sm font-bold dark:text-white shadow-inner"
          />
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex bg-white/50 dark:bg-slate-900/50 p-1.5 rounded-[24px] border border-slate-200/50 dark:border-white/10 shadow-sm">
            {[
              { mode: ViewMode.GRID, icon: LayoutGrid },
              { mode: ViewMode.LIST, icon: List },
              { mode: ViewMode.MAP, icon: Map }
            ].map((v) => (
              <button
                key={v.mode}
                onClick={() => setViewMode(v.mode)}
                className={`p-3.5 rounded-[18px] transition-all duration-500 ${viewMode === v.mode ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <v.icon size={20} />
              </button>
            ))}
          </div>

          <div className="relative group">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white dark:bg-slate-900/50 px-8 py-5 rounded-[32px] text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 outline-none appearance-none pr-14 cursor-pointer border border-transparent hover:border-blue-500/30 transition-all shadow-sm"
            >
              <option>All Nodes</option>
              <option>Active</option>
              <option>On Hold</option>
              <option>Suspended</option>
              <option>Blacklisted</option>
            </select>
            <Filter className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white flex items-center gap-3 px-10 py-5 rounded-[32px] text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_-10px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all group/btn"
          >
            <Plus size={20} className="group-hover/btn:rotate-90 transition-transform duration-500" /> Register Node
          </button>
        </div>
      </div>

      {/* 3. Main Data Visualization */}
      <div className="min-h-[600px]">
        {viewMode === ViewMode.GRID ? renderGridView() : renderListView()}
      </div>

      {/* 4. Multi-Step Registration Drawer */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end p-0 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-500">
          <div className="glass w-full max-w-4xl h-full bg-white dark:bg-slate-900 shadow-2xl border-l dark:border-white/10 overflow-hidden flex flex-col animate-in slide-in-from-right-full duration-700">
            <div className="p-10 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-[24px] flex items-center justify-center text-white shadow-2xl">
                  <Building2 size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Supplier Onboarding</h2>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Step {step} of 8 • Node Configuration Wizard</p>
                </div>
              </div>
              <button onClick={() => setIsAdding(false)} className="p-4 rounded-[24px] bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 transition-all"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-10">
              {/* Stepper Visualization */}
              <div className="flex items-center gap-2 mb-12">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-700 ${i <= step ? 'bg-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-slate-100 dark:bg-white/5'}`}></div>
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity Name</label>
                      <input type="text" placeholder="e.g. Global Meds Ltd" className="w-full px-8 py-4 rounded-3xl border border-slate-200 dark:border-white/10 dark:bg-slate-800/50 outline-none focus:border-blue-500 transition-all text-sm font-bold dark:text-white" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Vertical</label>
                      <select className="w-full px-8 py-4 rounded-3xl border border-slate-200 dark:border-white/10 dark:bg-slate-800/50 outline-none focus:border-blue-500 transition-all text-sm font-bold dark:text-white appearance-none cursor-pointer">
                        <option>Manufacturer</option>
                        <option>Distributor</option>
                        <option>Wholesaler</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Email</label>
                      <input type="email" placeholder="contact@entity.com" className="w-full px-8 py-4 rounded-3xl border border-slate-200 dark:border-white/10 dark:bg-slate-800/50 outline-none focus:border-blue-500 transition-all text-sm font-bold dark:text-white" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Phone</label>
                      <input type="tel" placeholder="+1 (000) 000-0000" className="w-full px-8 py-4 rounded-3xl border border-slate-200 dark:border-white/10 dark:bg-slate-800/50 outline-none focus:border-blue-500 transition-all text-sm font-bold dark:text-white" />
                    </div>
                  </div>
                </div>
              )}

              {step > 1 && (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                  <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-[40px] flex items-center justify-center text-blue-600 mb-8">
                    <Zap size={48} className="animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Initializing Module {step}</h3>
                  <p className="text-slate-400 dark:text-slate-500 font-bold max-w-sm mt-4 leading-relaxed uppercase text-[10px] tracking-widest">Constructing the high-fidelity data structure for this onboarding sequence...</p>
                </div>
              )}
            </div>

            <div className="p-10 border-t border-slate-100 dark:border-white/5 shrink-0 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={() => step > 1 ? setStep(s => s - 1) : setIsAdding(false)}
                className="px-10 py-5 rounded-[32px] border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
              >
                {step === 1 ? 'Abort Command' : 'Reverse Step'}
              </button>
              <button
                onClick={() => step < 8 ? setStep(s => s + 1) : setIsAdding(false)}
                className="px-12 py-5 rounded-[32px] bg-blue-600 text-white text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 group/next"
              >
                {step === 8 ? 'Confirm Registry' : 'Proceed Signal'}
                <ArrowRight size={18} className="group-hover/next:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Detailed Supplier Profile View */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-500">
          <div className="glass w-full max-w-[1400px] h-[90vh] bg-white dark:bg-slate-900 rounded-[56px] shadow-2xl border dark:border-white/10 overflow-hidden flex flex-col animate-in zoom-in duration-500">
            <div className="p-10 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-8">
                <div className="w-24 h-24 rounded-[36px] overflow-hidden bg-white dark:bg-slate-800 border-4 border-white dark:border-white/10 shadow-2xl p-1">
                  <img src={selectedSupplier.logoUrl} alt={selectedSupplier.name} className="w-full h-full object-cover rounded-[28px]" />
                </div>
                <div>
                  <div className="flex items-center gap-4">
                    <h2 className="text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{selectedSupplier.name}</h2>
                    <span className={`px-5 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${getStatusStyle(selectedSupplier.status)}`}>
                      {selectedSupplier.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 mt-3">
                    <div className="flex items-center gap-2">
                      {renderStars(selectedSupplier.rating)}
                      <span className="text-xs font-black text-slate-800 dark:text-white">{selectedSupplier.rating}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-200 dark:bg-white/10"></div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <MapPin size={12} className="text-blue-500" /> {selectedSupplier.location.city}, {selectedSupplier.location.country}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="px-8 py-4 rounded-[24px] border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-all flex items-center gap-2"><Download size={16} /> Catalog</button>
                <button className="px-8 py-4 rounded-[24px] bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-blue-500/20 hover:scale-[1.05] transition-all flex items-center gap-2"><ShoppingCart size={16} /> New Purchase Order</button>
                <button onClick={() => setSelectedSupplier(null)} className="p-4 rounded-[24px] bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 transition-all"><X size={24} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex">
              {/* Profile Tabs */}
              <div className="w-80 border-r border-slate-100 dark:border-white/5 p-8 space-y-3 bg-slate-50/20 dark:bg-slate-900/40">
                {[
                  { id: 'Overview', icon: LayoutGrid },
                  { id: 'Catalog', icon: Package },
                  { id: 'History', icon: History },
                  { id: 'Finance', icon: CreditCard },
                  { id: 'Performance', icon: TrendingUp },
                  { id: 'Documents', icon: FileText },
                  { id: 'Analytics', icon: BarChart3 }
                ].map((tab) => (
                  <button key={tab.id} className="w-full flex items-center gap-4 px-6 py-4 rounded-[24px] text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-blue-600 transition-all group">
                    <tab.icon size={18} className="group-hover:scale-110 transition-transform" /> {tab.id}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-12 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                    { label: 'Total procure', val: `$${(selectedSupplier.purchaseValue / 1000).toFixed(1)}k`, icon: DollarSign, color: 'blue' },
                    { label: 'Asset velocity', val: `${selectedSupplier.avgDeliveryTime}d`, icon: Clock, color: 'emerald' },
                    { label: 'Fulfillment accuracy', val: `${selectedSupplier.onTimeRate}%`, icon: Target, color: 'amber' },
                    { label: 'Active SKUs', val: selectedSupplier.medicinesSupplied, icon: Package, color: 'indigo' }
                  ].map((m, i) => (
                    <div key={m.label} className="glass p-8 rounded-[40px] border dark:border-white/5 text-center group">
                      <div className={`w-12 h-12 rounded-2xl bg-${m.color}-100 dark:bg-${m.color}-900/20 text-${m.color}-600 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-sm`}>
                        <m.icon size={22} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{m.label}</p>
                      <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{m.val}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="glass p-10 rounded-[48px] border dark:border-white/5 h-[450px] flex flex-col">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-10 flex items-center gap-3">
                      <TrendingUp size={18} className="text-emerald-500" /> Procurement Trajectory
                    </h3>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[
                          { name: 'Jan', v: 4500 }, { name: 'Feb', v: 5200 }, { name: 'Mar', v: 4800 },
                          { name: 'Apr', v: 6100 }, { name: 'May', v: 5900 }, { name: 'Jun', v: 8400 }
                        ]}>
                          <defs>
                            <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(203, 213, 225, 0.2)" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }} />
                          <Tooltip contentStyle={{ borderRadius: '24px', border: 'none' }} />
                          <Area type="monotone" dataKey="v" stroke="#3B82F6" strokeWidth={4} fill="url(#pGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass p-10 rounded-[48px] border dark:border-white/5 h-[450px] flex flex-col">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-10 flex items-center gap-3">
                      <ShieldCheck size={18} className="text-blue-500" /> Operational Scorecard
                    </h3>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                          { subject: 'Quality', A: selectedSupplier.performance.quality, fullMark: 100 },
                          { subject: 'Delivery', A: selectedSupplier.performance.delivery, fullMark: 100 },
                          { subject: 'Pricing', A: selectedSupplier.performance.pricing, fullMark: 100 },
                          { subject: 'Comm', A: selectedSupplier.performance.communication, fullMark: 100 },
                          { subject: 'Fulfill', A: selectedSupplier.performance.fulfillment, fullMark: 100 },
                        ]}>
                          <PolarGrid stroke="rgba(203, 213, 225, 0.3)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 900, fill: '#94A3B8' }} />
                          <Radar name="Performance" dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
    </div>
  );
};

const Square = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
  </svg>
);

export default SuppliersDirectory;
