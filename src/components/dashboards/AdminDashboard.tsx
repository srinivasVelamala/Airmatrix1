import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { motion } from 'motion/react';
import { 
  Users, Ticket as TicketIcon, TrendingUp, Search, 
  Filter, Calendar, Map as MapIcon, 
  Bell, ChevronRight, MoreVertical,
  Activity, CheckCircle, Clock, AlertTriangle,
  MapPin, Loader2, LogOut, UserCheck, UserX,
  UserPlus, ShoppingBag, Plus, Trash2, Edit2,
  Package, Image as ImageIcon, X
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell
} from 'recharts';
import { cn, getStatusColor, formatDate } from '../../lib/utils';
import { 
  getTickets, getProfiles, updateProfileStatus, 
  assignTicket, getProducts, createProduct, 
  updateProduct, deleteProduct,
  type Ticket, type User, type Product 
} from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { profile: myProfile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profiles, setProfiles] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [userDirTab, setUserDirTab] = useState<'employees' | 'customers'>('employees');
  const [gridDensity, setGridDensity] = useState(3); // 1: List, 2: Compact, 3: Dense

  // Product modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'Units',
    stock_quantity: 0,
    image_url: ''
  });
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const fetchAllData = async () => {
    if (!myProfile) return;
    try {
      setLoading(true);
      console.log('Fetching all operations data...');
      const [ticketData, profileData, productData] = await Promise.all([
        getTickets(myProfile.id, 'admin'),
        getProfiles(),
        getProducts()
      ]);
      console.log(`Fetched ${ticketData.length} tickets, ${profileData.length} profiles, and ${productData.length} products`);
      setTickets(ticketData);
      setProfiles(profileData);
      setProducts(productData);
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

  const handleUpdateStatus = async (userId: string, role: any, updates: any) => {
    try {
      setIsUpdatingProfile(userId);
      await updateProfileStatus(userId, role, updates);
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, ...updates } : p));
      toast.success('Status updated successfully');
    } catch (error: any) {
      toast.error('Error updating status');
    } finally {
      setIsUpdatingProfile(null);
    }
  };

  const handleAssign = async (ticketId: string, employeeId: string) => {
    if (!myProfile) return;
    try {
      setIsAssigning(true);
      await assignTicket(ticketId, employeeId, myProfile.id);
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, assigned_employee: employeeId, status: 'Assigned' as any } : t));
      setAssigningTicketId(null);
      toast.success('Ticket assigned successfully');
    } catch (error: any) {
      toast.error('Failed to assign ticket');
    } finally {
      setIsAssigning(false);
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
    const matchesRole = userDirTab === 'employees' ? (p.role === 'employee' || p.is_admin) : p.role === 'customer';
    return matchesSearch && matchesFilter && matchesRole;
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
          {['Overview', 'Tickets', 'Users', 'Store', 'Analytics', 'Settings'].map((item) => (
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
                {item === 'Store' && <ShoppingBag size={18} />}
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
                {item === 'Store' && products.length > 0 && (
                   <span className="bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded-full ring-2 ring-slate-900">
                    {products.length}
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
      <main className="flex-1 p-4 lg:p-10 space-y-6 lg:space-y-10 pb-32 lg:pb-10 overflow-x-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex justify-between items-center mb-6">
          <h1 className="text-lg font-black text-slate-900 tracking-tighter">AIRMATRIX</h1>
          <div className="flex gap-1.5 flex-shrink-0">
            <button onClick={fetchAllData} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 transition-active active:scale-95">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Activity size={18} className="text-blue-600" />}
            </button>
            <button onClick={() => signOut()} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400 flex-shrink-0 transition-active active:scale-95">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 lg:gap-6">
          <div>
            <div className="flex items-center gap-1.5 mb-1 lg:mb-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Operations</p>
            </div>
            <h2 className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tight">{activeTab === 'Users' ? 'User Approvals' : 'Admin Dashboard'}</h2>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={fetchAllData}
              className="bg-white text-slate-900 px-4 py-2.5 lg:px-6 lg:py-4 rounded-xl lg:rounded-[24px] font-bold text-xs lg:text-sm flex items-center gap-2 border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
            >
              {loading ? <Loader2 size={14} className="animate-spin text-blue-600" /> : <Activity size={14} className="text-blue-600" />}
              Sync
            </button>
          </div>
        </div>

        {activeTab === 'Overview' && (
          <>
            {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            {[
                { label: 'Pending Tickets', value: pendingCount, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Active Users', value: profiles.filter(p => p.active).length, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Pending Approvals', value: pendingUsersCount, icon: UserX, color: 'text-red-500', bg: 'bg-red-50' },
                { label: 'Completed Tickets', value: completedCount, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map((stat, i) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  key={i}
                  className="bg-white p-4 lg:p-7 rounded-2xl lg:rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all group active:scale-95 cursor-pointer"
                  onClick={() => {
                    if (stat.label === 'Pending Approvals') {
                      setActiveTab('Users');
                      setFilterStatus('pending');
                    }
                    if (stat.label === 'Pending Tickets') {
                      setActiveTab('Tickets');
                      setFilterStatus('New');
                    }
                    if (stat.label === 'Active Users') {
                      setActiveTab('Users');
                      setFilterStatus('approved');
                    }
                    if (stat.label === 'Completed Tickets') {
                      setActiveTab('Tickets');
                      setFilterStatus('Completed');
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-3 lg:mb-6">
                    <div className={cn("p-2 lg:p-4 rounded-xl lg:rounded-3xl group-hover:scale-110 transition-transform", stat.bg)}>
                      <stat.icon className={cn(stat.color)} size={18} />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[8px] lg:text-[10px] font-black uppercase tracking-[0.15em] mb-1 lg:mb-1.5">{stat.label}</p>
                  <p className="text-xl lg:text-4xl font-black text-slate-900 tabular-nums">
                    {loading ? <Loader2 className="animate-spin text-slate-200" size={20} /> : stat.value}
                  </p>
                </motion.div>
              ))}
        </div>

        {/* Charts & Map Sections */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="xl:col-span-2 bg-white lg:p-10 p-6 lg:rounded-[48px] rounded-3xl border border-slate-100 shadow-sm min-h-[400px] lg:min-h-[450px]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 lg:mb-10">
              <div>
                <h3 className="font-black text-slate-900 text-lg lg:text-xl tracking-tight">Service Volume</h3>
                <p className="text-slate-500 text-xs lg:text-sm font-medium">Weekly comparison</p>
              </div>
              <select className="bg-slate-50 border border-slate-200 rounded-xl text-[10px] lg:text-xs px-3 lg:px-4 py-2 lg:py-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-100">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            <div className="h-[250px] lg:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={WEEKLY_DATA}>
                  <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  />
                  <Bar dataKey="tickets" fill="#2563eb" radius={[8, 8, 2, 2]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="bg-white lg:p-10 p-6 lg:rounded-[48px] rounded-3xl border border-slate-100 shadow-sm flex flex-col">
            <h3 className="font-black text-slate-900 text-lg lg:text-xl tracking-tight mb-1 lg:mb-2 text-white">Health Matrix</h3>
            <p className="text-slate-500 text-xs lg:text-sm font-medium mb-6 lg:mb-8">System status overview</p>
            
            <div className="h-[200px] lg:h-[240px] relative mb-6 lg:mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={STATUS_CHART_DATA}
                    innerRadius={60}
                    outerRadius={85}
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
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                <p className="text-2xl lg:text-4xl font-black text-slate-900 tabular-nums">{tickets.length}</p>
                <p className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
              </div>
            </div>
            
            <div className="space-y-3 lg:space-y-4 flex-1">
              {STATUS_CHART_DATA.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-2.5 lg:p-3 bg-slate-50/50 rounded-xl lg:rounded-2xl">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="w-2.5 lg:w-3.5 h-2.5 lg:h-3.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                    <p className="text-[10px] lg:text-xs font-bold text-slate-700">{item.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 lg:gap-2">
                    <p className="text-[10px] lg:text-xs font-black text-slate-900 tabular-nums">{item.value}</p>
                    <p className="text-[8px] lg:text-[10px] font-bold text-slate-400">({Math.round(item.value / (tickets.length || 1) * 100)}%)</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live System Log / Recent Tickets */}
        <div className="bg-white lg:p-10 p-6 lg:rounded-[48px] rounded-3xl border border-slate-100 shadow-sm space-y-6 lg:space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight">Live Operations Log</h3>
            <button 
              onClick={() => setActiveTab('Tickets')}
              className="text-blue-600 text-[10px] lg:text-xs font-black uppercase tracking-widest flex items-center gap-1.5 hover:gap-3 transition-all"
            >
              View All <ChevronRight size={14} className="lg:size-4" />
            </button>
          </div>
          
          <div className="hidden lg:block overflow-x-auto">
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
              </tbody>
            </table>
          </div>

          {/* Mobile Log View */}
          <div className="lg:hidden space-y-3">
            {tickets.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex-shrink-0 flex items-center justify-center">
                  <TicketIcon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <p className="font-bold text-slate-900 text-xs truncate uppercase tracking-tight">{t.ac_type}</p>
                    <span className="text-[8px] font-black text-slate-400 tabular-nums">{formatDate(t.created_at)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-slate-500 font-bold">{getUserName(t.customer_id)}</p>
                    <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded border", getStatusColor(t.status))}>
                      {t.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {tickets.length === 0 && !loading && (
            <div className="py-12 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
              No active logs found
            </div>
          )}
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

        <div className="bg-white lg:rounded-[40px] rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Details</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
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
                          {assigningTicketId === t.id ? (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 transition-all">
                              <select
                                className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-1.5 font-bold outline-none focus:ring-2 focus:ring-blue-100"
                                onChange={(e) => handleAssign(t.id, e.target.value)}
                                defaultValue=""
                                disabled={isAssigning}
                              >
                                <option value="" disabled>Select Employee</option>
                                {profiles
                                  .filter(p => (p.role === 'employee' || p.is_admin) && p.approval_status === 'approved' && p.active)
                                  .map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))
                                }
                              </select>
                              <button 
                                onClick={() => setAssigningTicketId(null)}
                                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <UserX size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between w-full group/assign">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  t.assigned_employee ? "bg-blue-500" : "bg-slate-300"
                                )} />
                                <span className={cn(
                                  "text-xs font-bold",
                                  t.assigned_employee ? "text-slate-600" : "text-slate-400"
                                )}>
                                  {getUserName(t.assigned_employee)}
                                </span>
                              </div>
                              <button
                                onClick={() => setAssigningTicketId(t.id)}
                                className="opacity-0 group-hover/assign:opacity-100 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Assign Employee"
                              >
                                <UserPlus size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right font-black text-xs text-slate-400 tracking-tighter">
                        {formatDate(t.created_at)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Ticket View */}
          <div className="lg:hidden divide-y divide-slate-100">
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
                <div key={t.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <TicketIcon size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{t.ac_type}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.priority} Priority</p>
                      </div>
                    </div>
                    <span className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border", getStatusColor(t.status))}>
                      {t.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Customer</p>
                      <p className="font-bold text-slate-700 text-xs">{getUserName(t.customer_id)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Created</p>
                      <p className="font-bold text-slate-500 text-xs">{formatDate(t.created_at)}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Assignee:</p>
                       <span className="text-xs font-bold text-slate-600">{getUserName(t.assigned_employee)}</span>
                    </div>
                    <button 
                      onClick={() => setAssigningTicketId(assigningTicketId === t.id ? null : t.id)}
                      className="p-1.5 bg-white shadow-sm border border-slate-200 rounded-lg text-blue-600"
                    >
                      <UserPlus size={14} />
                    </button>
                  </div>

                  {assigningTicketId === t.id && (
                    <div className="pt-2 animate-in slide-in-from-top-2 duration-200">
                      <select
                        className="w-full bg-blue-50 border border-blue-200 rounded-xl text-xs px-4 py-3 font-bold outline-none ring-2 ring-blue-100"
                        onChange={(e) => handleAssign(t.id, e.target.value)}
                        defaultValue=""
                        disabled={isAssigning}
                      >
                        <option value="" disabled>Select technician...</option>
                        {profiles
                          .filter(p => (p.role === 'employee' || p.is_admin) && p.approval_status === 'approved' && p.active)
                          .map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))
                        }
                      </select>
                    </div>
                  )}
                </div>
              ))}
          </div>

          {tickets.length === 0 && (
            <div className="px-8 py-20 text-center">
              <TicketIcon size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No tickets found</p>
            </div>
          )}
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

        <div className="bg-white lg:rounded-[40px] rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 lg:p-8 border-b border-slate-50 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-slate-900 text-lg lg:text-xl tracking-tight">User Directory</h3>
                <p className="text-xs lg:text-sm text-slate-500 font-medium">Manage access and account status</p>
              </div>
              <div className="flex gap-2 lg:gap-4 overflow-x-auto no-scrollbar">
                <div className="px-3 lg:px-4 py-1.5 lg:py-2 bg-amber-50 rounded-xl text-[10px] lg:text-xs font-black uppercase text-amber-600 flex items-center gap-1.5 lg:gap-2 whitespace-nowrap">
                  <Clock size={12} />
                  {pendingUsersCount} Pending
                </div>
                <div className="px-3 lg:px-4 py-1.5 lg:py-2 bg-emerald-50 rounded-xl text-[10px] lg:text-xs font-black uppercase text-emerald-600 flex items-center gap-1.5 lg:gap-2 whitespace-nowrap">
                  <CheckCircle size={12} />
                  {approvedUsersCount} Active
                </div>
              </div>
            </div>

            {/* Role Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
              <button
                onClick={() => setUserDirTab('employees')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  userDirTab === 'employees' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Employees
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md text-[8px]",
                  userDirTab === 'employees' ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
                )}>
                  {profiles.filter(p => p.role === 'employee' || p.is_admin).length}
                </span>
              </button>
              <button
                onClick={() => setUserDirTab('customers')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  userDirTab === 'customers' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Customers
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md text-[8px]",
                  userDirTab === 'customers' ? "bg-white text-slate-900 shadow-sm" : "bg-slate-200 text-slate-500"
                )}>
                  {profiles.filter(p => p.role === 'customer').length}
                </span>
              </button>
            </div>
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Details</th>
                  {userDirTab === 'employees' && (
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                  )}
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Active</th>
                  {userDirTab === 'employees' && (
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Is Admin</th>
                  )}
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
                    {userDirTab === 'employees' && (
                      <td className="px-6 py-6 font-bold text-xs text-slate-600 truncate max-w-[100px]">{p.role}</td>
                    )}
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
                        onClick={() => handleUpdateStatus(p.id, p.role, { active: !p.active })}
                        disabled={isUpdatingProfile === p.id}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          p.active ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-400 border border-slate-200"
                        )}
                      >
                        {p.active ? 'Yes' : 'No'}
                      </button>
                    </td>
                    {userDirTab === 'employees' && (
                      <td className="px-4 py-6 text-center">
                        <button
                          onClick={() => handleUpdateStatus(p.id, p.role, { is_admin: !p.is_admin })}
                          disabled={isUpdatingProfile === p.id}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            p.is_admin ? "bg-purple-50 text-purple-600 border border-purple-100" : "bg-slate-100 text-slate-400 border border-slate-200"
                          )}
                        >
                          {p.is_admin ? 'Admin' : 'User'}
                        </button>
                      </td>
                    )}
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-2">
                        {p.approval_status === 'pending' && (
                          <>
                            <button
                              disabled={isUpdatingProfile === p.id}
                              onClick={() => handleUpdateStatus(p.id, p.role, { approval_status: 'approved', active: true })}
                              className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90"
                              title="Approve"
                            >
                              <UserCheck size={18} />
                            </button>
                            <button
                              disabled={isUpdatingProfile === p.id}
                              onClick={() => handleUpdateStatus(p.id, p.role, { approval_status: 'rejected', active: false })}
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
                            onClick={() => handleUpdateStatus(p.id, p.role, { approval_status: 'disabled', active: false })}
                            className="px-4 py-2 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200"
                          >
                            Disable
                          </button>
                        )}
                        {(p.approval_status === 'disabled' || p.approval_status === 'rejected') && (
                          <button
                            disabled={isUpdatingProfile === p.id}
                            onClick={() => handleUpdateStatus(p.id, p.role, { approval_status: 'approved', active: true })}
                            className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-900/20"
                          >
                            Enable
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile User View */}
          <div className="lg:hidden divide-y divide-slate-100">
             {filteredProfiles.map((p) => (
               <div key={p.id} className="p-4 space-y-4">
                 <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                     <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shadow-sm border border-white",
                        p.approval_status === 'approved' ? "bg-blue-100 text-blue-600" : 
                        p.approval_status === 'rejected' ? "bg-red-100 text-red-600" :
                        "bg-amber-100 text-amber-600"
                      )}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm tracking-tight">{p.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold">
                          {p.mobile_no}
                          {userDirTab === 'employees' && ` • ${p.role}`}
                        </p>
                      </div>
                   </div>
                   <div className="flex flex-col items-end gap-1">
                     <span className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border",
                        p.approval_status === 'approved' ? "text-emerald-600 border-emerald-100 bg-emerald-50" : 
                        p.approval_status === 'pending' ? "text-amber-600 border-amber-100 bg-amber-50" :
                        "text-red-500 border-red-100 bg-red-50"
                      )}>
                        {p.approval_status}
                      </span>
                      <div className="flex gap-1">
                        {userDirTab === 'employees' && p.is_admin && <span className="bg-purple-50 text-purple-600 border border-purple-100 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Admin</span>}
                        {p.active && <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Live</span>}
                      </div>
                   </div>
                 </div>

                 <div className="flex gap-2">
                   {p.approval_status === 'pending' ? (
                     <>
                        <button
                          disabled={isUpdatingProfile === p.id}
                          onClick={() => handleUpdateStatus(p.id, p.role, { approval_status: 'approved', active: true })}
                          className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 flex items-center justify-center gap-1.5"
                        >
                          <UserCheck size={14} /> Approve
                        </button>
                        <button
                          disabled={isUpdatingProfile === p.id}
                          onClick={() => handleUpdateStatus(p.id, p.role, { approval_status: 'rejected', active: false })}
                          className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5"
                        >
                          <UserX size={14} /> Reject
                        </button>
                     </>
                   ) : (
                     <div className="flex-1 flex gap-2">
                       <button
                          onClick={() => handleUpdateStatus(p.id, p.role, { active: !p.active })}
                          className="flex-1 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500"
                        >
                          {p.active ? 'Deactivate' : 'Activate'}
                        </button>
                        {userDirTab === 'employees' && (
                          <button
                            onClick={() => handleUpdateStatus(p.id, p.role, { is_admin: !p.is_admin })}
                            className="flex-1 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500"
                          >
                            {p.is_admin ? 'Demote' : 'Make Admin'}
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateStatus(p.id, p.role, { approval_status: p.approval_status === 'disabled' ? 'approved' : 'disabled', active: p.approval_status === 'disabled' })}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest",
                            p.approval_status === 'disabled' ? "bg-blue-600 text-white" : "bg-red-50 text-red-500 border border-red-100"
                          )}
                        >
                          {p.approval_status === 'disabled' ? 'Enable' : 'Disable'}
                        </button>
                     </div>
                   )}
                 </div>
               </div>
             ))}
          </div>

          {filteredProfiles.length === 0 && (
            <div className="px-8 py-16 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Users size={32} />
              </div>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">No users found matching criteria</p>
            </div>
          )}
        </div>
      </div>
    )}
    {activeTab === 'Store' && (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 overflow-x-auto no-scrollbar">
            <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
              {['All', 'Units', 'Accessories', 'Filters', 'Spare Parts'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterStatus(cat)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    filterStatus === cat || (cat === 'All' && filterStatus === 'all') ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-2xl shrink-0">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Size</span>
               <input 
                 type="range" 
                 min="1" 
                 max="3" 
                 step="1"
                 value={gridDensity}
                 onChange={(e) => setGridDensity(parseInt(e.target.value))}
                 className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
               />
            </div>
          </div>
          <button 
            onClick={() => {
              setEditingProduct(null);
              setProductForm({ name: '', description: '', price: 0, category: 'Units', stock_quantity: 0, image_url: '' });
              setIsProductModalOpen(true);
            }}
            className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus size={18} />
            Add New Product
          </button>
        </div>

        <div className={cn(
          "grid gap-4 lg:gap-6 transition-all duration-300",
          gridDensity === 1 ? "grid-cols-1" : 
          gridDensity === 2 ? "grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : 
          "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        )}>
          {products
            .filter(p => filterStatus === 'all' || filterStatus === 'All' || p.category === filterStatus)
            .map((product) => (
              <motion.div 
                layout
                key={product.id}
                className={cn(
                  "bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex transition-all group",
                  gridDensity === 1 ? "flex-row h-24 md:h-32" : "flex-col"
                )}
              >
                <div className={cn(
                  "bg-slate-50 relative overflow-hidden shrink-0",
                  gridDensity === 1 ? "w-24 md:w-32 h-full" : "aspect-square w-full"
                )}>
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                      <Package size={gridDensity === 3 ? 20 : 32} />
                    </div>
                  )}
                  
                  <div className={cn(
                    "absolute top-2 right-2 flex gap-1 transition-opacity",
                    gridDensity === 1 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}>
                    <button 
                      onClick={() => {
                        setEditingProduct(product);
                        setProductForm({
                          name: product.name,
                          description: product.description,
                          price: product.price,
                          category: product.category,
                          stock_quantity: product.stock_quantity,
                          image_url: product.image_url || ''
                        });
                        setIsProductModalOpen(true);
                      }}
                      className={cn(
                        "p-1.5 bg-white/90 backdrop-blur-md rounded-lg text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm",
                        gridDensity === 3 ? "p-1" : "p-1.5"
                      )}
                    >
                      <Edit2 size={gridDensity === 3 ? 12 : 14} />
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete this product?')) {
                          try {
                            await deleteProduct(product.id);
                            setProducts(prev => prev.filter(p => p.id !== product.id));
                            toast.success('Product deleted');
                          } catch (error) {
                            toast.error('Failed to delete product');
                          }
                        }
                      }}
                      className={cn(
                        "p-1.5 bg-white/90 backdrop-blur-md rounded-lg text-slate-600 hover:bg-red-600 hover:text-white transition-all shadow-sm",
                        gridDensity === 3 ? "p-1" : "p-1.5"
                      )}
                    >
                      <Trash2 size={gridDensity === 3 ? 12 : 14} />
                    </button>
                  </div>
                </div>
                <div className={cn(
                  "flex-1 flex flex-col justify-between",
                  gridDensity === 3 ? "p-2" : "p-4"
                )}>
                  <div>
                    {gridDensity < 3 && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-black uppercase tracking-widest">{product.category}</span>
                        {gridDensity === 1 && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                            product.stock_quantity > 10 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                          )}>
                            Stock: {product.stock_quantity}
                          </span>
                        )}
                      </div>
                    )}
                    <h4 className={cn(
                      "font-black text-slate-900 leading-tight truncate",
                      gridDensity === 3 ? "text-[10px]" : "text-sm"
                    )}>{product.name}</h4>
                    {gridDensity === 1 && (
                      <p className="text-[10px] text-slate-500 font-medium line-clamp-1 mt-1 leading-relaxed">{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                    <p className={cn(
                      "font-black text-slate-900",
                      gridDensity === 3 ? "text-xs" : "text-sm"
                    )}>₹{product.price.toLocaleString()}</p>
                    {gridDensity === 3 && (
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        product.stock_quantity > 10 ? "bg-emerald-500" : "bg-red-500"
                      )} title={`Stock: ${product.stock_quantity}`} />
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          }
        </div>

        {products.length === 0 && (
          <div className="py-20 text-center">
            <ShoppingBag size={48} className="mx-auto text-slate-100 mb-4" />
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No products in store</p>
          </div>
        )}

        {/* Product Modal */}
        {isProductModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl relative"
            >
              <div className="p-8 lg:p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {editingProduct ? 'Edit Item' : 'Add Store Item'}
                  </h3>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-1">Matrix Inventory System</p>
                </div>
                <button 
                  onClick={() => setIsProductModalOpen(false)}
                  className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                <form className="p-8 lg:p-10 space-y-8" onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    setIsSavingProduct(true);
                    if (editingProduct) {
                      await updateProduct(editingProduct.id, productForm);
                      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...productForm } : p));
                      toast.success('Product updated');
                    } else {
                      const newProduct = await createProduct(productForm);
                      setProducts(prev => [newProduct, ...prev]);
                      toast.success('Product created');
                    }
                    setIsProductModalOpen(false);
                  } catch (error) {
                    toast.error('Failed to save product');
                  } finally {
                    setIsSavingProduct(false);
                  }
                }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Item Title</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g., 1.5T Split AC Unit"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none ring-2 ring-transparent focus:ring-blue-100 focus:border-blue-400 transition-all text-sm"
                          value={productForm.name}
                          onChange={e => setProductForm({...productForm, name: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Category</label>
                        <select 
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none ring-2 ring-transparent focus:ring-blue-100 focus:border-blue-400 transition-all text-sm appearance-none"
                          value={productForm.category}
                          onChange={e => setProductForm({...productForm, category: e.target.value})}
                        >
                          <option>Units</option>
                          <option>Accessories</option>
                          <option>Filters</option>
                          <option>Spare Parts</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Price (₹)</label>
                          <input 
                            type="number" 
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none ring-2 ring-transparent focus:ring-blue-100 focus:border-blue-400 transition-all text-sm"
                            value={productForm.price || ''}
                            onChange={e => setProductForm({...productForm, price: parseFloat(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Stock Vol.</label>
                          <input 
                            type="number" 
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none ring-2 ring-transparent focus:ring-blue-100 focus:border-blue-400 transition-all text-sm"
                            value={productForm.stock_quantity || ''}
                            onChange={e => setProductForm({...productForm, stock_quantity: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Specification / Bio</label>
                        <textarea 
                          rows={4}
                          placeholder="Details about the product, warranty, compatibility..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none ring-2 ring-transparent focus:ring-blue-100 focus:border-blue-400 transition-all text-sm resize-none"
                          value={productForm.description}
                          onChange={e => setProductForm({...productForm, description: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Media Attachment</label>
                        <div className="relative group">
                          <div className={cn(
                            "w-full aspect-square bg-slate-100 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all",
                            productForm.image_url ? "border-blue-200 bg-white" : "border-slate-200 hover:border-blue-400 group-hover:bg-slate-50"
                          )}>
                            {productForm.image_url ? (
                              <div className="relative w-full h-full group/img">
                                <img src={productForm.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center">
                                  <button 
                                    type="button"
                                    onClick={() => setProductForm({...productForm, image_url: ''})}
                                    className="p-3 bg-red-500 text-white rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all"
                                  >
                                    <Trash2 size={20} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center p-6 w-full h-full flex flex-col items-center justify-center relative cursor-pointer">
                                <div className="w-16 h-16 bg-white rounded-3xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 mb-4 group-hover:text-blue-500 group-hover:scale-110 transition-all">
                                  <ImageIcon size={24} />
                                </div>
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Click to Upload</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">JPG, PNG, WEBP (Max 5MB)</p>
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        setProductForm({...productForm, image_url: reader.result as string});
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex justify-end gap-4">
                    <button 
                      type="button" 
                      onClick={() => setIsProductModalOpen(false)}
                      className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSavingProduct}
                      className="px-10 py-4 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-200 hover:bg-blue-600 hover:shadow-blue-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSavingProduct && <Loader2 size={16} className="animate-spin" />}
                      {editingProduct ? 'Update Inventory' : 'Add to Catalog'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    )}

    {activeTab === 'Analytics' && (
      <div className="space-y-12 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm overflow-hidden">
            <h3 className="font-black text-xl text-slate-900 tracking-tight mb-8">Service Demand</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={WEEKLY_DATA}>
                  <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tickets" 
                    stroke="#2563eb" 
                    strokeWidth={4} 
                    dot={{ fill: '#2563eb', strokeWidth: 2, r: 6, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col">
            <h3 className="font-black text-xl text-slate-900 tracking-tight mb-8">Unit Distribution</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Split', value: 45, color: '#3b82f6' },
                      { name: 'Window', value: 30, color: '#f59e0b' },
                      { name: 'Cassette', value: 15, color: '#10b981' },
                      { name: 'Others', value: 10, color: '#94a3b8' }
                    ]}
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {[0,1,2,3].map((i) => <Cell key={i} fill={['#3b82f6', '#f59e0b', '#10b981', '#94a3b8'][i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    )}
  </main>
      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 h-16 px-2 flex items-center justify-around z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        {[
          { id: 'Overview', icon: Activity, label: 'Ops' },
          { id: 'Tickets', icon: TicketIcon, label: 'Tickets' },
          { id: 'Users', icon: Users, label: 'Users' },
          { id: 'Store', icon: ShoppingBag, label: 'Store' },
          { id: 'Analytics', icon: TrendingUp, label: 'Stats' }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 min-w-[70px] relative transition-all active:scale-95",
              activeTab === item.id ? "text-blue-600" : "text-slate-400"
            )}
          >
            <item.icon size={20} className={cn("transition-transform", activeTab === item.id ? "scale-110" : "")} />
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
            {activeTab === item.id && (
              <motion.div 
                layoutId="mobileTab" 
                className="absolute -top-[16px] w-8 h-1 bg-blue-600 rounded-full" 
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
