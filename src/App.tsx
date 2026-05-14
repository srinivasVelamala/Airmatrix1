/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './lib/AuthContext';
import LoginScreen from './components/LoginScreen';
import CustomerDashboard from './components/dashboards/CustomerDashboard';
import AdminDashboard from './components/dashboards/AdminDashboard';
import EmployeeDashboard from './components/dashboards/EmployeeDashboard';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!profile || (!profile.active && !profile.is_admin)) {
    return <LoginScreen />;
  }

  if (profile.is_admin) {
    return <AdminDashboard />;
  }

  switch (profile.role) {
    case 'customer':
      return <CustomerDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'employee':
      return <EmployeeDashboard />;
    default:
      return <LoginScreen />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-center" />
    </AuthProvider>
  );
}
