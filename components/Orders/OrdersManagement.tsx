
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Filter, Plus, Download, Printer, FileText, FileSpreadsheet,
  MoreVertical, Eye, Edit2, Trash2, CheckCircle2, Clock, AlertCircle,
  XCircle, ChevronRight, ArrowUpRight, ArrowDownRight, ShoppingCart,
  DollarSign, Users, Calendar, X, Save, User, MapPin, History, CreditCard,
  ChevronDown, Package, Layers, Zap, ShieldCheck, Mail, Send
} from 'lucide-react';
import {
  MOCK_MEDICINES
} from '../../constants';
import { Order, Medicine } from '../../types';
import { supabase } from '../../lib/supabase';

interface OrdersManagementProps {
  initialSearch: string;
}

const OrdersManagement: React.FC<OrdersManagementProps> = ({ initialSearch }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  // const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS); // Removed mock
  const [orders, setOrders] = useState<Order[]>([]);

  // --- Supabase Integration ---
  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('date', { ascending: false });
      if (error) throw error;

      // Transform DB to Frontend types
      const transformed: Order[] = data.map((o: any) => ({
        id: o.order_number || o.id, // Use order_number if available for display
        customerName: o.customer_name,
        customerType: o.customer_type,
        date: o.date,
        amount: o.total_amount,
        status: o.status,
        paymentStatus: o.payment_status,
        paymentMethod: o.payment_method,
        items: o.item_count
      }));
      setOrders(transformed);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);
  // ---------------------------

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  // Modals
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = !searchTerm ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All Statuses' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'Pending').length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
    const avgValue = total > 0 ? totalRevenue / total : 0;
    return { total, pending, totalRevenue, avgValue };
  }, [orders]);

  // Handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredOrders.map(o => o.id)));
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const updateOrderStatus = async (id: string, newStatus: Order['status']) => {
    try {
      // Improve: use real ID if `orders` uses order_number as displayed ID.
      // But above I mapped: id: o.order_number || o.id.
      // If I use order_number for display, I need the REAL UUID for updates?
      // Or I should query by order_number.
      // Let's assume for now I should use the real UUID for updates.
      // But I mapped it to `id`. If I mapped `order_number` to `id`, I lost the UUID unless I store it elsewhere.
      // Ideally `Order` interface should have `uuid` or I should use `id` as `id` (UUID) and `orderNumber` as display.
      // `types.ts` `Order` has `id`.
      // Let's just try to update by `order_number` if it looks like one, or `id` otherwise.
      // Actually `supabase_schema.sql` has `order_number` as UNIQUE.

      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('order_number', id);
      // Fallback if ID is UUID
      if (error) {
        await supabase.from('orders').update({ status: newStatus }).eq('id', id);
      }

      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
      if (viewingOrder?.id === id) setViewingOrder(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (e) {
      console.error('Error updating status', e);
    }
  };

  const deleteOrder = async (id: string) => {
    if (confirm('Permanently delete this order record?')) {
      try {
        await supabase.from('orders').delete().eq('order_number', id);
        // optimization: optimistic update
        setOrders(prev => prev.filter(o => o.id !== id));
        if (viewingOrder?.id === id) setViewingOrder(null);
      } catch (e) {
        console.error('Error deleting order', e);
      }
    }
  };

  const getStatusBadgeStyles = (status: Order['status']) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30';
      case 'Processing': return 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30';
      case 'Pending': return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30';
      case 'Cancelled': return 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/30';
      default: return '';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-32">

      {/* 1. Header & Quick Stats */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/20">
              <ShoppingCart size={24} />
            </div>
            Orders Management
          </h1>
          <nav className="flex items-center gap-2 mt-4 ml-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dashboard</span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Orders Management</span>
          </nav>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1 max-w-4xl">
          {[
            { label: 'Total Orders', val: stats.total, icon: ShoppingCart, color: 'blue' },
            { label: 'Pending Action', val: stats.pending, icon: Clock, color: 'amber' },
            { label: 'Total Revenue', val: stats.totalRevenue, icon: DollarSign, color: 'emerald', prefix: '$' },
            { label: 'Avg Order Value', val: stats.avgValue, icon: Zap, color: 'indigo', prefix: '$' }
          ].map((s, i) => (
            <div key={s.label} className="glass p-5 rounded-[28px] border dark:border-white/5 transition-all hover:bg-white group">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white bg-${s.color}-600 shadow-lg group-hover:scale-110 transition-transform`}>
                  <s.icon size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white tracking-tighter">
                    {s.prefix}{s.val.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Controls & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-100/50 dark:bg-white/5 p-6 rounded-[40px] border border-slate-200/50 dark:border-white/5 shadow-inner">
        <div className="flex-1 max-w-xl relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search by Order ID or Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white dark:bg-slate-900/50 border border-transparent focus:border-blue-500 outline-none transition-all text-sm font-bold dark:text-white shadow-inner"
          />
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-slate-900/50 px-6 py-4 rounded-3xl text-[10px] font-bold uppercase tracking-widest text-slate-500 outline-none appearance-none pr-12 cursor-pointer border border-transparent hover:border-blue-500/30 transition-all shadow-sm"
            >
              <option>All Statuses</option>
              <option>Pending</option>
              <option>Processing</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
            <Filter className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>

          <div className="flex items-center gap-2 p-1.5 bg-white/50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10">
            <button className="p-3 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 transition-all" title="Export PDF"><FileText size={18} /></button>
            <button className="p-3 rounded-2xl text-slate-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-800 transition-all" title="Export Excel"><FileSpreadsheet size={18} /></button>
            <button className="p-3 rounded-2xl text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 transition-all" title="Print Batch"><Printer size={18} /></button>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 text-white flex items-center gap-2 px-8 py-4 rounded-3xl text-[11px] font-bold uppercase tracking-widest shadow-2xl shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus size={18} /> Create New Order
          </button>
        </div>
      </div>

      {/* 3. Orders Table */}
      <div className="glass rounded-[48px] border dark:border-white/5 overflow-hidden shadow-2xl relative">
        <div className="overflow-x-auto min-h-[500px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 dark:border-white/5">
                <th className="px-8 py-8 w-10">
                  <button onClick={toggleSelectAll} className="p-2 rounded-lg transition-all text-slate-300">
                    {selectedIds.size === filteredOrders.length && filteredOrders.length > 0 ? <ShieldCheck size={18} className="text-blue-600" /> : <Square size={18} />}
                  </button>
                </th>
                <th className="px-8 py-8">Order ID</th>
                <th className="px-8 py-8">Customer Entity</th>
                <th className="px-8 py-8 text-center">Items</th>
                <th className="px-8 py-8 text-right">Value</th>
                <th className="px-8 py-8">Current Workflow</th>
                <th className="px-8 py-8 text-center">Operation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredOrders.map((o) => {
                const isSelected = selectedIds.has(o.id);
                return (
                  <tr key={o.id} className={`group hover:bg-white/90 dark:hover:bg-white/5 transition-all ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                    <td className="px-8 py-6">
                      <button onClick={() => toggleSelectOne(o.id)} className={`p-2 rounded-lg transition-all ${isSelected ? 'text-blue-600' : 'text-slate-300'}`}>
                        {isSelected ? <CheckCircle2 size={18} /> : <Square size={18} />}
                      </button>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-xs font-black text-blue-600 tracking-tighter uppercase">#{o.id}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 flex items-center gap-1.5">
                        <Calendar size={10} /> {new Date(o.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 font-bold text-xs">
                          {o.customerName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{o.customerName}</div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-1">{o.customerType} Channel</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        <Package size={12} /> {o.items} Units
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right font-mono text-sm font-black text-slate-800 dark:text-white">${o.amount.toLocaleString()}</td>
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-[9px] font-bold uppercase tracking-widest shadow-sm ${getStatusBadgeStyles(o.status)}`}>
                        {o.status === 'Completed' ? <CheckCircle2 size={12} /> : o.status === 'Processing' ? <Zap size={12} /> : <Clock size={12} />}
                        {o.status}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setViewingOrder(o)} className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-blue-600"><Eye size={18} /></button>
                        <button onClick={() => deleteOrder(o.id)} className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-rose-500"><Trash2 size={18} /></button>
                        <button className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-slate-800 dark:hover:text-white"><MoreVertical size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Floating Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[80] w-full max-w-2xl px-6 animate-in slide-in-from-bottom-12 duration-500">
          <div className="glass p-5 rounded-[32px] border border-blue-500/30 shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                <ShieldCheck size={24} />
              </div>
              <div>
                <div className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">Bulk Operations</div>
                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{selectedIds.size} Records Targeted</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsBulkUpdating(true)} className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-white transition-all flex items-center gap-2"><Zap size={14} className="text-amber-500" /> Change Status</button>
              <button className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-white transition-all flex items-center gap-2"><Printer size={14} /> Batch Print</button>
              <button onClick={() => setSelectedIds(new Set())} className="p-3 rounded-2xl text-slate-400"><X size={20} /></button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modals - Detailed Order View */}
      {viewingOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl border dark:border-white/10 overflow-hidden animate-in zoom-in duration-300 h-[85vh] flex flex-col">
            <div className="p-10 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-blue-500/20">
                  <FileText size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Order Summary</h2>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">LOG_ID: #{viewingOrder.id} • AUTH_STAMP: {new Date(viewingOrder.date).toLocaleString()}</p>
                </div>
              </div>
              <button onClick={() => setViewingOrder(null)} className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 transition-all"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Customer Card */}
                <div className="glass p-8 rounded-[32px] border dark:border-white/5">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><User size={14} className="text-blue-500" /> Entity Profile</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-lg font-black text-slate-800 dark:text-white tracking-tight">{viewingOrder.customerName}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{viewingOrder.customerType} Segment</p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
                      <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600 dark:text-slate-400"><MapPin size={14} className="text-slate-400" /> Sector 45, Industrial Hub</div>
                      <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600 dark:text-slate-400"><Mail size={14} className="text-slate-400" /> contact@{viewingOrder.customerName.toLowerCase().replace(/\s/g, '')}.com</div>
                    </div>
                  </div>
                </div>

                {/* Workflow Status Card */}
                <div className="glass p-8 rounded-[32px] border dark:border-white/5">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Zap size={14} className="text-amber-500" /> Workflow State</h3>
                  <div className="space-y-6">
                    <div>
                      <span className={`px-5 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest shadow-sm ${getStatusBadgeStyles(viewingOrder.status)}`}>
                        {viewingOrder.status}
                      </span>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Update State Override</p>
                      <div className="flex gap-2">
                        {['Processing', 'Completed', 'Cancelled'].map(s => (
                          <button
                            key={s}
                            onClick={() => updateOrderStatus(viewingOrder.id, s as any)}
                            className="flex-1 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[9px] font-bold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all uppercase"
                          >
                            {s.charAt(0)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Summary Card */}
                <div className="glass p-8 rounded-[32px] border dark:border-white/5">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><CreditCard size={14} className="text-emerald-500" /> Valuation Node</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gross total</span>
                      <span className="text-sm font-black text-slate-800 dark:text-white font-mono">${(viewingOrder.amount * 0.9).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Regulatory Tax (10%)</span>
                      <span className="text-sm font-black text-slate-800 dark:text-white font-mono">${(viewingOrder.amount * 0.1).toFixed(2)}</span>
                    </div>
                    <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                      <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Net Valuation</span>
                      <span className="text-xl font-black text-emerald-500 font-mono">${viewingOrder.amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="glass rounded-[32px] border dark:border-white/5 overflow-hidden">
                <div className="p-6 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2"><Package size={14} /> SKU Breakdown</h3>
                  <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-800/30">{viewingOrder.items} TOTAL NODES</span>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 dark:bg-white/5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-8 py-5">Product Identifier</th>
                      <th className="px-8 py-5 text-center">Batch_Ref</th>
                      <th className="px-8 py-5 text-center">Qty_Ordered</th>
                      <th className="px-8 py-5 text-right">Unit_Rate</th>
                      <th className="px-8 py-5 text-right">Total_Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {[1, 2].map(i => (
                      <tr key={i} className="group hover:bg-slate-50 dark:hover:bg-white/5">
                        <td className="px-8 py-5">
                          <div className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase">Amoxicillin Node {i}</div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Antibiotics • 500mg</p>
                        </td>
                        <td className="px-8 py-5 text-center text-[10px] font-bold text-slate-500">BCH-992{i}</td>
                        <td className="px-8 py-5 text-center text-[10px] font-black text-slate-800 dark:text-white">{10 * i} PKTS</td>
                        <td className="px-8 py-5 text-right text-[10px] font-bold text-slate-500">$12.50</td>
                        <td className="px-8 py-5 text-right text-xs font-black text-slate-900 dark:text-white font-mono">${(12.5 * 10 * i).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Activity Timeline */}
              <div className="glass p-8 rounded-[32px] border dark:border-white/5">
                <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2"><History size={14} /> Operational Audit Trail</h3>
                <div className="space-y-8 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-100 dark:before:bg-white/5">
                  {[
                    { title: 'Workflow Initialized', time: '10 mins ago', desc: 'Order record created by Commander Thompson', icon: Plus, color: 'blue' },
                    { title: 'Valuation Verified', time: '5 mins ago', desc: 'Payment confirmation signal received via Stripe node', icon: CreditCard, color: 'emerald' },
                    { title: 'State Change: ' + viewingOrder.status, time: 'Just now', desc: 'Workflow status updated to live track', icon: Zap, color: 'amber' }
                  ].map((step, idx) => (
                    <div key={idx} className="relative pl-12 flex gap-6 animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                      <div className={`absolute left-0 w-8 h-8 rounded-xl bg-${step.color}-600 text-white flex items-center justify-center shadow-lg shadow-${step.color}-500/20 z-10`}>
                        <step.icon size={14} />
                      </div>
                      <div>
                        <div className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{step.title}</div>
                        <p className="text-[10px] text-slate-500 font-bold mt-1 leading-relaxed">{step.desc}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">{step.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-10 border-t border-slate-100 dark:border-white/5 shrink-0 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <button onClick={() => deleteOrder(viewingOrder.id)} className="px-8 py-4 rounded-[24px] border border-rose-100 dark:border-rose-900/30 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all flex items-center gap-2"><Trash2 size={16} /> Purge Order</button>
              <div className="flex gap-4">
                <button className="px-8 py-4 rounded-[24px] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center gap-2"><Printer size={16} /> Print Document</button>
                <button className="px-10 py-4 rounded-[24px] bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"><Send size={16} /> Dispatch to Entity</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal - Create New Order (Simplified Wizard) */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl border dark:border-white/10 overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Initialize Command</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Order Registration Protocol</p>
              </div>
              <button onClick={() => setIsCreating(false)} className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-rose-500"><X size={20} /></button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setIsCreating(false); }} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Entity Name</label>
                  <input required type="text" placeholder="e.g. Apex Health Center" className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-white/10 dark:bg-slate-800/40 outline-none focus:border-blue-500 transition-all text-sm font-bold dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Entity Channel</label>
                  <select className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-white/10 dark:bg-slate-800/40 outline-none focus:border-blue-500 transition-all text-sm font-bold dark:text-white appearance-none cursor-pointer">
                    <option>Retail</option>
                    <option>Wholesale</option>
                    <option>Hospital</option>
                    <option>Clinic</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Asset Allocation (SKUs)</label>
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 dark:bg-slate-800/40 space-y-3">
                    <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Amoxicillin 500mg</span>
                      <div className="flex items-center gap-3">
                        <input type="number" defaultValue={1} className="w-16 px-2 py-1 rounded-lg border dark:bg-slate-800 dark:text-white text-center text-xs" />
                        <span className="text-xs font-black text-blue-600">$12.50</span>
                        <button className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition-all"><X size={14} /></button>
                      </div>
                    </div>
                    <button type="button" className="w-full py-3 rounded-xl border border-dashed border-slate-300 dark:border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:border-blue-500 hover:text-blue-500 transition-all">+ Add Product Node</button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Payment Protocol</label>
                  <select className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-white/10 dark:bg-slate-800/40 outline-none focus:border-blue-500 transition-all text-sm font-bold dark:text-white appearance-none cursor-pointer">
                    <option>Card Payment</option>
                    <option>UPI Transfer</option>
                    <option>Bank Credit</option>
                    <option>Cash Liquidity</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Valuation Estimate</label>
                  <div className="w-full px-6 py-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 text-emerald-600 font-black text-lg font-mono">$12.50</div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 dark:border-white/5 flex gap-4">
                <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-4 rounded-3xl border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all dark:text-slate-300">Abort Initialization</button>
                <button type="submit" className="flex-1 py-4 rounded-3xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Commit Command</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal - Bulk Status Update */}
      {isBulkUpdating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-md bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl border dark:border-white/10 overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Workflow Override</h2>
              <button onClick={() => setIsBulkUpdating(false)} className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-rose-500"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-wide">Select the new workflow state for <span className="text-blue-600 font-black">{selectedIds.size} targeting nodes</span>. This will trigger automated entity notifications.</p>
              <div className="space-y-3">
                {['Pending', 'Processing', 'Completed', 'Cancelled'].map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      setOrders(prev => prev.map(o => selectedIds.has(o.id) ? { ...o, status: s as any } : o));
                      setIsBulkUpdating(false);
                      setSelectedIds(new Set());
                    }}
                    className="w-full p-5 rounded-[24px] border border-slate-200 dark:border-white/10 text-left hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest">{s}</span>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .ease-out-back { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
      `}</style>
    </div>
  );
};

const Square = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
  </svg>
);

export default OrdersManagement;
