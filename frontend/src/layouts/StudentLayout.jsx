import React from 'react';
import { Outlet } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import PortalLayout, { SidebarSection, SidebarLink } from './PortalLayout.jsx';

export default function StudentLayout() {
  const { count } = useCart();
  return (
    <PortalLayout
      portalName="Student"
      sidebar={
        <>
          <SidebarSection>
            <SidebarLink to="/student/menu">🍽️ Menu</SidebarLink>
            <SidebarLink to="/student/cart">🛒 Cart {count > 0 && `(${count})`}</SidebarLink>
          </SidebarSection>
          <SidebarSection title="Orders">
            <SidebarLink to="/student/orders">📦 My Orders</SidebarLink>
          </SidebarSection>
          <SidebarSection title="Rewards">
            <SidebarLink to="/student/wallet">💳 Wallet</SidebarLink>
          </SidebarSection>
          <SidebarSection title="Support">
            <SidebarLink to="/student/support">⭐ Suggest / Report</SidebarLink>
            <SidebarLink to="/student/faq">❓ FAQ & Help</SidebarLink>
          </SidebarSection>
          <SidebarSection title="Account">
            <SidebarLink to="/student/profile">👤 Profile</SidebarLink>
          </SidebarSection>
        </>
      }
    >
      <Outlet />
    </PortalLayout>
  );
}
