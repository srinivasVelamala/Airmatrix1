import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { motion } from 'motion/react';
import { 
  Users, Ticket as TicketIcon, TrendingUp, Search, 
  Filter, Calendar, Map as MapIcon, 
  Bell, ChevronRight, MoreVertical,
  Activity, CheckCircle, Clock, AlertTriangle,
  MapPin, Loader2, LogOut, UserCheck, UserX
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell
} from 'recharts';
import { cn, getStatusColor, formatDate } from '../../lib/utils';
import { getTickets, getUsers, updateUserStatus, type Ticket, type User } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { profile: myProfile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profiles, setProfiles] = useState<User[]>([]);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchAllData = async () => {
    if (!myProfile) return;
    try {
      setLoading(true);
      console.log('Fetching all operations data...');
      const [ticketData, profileData] = await Promise.all([
        getTickets(myProfile.id, 'admin'),
        getUsers()
      ]);
      console.log(`Fetched ${ticketData.length} tickets and ${profileData.length} profiles`);
      setTickets(ticketData);
      setProfiles(profileData);
    } catch (error: any) {
      console.error('Admin Fetch Error Details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast.error(`Sync Failed: ${error.message || 'Check database connection'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [myProfile]);

  const handleUpdateStatus = async (userId: string, updates: any) => {
    try {
      setIsUpdatingProfile(userId);
      await updateUserStatus(userId, updates);
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, ...updates } : p));
      toast.success('Status updated successfully');
    } catch (error: any) {
      toast.error('Error updating status');
    } finally {
      setIsUpdatingProfile(null);
    }
  };

  // Derived stats
  const pendingUsersCount = profiles.filter(p => p.approval_status === 'pending').length;
  const approvedUsersCount = profiles.filter(p => p.approval_status === 'approved').length;
  const rejectedUsersCount = profiles.filter(p => p.approval_status === 'rejected').length;
  const disabledUsersCount = profiles.filter(p => p.approval_status === 'disabled').length;

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = p.mobile_no?.includes(searchTerm) || p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || p.approval_status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const pendingCount = tickets.filter(t => t.status === 'New').length;
  const inProgressCount = tickets.filter(t => !['New', 'Completed', 'Cancelled'].includes(t.status)).length;
  const completedCount = tickets.filter(t => t.status === 'Completed').length;
  const criticalCount = tickets.filter(t => t.priority === 'High' || t.priority === 'Emergency').length;

  const STATUS_CHART_DATA = [
    { name: 'New', value: pendingCount, color: '#3b82f6' },
    { name: 'Active', value: inProgressCount, color: '#f59e0b' },
    { name: 'Done', value: completedCount, color: '#10b981' },
    { name: 'Other', value: tickets.length - (pendingCount + inProgressCount + completedCount), color: '#94a3b8' },
  ].filter(d => d.value > 0);

  const WEEKLY_DATA = [
    { name: 'Mon', tickets: 12 },
    { name: 'Tue', tickets: 19 },
    { name: 'Wed', tickets: 15 },
    { name: 'Thu', tickets: 22 },
    { name: 'Fri', tickets: 30 },
    { name: 'Sat', tickets: 10 },
    { name: 'Sun', tickets: 5 },
  ];

  // Helper to resolve user names from profiles
  const getUserName = (userId: string | undefined | null) => {
    if (!userId) return 'Unassigned';
    const profile = profiles.find(p => p.id === userId);
    return profile?.name || 'System User';
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Sidebar - Desktop only */}
      <aside className="hidden lg:flex w-72 bg-slate-900 flex-col h-screen sticky top-0">
        <div className="p-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">AIRMATRIX</h1>
          <p className="text-slate-500 text-[10px] mt-1 uppercase tracking-[0.2em] font-black">Admin Console</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {['Overview', 'Tickets', 'Users', 'Analytics', 'Settings'].map((item) => (
            <button
              key={item}
              onClick={() => setActiveTab(item)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-sm transition-all",
                activeTab === item ? "bg-blue-600 text-white shadow-xl shadow-blue-900/40" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                {item === 'Overview' && <Activity size={18} />}
                {item === 'Tickets' && <TicketIcon size={18} />}
                {item === 'Users' && <Users size={18} />}
                {item === 'Analytics' && <TrendingUp size={18} />}
                {item}
              </div>
              <div className="flex gap-1.5">
                {item === 'Users' && pendingUsersCount > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full ring-2 ring-slate-900">
                    {pendingUsersCount}
                  </span>
                )}
                {item === 'Tickets' && tickets.length > 0 && (
                  <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full ring-2 ring-slate-900">
                    {tickets.length}
                  </span>
                )}
              </div>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800">
          <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all">
            <LogOut size={20} className="rotate-90" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10 space-y-10 pb-20 overflow-x-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex justify-between items-center mb-8">
          <h1 className="text-xl font-black text-slate-900 tracking-tighter">AIRMATRIX</h1>
          <button onClick={fetchAllData} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Activity size={20} className="text-blue-600" />}
          </button>
        </header>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Operations</p>
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">{activeTab === 'Users' ? 'User Approvals' : 'Admin Dashboard'}</h2>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={fetchAllData}
              className="bg-white text-slate-900 px-6 py-4 rounded-[24px] font-bold text-sm flex items-center gap-2 border border-slate-200 shadow-sm hover:bg-slate-50 transition-all"
            >
              {loading ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <Activity size={18} className="text-blue-600" />}
              Sync Data
            </button>
          </div>
        </div>

        {activeTab === 'Overview' && (
          <>
            {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {[
                { label: 'Pending Requests', value: pendingCount, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Active Users', value: profiles.filter(p => p.active).length, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Pending Approvals', value: pendingUsersCount, icon: UserX, color: 'text-red-500', bg: 'bg-red-50' },
                { label: 'Completed Jobs', value: completedCount, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map((stat, i) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  key={i}
                  className="bg-white p-7 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all group"
                  onClick={() => stat.label === 'Pending Approvals' && setActiveTab('Users')}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className={cn("p-4 rounded-3xl group-hover:scale-110 transition-transform", stat.bg)}>
                      <stat.icon className={cn(stat.color)} size={28} />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5">{stat.label}</p>
                  <p className="text-4xl font-black text-slate-900 tabular-nums">
                    {loading ? <Loader2 className="animate-spin text-slate-200" size={32} /> : stat.value}
                  </p>
                </motion.div>
              ))}
        </div>

        {/* Charts & Map Sections */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="xl:col-span-2 bg-white p-8 lg:p-10 rounded-[48px] border border-slate-100 shadow-sm min-h-[450px]">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="font-black text-slate-900 text-xl tracking-tight">Service Volume</h3>
                <p className="text-slate-500 text-sm font-medium">Weekly comparison</p>
              </div>
              <select className="bg-slate-50 border border-slate-200 rounded-2xl text-xs px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-100">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={WEEKLY_DATA}>
                  <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                  />
                  <Bar dataKey="tickets" fill="#2563eb" radius={[12, 12, 4, 4]} barSize={45} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col">
            <h3 className="font-black text-slate-900 text-xl tracking-tight mb-2">Health Matrix</h3>
            <p className="text-slate-500 text-sm font-medium mb-8">System status overview</p>
            
            <div className="h-[240px] relative mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={STATUS_CHART_DATA}
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {STATUS_CHART_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
                <p className="text-4xl font-black text-slate-900 tabular-nums">{tickets.length}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tickets</p>
              </div>
            </div>
            
            <div className="space-y-4 flex-1">
              {STATUS_CHART_DATA.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                    <p className="text-xs font-bold text-slate-700">{item.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black text-slate-900 tabular-nums">{item.value}</p>
                    <p className="text-[10px] font-bold text-slate-400">({Math.round(item.value / (tickets.length || 1) * 100)}%)</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live System Log / Recent Tickets */}
        <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Live Operations Log</h3>
            <button className="text-blue-600 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 hover:gap-3 transition-all">
              View All History <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Ticket</th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Customer</th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Status</th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Priority</th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tickets.slice(0, 5).map((t) => (
                  <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <TicketIcon size={18} />
                        </div>
                        <span className="font-bold text-sm truncate max-w-[150px]">{t.ac_type} Maintenance</span>
                      </div>
                    </td>
                    <td className="py-5 px-4 font-bold text-sm text-slate-600">
                      {getUserName(t.customer_id)}
                    </td>
                    <td className="py-5 px-4">
                      <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", getStatusColor(t.status))}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-5 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-500">
                        <AlertTriangle size={14} className={t.priority === 'High' ? 'text-red-500' : 'text-amber-500'} />
                        {t.priority}
                      </div>
                    </td>
                    <td className="py-5 px-4 text-right font-black text-xs text-slate-400 tracking-tighter">{formatDate(t.created_at)}</td>
                  </tr>
                ))}
                {tickets.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                      No active logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )}

    {activeTab === 'Tickets' && (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto">
            {['all', 'New', 'In Progress', 'Completed'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  filterStatus === status ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search tickets..."
              className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Details</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tickets
                  .filter(t => {
                    const matchesSearch = t.complaint?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                        t.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        getUserName(t.customer_id).toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesFilter = filterStatus === 'all' || 
                                         (filterStatus === 'In Progress' ? !['New', 'Completed', 'Cancelled'].includes(t.status) : t.status === filterStatus);
                    return matchesSearch && matchesFilter;
                  })
                  .map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                            <TicketIcon size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{t.ac_type}</p>
                            <p className="text-xs text-slate-500">{t.brand} • {t.priority}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <p className="font-bold text-slate-700 text-sm">{getUserName(t.customer_id)}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">ID: {t.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-6 py-6">
                        <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", getStatusColor(t.status))}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                          <span className="text-xs font-bold text-slate-600">{getUserName(t.assigned_employee)}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right font-black text-xs text-slate-400 tracking-tighter">
                        {formatDate(t.created_at)}
                      </td>
                    </tr>
                  ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <TicketIcon size={40} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No tickets found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {activeTab === 'Users' && (
      <div className="space-y-6">
        {/* User Management Toolbar */}
        <div className="flex flex-col xl:flex-row gap-4 items-center justify-between">
          <div className="flex bg-slate-100 p-1 rounded-2xl w-full xl:w-auto">
            {['all', 'pending', 'approved', 'rejected', 'disabled'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  filterStatus === status ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="relative w-full xl:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600" size={18} />
            <input
              type="text"
              placeholder="Search by name or mobile number..."
              className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-100 rounded-[20px] outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 font-bold text-sm shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-slate-900 text-xl tracking-tight">User Directory</h3>
              <p className="text-sm text-slate-500 font-medium">Manage access and account status</p>
            </div>
            <div className="flex gap-4">
              <div className="px-4 py-2 bg-amber-50 rounded-xl text-xs font-black uppercase text-amber-600 flex items-center gap-2">
                <Clock size={14} />
                {pendingUsersCount} Pending
              </div>
              <div className="px-4 py-2 bg-emerald-50 rounded-xl text-xs font-black uppercase text-emerald-600 flex items-center gap-2">
                <CheckCircle size={14} />
                {approvedUsersCount} Active
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Details</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Active</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Is Admin</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProfiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border border-white",
                          p.approval_status === 'approved' ? "bg-blue-100 text-blue-600" : 
                          p.approval_status === 'rejected' ? "bg-red-100 text-red-600" :
                          "bg-amber-100 text-amber-600"
                        )}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{p.name || 'Anonymous'}</p>
                          <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                            <Activity size={10} />
                            {p.mobile_no}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 font-bold text-xs text-slate-600 truncate max-w-[100px]">{p.role}</td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          p.approval_status === 'approved' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : 
                          p.approval_status === 'pending' ? "bg-amber-500 animate-pulse" :
                          p.approval_status === 'rejected' ? "bg-red-500" : "bg-slate-400"
                        )} />
                        <span className={cn(
                          "text-xs font-bold uppercase",
                          p.approval_status === 'approved' ? "text-emerald-600" : 
                          p.approval_status === 'pending' ? "text-amber-600" :
                          p.approval_status === 'rejected' ? "text-red-500" : "text-slate-500"
                        )}>
                          {p.approval_status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-6 text-center">
                      <button
                        onClick={() => handleUpdateStatus(p.id, { active: !p.active })}
                        disabled={isUpdatingProfile === p.id}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          p.active ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-400 border border-slate-200"
                        )}
                      >
                        {p.active ? 'Yes' : 'No'}
                      </button>
                    </td>
                    <td className="px-4 py-6 text-center">
                      <button
                        onClick={() => handleUpdateStatus(p.id, { is_admin: !p.is_admin })}
                        disabled={isUpdatingProfile === p.id}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          p.is_admin ? "bg-purple-50 text-purple-600 border border-purple-100" : "bg-slate-100 text-slate-400 border border-slate-200"
                        )}
                      >
                        {p.is_admin ? 'Admin' : 'User'}
                      </button>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-2">
                        {p.approval_status === 'pending' && (
                          <>
                            <button
                              disabled={isUpdatingProfile === p.id}
                              onClick={() => handleUpdateStatus(p.id, { approval_status: 'approved', active: true })}
                              className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90"
                              title="Approve"
                            >
                              <UserCheck size={18} />
                            </button>
                            <button
                              disabled={isUpdatingProfile === p.id}
                              onClick={() => handleUpdateStatus(p.id, { approval_status: 'rejected', active: false })}
                              className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-90"
                              title="Reject"
                            >
                              <UserX size={18} />
                            </button>
                          </>
                        )}
                        {p.approval_status === 'approved' && (
                          <button
                            disabled={isUpdatingProfile === p.id}
                            onClick={() => handleUpdateStatus(p.id, { approval_status: 'disabled', active: false })}
                            className="px-4 py-2 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200"
                          >
                            Disable
                          </button>
                        )}
                        {(p.approval_status === 'disabled' || p.approval_status === 'rejected') && (
                          <button
                            disabled={isUpdatingProfile === p.id}
                            onClick={() => handleUpdateStatus(p.id, { approval_status: 'approved', active: true })}
                            className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-900/20"
                          >
                            Enable
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Users size={32} />
                      </div>
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">No users found matching criteria</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}
  </main>
    </div>
  );
}
