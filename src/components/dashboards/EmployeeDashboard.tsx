import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Navigation, Phone, CheckCircle2, 
  Clock, MapPin, Camera, Clipboard,
  ChevronRight, ArrowLeft, Play,
  Check, X, AlertCircle, MessageSquare,
  QrCode, Loader2, LogOut
} from 'lucide-react';
import { cn, getStatusColor, formatDate } from '../../lib/utils';
import { supabase, isMockMode, type Ticket, type TicketStatus, getTickets, updateTicketStatus } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import QRScanner from '../QRScanner';

export default function EmployeeDashboard() {
  const { profile, signOut } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const fetchTickets = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const data = await getTickets(profile.id, 'employee');
      setTickets(data);
    } catch (error: any) {
      console.error('Fetch Error:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [profile]);

  const currentJob = tickets.find(t => 
    ['Accepted', 'On Route', 'Arrived', 'In Progress'].includes(t.status)
  );

  // Background location ping simulation for Technicians
  useEffect(() => {
    if (!profile || profile.role !== 'employee' || !currentJob) return;

    const interval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            console.log(`[Technician Location Update] Lat: ${latitude}, Lon: ${longitude}`);
            
            // If Supabase is real, sync location
            if (!isMockMode) {
              await supabase
                .from('employee_locations')
                .upsert({
                  employee_id: profile.id,
                  latitude,
                  longitude,
                  updated_at: new Date().toISOString()
                });
            }
          },
          (error) => console.warn('Location access denied or unavailable', error)
        );
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [profile, currentJob]);

  const handleScan = (data: string) => {
    setIsScanning(false);
    toast.success(`Asset Identified: ${data}`);
    
    // Auto-fill dummy equipment info if it's a "known" asset
    if (selectedTicket) {
      setTickets(prev => prev.map(t => 
        t.id === selectedTicket.id ? { 
          ...t, 
          brand: 'Daikin (Premium)', 
          ac_type: 'Central AC' as any,
          complaint: t.complaint + '\n\n[Asset Scanned: ' + data + ']'
        } : t
      ));
      setSelectedTicket(prev => prev ? { 
        ...prev, 
        brand: 'Daikin (Premium)',
        complaint: prev.complaint + '\n\n[Asset Scanned: ' + data + ']'
      } : null);
    }
  };

  const updateStatus = async (status: TicketStatus) => {
    if (!selectedTicket || !profile) return;
    
    try {
      setIsUpdating(true);
      await updateTicketStatus(selectedTicket.id, status, undefined, profile.id);
      
      setTickets(prev => prev.map(t => 
        t.id === selectedTicket.id ? { ...t, status } : t
      ));
      setSelectedTicket(prev => prev ? { ...prev, status } : null);
      toast.success(`Status updated to ${status}`);
    } catch (error: any) {
      console.error('Update Error:', error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-20">
      <AnimatePresence mode="wait">
        {isScanning && (
          <QRScanner 
            onScan={handleScan} 
            onClose={() => setIsScanning(false)} 
          />
        )}
        {!selectedTicket ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="p-4 space-y-4 lg:p-6 lg:space-y-6"
          >
            {/* Staff Header */}
            <header className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-lg">
                  {profile?.name?.[0]}
                </div>
                <div>
                  <h2 className="font-bold text-base leading-tight">{profile?.name}</h2>
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    Technician
                  </p>
                </div>
              </div>
              <button onClick={() => signOut()} className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0">
                <LogOut size={18} className="text-slate-400" />
              </button>
            </header>

            {/* Current Active Job Alert */}
            {currentJob && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-blue-600 p-5 rounded-[24px] shadow-xl shadow-blue-600/20"
                onClick={() => setSelectedTicket(currentJob)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-white/20 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest">
                    Current Task
                  </div>
                  <Play size={16} fill="currentColor" />
                </div>
                <h3 className="text-lg font-black mb-0.5">{currentJob.customer_name}</h3>
                <p className="text-blue-100 text-xs mb-3 line-clamp-1">{currentJob.address}</p>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase bg-black/10 w-fit px-2.5 py-1.5 rounded-lg">
                  <Clock size={12} />
                  Started {formatDate(currentJob.created_at)}
                </div>
              </motion.div>
            )}

            {/* Task List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Job Queue</h3>
                {loading && <Loader2 size={12} className="animate-spin text-blue-500" />}
              </div>
              
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-600">
                  <Loader2 size={24} className="animate-spin" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">Syncing Jobs...</p>
                </div>
              ) : tickets.filter(t => t.id !== currentJob?.id).length === 0 ? (
                <div className="bg-white/5 border border-white/10 border-dashed rounded-2xl p-8 text-center">
                  <Clipboard size={24} className="mx-auto mb-3 text-slate-700" />
                  <p className="text-slate-500 text-xs font-medium">No pending tasks</p>
                </div>
              ) : (
                tickets.filter(t => t.id !== currentJob?.id).map((ticket) => (
                  <div 
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="bg-white/5 border border-white/10 p-3.5 rounded-2xl flex items-center justify-between group active:bg-white/10 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                         "w-10 h-10 rounded-xl flex items-center justify-center",
                         ticket.priority === 'High' ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500"
                      )}>
                        <Clipboard size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{ticket.customer_name || 'Service Request'}</h4>
                        <p className="text-slate-500 text-[10px] italic">{ticket.ac_type} • {ticket.status}</p>
                      </div>
                    </div>
                    <ChevronRight className="text-slate-700 group-hover:text-slate-400" size={16} />
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ x: 300, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            exit={{ x: 300, opacity: 0 }}
            className="flex flex-col h-screen"
          >
            {/* Sticky Job Header */}
            <div className="p-6 bg-slate-900 sticky top-0 z-20 border-b border-white/5">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="p-3 bg-white/5 rounded-2xl"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-bold">Job Details</h2>
              </div>
              
              <div className="flex justify-between items-start">
                <div>
                  <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 inline-block border", getStatusColor(selectedTicket.status))}>
                    {selectedTicket.status}
                  </div>
                  <h1 className="text-3xl font-black">{selectedTicket.customer_name}</h1>
                </div>
                <div className="bg-red-500/20 text-red-500 px-3 py-2 rounded-xl text-xs font-bold uppercase">
                  {selectedTicket.priority}
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <section className="space-y-3">
                <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Location & Route</h4>
                <div className="bg-white/5 p-5 rounded-[32px] space-y-4">
                  <div className="flex items-start gap-4">
                    <MapPin className="text-blue-500 mt-1" size={20} />
                    <p className="text-slate-200 text-sm">{selectedTicket.address}</p>
                  </div>
                  <div className="flex gap-3">
                    <button className="flex-1 bg-indigo-600 hover:bg-indigo-500 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all">
                      <Navigation size={18} />
                      Navigate
                    </button>
                    <button className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <Phone size={18} />
                    </button>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Service Overview</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl">
                    <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Equipment</p>
                    <p className="font-bold">{selectedTicket.ac_type}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl">
                    <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Brand</p>
                    <p className="font-bold">{selectedTicket.brand}</p>
                  </div>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/5">
                  <p className="text-slate-500 text-[10px] font-bold uppercase mb-2">Complaint Description</p>
                  <p className="text-slate-200 leading-relaxed italic">"{selectedTicket.complaint}"</p>
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Technician Actions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setIsScanning(true)}
                    className="bg-blue-600 hover:bg-blue-500 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-bold text-[10px] uppercase shadow-lg shadow-blue-950/40"
                  >
                    <QrCode size={20} />
                    Scan Equipment
                  </button>
                  <button className="bg-white/5 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-bold text-[10px] uppercase">
                    <Camera size={20} />
                    Add Photo
                  </button>
                </div>
              </section>
            </div>

            {/* Bottom Workflow Actions */}
            <div className="p-6 bg-slate-900 border-t border-white/10 shadow-[0_-10px_20px_rgba(0,0,0,0.4)]">
              {selectedTicket.status === 'Assigned' && (
                <button 
                  onClick={() => updateStatus('Accepted')}
                  disabled={isUpdating}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 h-16 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Check size={24} />
                  Accept Job Assignment
                </button>
              )}
              {selectedTicket.status === 'Accepted' && (
                <button 
                  onClick={() => updateStatus('On Route')}
                  disabled={isUpdating}
                  className="w-full bg-blue-600 h-16 rounded-2xl font-black text-lg transition-all"
                >
                  Start Route to Site
                </button>
              )}
              {selectedTicket.status === 'On Route' && (
                <button 
                    onClick={() => updateStatus('Arrived')}
                    disabled={isUpdating}
                    className="w-full bg-blue-500 h-16 rounded-2xl font-black text-lg transition-all"
                  >
                    Mark as Arrived
                  </button>
              )}
              {selectedTicket.status === 'Arrived' && (
                <button 
                    onClick={() => updateStatus('In Progress')}
                    disabled={isUpdating}
                    className="w-full bg-slate-100 text-slate-900 h-16 rounded-2xl font-black text-lg transition-all"
                  >
                    Start Maintenance Work
                  </button>
              )}
              {selectedTicket.status === 'In Progress' && (
                <div className="grid grid-cols-2 gap-3">
                   <button 
                     onClick={() => updateStatus('Parts Required')}
                     disabled={isUpdating}
                     className="bg-red-500/20 text-red-500 h-16 rounded-2xl font-black transition-all"
                   >
                     Hold (Parts)
                   </button>
                   <button 
                     onClick={() => updateStatus('Completed')}
                     disabled={isUpdating}
                     className="bg-emerald-500 h-16 rounded-2xl font-black transition-all"
                   >
                     Complete Job
                   </button>
                </div>
              )}
              {selectedTicket.status === 'Completed' && (
                <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold py-4">
                  <CheckCircle2 size={24} />
                  Job Successfully Completed
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
