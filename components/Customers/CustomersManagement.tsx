
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, ChevronRight, Phone, Calendar, ShoppingBag, 
  DollarSign, Eye, ArrowLeft, Package, Clock, CheckCircle2, 
  History, User, MapPin, Mail, ExternalLink, Filter, ShoppingCart
} from 'lucide-react';
import { Order } from '../../types';

interface Customer {
  customer_phone: string;
  customer_name: string;
  total_orders: number;
  total_spent: number;
  last_order_date: string;
}

interface CustomersManagementProps {
  initialSearch: string;
}

const CustomersManagement: React.FC<CustomersManagementProps> = ({ initialSearch }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  // --- Fetch Customers ---
  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/admin/customers');
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Fetch Customer History ---
  const fetchCustomerHistory = async (phone: string) => {
    try {
      const res = await fetch('/api/admin/orders');
      const data: Order[] = await res.json();
      // Filter orders by phone
      const history = data.filter(o => o.customerPhone === phone || (o as any).customer_phone === phone);
      setCustomerOrders(history);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerHistory(selectedCustomer.customer_phone);
    }
  }, [selectedCustomer]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.customer_phone.includes(searchTerm) || 
      c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Users size={20} />
            </div>
            {selectedCustomer ? 'Customer Profile' : 'Customers & History'}
          </h1>
          <nav className="flex items-center gap-2 mt-2 ml-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600" onClick={() => setSelectedCustomer(null)}>Directory</span>
            {selectedCustomer && (
              <>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">+{selectedCustomer.customer_phone}</span>
              </>
            )}
          </nav>
        </div>

        {selectedCustomer && (
          <button 
            onClick={() => setSelectedCustomer(null)}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm"
          >
            <ArrowLeft size={14} /> Back to Directory
          </button>
        )}
      </div>

      {!selectedCustomer ? (
        <>
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-[32px] border dark:border-white/5 flex items-center gap-6">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600">
                <Users size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Active Users</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">{customers.length}</p>
              </div>
            </div>
            <div className="glass p-6 rounded-[32px] border dark:border-white/5 flex items-center gap-6">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lifetime Revenue</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">
                  Rs. {customers.reduce((sum, c) => sum + c.total_spent, 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="glass p-6 rounded-[32px] border dark:border-white/5 flex items-center gap-6">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600">
                <ShoppingBag size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Orders Placed</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">
                  {customers.reduce((sum, c) => sum + c.total_orders, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="relative group max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white dark:bg-slate-900 border dark:border-white/10 outline-none focus:ring-2 ring-blue-500/20 transition-all text-sm font-bold dark:text-white shadow-sm"
            />
          </div>

          {/* Customers Table */}
          <div className="glass rounded-[40px] border dark:border-white/5 overflow-hidden shadow-xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">
                  <th className="px-8 py-6">Customer Identification</th>
                  <th className="px-8 py-6 text-center">Orders</th>
                  <th className="px-8 py-6 text-right">Total Spent</th>
                  <th className="px-8 py-6">Last Activity</th>
                  <th className="px-8 py-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredCustomers.map((c) => (
                  <tr key={c.customer_phone} className="group hover:bg-white dark:hover:bg-white/5 transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 font-bold text-sm group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          {c.customer_name?.charAt(0) || <Phone size={14} />}
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{c.customer_name || 'Anonymous User'}</div>
                          <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 mt-1">
                            <Phone size={10} /> +{c.customer_phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="inline-flex px-3 py-1 bg-slate-100 dark:bg-blue-900/20 text-slate-600 dark:text-blue-400 rounded-lg text-[10px] font-black">
                        {c.total_orders} ORDERS
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="text-sm font-black text-slate-800 dark:text-white font-mono">Rs. {c.total_spent.toLocaleString()}</div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">
                          {new Date(c.last_order_date).toLocaleDateString()}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                          {new Date(c.last_order_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => setSelectedCustomer(c)}
                        className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-white transition-all"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Customer Profile Card */}
          <div className="xl:col-span-1 space-y-6">
            <div className="glass p-10 rounded-[40px] border dark:border-white/5 shadow-xl sticky top-24">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-blue-600 rounded-[30px] flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-blue-500/30 mb-6">
                  {selectedCustomer.customer_name?.charAt(0) || <User size={32} />}
                </div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{selectedCustomer.customer_name || 'Anonymous User'}</h2>
                <p className="text-sm font-bold text-blue-600 mt-1">+{selectedCustomer.customer_phone}</p>
                
                <div className="grid grid-cols-2 gap-4 w-full mt-10">
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border dark:border-white/5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Spent</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white mt-1">Rs. {selectedCustomer.total_spent.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border dark:border-white/5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Orders</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white mt-1">{selectedCustomer.total_orders}</p>
                  </div>
                </div>

                <div className="w-full mt-8 pt-8 border-t border-slate-100 dark:border-white/5 space-y-4">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-10 h-10 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-400">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Delivery Channel</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-white uppercase mt-0.5">WhatsApp Interactive</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-10 h-10 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-400">
                      <Phone size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Phone</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-white uppercase mt-0.5">+{selectedCustomer.customer_phone}</p>
                    </div>
                  </div>
                </div>

                <button className="w-full mt-10 py-4.5 bg-slate-900 dark:bg-blue-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Send WhatsApp Broadcast
                </button>
              </div>
            </div>
          </div>

          {/* History / Orders */}
          <div className="xl:col-span-2 space-y-8">
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
              <History size={20} className="text-blue-600" /> Complete Order History
            </h3>

            {customerOrders.length === 0 ? (
              <div className="glass p-20 rounded-[40px] border dark:border-white/5 text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-6">
                  <ShoppingCart size={32} />
                </div>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">No order logs found for this entity.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {customerOrders.map((order, idx) => (
                  <div key={order.id} className="glass rounded-[40px] border dark:border-white/5 hover:border-blue-500/30 transition-all overflow-hidden shadow-lg group">
                    <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white dark:bg-blue-900/20 border dark:border-white/10 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <Package size={24} />
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Order #{order.id}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 flex items-center gap-2">
                             <Calendar size={12} /> {new Date(order.date || (order as any).created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount</p>
                          <p className="text-lg font-black text-emerald-600 font-mono">Rs. {order.amount.toLocaleString()}</p>
                        </div>
                        <div className={`px-4 py-2 rounded-2xl border text-[9px] font-black uppercase tracking-widest ${
                          order.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          order.status === 'Cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {order.status}
                        </div>
                        <button 
                          onClick={() => setViewingOrder(order)}
                          className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-blue-600"
                        >
                          <ChevronRight size={24} />
                        </button>
                      </div>
                    </div>

                    {/* Quick Item Preview */}
                    <div className="px-8 pb-8 flex flex-wrap gap-2">
                      {order.items?.map((item: any, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl text-[9px] font-bold text-slate-600 dark:text-slate-400 border dark:border-white/5">
                          {item.quantity}x {item.product_name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal - Full Receipt View */}
      {viewingOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl border dark:border-white/10 overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Digital Receipt</h2>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">#{viewingOrder.id} • Verified Logic Node</p>
              </div>
              <button onClick={() => setViewingOrder(null)} className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 transition-all"><X size={24} /></button>
            </div>

            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-white/5 pb-8">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Recipient Entity</p>
                  <p className="text-lg font-black text-slate-800 dark:text-white leading-tight uppercase tracking-tight">{viewingOrder.customerName}</p>
                  <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-2"><Phone size={12} /> +{viewingOrder.customerPhone || (viewingOrder as any).customer_phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dispatch Timestamp</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-white uppercase">{new Date(viewingOrder.date).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-4"><Package size={14} /> Itemized Breakdown</p>
                <div className="space-y-3">
                  {viewingOrder.items.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border dark:border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-800 dark:text-white font-black text-[10px]">
                          {item.quantity}x
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{item.product_name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Unit: Rs. {item.unit_price || item.price}</p>
                        </div>
                      </div>
                      <p className="text-xs font-black text-slate-800 dark:text-white font-mono">Rs. {(item.subtotal || (item.quantity * item.price)).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 dark:border-white/5 space-y-4">
                 <div className="flex justify-between items-center px-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Valuation</span>
                    <span className="text-lg font-black text-slate-800 dark:text-white font-mono">Rs. {viewingOrder.amount.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center px-4 py-6 bg-blue-600 rounded-[28px] text-white shadow-xl">
                    <span className="text-xs font-black uppercase tracking-widest">Net Payable (COD)</span>
                    <span className="text-2xl font-black font-mono">Rs. {viewingOrder.amount.toLocaleString()}</span>
                 </div>
              </div>

              <div className="p-6 bg-slate-100 dark:bg-white/5 rounded-[30px] border dark:border-white/5">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><MapPin size={12} /> Delivery Node</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-100 leading-relaxed uppercase tracking-tight">
                  {(viewingOrder as any).delivery_address || 'Sector 45, Industrial Hub, Karachi, PK'}
                </p>
              </div>
            </div>

            <div className="p-8 bg-slate-50 dark:bg-white/5 border-t dark:border-white/10 flex gap-4">
              <button className="flex-1 py-4.5 rounded-3xl border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-white transition-all transition-all flex items-center justify-center gap-2">
                <History size={16} /> Print Audit
              </button>
              <button className="flex-1 py-4.5 rounded-3xl bg-slate-900 dark:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <ExternalLink size={16} /> Export JSON
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

    </div>
  );
};

const X = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

export default CustomersManagement;
