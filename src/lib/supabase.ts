import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Improved URL handling
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.trim();

  // Guard against DB connection string (common mistake)
  if (supabaseUrl.startsWith('postgresql://') || supabaseUrl.startsWith('postgres://')) {
    // Attempt auto-recovery
    const match = supabaseUrl.match(/db\.([a-z0-9]+)\.supabase\.co/);
    if (match && match[1]) {
      const extractedUrl = `https://${match[1]}.supabase.co`;
      console.warn(`AUTO-FIX: Converted database string to API URL: ${extractedUrl}`);
      supabaseUrl = extractedUrl;
    } else {
      console.error('CONFIGURATION ERROR: VITE_SUPABASE_URL should be your Supabase Project URL (https://xyz.supabase.co), not the Database connection string.');
      supabaseUrl = ''; // Invalidate it if we can't auto-fix
    }
  } else if (!supabaseUrl.startsWith('http')) {
    // If it's a project ID only, construct the URL
    if (!supabaseUrl.includes('.')) {
      supabaseUrl = `https://${supabaseUrl}.supabase.co`;
    } else {
      supabaseUrl = `https://${supabaseUrl}`;
    }
  }
  // Remove trailing slash and /rest/v1/ suffix (common mistake)
  if (supabaseUrl) {
    supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '');
    if (supabaseUrl.endsWith('/')) {
      supabaseUrl = supabaseUrl.slice(0, -1);
    }
  }
}

const placeholderUrl = 'https://placeholder.supabase.co';
const actualUrl = supabaseUrl || placeholderUrl;
const actualKey = supabaseAnonKey || 'placeholder-key';

export { actualUrl, actualKey };

// Decide if we are in mock mode or have a hard config error
const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// We only have a "Config Error" if we started with postgres AND failed to fix it
export const isConfigError = rawUrl.startsWith('postgres') && !supabaseUrl.startsWith('http');

export const isMockMode = !supabaseUrl || 
                         supabaseUrl.includes('placeholder') ||
                         supabaseUrl.includes('your-project-id') ||
                         !supabaseAnonKey ||
                         supabaseAnonKey.includes('placeholder');

export const supabase = createClient(actualUrl, actualKey);

// Ticket Operations
export async function getTickets(userId: string, role: UserRole) {
  if (isMockMode) {
    return [
      { id: '1', customer_id: 'cus1', customer_name: 'John Doe', status: 'New', priority: 'High', ac_type: 'Split AC', brand: 'LG', complaint: 'Not cooling', created_at: new Date().toISOString(), address: '123 Main St', latitude: 0, longitude: 0 },
      { id: '2', customer_id: 'cus2', customer_name: 'Jane Smith', status: 'In Progress', priority: 'Medium', ac_type: 'Window AC', brand: 'Samsung', complaint: 'Noise', created_at: new Date().toISOString(), address: '456 Oak Ave', latitude: 0, longitude: 0 },
    ] as Ticket[];
  }

  let query = supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (role === 'customer') {
    query = query.eq('customer_id', userId);
  } else if (role === 'employee') {
    query = query.eq('assigned_employee', userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return (data || []) as Ticket[];
}

export async function createTicket(ticket: Omit<Ticket, 'id' | 'created_at' | 'status'>) {
  if (isMockMode) {
    return { ...ticket, id: Math.random().toString(), created_at: new Date().toISOString(), status: 'New' } as Ticket;
  }

  const { data, error } = await supabase
    .from('tickets')
    .insert([{
      ...ticket,
      status: 'New'
    }])
    .select()
    .single();

  if (error) throw error;
  return data as Ticket;
}

export async function getUsers() {
  if (isMockMode) {
    return [
      { id: 'mock-cus', role: 'customer', name: 'John Customer', mobile_no: '9876543210', active: true, approval_status: 'approved', is_admin: false, created_at: new Date().toISOString() },
      { id: 'mock-adm', role: 'admin', name: 'Super Admin', mobile_no: '9000000000', active: true, approval_status: 'approved', is_admin: true, created_at: new Date().toISOString() },
      { id: 'mock-emp', role: 'employee', name: 'Alex Technician', mobile_no: '9111111111', active: true, approval_status: 'approved', is_admin: false, created_at: new Date().toISOString() },
      { id: 'mock-pen', role: 'customer', name: 'Pending User', mobile_no: '9222222222', active: false, approval_status: 'pending', is_admin: false, created_at: new Date().toISOString() },
    ] as User[];
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as User[];
}

export async function updateUserStatus(userId: string, updates: Partial<User>) {
  if (isMockMode) return;

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus, notes?: string, changedBy?: string) {
  const { error } = await supabase
    .from('tickets')
    .update({ status })
    .eq('id', ticketId);

  if (error) throw error;

  // Add to history
  if (changedBy) {
    await supabase
      .from('ticket_status_history')
      .insert([{
        ticket_id: ticketId,
        new_status: status,
        changed_by: changedBy,
        notes: notes || `Status updated to ${status}`
      }]);
  }
}

export async function assignTicket(ticketId: string, employeeId: string, assignedBy: string) {
  if (isMockMode) return;

  const { error } = await supabase
    .from('tickets')
    .update({ 
      assigned_employee: employeeId,
      status: 'Assigned'
    })
    .eq('id', ticketId);

  if (error) throw error;

  // Add to history
  await supabase
    .from('ticket_status_history')
    .insert([{
      ticket_id: ticketId,
      new_status: 'Assigned',
      changed_by: assignedBy,
      notes: `Ticket assigned to staff member`
    }]);
}

export type UserRole = 'customer' | 'admin' | 'employee';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'disabled';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  mobile_no: string;
  approval_status: ApprovalStatus;
  active: boolean;
  is_admin: boolean;
  avatar_url?: string;
  created_at: string;
  password_hash?: string;
}

export interface Ticket {
  id: string;
  customer_id: string;
  customer_name?: string;
  status: TicketStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  address: string;
  latitude: number;
  longitude: number;
  ac_type: 'Split AC' | 'Window AC' | 'Cassette AC' | 'Central AC';
  brand: string;
  complaint: string;
  assigned_employee?: string;
  assigned_employee_name?: string;
  created_at: string;
  preferred_visit_date?: string;
}

export type TicketStatus = 
  | 'New' 
  | 'Assigned' 
  | 'Accepted' 
  | 'On Route' 
  | 'Arrived' 
  | 'In Progress' 
  | 'Parts Required' 
  | 'Waiting Customer Approval' 
  | 'Completed' 
  | 'Cancelled';

export interface TicketHistory {
  id: string;
  ticket_id: string;
  old_status: TicketStatus;
  new_status: TicketStatus;
  changed_by: string;
  notes: string;
  timestamp: string;
}

export interface EmployeeLocation {
  employee_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
}
