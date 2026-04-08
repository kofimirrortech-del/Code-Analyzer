import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../hooks/useAuth.jsx';
import { canView } from '../utils/permissions.js';
import {
  LayoutGrid, Package, Wheat, Factory, Archive, Truck,
  History as HistoryIcon, Settings, LogOut, Menu, X, ChefHat,
  ClipboardList, ClipboardCheck, BarChart2, ShoppingBag, Users as UsersIcon
} from 'lucide-react';

const ALL_NAV = [
  { path: '/',                  label: 'Dashboard',          icon: LayoutGrid,    section: null,               adminOnly: true },
  { path: '/store',             label: 'Store',              icon: Package,       section: 'store' },
  { path: '/ingredients',       label: 'Ingredients',        icon: Wheat,         section: 'ingredients' },
  { path: '/production',        label: 'Production',         icon: Factory,       section: 'production' },
  { path: '/bakery',            label: 'Bakery',             icon: ChefHat,       section: 'bakery' },
  { path: '/packaging',         label: 'Packaging',          icon: Archive,       section: 'packaging' },
  { path: '/dispatch',          label: 'Dispatch',           icon: Truck,         section: 'dispatch' },
  { path: '/todays-order',      label: "Today's Order",      icon: ClipboardList, section: 'todays-order' },
  { path: '/todays-production', label: "Today's Production", icon: ClipboardCheck,section: 'todays-production' },
  { path: '/analytics',         label: 'Analytics',          icon: BarChart2,     section: null, adminOnly: true },
  { path: '/purchase-orders',   label: 'Purchase Orders',    icon: ShoppingBag,   section: null, adminOnly: true },
  { path: '/users',             label: 'Users',              icon: UsersIcon,     section: null, adminOnly: true },
  { path: '/history',           label: 'History',            icon: HistoryIcon,   section: null, adminOnly: true },
  { path: '/settings',          label: 'Settings',           icon: Settings,      section: null, adminOnly: true },
];

function Sidebar({ user, onClose }) {
  const [location] = useLocation();
  const { logout, isLoggingOut } = useAuth();

  const items = ALL_NAV.filter(n => {
    if (n.adminOnly) return user.role === 'ADMIN';
    if (n.section) return canView(user, n.section);
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1.5rem 1.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(245,158,11,0.3)', flexShrink: 0 }}>
          <ChefHat size={20} color="#000" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>DEFFIZZY</div>
          <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Cloud ERP</div>
        </div>
      </div>

      <div style={{ padding: '0 1rem 0.75rem' }}>
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#f59e0b', fontSize: '0.8rem', flexShrink: 0 }}>
            {user.username[0].toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</div>
            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{user.role}</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '0 1rem', overflowY: 'auto' }}>
        {items.map(item => {
          const active = location === item.path || (item.path !== '/' && location.startsWith(item.path));
          return (
            <Link key={item.path} href={item.path} onClick={onClose}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.625rem 0.875rem', borderRadius: 10, marginBottom: 2,
                fontSize: '0.825rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                background: active ? 'rgba(245,158,11,0.1)' : 'transparent',
                color: active ? '#f59e0b' : '#94a3b8',
                border: active ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
              }}>
                <item.icon size={16} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '0.75rem 1rem 1rem' }}>
        <button onClick={() => logout()} disabled={isLoggingOut} className="btn btn-danger" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}>
          <LogOut size={15} />{isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!user) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a18' }}>
      <aside className="glass" style={{ width: 236, flexShrink: 0, display: 'none', flexDirection: 'column', borderTop: 'none', borderLeft: 'none', borderBottom: 'none', borderRadius: 0, minHeight: '100vh', position: 'sticky', top: 0 }} id="desktop-sidebar">
        <Sidebar user={user} onClose={() => {}} />
      </aside>

      <div className="glass" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }} id="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ChefHat size={20} color="#f59e0b" />
          <span style={{ fontWeight: 700, color: '#fff' }}>DEFFIZZY</span>
        </div>
        <button onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.5rem' }}><Menu size={20} /></button>
      </div>

      {mobileOpen && (
        <div className="overlay" style={{ justifyContent: 'flex-start', alignItems: 'stretch', padding: 0 }} onClick={() => setMobileOpen(false)}>
          <div className="glass" onClick={e => e.stopPropagation()} style={{ width: 236, height: '100%', flexShrink: 0, overflowY: 'auto', borderTop: 'none', borderLeft: 'none', borderBottom: 'none', borderRadius: 0, position: 'relative' }}>
            <button onClick={() => setMobileOpen(false)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
            <Sidebar user={user} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <main style={{ flex: 1, padding: '1.5rem', paddingTop: 'calc(56px + 1.5rem)', overflowY: 'auto', maxWidth: '100%' }} id="main-content">
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>{children}</div>
      </main>

      <style>{`
        @media (min-width: 1024px) {
          #desktop-sidebar { display: flex !important; }
          #mobile-topbar   { display: none !important; }
          #main-content    { padding-top: 1.5rem !important; }
        }
      `}</style>
    </div>
  );
}
