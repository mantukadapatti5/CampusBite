import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import OfflineBanner from './components/OfflineBanner.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { homeForRole } from './utils/roleHome.js';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import AccessDenied from './pages/AccessDenied.jsx';

import StudentLayout from './layouts/StudentLayout.jsx';
import KitchenLayout from './layouts/KitchenLayout.jsx';
import ManagerLayout from './layouts/ManagerLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';

import Menu from './pages/Menu.jsx';
import Cart from './pages/Cart.jsx';
import Wallet from './pages/Wallet.jsx';
import MyOrders from './pages/MyOrders.jsx';
import OrderTracking from './pages/OrderTracking.jsx';
import SupportRequests from './pages/SupportRequests.jsx';
import Faq from './pages/Faq.jsx';
import Profile from './pages/Profile.jsx';

import KitchenDashboard from './pages/KitchenDashboard.jsx';
import KitchenView from './pages/KitchenView.jsx';
import ManualOrderEntry from './pages/ManualOrderEntry.jsx';

import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminMenuManagement from './pages/AdminMenuManagement.jsx';
import AdminAllOrders from './pages/AdminAllOrders.jsx';
import AdminReports from './pages/AdminReports.jsx';
import AdminStaffManagement from './pages/AdminStaffManagement.jsx';
import AdminSupportRequests from './pages/AdminSupportRequests.jsx';
import AdminCoupons from './pages/AdminCoupons.jsx';
import AdminFeedback from './pages/AdminFeedback.jsx';
import AdminSettings from './pages/AdminSettings.jsx';

// Strict role gate: unauthenticated -> login. Wrong role for this portal ->
// a real 403 Access Denied screen (not a silent redirect), matching the
// "student hitting /admin/dashboard gets 403" requirement.
function RoleGate({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <AccessDenied />;
  return children;
}

function PostLoginRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homeForRole(user.role)} replace />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-ink">
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<PostLoginRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ── STUDENT PORTAL ───────────────────────────────────────── */}
        <Route element={<RoleGate roles={['student', 'staff']}><StudentLayout /></RoleGate>}>
          <Route path="/student/menu" element={<Menu />} />
          <Route path="/student/cart" element={<Cart />} />
          <Route path="/student/wallet" element={<Wallet />} />
          <Route path="/student/orders" element={<MyOrders />} />
          <Route path="/student/orders/:id" element={<OrderTracking />} />
          <Route path="/student/support" element={<SupportRequests />} />
          <Route path="/student/faq" element={<Faq />} />
          <Route path="/student/profile" element={<Profile />} />
        </Route>

        {/* ── KITCHEN PORTAL ───────────────────────────────────────── */}
        <Route element={<RoleGate roles={['canteen_staff', 'manager', 'admin']}><KitchenLayout /></RoleGate>}>
          <Route path="/kitchen/dashboard" element={<KitchenDashboard />} />
          <Route path="/kitchen/queue" element={<KitchenView />} />
          <Route path="/kitchen/manual-order" element={<ManualOrderEntry />} />
          <Route path="/kitchen/profile" element={<Profile />} />
        </Route>

        {/* ── MANAGER PORTAL (also reachable by Admin — same routes) ── */}
        <Route element={<RoleGate roles={['manager', 'admin']}><ManagerLayout /></RoleGate>}>
          <Route path="/manager/dashboard" element={<AdminDashboard />} />
          <Route path="/manager/menu" element={<AdminMenuManagement />} />
          <Route path="/manager/orders" element={<AdminAllOrders />} />
          <Route path="/manager/staff" element={<AdminStaffManagement />} />
          <Route path="/manager/coupons" element={<AdminCoupons />} />
          <Route path="/manager/feedback" element={<AdminFeedback />} />
          <Route path="/manager/support" element={<AdminSupportRequests />} />
          <Route path="/manager/reports" element={<AdminReports />} />
          <Route path="/manager/settings" element={<AdminSettings />} />
          <Route path="/manager/profile" element={<Profile />} />
        </Route>

        {/* ── ADMIN PORTAL (admin-only pages; shares /manager/* for the
             rest via the RoleGate above already allowing 'admin') ─── */}
        <Route element={<RoleGate roles={['admin']}><AdminLayout /></RoleGate>}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/staff" element={<AdminStaffManagement />} />
          <Route path="/admin/profile" element={<Profile />} />
        </Route>

        <Route path="/access-denied" element={<AccessDenied />} />
        <Route path="*" element={<PostLoginRedirect />} />
      </Routes>
    </div>
  );
}
