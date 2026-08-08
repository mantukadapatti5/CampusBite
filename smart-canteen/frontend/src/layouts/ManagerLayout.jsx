import React from 'react';
import { Outlet } from 'react-router-dom';
import PortalLayout, { SidebarSection, SidebarLink } from './PortalLayout.jsx';

export default function ManagerLayout() {
  return (
    <PortalLayout
      portalName="Manager"
      sidebar={
        <>
          <SidebarSection>
            <SidebarLink to="/manager/dashboard">🏠 Dashboard</SidebarLink>
          </SidebarSection>
          <SidebarSection title="Menu">
            <SidebarLink to="/manager/menu">🍽️ Menu Management</SidebarLink>
          </SidebarSection>
          <SidebarSection title="Operations">
            <SidebarLink to="/manager/orders">🛒 All Orders</SidebarLink>
            <SidebarLink to="/manager/staff">👨‍🍳 Kitchen Staff</SidebarLink>
          </SidebarSection>
          <SidebarSection title="Growth">
            <SidebarLink to="/manager/coupons">🎁 Coupons & Offers</SidebarLink>
            <SidebarLink to="/manager/feedback">⭐ Feedback</SidebarLink>
            <SidebarLink to="/manager/support">📩 Suggestions & Issues</SidebarLink>
          </SidebarSection>
          <SidebarSection title="Insights">
            <SidebarLink to="/manager/reports">📊 Reports & Analytics</SidebarLink>
          </SidebarSection>
          <SidebarSection title="Canteen">
            <SidebarLink to="/manager/settings">⚙️ Canteen Settings</SidebarLink>
          </SidebarSection>
          <SidebarSection title="Account">
            <SidebarLink to="/manager/profile">👤 Profile</SidebarLink>
          </SidebarSection>
        </>
      }
    >
      <Outlet />
    </PortalLayout>
  );
}
