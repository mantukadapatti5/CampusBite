import React from 'react';
import { Outlet } from 'react-router-dom';
import PortalLayout, { SidebarSection, SidebarLink } from './PortalLayout.jsx';

export default function KitchenLayout() {
  return (
    <PortalLayout
      portalName="Kitchen"
      sidebar={
        <>
          <SidebarSection>
            <SidebarLink to="/kitchen/dashboard">🏠 Dashboard</SidebarLink>
            <SidebarLink to="/kitchen/queue">🔴 Live Order Queue</SidebarLink>
            <SidebarLink to="/kitchen/manual-order">➕ Manual Order Entry</SidebarLink>
          </SidebarSection>
          <SidebarSection title="Account">
            <SidebarLink to="/kitchen/profile">👤 Profile</SidebarLink>
          </SidebarSection>
        </>
      }
    >
      <Outlet />
    </PortalLayout>
  );
}
