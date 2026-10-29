import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const HOME_BY_ROLE = {
  student: '/student/menu',
  staff: '/student/menu',
  canteen_staff: '/kitchen/dashboard',
  manager: '/manager/dashboard',
  admin: '/admin/dashboard',
};

export default function AccessDenied() {
  const { user } = useAuth();
  const home = HOME_BY_ROLE[user?.role] || '/login';

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center">
      <div className="card p-8 text-center max-w-sm">
        <p className="font-mono text-6xl text-chili mb-2">403</p>
        <h1 className="font-display text-2xl text-paper mb-2">Access Denied</h1>
        <p className="text-sm text-paper/60 mb-6">
          Your account role ({user?.role || 'unknown'}) doesn't have permission to view this page.
        </p>
        <Link to={home} className="btn-primary inline-block">Go to your dashboard</Link>
      </div>
    </div>
  );
}
