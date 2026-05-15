import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Filter, History, MapPin, 
  Settings, LogOut, Ticket as TicketIcon, Clock, 
  CheckCircle2, AlertCircle, ChevronRight, X, Loader2
} from 'lucide-react';
import { cn, getStatusColor, formatDate } from '../../lib/utils';
import { type Ticket, getTickets, createTicket } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function CustomerDashboard() {
  const { profile, signOut } = useAuth();
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // New Ticket Form State
  const [newTicket, setNewTicket] = useState({
    ac_type: 'Split AC' as Ticket['ac_type'],
    priority: 'Medium' as Ticket['priority'],
    complaint: '',
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
    fetchTickets();
  }, [profile]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!newTicket.complaint || !newTicket.address) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setCreating(true);
      await createTicket({
        ...newTicket,
        customer_id: profile.id
      });
      toast.success('Ticket created successfully!');
      setIsNewTicketOpen(false);
      setNewTicket({
        ac_type: 'Split AC',
        priority: 'Medium',
        complaint: '',
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
          <button onClick={() => signOut()} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 active:scale-90 transition-all flex-shrink-0">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4 lg:p-6 lg:space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg shadow-blue-100">
            <div className="bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center mb-2">
              <Clock size={14} />
            </div>
            <p className="text-[8px] text-blue-100 uppercase font-black tracking-widest">Active</p>
            <p className="text-lg font-black">{tickets.filter(t => !['Completed', 'Cancelled'].includes(t.status)).length}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-lg shadow-slate-100">
            <div className="bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center mb-2">
              <CheckCircle2 size={14} />
            </div>
            <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Resolved</p>
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
                transition={{ delay: i * 0.1 }}
                key={ticket.id}
                className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm hover:border-blue-200 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={cn("px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.1em] border", getStatusColor(ticket.status))}>
                    {ticket.status}
                  </div>
                  <div className="flex items-center text-slate-400 gap-1.5 text-[10px] font-medium">
                    <Clock size={12} />
                    {formatDate(ticket.created_at)}
                  </div>
                </div>
                
                <h4 className="font-bold text-slate-900 mb-1.5 text-lg">{ticket.ac_type} Maintenance</h4>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">{ticket.complaint}</p>
                
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <MapPin size={14} className="text-slate-400" />
                    <span className="truncate max-w-[150px]">{ticket.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                    <AlertCircle size={12} className={cn(
                      ticket.priority === 'High' || ticket.priority === 'Emergency' ? "text-red-500" : "text-amber-500"
                    )} />
                    {ticket.priority}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>

      {/* FAB */}
      <button 
        onClick={() => setIsNewTicketOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
      >
        <Plus size={28} />
      </button>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 h-16 px-6 flex items-center justify-between z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <button className="flex flex-col items-center gap-1 text-blue-600">
          <TicketIcon size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">Tickets</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <History size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">History</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <MapPin size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">Store</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <Settings size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">Settings</span>
        </button>
      </nav>

      {/* New Ticket Modal */}
      <AnimatePresence>
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Complaint Details</label>
                  <textarea 
                    rows={4} 
                    required
                    placeholder="Describe the issue you're facing..."
                    value={newTicket.complaint}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, complaint: e.target.value }))}
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-400 transition-all font-medium placeholder:text-slate-300"
                  />
                </div>

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
