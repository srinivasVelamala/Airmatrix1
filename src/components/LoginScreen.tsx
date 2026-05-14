import React from 'react';
import { useAuth, type ConnectionStatus } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogIn, UserPlus, ShieldCheck, AlertCircle, 
  RefreshCw, Activity, CheckCircle2, XCircle,
  Phone, Lock, User, Clock, ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { isConfigError } from '../lib/supabase';

export default function LoginScreen() {
  const { 
    setMockProfile, 
    signInWithPassword, 
    signUp, 
    connectionStatus, 
    checkConnection, 
    authError, 
    profile, 
    signOut 
  } = useAuth();
  
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState<'customer' | 'employee'>('customer');
  const [mode, setMode] = React.useState<'login' | 'signup'>('login');
  const [isPending, setIsPending] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error('Please enter both mobile number and password');
      return;
    }
    
    setIsPending(true);
    try {
      await signInWithPassword(phone, password);
      toast.success('Logging in...');
    } catch (error: any) {
      console.error('Login Error:', error);
      toast.error(error.message || 'Login failed');
    } finally {
      setIsPending(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!name || !phone || !password || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      toast.error('Mobile number must be exactly 10 digits');
      return;
    }
    if (!/^\d{6}$/.test(password)) {
      toast.error('Password must be exactly 6 digits');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsPending(true);
    try {
      await signUp(name, phone, password, role);
      toast.success('Registration successful. Waiting for admin approval.');
      setMode('login');
    } catch (error: any) {
      console.error('Signup Error:', error);
      toast.error(error.message || 'Signup failed');
    } finally {
      setIsPending(false);
    }
  };

  if (profile && profile.approval_status !== 'approved' && !profile.is_admin) {
    const isRejected = profile.approval_status === 'rejected';
    
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-[40px] shadow-2xl shadow-slate-200 p-10 text-center space-y-8"
        >
          <div className={cn(
            "w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto shadow-inner",
            isRejected ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"
          )}>
            {isRejected ? <XCircle size={48} /> : <Clock size={48} className="animate-pulse" />}
          </div>
          
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {isRejected ? 'Access Denied' : 'Waiting for Approval'}
            </h1>
            <p className="text-slate-500 font-medium leading-relaxed">
              {isRejected 
                ? 'Your account request has been rejected. Please contact the administrator for more information.'
                : `Welcome, ${profile.name}! Your account is currently under review by our administrators.`
              }
            </p>
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-sm text-slate-600 font-medium">
            {isRejected 
              ? 'Status: Rejected' 
              : 'Service access is usually granted within 24 hours. You will be able to access the dashboard once approved.'
            }
          </div>

          <button 
            onClick={() => signOut()}
            className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-bold shadow-lg active:scale-95 transition-all"
          >
            Sign Out
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[48px] shadow-2xl shadow-slate-200 overflow-hidden"
      >
        <div className="bg-blue-600 p-10 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full -ml-12 -mb-12 blur-xl" />
          
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md shadow-xl">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">AIRMATRIX</h1>
          <p className="text-blue-100 uppercase tracking-[0.3em] text-[10px] font-black opacity-80 font-inter">Service Excellence</p>
        </div>

        <div className="p-10 space-y-8">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                connectionStatus === 'connected' ? 'bg-green-100 text-green-600' :
                connectionStatus === 'error' ? 'bg-red-100 text-red-600' :
                'bg-amber-100 text-amber-600'
              }`}>
                {connectionStatus === 'connected' ? <CheckCircle2 size={18} /> :
                 connectionStatus === 'error' ? <XCircle size={18} /> :
                 <Activity size={18} />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Link</p>
                <p className="text-sm font-bold text-slate-700">
                  {connectionStatus === 'connected' ? 'Online' :
                   connectionStatus === 'error' ? 'Offline' : 'Demo Active'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => checkConnection()}
              className="p-2.5 bg-white shadow-sm border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors text-slate-400"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button 
              onClick={() => setMode('login')}
              className={cn(
                "flex-1 py-3 rounded-[14px] text-xs font-black uppercase tracking-widest transition-all",
                mode === 'login' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              )}
            >
              Login
            </button>
            <button 
              onClick={() => setMode('signup')}
              className={cn(
                "flex-1 py-3 rounded-[14px] text-xs font-black uppercase tracking-widest transition-all",
                mode === 'signup' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              )}
            >
              Sign Up
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.form 
              key={mode}
              initial={{ opacity: 0, x: mode === 'signup' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'signup' ? -20 : 20 }}
              onSubmit={mode === 'login' ? handleLogin : handleSignUp}
              className="space-y-5"
            >
              {mode === 'signup' && (
                <>
                  <div className="relative group">
                    <User className="absolute left-4 top-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-400 outline-none transition-all font-medium"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRole('customer')}
                      className={cn(
                        "flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        role === 'customer' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                      )}
                    >
                      Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('employee')}
                      className={cn(
                        "flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        role === 'employee' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                      )}
                    >
                      Staff
                    </button>
                  </div>
                </>
              )}

              <div className="relative group">
                <Phone className="absolute left-4 top-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input
                  type="tel"
                  required
                  placeholder="Mobile Number"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-400 outline-none transition-all font-medium"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input
                  type="password"
                  required
                  placeholder="Password (6-digit PIN)"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-400 outline-none transition-all font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>

              {mode === 'signup' && (
                <div className="relative group">
                  <ShieldCheck className="absolute left-4 top-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input
                    type="password"
                    required
                    placeholder="Confirm PIN"
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-400 outline-none transition-all font-medium"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
              )}

              <button
                disabled={isPending}
                className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isPending ? (
                  <RefreshCw className="animate-spin" size={20} />
                ) : (
                  <>
                    {mode === 'login' ? 'Login' : 'Create Account'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </motion.form>
          </AnimatePresence>

          <div className="pt-6 border-t border-slate-50">
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => setMockProfile('admin')}
                className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-900 transition-colors border border-dashed border-slate-200 px-3 py-1 rounded-lg"
              >
                Demo Admin
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
