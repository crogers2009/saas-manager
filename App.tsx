import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import UserManagementPage from './pages/UserManagementPage';
import DepartmentManagementPage from './pages/DepartmentManagementPage';
import DashboardPage from './pages/DashboardPage';
import SoftwareInventoryPage from './pages/SoftwareInventoryPage';
import SoftwareDetailPage from './pages/SoftwareDetailPage';
import AddEditSoftwarePage from './pages/AddEditSoftwarePage';
import SoftwareRequestPage from './pages/SoftwareRequestPage';
import RenewalManagementPage from './pages/RenewalManagementPage';
import AuditTrackingPage from './pages/AuditTrackingPage';
import FeatureOverlapPage from './pages/FeatureOverlapPage';
import EmailSettingsPage from './pages/EmailSettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="software" element={<SoftwareInventoryPage />} />
        <Route path="software/new" element={<AddEditSoftwarePage />} />
        <Route path="software/:id" element={<SoftwareDetailPage />} />
        <Route path="software/:id/edit" element={<AddEditSoftwarePage />} />
        <Route path="requests" element={<SoftwareRequestPage />} />
        <Route path="requests/new" element={<SoftwareRequestPage />} /> 
        <Route path="renewals" element={<RenewalManagementPage />} />
        <Route path="audits" element={<AuditTrackingPage />} />
        <Route path="overlap" element={<FeatureOverlapPage />} />
        <Route path="email-settings" element={<EmailSettingsPage />} />
        <Route path="users" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
        <Route path="departments" element={<AdminRoute><DepartmentManagementPage /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;