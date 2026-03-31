import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../hooks/useAuth.jsx';
import {
  LayoutGrid, Package, Wheat, Factory, Archive, Truck,
  History as HistoryIcon, Settings, LogOut, Menu, X, ChefHat
} from 'lucide-react';

const NAV = [
  { path: '/',            label: 'Dashboard',   icon: LayoutGrid, roles: ['ADMIN','STORE','INGREDIENT','PRODUCTION','PACKAGE','DISPATCH'] },
  { path: '/store',       label: 'Store',        icon: Package,    roles: ['ADMIN','STORE'] },
  { path: '/ingredients', label: 'Ingredients',  icon: Wheat,      roles: ['ADMIN','INGREDIENT'] },
  { path: '/production',  label: 'Production',   icon: Factory,    roles: ['ADMIN','PRODUCTION'] },
  { path: '/packaging',   label: 'Packaging',    icon: Archive,    roles: ['ADMIN','PACKAGE'] },
  { path: '/dispatch',    label: 'Dispatch',     icon: Truck,      roles: ['ADMIN','DISPATCH'] },
  { path: '/history',     label: 'History',      icon: HistoryIcon,roles: ['ADMIN','STORE','INGREDIENT','PRODUCTION','PACKAGE','DISPATCH'] },
  { path: '/settings',    label: 'Settings',     icon: Settings,   roles: ['ADMIN'] },
];

function Sidebar({ user, onClose }) {
  const [location] = useLocation();
  const { logout, isLoggingOut } = useAuth();
  const items = NAV.filter(n => n.roles.includes(user.role));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '2rem 1.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(245,158,11,0.3)' }}>
          <ChefHat size={22} color="#000" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.01em' }}>DEFFIZZY</div>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Cloud ERP</div>
        </div>
      </div>

      <div style={{ padding: '0 1rem 1rem' }}>
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#f59e0b', fontSize: '0.875rem' }}>
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#fff' }}>{user.username}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{user.role}</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '0 1rem', overflowY: 'auto' }}>
        {items.map(item => {
          const active = location === item.path || (item.path !== '/' && location.startsWith(item.path));
          return (
            <Link key={item.path} href={item.path} onClick={onClose}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: 12, marginBottom: 4,
                fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.15s',
                background: active ? 'rgba(245,158,11,0.1)' : 'transparent',
                color: active ? '#f59e0b' : '#94a3b8',
                border: active ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
              }}>
                <item.icon size={18} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '1rem' }}>
        <button onClick={() => logout()} disabled={isLoggingOut} className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }}>
          <LogOut size={16} />
          {isLoggingOut ? 'Logging out...' : 'Logout'}
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
      {/* Desktop sidebar */}
      <aside className="glass" style={{ width: 256, flexShrink: 0, display: 'none', flexDirection: 'column', borderTop: 'none', borderLeft: 'none', borderBottom: 'none', borderRadius: 0, minHeight: '100vh', position: 'sticky', top: 0 }}
        id="desktop-sidebar">
        <Sidebar user={user} onClose={() => {}} />
      </aside>

      {/* Mobile topbar */}
      <div className="glass" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 60, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }}
        id="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ChefHat size={22} color="#f59e0b" />
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>DEFFIZZY</span>
        </div>
        <button onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.5rem' }}>
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="overlay" style={{ justifyContent: 'flex-start', alignItems: 'stretch', padding: 0 }}
          onClick={() => setMobileOpen(false)}>
          <div className="glass" onClick={e => e.stopPropagation()}
            style={{ width: 256, height: '100%', flexShrink: 0, overflowY: 'auto', borderTop: 'none', borderLeft: 'none', borderBottom: 'none', borderRadius: 0, position: 'relative' }}>
            <button onClick={() => setMobileOpen(false)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <Sidebar user={user} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <main style={{ flex: 1, padding: '1.5rem', paddingTop: 'calc(60px + 1.5rem)', overflowY: 'auto', maxWidth: '100%' }} id="main-content">
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          {children}
        </div>
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
