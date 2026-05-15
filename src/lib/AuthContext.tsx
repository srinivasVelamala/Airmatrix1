import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isMockMode, type User, type UserRole } from './supabase';
import bcrypt from 'bcryptjs';

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
      const { data, error } = await supabase.from('users').select('count');
      if (error && error.code !== 'PGRST116') throw error;
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
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setUser({ id: data.id });
      } else {
        localStorage.removeItem('matrix_user_id');
        setProfile(null);
        setUser(null);
      }
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
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('mobile_no', mobile_no)
        .maybeSingle();

      if (error) throw error;
      
      if (!userData) {
        // Check if there are ANY users. If not, suggest signing up.
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
        if (count === 0) {
          throw new Error('Database is empty. Please "Sign Up" to create the first Admin account.');
        }
        throw new Error('User does not exist. Please check mobile number or Sign Up.');
      }

      const isValid = await bcrypt.compare(password, userData.password_hash);
      if (!isValid) throw new Error('Incorrect password. Please try again.');

      // Check approval status
      if (userData.approval_status === 'pending') {
        setProfile(userData); // Set profile so LoginScreen can show "Pending" state
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
      // Re-throw with a more user-friendly message if it's a generic supabase error
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
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('mobile_no', mobile_no)
        .maybeSingle();

      if (existingUser) throw new Error('Mobile number already registered. Please Login.');

      // Check if this is the first user to make them admin
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const isFirstUser = count === 0;

      const password_hash = await bcrypt.hash(password, 10);

      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
          name,
          mobile_no,
          password_hash,
          role: isFirstUser ? 'admin' : role,
          is_admin: isFirstUser,
          approval_status: isFirstUser ? 'approved' : 'pending',
          active: isFirstUser
        }])
        .select()
        .single();

      if (error) throw error;
      
      // If it's the first user, we can log them in immediately
      if (isFirstUser && newUser) {
        localStorage.setItem('matrix_user_id', newUser.id);
        setProfile(newUser);
        setUser({ id: newUser.id });
        toast.success('Admin account created and approved automatically!');
        return;
      }
      
      // We don't sign in other users immediately because they need approval
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
