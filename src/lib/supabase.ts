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

// User Operations
export async function getProfiles() {
  if (isMockMode) {
    return [
      { id: 'mock-cus', role: 'customer', name: 'John Customer', mobile_no: '9876543210', active: true, approval_status: 'approved', is_admin: false, created_at: new Date().toISOString() },
      { id: 'mock-adm', role: 'admin', name: 'Super Admin', mobile_no: '9000000000', active: true, approval_status: 'approved', is_admin: true, created_at: new Date().toISOString() },
      { id: 'mock-emp', role: 'employee', name: 'Alex Technician', mobile_no: '9111111111', active: true, approval_status: 'approved', is_admin: false, created_at: new Date().toISOString() },
      { id: 'mock-pen', role: 'customer', name: 'Pending User', mobile_no: '9222222222', active: false, approval_status: 'pending', is_admin: false, created_at: new Date().toISOString() },
    ] as (Customer | Employee)[];
  }

  const [customersRes, employeesRes] = await Promise.all([
    supabase.from('customers').select('*'),
    supabase.from('employees').select('*')
  ]);

  if (customersRes.error) throw customersRes.error;
  if (employeesRes.error) throw employeesRes.error;

  const customers = (customersRes.data || []).map(c => ({ ...c, role: 'customer' as UserRole }));
  const employees = (employeesRes.data || []).map(e => ({ ...e, role: (e.is_admin ? 'admin' : 'employee') as UserRole }));

  return [...customers, ...employees].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function updateProfileStatus(userId: string, role: UserRole, updates: Partial<Customer | Employee>) {
  if (isMockMode) return;

  const table = role === 'customer' ? 'customers' : 'employees';
  
  // Remove role from updates if it exists as it's not a real column in the split tables
  const { role: _, ...cleanUpdates } = updates as any;

  const { error } = await supabase
    .from(table)
    .update(cleanUpdates)
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

// Purchase Operations
export async function getPurchaseHistory(customerId: string) {
  if (isMockMode) {
    return [
      { id: 'p1', customer_id: customerId, item_name: 'Split AC Service (Annual)', item_category: 'Service', amount: 2500, currency: 'INR', status: 'completed', payment_method: 'Credit Card', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: 'p2', customer_id: customerId, item_name: 'Eco-Cooler Split AC 1.5T', item_category: 'Store', amount: 34999, currency: 'INR', status: 'completed', payment_method: 'UPI', created_at: new Date(Date.now() - 86400000 * 15).toISOString() },
      { id: 'p3', customer_id: customerId, item_name: 'Premium HEPA Air Filter', item_category: 'Store', amount: 1200, currency: 'INR', status: 'completed', payment_method: 'Cash', created_at: new Date(Date.now() - 86400000 * 45).toISOString() },
    ] as Purchase[];
  }

  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    // Log the actual error for debugging
    console.error('Supabase Purchase Fetch Error:', error);
    
    // If table doesn't exist, return empty array instead of throwing
    if (error.code === '42P01' || error.message?.includes('does not exist') || error.code === 'PGRST116') {
      console.warn('Purchases table not found in Supabase. Please run the SQL migration.');
      return [];
    }
    throw error;
  }
  return (data || []) as Purchase[];
}

// Product Operations
export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name');

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
       console.warn('Products table not found in Supabase.');
       return [];
    }
    throw error;
  }

  return (data || []) as Product[];
}

export async function createProduct(product: Omit<Product, 'id' | 'created_at'>) {
  if (isMockMode) {
    return { ...product, id: Math.random().toString(), created_at: new Date().toISOString() } as Product;
  }

  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select()
    .single();

  if (error) throw error;
  return data as Product;
}

export async function updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'created_at'>>) {
  if (isMockMode) return;

  const { error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteProduct(id: string) {
  if (isMockMode) return;

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function createOrder(order: { 
  customer_id: string; 
  total_amount: number; 
  items: { product_id: string; quantity: number; unit_price: number; name: string }[] 
}) {
  if (isMockMode) {
    return { id: Math.random().toString(), ...order, status: 'pending', created_at: new Date().toISOString() };
  }

  // 1. Create the order
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert([{
      customer_id: order.customer_id,
      total_amount: order.total_amount,
      status: 'pending'
    }])
    .select()
    .single();

  if (orderError) throw orderError;

  // 2. Create order items
  const orderItems = order.items.map(item => ({
    order_id: orderData.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) throw itemsError;

  // 3. Update purchases table for history view (flattened records)
  const purchaseRecords = order.items.map(item => ({
    customer_id: order.customer_id,
    amount: item.unit_price * item.quantity,
    item_category: 'Store',
    item_name: item.name,
    status: 'completed',
    payment_method: 'Online Payment'
  }));

  await supabase.from('purchases').insert(purchaseRecords);

  return orderData;
}

export type UserRole = 'customer' | 'admin' | 'employee';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'disabled';

export interface BaseUser {
  id: string;
  name: string;
  mobile_no: string;
  approval_status: ApprovalStatus;
  active: boolean;
  avatar_url?: string;
  created_at: string;
  password_hash?: string;
}

export interface Customer extends BaseUser {
  role: 'customer';
  is_admin: false;
}

export interface Employee extends BaseUser {
  role: 'employee' | 'admin';
  is_admin: boolean;
}

export type User = Customer | Employee;

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

export interface Purchase {
  id: string;
  customer_id: string;
  item_name: string;
  item_category?: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'cancelled';
  payment_method: string;
  transaction_id?: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  stock_quantity: number;
  created_at: string;
}
