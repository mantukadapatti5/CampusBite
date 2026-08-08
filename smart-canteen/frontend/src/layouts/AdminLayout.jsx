import React from 'react';
import { Outlet } from 'react-router-dom';
import PortalLayout, { SidebarSection, SidebarLink } from './PortalLayout.jsx';

export default function AdminLayout() {
  return (
    <PortalLayout
      portalName="Admin"
      sidebar={
        <>
          <SidebarSection>
            <SidebarLink to="/admin/dashboard">🏠 Admin Dashboard</SidebarLink>
          </SidebarSection>
          <SidebarSection title="System">
            <SidebarLink to="/admin/staff">👥 User Management</SidebarLink>
          </SidebarSection>
          {/* Admin has full access to everything Manager can do too — same
              routes, same pages, the route guard just allows both roles in.
              No point duplicating these screens under /admin/*. */}
          <SidebarSection title="Canteen Operations (shared with Manager)">
            <SidebarLink to="/manager/menu">🍽️ Menu Management</SidebarLink>
            <SidebarLink to="/manager/orders">🛒 All Orders</SidebarLink>
            <SidebarLink to="/manager/coupons">🎁 Coupons & Offers</SidebarLink>
            <SidebarLink to="/manager/feedback">⭐ Feedback</SidebarLink>
            <SidebarLink to="/manager/support">📩 Suggestions & Issues</SidebarLink>
            <SidebarLink to="/manager/reports">📊 Reports & Analytics</SidebarLink>
            <SidebarLink to="/manager/settings">⚙️ Canteen Settings</SidebarLink>
          </SidebarSection>
          <SidebarSection title="Account">
            <SidebarLink to="/admin/profile">👤 Profile</SidebarLink>
          </SidebarSection>
        </>
      }
    >
      <Outlet />
    </PortalLayout>
  );
}
