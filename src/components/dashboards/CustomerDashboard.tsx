import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Filter, History, MapPin, 
  Settings, LogOut, Ticket as TicketIcon, Clock, 
  CheckCircle2, AlertCircle, ChevronRight, X, Loader2, ShoppingBag,
  ShoppingCart, Minus, Trash2
} from 'lucide-react';
import { cn, getStatusColor, formatDate } from '../../lib/utils';
import { type Ticket, getTickets, createTicket, createOrder, type Product } from '../../lib/supabase';
import toast from 'react-hot-toast';
import PurchaseHistory from './PurchaseHistory';
import StoreView from './StoreView';

const COMPLAINT_OPTIONS = [
  'Not Cooling',
  'Water Leakage',
  'Unusual Noise',
  'Foul Smell',
  'Remote Not Working',
  'Gas Refilling',
  'General Servicing',
  'Others'
];

export default function CustomerDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'tickets' | 'history' | 'store' | 'settings'>('tickets');
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState('');
  const [customComplaint, setCustomComplaint] = useState('');

  // Cart State
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // New Ticket Form State
  const [newTicket, setNewTicket] = useState({
    ac_type: 'Split AC' as Ticket['ac_type'],
    priority: 'Medium' as Ticket['priority'],
    address: profile?.name ? `Service for ${profile.name}` : '',
    latitude: 0,
    longitude: 0,
    brand: ''
  });

  const fetchTickets = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const data = await getTickets(profile.id, 'customer');
      setTickets(data);
    } catch (error: any) {
      console.error('Fetch Error:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tickets') {
      fetchTickets();
    }
  }, [profile, activeTab]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const finalComplaint = selectedComplaint === 'Others' ? customComplaint : selectedComplaint;

    if (!finalComplaint || !newTicket.address) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setCreating(true);
      await createTicket({
        ...newTicket,
        complaint: finalComplaint,
        customer_id: profile.id
      });
      toast.success('Ticket created successfully!');
      setIsNewTicketOpen(false);
      setSelectedComplaint('');
      setCustomComplaint('');
      setNewTicket({
        ac_type: 'Split AC',
        priority: 'Medium',
        address: profile?.name ? `Service for ${profile.name}` : '',
        latitude: 0,
        longitude: 0,
        brand: ''
      });
      fetchTickets();
    } catch (error: any) {
      console.error('Create Error:', error);
      toast.error(error.message || 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`${product.name} added to cart`, {
      icon: '🛒',
      position: 'bottom-right'
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleCheckout = async () => {
    if (!profile || cart.length === 0) return;

    try {
      setIsCheckingOut(true);
      const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      
      await createOrder({
        customer_id: profile.id,
        total_amount: totalAmount,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
          name: item.product.name
        }))
      });

      toast.success('Order placed successfully!');
      setCart([]);
      setIsCartOpen(false);
      setActiveTab('history');
    } catch (error: any) {
      console.error('Checkout Error:', error);
      toast.error('Failed to place order');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredTickets = tickets.filter(t => {
    if (filter === 'All') return true;
    if (filter === 'Active') return !['Completed', 'Cancelled'].includes(t.status);
    return t.status === filter;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30">
        <div className="flex justify-between items-center">
          <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">AIRMATRIX</h1>
            <p className="text-[10px] text-slate-500 font-bold">Hello, {profile?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2.5 bg-slate-50 rounded-xl text-slate-400 relative">
              <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-white" />
              <Clock size={18} />
            </button>
            <button onClick={() => signOut()} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 active:scale-90 transition-all flex-shrink-0">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4 lg:p-6 lg:space-y-6">
        {activeTab === 'tickets' && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg shadow-blue-100">
                <div className="bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center mb-2">
                  <Clock size={14} />
                </div>
                <p className="text-[8px] text-blue-100 uppercase font-black tracking-widest">Active Requests</p>
                <p className="text-lg font-black">{tickets.filter(t => !['Completed', 'Cancelled'].includes(t.status)).length}</p>
              </div>
              <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-lg shadow-slate-100">
                <div className="bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center mb-2">
                  <CheckCircle2 size={14} />
                </div>
                <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Completed Jobs</p>
                <p className="text-lg font-black">{tickets.filter(t => t.status === 'Completed').length}</p>
              </div>
            </div>

            {/* Filter & Search */}
            <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
              {['All', 'New', 'Active', 'Completed'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={cn(
                    "px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all",
                    filter === tab ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "bg-white text-slate-500 border border-slate-200"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Ticket List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Your Tickets</h3>
                {loading && <Loader2 size={16} className="animate-spin text-blue-600" />}
              </div>
              
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                  <Loader2 size={32} className="animate-spin" />
                  <p className="text-sm font-medium">Fetching tickets...</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="bg-white rounded-[32px] p-10 border border-slate-200 border-dashed text-center">
                  <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <TicketIcon size={24} className="text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium mb-1">No tickets found</p>
                  <p className="text-xs text-slate-400 italic">Create your first service request to get started</p>
                </div>
              ) : (
                filteredTickets.map((ticket, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={ticket.id}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border", getStatusColor(ticket.status))}>
                        {ticket.status}
                      </div>
                      <div className="flex items-center text-slate-400 gap-1.5 text-[8px] font-bold">
                        <Clock size={10} />
                        {formatDate(ticket.created_at)}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{ticket.ac_type} Maintenance</h4>
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 font-medium">{ticket.complaint}</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                         <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                            <AlertCircle size={10} className={cn(
                              ticket.priority === 'High' || ticket.priority === 'Emergency' ? "text-red-500" : "text-amber-500"
                            )} />
                            {ticket.priority}
                         </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50 overflow-hidden">
                      <MapPin size={10} className="text-slate-300 shrink-0" />
                      <span className="text-[9px] font-bold text-slate-500 truncate">{ticket.address}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'history' && profile && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Purchase History</h2>
                <p className="text-xs text-slate-500 font-medium">Your past payments and services</p>
              </div>
            </div>
            <PurchaseHistory customerId={profile.id} />
          </div>
        )}

        {activeTab === 'store' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Matrix Store</h2>
                <p className="text-xs text-slate-500 font-medium">Genuine AC units, parts and equipment</p>
              </div>
            </div>
            <StoreView onAddToCart={handleAddToCart} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
             <h2 className="text-2xl font-black text-slate-900 tracking-tight">Settings</h2>
             <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center gap-4">
                   <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-2xl font-black uppercase">
                      {profile?.name?.charAt(0)}
                   </div>
                   <div>
                      <h4 className="font-black text-slate-900">{profile?.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{profile?.mobile_no}</p>
                   </div>
                </div>
                <div className="p-2">
                   <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                            <MapPin size={20} />
                         </div>
                         <p className="text-sm font-bold text-slate-700">Manage Addresses</p>
                      </div>
                      <ChevronRight size={18} className="text-slate-300" />
                   </button>
                   <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                            <Settings size={20} />
                         </div>
                         <p className="text-sm font-bold text-slate-700">Account Preferences</p>
                      </div>
                      <ChevronRight size={18} className="text-slate-300" />
                   </button>
                   <button onClick={() => signOut()} className="w-full flex items-center justify-between p-4 hover:bg-red-50 rounded-2xl transition-colors group">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                            <LogOut size={20} />
                         </div>
                         <p className="text-sm font-bold text-red-600">Sign Out</p>
                      </div>
                   </button>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* FAB - Cart */}
      {activeTab === 'store' && cart.length > 0 && (
        <button 
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
        >
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white">
            {cartCount}
          </div>
          <ShoppingCart size={24} />
        </button>
      )}

      {/* FAB - New Ticket */}
      {activeTab === 'tickets' && (
        <button 
          onClick={() => setIsNewTicketOpen(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
        >
          <Plus size={28} />
        </button>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 h-16 px-6 flex items-center justify-between z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <button 
          onClick={() => setActiveTab('tickets')}
          className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'tickets' ? "text-blue-600" : "text-slate-400")}
        >
          <TicketIcon size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">Tickets</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'history' ? "text-blue-600" : "text-slate-400")}
        >
          <History size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">History</span>
        </button>
        <button 
          onClick={() => setActiveTab('store')}
          className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'store' ? "text-blue-600" : "text-slate-400")}
        >
          <ShoppingBag size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">Store</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'settings' ? "text-blue-600" : "text-slate-400")}
        >
          <Settings size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">Settings</span>
        </button>
      </nav>

      {/* New Ticket Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => !isCheckingOut && setIsCartOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110]"
            />
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[48px] p-8 pb-12 z-[111] max-h-[90vh] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8 shrink-0" />
              
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Your Cart</h2>
                  <p className="text-slate-500 font-medium">Review your items before checkout</p>
                </div>
                <button 
                  onClick={() => !isCheckingOut && setIsCartOpen(false)} 
                  className="p-3 bg-slate-50 text-slate-400 rounded-2xl"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 space-y-4 no-scrollbar">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                    <div className="w-16 h-16 bg-white rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                      {item.product.image_url ? (
                        <img src={item.product.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-200"><ShoppingBag size={20} /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{item.product.name}</h4>
                      <p className="text-xs font-black text-blue-600 mt-0.5">₹{item.product.price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-100">
                      <button 
                        onClick={() => updateCartQuantity(item.product.id, -1)}
                        className="p-1 hover:text-blue-600"
                      >
                         {item.quantity === 1 ? <Trash2 size={16} className="text-red-400" /> : <Minus size={16} />}
                      </button>
                      <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateCartQuantity(item.product.id, 1)}
                        className="p-1 hover:text-blue-600"
                      >
                         <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {cart.length === 0 && (
                  <div className="py-20 text-center">
                    <ShoppingBag size={48} className="mx-auto text-slate-100 mb-4" />
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cart is empty</p>
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="pt-8 space-y-6 shrink-0">
                  <div className="flex items-center justify-between px-2">
                     <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Amount</p>
                     <p className="text-3xl font-black text-slate-900">₹{cartTotal.toLocaleString()}</p>
                  </div>
                  
                  <button 
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black text-xl shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                  >
                    {isCheckingOut ? (
                      <>
                        <Loader2 size={24} className="animate-spin" />
                        PROCESSING...
                      </>
                    ) : (
                      'CHECKOUT NOW'
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}

        {isNewTicketOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => !creating && setIsNewTicketOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100]"
            />
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[48px] p-8 pb-12 z-[101] max-h-[95vh] overflow-y-auto shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
              
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">New Request</h2>
                  <p className="text-slate-500 font-medium">Tell us what needs fixing</p>
                </div>
                <button 
                  onClick={() => !creating && setIsNewTicketOpen(false)} 
                  className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-900 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form className="space-y-8" onSubmit={handleCreateTicket}>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">AC Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Split AC', 'Window AC', 'Cassette AC', 'Central AC'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewTicket(prev => ({ ...prev, ac_type: type as any }))}
                        className={cn(
                          "p-4 rounded-2xl text-sm font-bold border transition-all text-left",
                          newTicket.ac_type === type 
                            ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                            : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-300"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Priority</label>
                  <div className="flex gap-2">
                    {['Low', 'Medium', 'High', 'Emergency'].map(p => (
                      <button 
                        key={p} 
                        type="button"
                        onClick={() => setNewTicket(prev => ({ ...prev, priority: p as any }))}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider border transition-all",
                          newTicket.priority === p
                            ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200"
                            : "bg-white border-slate-200 text-slate-400 hover:border-slate-400"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Issue Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {COMPLAINT_OPTIONS.map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedComplaint(option)}
                        className={cn(
                          "px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all text-center",
                          selectedComplaint === option 
                            ? "bg-slate-900 border-slate-900 text-white shadow-lg" 
                            : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedComplaint === 'Others' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3"
                  >
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Complaint Details</label>
                    <textarea 
                      rows={3} 
                      required
                      placeholder="Please describe your specific issue..."
                      value={customComplaint}
                      onChange={(e) => setCustomComplaint(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-400 transition-all font-medium placeholder:text-slate-300 text-sm"
                    />
                  </motion.div>
                )}

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Service Address</label>
                  <div className="relative group">
                    <MapPin className="absolute left-5 top-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input 
                      type="text" 
                      required
                      placeholder="Street address, building, floor"
                      value={newTicket.address}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-400 transition-all font-medium placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <button 
                  disabled={creating}
                  className="w-full bg-blue-600 disabled:bg-blue-300 text-white py-6 rounded-[32px] font-black text-xl shadow-2xl shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  {creating ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      SUBMITTING...
                    </>
                  ) : (
                    'CREATE TICKET'
                  )}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
