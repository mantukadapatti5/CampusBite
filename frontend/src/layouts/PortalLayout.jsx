import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function SidebarLink({ to, children }) {
  const location = useLocation();
  const active = location.pathname === to || location.pathname.startsWith(to + '/');
  return (
    <Link
      to={to}
      className={`block px-3 py-2 rounded-lg text-sm transition ${
        active ? 'bg-signal/15 text-signal' : 'text-paper/70 hover:text-paper hover:bg-white/5'
      }`}
    >
      {children}
    </Link>
  );
}

export function SidebarSection({ title, children }) {
  return (
    <div className="mb-4">
      {title && <p className="text-[10px] uppercase tracking-wider text-paper/30 px-3 mb-1">{title}</p>}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export default function PortalLayout({ portalName, sidebar, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink flex">
      <aside className="w-56 shrink-0 bg-panel border-r border-white/5 min-h-screen p-3 hidden md:flex md:flex-col">
        <div className="px-2 py-3 mb-2">
          <p className="font-display text-xl text-paper tracking-wide">SMART CANTEEN</p>
          <p className="text-[10px] font-mono text-signalDim uppercase">{portalName} portal</p>
        </div>
        <nav className="flex-1 overflow-y-auto">{sidebar}</nav>
        <div className="border-t border-white/5 pt-3 mt-3 px-2">
          <p className="text-xs text-paper/60 truncate">{user?.name}</p>
          <p className="text-[10px] font-mono text-paper/30 uppercase">{user?.role}</p>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="btn-ghost text-xs py-1 px-2 mt-2 w-full"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* compact top bar for mobile, since the sidebar is hidden below md */}
        <div className="md:hidden border-b border-white/5 bg-panel px-4 py-3 flex items-center justify-between">
          <span className="font-display text-lg text-paper">{portalName}</span>
          <button onClick={() => { logout(); navigate('/login'); }} className="text-xs text-paper/60">Logout</button>
        </div>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
