
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Filter, Plus, Download, Tag,
  ChevronRight, ChevronDown, Folder, Pill,
  BarChart3, LayoutGrid, List, BarChart4,
  Zap, MoreVertical, Eye, Edit2, Trash2,
  Move, ShieldCheck, AlertCircle, Info,
  Settings, Layers, TrendingUp, History,
  X, Save, ArrowRight, Package, DollarSign,
  PieChart as PieIcon, Calculator, Target,
  GripVertical, FileText, CheckCircle2,
  GitBranch, Sparkles, Wand2, Merge, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Cell, PieChart, Pie, AreaChart, Area,
  CartesianGrid, Treemap, ScatterChart, Scatter,
  ZAxis
} from 'recharts';
import { MOCK_CATEGORIES, MOCK_MEDICINES } from '../../constants';
import { Category, Medicine } from '../../types';
import { supabase } from '../../lib/supabase';

const ViewMode = { TREE: 'tree', GRID: 'grid', TABLE: 'table', ANALYTICS: 'analytics' };

const CategoriesManagement: React.FC = () => {
  const [viewMode, setViewMode] = useState(ViewMode.TREE);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['cat-1']));
  const [activeTab, setActiveTab] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  // --- Supabase Integration ---
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  const fetchData = async () => {
    try {
      const [catRes, medRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order', { ascending: true }),
        supabase.from('medicines').select('id, price, stock, category_name, category_id') // Fetch subset for stats
      ]);

      if (catRes.error) throw catRes.error;
      if (medRes.error) throw medRes.error;

      // Transform DB categories to Frontend types if needed
      // DB has parent_id, frontend has parentId.
      const transformedCategories = catRes.data.map((c: any) => ({
        ...c,
        parentId: c.parent_id,
        sortOrder: c.sort_order,
        // Calculate derived stats from medRes.data
        productCount: medRes.data.filter((m: any) => m.category_id === c.id || m.category_name === c.name).length,
        revenue: medRes.data
          .filter((m: any) => m.category_id === c.id || m.category_name === c.name)
          .reduce((acc: number, m: any) => acc + (m.price * m.stock), 0), // Simplifying revenue as stock value for now? 
        // Or revenue should be from orders? The mock 'revenue' seems to be 'value' in grid view. 
        // In grid view it says "Yield Value". 
        attributes: c.attributes || {},
        recursiveProductCount: 0 // Will compute below
      }));

      // Compute recursive counts/revenue
      const computeRecursive = (cats: any[]) => {
        // Simple approach: propagate up? Or just leave as direct count for now.
        // The tree builder does hierarchy.
        return cats.map(c => {
          // Find children
          const children = cats.filter(child => child.parentId === c.id);
          // Verify if this works for unlimited depth, simplistic for 1-2 levels
          const childCount = children.reduce((acc, child) => acc + child.productCount, 0);
          return { ...c, recursiveProductCount: c.productCount + childCount };
        });
      };

      setCategories(computeRecursive(transformedCategories));
      setMedicines(medRes.data as unknown as Medicine[]);

    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Stats Derived
  const stats = useMemo(() => {
    const total = categories.length;
    const medCount = medicines.length;
    const topCat = [...categories].sort((a, b) => (b.revenue || 0) - (a.revenue || 0))[0];
    const avgProducts = total ? medCount / total : 0;
    const attention = categories.filter(c => c.productCount === 0 || c.status === 'Draft').length;
    return { total, medicines: medCount, topCat, avgProducts, attention };
  }, [categories, medicines]);

  // Filtering
  const filteredCategories = useMemo(() => {
    return categories.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  // Tree Logic: Group categories by parent
  const categoryTree = useMemo(() => {
    const buildTree = (parentId: string | null = null): any[] => {
      return categories
        .filter(c => c.parentId === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(c => ({
          ...c,
          children: buildTree(c.id)
        }));
    };
    // Root categories have parent_id null
    return buildTree(null);
  }, [categories]);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const getStatusStyle = (status: Category['status']) => {
    switch (status) {
      case 'Active': return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30';
      case 'Inactive': return 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/50 dark:border-white/5';
      case 'Draft': return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30';
      default: return '';
    }
  };

  const renderTreeItem = (node: any, level: number = 0) => {
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="space-y-2">
        <div
          className={`group flex items-center gap-4 p-4 rounded-3xl border transition-all duration-300 ${selectedCategory?.id === node.id
            ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-500/20 text-white'
            : 'glass hover:bg-white dark:hover:bg-slate-800 border-transparent hover:border-blue-500/20'
            }`}
          style={{ marginLeft: `${level * 40}px` }}
          onClick={() => setSelectedCategory(node)}
        >
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
              className={`p-1.5 rounded-xl transition-all ${hasChildren ? 'hover:bg-white/20' : 'opacity-0 cursor-default'}`}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedCategory?.id === node.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/5 text-blue-500'}`}>
              {level === 0 ? <Folder size={20} /> : <Tag size={18} />}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-black uppercase tracking-tight">{node.name}</h4>
                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border ${getStatusStyle(node.status)} ${selectedCategory?.id === node.id ? 'border-white/20 text-white' : ''}`}>
                  {node.status}
                </span>
              </div>
              <p className={`text-[10px] font-bold mt-0.5 uppercase tracking-widest ${selectedCategory?.id === node.id ? 'text-blue-100' : 'text-slate-400'}`}>
                {node.recursiveProductCount} Assets • {node.type}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-2.5 rounded-xl hover:bg-white/20 text-current transition-all"><Eye size={16} /></button>
            <button className="p-2.5 rounded-xl hover:bg-white/20 text-current transition-all"><Plus size={16} /></button>
            <button className="p-2.5 rounded-xl hover:bg-white/20 text-current transition-all"><Edit2 size={16} /></button>
          </div>
        </div>
        {isExpanded && node.children.map((child: any) => renderTreeItem(child, level + 1))}
      </div>
    );
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {filteredCategories.map((c, i) => (
        <div key={c.id} className="glass-card p-8 rounded-[40px] border dark:border-white/5 relative group animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
          <div className="flex items-start justify-between mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-blue-500/20 group-hover:scale-110 transition-transform">
              <Folder size={28} />
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(c.status)}`}>
                {c.status}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-2">{c.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest line-clamp-2">{c.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-white/5 border dark:border-white/5">
              <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                <Package size={12} className="text-blue-500" /> Stock Nodes
              </div>
              <p className="text-xl font-black text-slate-800 dark:text-white tracking-tighter">{c.recursiveProductCount}</p>
            </div>
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-white/5 border dark:border-white/5">
              <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                <DollarSign size={12} className="text-emerald-500" /> Yield Value
              </div>
              <p className="text-xl font-black text-emerald-500 tracking-tighter">${c.revenue ? (c.revenue / 1000).toFixed(1) : 0}k</p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center overflow-hidden shadow-sm">
                  <img src={`https://picsum.photos/seed/cat${c.id}${i}/40/40`} className="w-full h-full object-cover" />
                </div>
              ))}
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-black text-blue-600">
                +{c.productCount > 3 ? c.productCount - 3 : 0}
              </div>
            </div>
            <button className="text-blue-600 dark:text-blue-400 font-black uppercase text-[10px] tracking-widest hover:underline flex items-center gap-2 group/link">
              Explore Assets <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-32 relative">

      {/* 1. Header & Quick Stats */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10">
        <div className="flex-1">
          <h1 className="text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-600 rounded-[28px] flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 animate-pulse-slow">
              <Layers size={32} />
            </div>
            Category Hub
          </h1>
          <nav className="flex items-center gap-2 mt-6 ml-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Logistics Terminal</span>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Classification Registry</span>
          </nav>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 flex-1 max-w-5xl">
          {[
            { label: 'Classification Nodes', val: stats.total, icon: GitBranch, color: 'blue' },
            { label: 'Categorized Assets', val: stats.medicines, icon: Package, color: 'indigo' },
            { label: 'High Yield Path', val: stats.topCat?.name, icon: TrendingUp, color: 'emerald' },
            { label: 'Average Density', val: stats.avgProducts.toFixed(1), icon: Calculator, color: 'amber' },
            { label: 'Logic Alert', val: stats.attention, icon: AlertCircle, color: 'rose' }
          ].map((s, i) => (
            <div key={s.label} className="glass p-5 rounded-[32px] border dark:border-white/5 hover:bg-white group transition-all duration-500 text-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white bg-${s.color}-600 shadow-lg group-hover:scale-110 transition-transform mx-auto mb-3`}>
                <s.icon size={18} />
              </div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate w-full">{s.label}</p>
              <p className="text-sm font-black text-slate-800 dark:text-white tracking-tight uppercase truncate">{s.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Control & Navigation Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-slate-100/40 dark:bg-white/5 p-8 rounded-[48px] border border-slate-200/50 dark:border-white/5 shadow-inner">
        <div className="flex-1 max-w-2xl relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search hierarchy: name, attributes, or SKUs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-8 py-5 rounded-[32px] bg-white dark:bg-slate-900/50 border border-transparent focus:border-blue-500 outline-none transition-all text-sm font-bold dark:text-white shadow-inner"
          />
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex bg-white/50 dark:bg-slate-900/50 p-1.5 rounded-[24px] border border-slate-200/50 dark:border-white/10 shadow-sm">
            {[
              { mode: ViewMode.TREE, icon: GitBranch },
              { mode: ViewMode.GRID, icon: LayoutGrid },
              { mode: ViewMode.TABLE, icon: List },
              { mode: ViewMode.ANALYTICS, icon: BarChart4 }
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

          <div className="flex items-center gap-3">
            <button className="p-4 rounded-[24px] bg-white dark:bg-white/5 text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-blue-500/20"><Wand2 size={20} /></button>
            <button className="p-4 rounded-[24px] bg-white dark:bg-white/5 text-slate-400 hover:text-amber-500 transition-all border border-transparent hover:border-amber-500/20"><Merge size={20} /></button>
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white flex items-center gap-3 px-10 py-5 rounded-[32px] text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_-10px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all group/btn"
          >
            <Plus size={20} className="group-hover/btn:rotate-90 transition-transform duration-500" /> New Category
          </button>
        </div>
      </div>

      {/* 3. Logic Visualization (Main Content) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* Left Side: Navigation Structure */}
        <div className="lg:col-span-8 space-y-10">
          {viewMode === ViewMode.TREE && (
            <div className="space-y-4 animate-in fade-in zoom-in duration-500">
              {categoryTree.map(node => renderTreeItem(node))}
            </div>
          )}

          {viewMode === ViewMode.GRID && renderGridView()}

          {viewMode === ViewMode.TABLE && (
            <div className="glass rounded-[48px] border dark:border-white/5 overflow-hidden shadow-2xl relative">
              <div className="overflow-x-auto min-h-[500px]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 dark:border-white/5">
                      <th className="px-8 py-8">Identity</th>
                      <th className="px-8 py-8">Taxonomy</th>
                      <th className="px-8 py-8 text-center">SKU Density</th>
                      <th className="px-8 py-8 text-right">Yield</th>
                      <th className="px-8 py-8">Logic Status</th>
                      <th className="px-8 py-8 text-center">Operation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredCategories.map((c) => (
                      <tr key={c.id} className="group hover:bg-white/90 dark:hover:bg-white/5 transition-all">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-blue-500 border border-slate-200 dark:border-white/10">
                              <Folder size={18} />
                            </div>
                            <div className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{c.name}</div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-800/30">
                            {c.type}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="text-sm font-black text-slate-800 dark:text-white">{c.recursiveProductCount}</div>
                          <div className="text-[8px] text-slate-400 font-bold uppercase">Active Nodes</div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="text-sm font-black text-emerald-500 font-mono">${c.revenue.toLocaleString()}</div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(c.status)}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => setSelectedCategory(c)} className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-blue-600 transition-all"><Eye size={18} /></button>
                            <button className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-amber-500 transition-all"><Edit2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {viewMode === ViewMode.ANALYTICS && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-700">
              <div className="glass p-10 rounded-[48px] border dark:border-white/5 h-[450px]">
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-10 flex items-center gap-3">
                  <TrendingUp size={18} className="text-emerald-500" /> Revenue Distribution per Node
                </h3>
                <div className="h-full pb-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categories}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(203, 213, 225, 0.2)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }} />
                      <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="revenue" radius={[10, 10, 10, 10]} barSize={40}>
                        {categories.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="glass p-10 rounded-[48px] border dark:border-white/5 h-[400px]">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-10 flex items-center gap-3">
                    <Target size={18} className="text-blue-500" /> Asset Concentration
                  </h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categories} innerRadius={60} outerRadius={100} paddingAngle={8} dataKey="productCount" stroke="none">
                        {categories.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="glass p-10 rounded-[48px] border dark:border-white/5 h-[400px]">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-10 flex items-center gap-3">
                    <Calculator size={18} className="text-indigo-500" /> Efficiency Matrix
                  </h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(203, 213, 225, 0.2)" />
                      <XAxis type="number" dataKey="revenue" name="Revenue" unit="$" />
                      <YAxis type="number" dataKey="margin" name="Margin" unit="%" />
                      <ZAxis type="number" dataKey="productCount" range={[100, 1000]} name="Products" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Categories" data={categories} fill="#3B82F6" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Detailed Intelligence Profile */}
        <div className="lg:col-span-4 space-y-10">
          <div className="glass p-8 rounded-[48px] border dark:border-white/5 h-full sticky top-24">
            {selectedCategory ? (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-[28px] flex items-center justify-center text-white shadow-2xl group transition-transform" style={{ backgroundColor: selectedCategory.color }}>
                    <Folder size={32} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{selectedCategory.name}</h2>
                      <button className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-blue-500 transition-all"><Settings size={18} /></button>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">LOGIC_NODE: #{selectedCategory.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 rounded-[32px] bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                    <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">Gross Yield</p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">${selectedCategory.revenue.toLocaleString()}</p>
                  </div>
                  <div className="p-6 rounded-[32px] bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
                    <p className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-1">Profit Index</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">{selectedCategory.margin}%</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={16} className="text-blue-500" /> Compliance Protocols
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Regulatory Class</span>
                      <span className="text-[10px] font-black text-slate-800 dark:text-white">{selectedCategory.attributes.regulatory || 'STANDARD'}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Storage Requirement</span>
                      <span className="text-[10px] font-black text-slate-800 dark:text-white">ROOM TEMP</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <History size={16} className="text-indigo-500" /> Node History
                  </h3>
                  <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-slate-100 dark:before:bg-white/5">
                    {[
                      { a: 'Node Created', t: '12 Jan 2024', u: ' Thompson' },
                      { a: 'Ruleset Applied', t: '15 Jan 2024', u: ' System' },
                      { a: 'Yield Synchronized', t: 'Today', u: ' Auto' }
                    ].map((h, i) => (
                      <div key={i} className="relative pl-10">
                        <div className="absolute left-0 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border-4 border-blue-500/20 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        </div>
                        <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase">{h.a}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{h.t} • AUTH: {h.u}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-10 flex gap-4">
                  <button className="flex-1 py-4 rounded-3xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">Edit Logic</button>
                  <button className="p-4 rounded-3xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[600px] text-center space-y-6 opacity-50">
                <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-300">
                  <MousePointer2 size={48} className="animate-bounce" />
                </div>
                <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Select Logic Node</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-[200px]">Initialize profile telemetry by selecting a category node from the main hub.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Category Registration Wizard Drawer */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end p-0 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-500">
          <div className="glass w-full max-w-4xl h-full bg-white dark:bg-slate-900 shadow-2xl border-l dark:border-white/10 overflow-hidden flex flex-col animate-in slide-in-from-right-full duration-700">
            <div className="p-10 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-[24px] flex items-center justify-center text-white shadow-2xl">
                  <Plus size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">New Logic Node</h2>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Step {activeTab} of 5 • Classification Protocol</p>
                </div>
              </div>
              <button onClick={() => setIsAdding(false)} className="p-4 rounded-[24px] bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 transition-all"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-12">
              {/* Stepper Header */}
              <div className="flex items-center gap-3 mb-16">
                {['Primary', 'Logic', 'Rules', 'Output', 'Review'].map((s, i) => (
                  <div key={s} className="flex-1">
                    <div className={`h-2 rounded-full mb-3 transition-all duration-700 ${i + 1 <= activeTab ? 'bg-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-100 dark:bg-white/5'}`}></div>
                    <p className={`text-[8px] font-black uppercase tracking-widest text-center ${i + 1 === activeTab ? 'text-blue-600' : 'text-slate-400'}`}>{s}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-500">
                {activeTab === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Node Identifier Name</label>
                      <input type="text" placeholder="e.g. Oncology Support" className="w-full px-8 py-5 rounded-3xl border border-slate-200 dark:border-white/10 dark:bg-slate-800/50 outline-none focus:border-blue-500 transition-all text-sm font-bold dark:text-white" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Terminal</label>
                      <select className="w-full px-8 py-5 rounded-3xl border border-slate-200 dark:border-white/10 dark:bg-slate-800/50 outline-none focus:border-blue-500 transition-all text-sm font-bold dark:text-white appearance-none cursor-pointer">
                        <option>Pharmaceuticals (Root)</option>
                        <option>Wellness & OTC (Root)</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Functional Description</label>
                      <textarea rows={4} placeholder="Describe the operational scope of this category node..." className="w-full px-8 py-5 rounded-3xl border border-slate-200 dark:border-white/10 dark:bg-slate-800/50 outline-none focus:border-blue-500 transition-all text-sm font-bold dark:text-white resize-none" />
                    </div>
                  </div>
                )}

                {activeTab > 1 && (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[32px] flex items-center justify-center text-blue-600 mb-8">
                      <RefreshCw size={40} className="animate-spin-slow" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Calibrating Module {activeTab}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 max-w-[300px]">Preparing data synchronization protocols for multi-dimensional classification.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-10 border-t border-slate-100 dark:border-white/5 shrink-0 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={() => activeTab > 1 ? setActiveTab(t => t - 1) : setIsAdding(false)}
                className="px-10 py-5 rounded-[32px] border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
              >
                {activeTab === 1 ? 'Abort Signal' : 'Reverse Logic'}
              </button>
              <button
                onClick={() => activeTab < 5 ? setActiveTab(t => t + 1) : setIsAdding(false)}
                className="px-12 py-5 rounded-[32px] bg-blue-600 text-white text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 group/next"
              >
                {activeTab === 5 ? 'Commit Registry' : 'Proceed Sequence'}
                <ArrowRight size={18} className="group-hover/next:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .animate-spin-slow { animation: spin 4s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const MousePointer2 = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
    <path d="m13 13 6 6"></path>
  </svg>
);

export default CategoriesManagement;
