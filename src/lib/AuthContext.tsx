import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isMockMode, type User, type UserRole } from './supabase';
import bcrypt from 'bcryptjs';
import { toast } from 'react-hot-toast';

export type ConnectionStatus = 'checking' | 'connected' | 'error' | 'mock';

interface AuthContextType {
  user: any | null;
  profile: User | null;
  loading: boolean;
  authError: string | null;
  connectionStatus: ConnectionStatus;
  signInWithPassword: (mobile_no: string, password: string) => Promise<void>;
  signUp: (name: string, mobile_no: string, password: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  setMockProfile: (role: UserRole) => void;
  checkConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for development
const MOCK_USERS: Record<UserRole, User> = {
  customer: { id: 'mock-cus', role: 'customer', name: 'John Customer', mobile_no: '9876543210', active: true, approval_status: 'approved', is_admin: false, created_at: new Date().toISOString() },
  admin: { id: 'mock-adm', role: 'admin', name: 'Super Admin', mobile_no: '9000000000', active: true, approval_status: 'approved', is_admin: true, created_at: new Date().toISOString() },
  employee: { id: 'mock-emp', role: 'employee', name: 'Alex Technician', mobile_no: '9111111111', active: true, approval_status: 'approved', is_admin: false, created_at: new Date().toISOString() },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');

  const checkConnection = async () => {
    if (isMockMode) {
      setConnectionStatus('mock');
      return;
    }
    setConnectionStatus('checking');
    try {
      // Check both tables
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from('customers').select('count', { count: 'exact', head: true }),
        supabase.from('employees').select('count', { count: 'exact', head: true })
      ]);
      if (e1 && e1.code !== 'PGRST116') throw e1;
      if (e2 && e2.code !== 'PGRST116') throw e2;
      setConnectionStatus('connected');
    } catch (err: any) {
      console.error('Connection health check failed:', err);
      setConnectionStatus('error');
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (isMockMode) {
        setLoading(false);
        setConnectionStatus('mock');
        return;
      }

      const storedUserId = localStorage.getItem('matrix_user_id');
      if (storedUserId) {
        await fetchProfile(storedUserId);
      } else {
        setLoading(false);
      }
      await checkConnection();
    };

    initAuth();
  }, []);

  async function fetchProfile(uid: string) {
    try {
      // Try customers first
      let { data: customer, error: e1 } = await supabase
        .from('customers')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (e1) throw e1;

      if (customer) {
        setProfile({ ...customer, role: 'customer' });
        setUser({ id: customer.id });
        return;
      }

      // Then try employees
      let { data: employee, error: e2 } = await supabase
        .from('employees')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (e2) throw e2;

      if (employee) {
        setProfile({ ...employee, role: employee.is_admin ? 'admin' : 'employee' });
        setUser({ id: employee.id });
        return;
      }

      // If not found in either
      localStorage.removeItem('matrix_user_id');
      setProfile(null);
      setUser(null);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function signInWithPassword(mobile_no: string, password: string) {
    if (isMockMode) {
      if (password === 'admin123') setMockProfile('admin');
      else setMockProfile('customer');
      return;
    }

    try {
      // Check customers table
      const { data: customerData, error: e1 } = await supabase
        .from('customers')
        .select('*')
        .eq('mobile_no', mobile_no)
        .maybeSingle();

      if (e1) throw e1;
      
      let userData = customerData ? { ...customerData, role: 'customer' as UserRole } : null;

      // If not in customers, check employees
      if (!userData) {
        const { data: employeeData, error: e2 } = await supabase
          .from('employees')
          .select('*')
          .eq('mobile_no', mobile_no)
          .maybeSingle();

        if (e2) throw e2;
        if (employeeData) {
          userData = { ...employeeData, role: (employeeData.is_admin ? 'admin' : 'employee') as UserRole };
        }
      }

      if (!userData) {
        // Check if there are ANY users in both tables
        const [ { count: c1 }, { count: c2 } ] = await Promise.all([
          supabase.from('customers').select('*', { count: 'exact', head: true }),
          supabase.from('employees').select('*', { count: 'exact', head: true })
        ]);

        if (c1 === 0 && c2 === 0) {
          throw new Error('Database is empty. Please "Sign Up" to create the first Admin account.');
        }
        throw new Error('User does not exist. Please check mobile number or Sign Up.');
      }

      const isValid = await bcrypt.compare(password, userData.password_hash);
      if (!isValid) throw new Error('Incorrect password. Please try again.');

      // Check approval status
      if (userData.approval_status === 'pending') {
        setProfile(userData); 
        setUser({ id: userData.id });
        return;
      }
      
      if (userData.approval_status === 'rejected') {
        throw new Error('Access denied. Contact admin');
      }

      if (userData.approval_status === 'disabled') {
        throw new Error('This account has been disabled. Contact admin');
      }

      if (!userData.active) {
        throw new Error('Waiting for admin approval');
      }

      localStorage.setItem('matrix_user_id', userData.id);
      setProfile(userData);
      setUser({ id: userData.id });
    } catch (err: any) {
      console.error('SignIn Error:', err);
      if (err.message === 'Failed to fetch') {
        throw new Error('Cannot connect to database. Check your internet connection.');
      }
      throw err;
    }
  }

  async function signUp(name: string, mobile_no: string, password: string, role: UserRole) {
    if (isMockMode) {
      setMockProfile(role);
      return;
    }

    try {
      // Check if user already exists in either table
      const [ { data: exCustomer }, { data: exEmployee } ] = await Promise.all([
        supabase.from('customers').select('id').eq('mobile_no', mobile_no).maybeSingle(),
        supabase.from('employees').select('id').eq('mobile_no', mobile_no).maybeSingle()
      ]);

      if (exCustomer || exEmployee) throw new Error('Mobile number already registered. Please Login.');

      // Check if this is the first user overall to make them admin
      const [ { count: c1 }, { count: c2 } ] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('employees').select('*', { count: 'exact', head: true })
      ]);
      const isFirstUser = (c1 === 0 && c2 === 0);

      const password_hash = await bcrypt.hash(password, 10);
      const targetTable = (isFirstUser || role === 'employee' || role === 'admin') ? 'employees' : 'customers';

      const { data: newUser, error } = await supabase
        .from(targetTable)
        .insert([{
          name,
          mobile_no,
          password_hash,
          is_admin: isFirstUser,
          approval_status: isFirstUser ? 'approved' : 'pending',
          active: isFirstUser
        }])
        .select()
        .single();

      if (error) throw error;
      
      if (isFirstUser && newUser) {
        const fullNewUser = { ...newUser, role: 'admin' as UserRole };
        localStorage.setItem('matrix_user_id', newUser.id);
        setProfile(fullNewUser);
        setUser({ id: newUser.id });
        toast.success('Admin account created and approved automatically!');
        return;
      }
      
      return;
    } catch (err: any) {
      console.error('SignUp Error:', err);
      throw err;
    }
  }

  async function signOut() {
    localStorage.removeItem('matrix_user_id');
    setProfile(null);
    setUser(null);
  }

  function setMockProfile(role: UserRole) {
    setProfile(MOCK_USERS[role]);
    setUser({ id: MOCK_USERS[role].id });
    setLoading(false);
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      authError, 
      connectionStatus, 
      signInWithPassword,
      signUp,
      signOut, 
      setMockProfile, 
      checkConnection 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
