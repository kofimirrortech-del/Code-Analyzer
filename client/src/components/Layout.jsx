import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { canView } from '../utils/permissions.js';
import toast from 'react-hot-toast';
import {
  LayoutGrid, Package, Wheat, Factory, Archive, Truck,
  History as HistoryIcon, Settings, LogOut, Menu, X, ChefHat,
  ClipboardList, ClipboardCheck, BarChart2, ShoppingBag, Users as UsersIcon,
  Bell, ChevronUp, ChevronDown, Send, FileBarChart2, Inbox, CheckCircle, AlertTriangle,
} from 'lucide-react';

const DEPT_FROM_ROLE = {
  STORE: 'store', INGREDIENT: 'ingredients', PRODUCTION: 'production',
  BAKERY: 'bakery', PACKAGE: 'packaging', DISPATCH: 'dispatch',
};

const ALL_NAV = [
  { path: '/',                  label: 'Dashboard',          icon: LayoutGrid,    section: null,               adminOnly: true },
  { path: '/summary-report',    label: 'Summary Report',     icon: FileBarChart2, section: null },
  { path: '/store',             label: 'Store',              icon: Package,       section: 'store' },
  { path: '/ingredients',       label: 'Ingredients',        icon: Wheat,         section: 'ingredients' },
  { path: '/production',        label: 'Production',         icon: Factory,       section: 'production' },
  { path: '/bakery',            label: 'Bakery',             icon: ChefHat,       section: 'bakery' },
  { path: '/packaging',         label: 'Packaging',          icon: Archive,       section: 'packaging' },
  { path: '/dispatch',          label: 'Dispatch',           icon: Truck,         section: 'dispatch' },
  { path: '/todays-order',      label: "Today's Order",      icon: ClipboardList, section: 'todays-order' },
  { path: '/todays-production', label: "Today's Production", icon: ClipboardCheck,section: 'todays-production' },
  { path: '/requests',          label: 'Requests',           icon: Inbox,         section: null },
  { path: '/analytics',         label: 'Analytics',          icon: BarChart2,     section: null, adminOnly: true },
  { path: '/purchase-orders',   label: 'Purchase Orders',    icon: ShoppingBag,   section: null, adminOnly: true },
  { path: '/users',             label: 'Users',              icon: UsersIcon,     section: null, adminOnly: true },
  { path: '/history',           label: 'History',            icon: HistoryIcon,   section: null, adminOnly: true },
  { path: '/settings',          label: 'Settings',           icon: Settings,      section: null, adminOnly: true },
];

const NOTIF_ICONS = { low_stock: AlertTriangle, request: Inbox, request_approved: CheckCircle, request_rejected: X };
const NOTIF_COLORS = { low_stock: '#ef4444', request: '#f59e0b', request_approved: '#10b981', request_rejected: '#64748b' };
const DEPTS = ['store','ingredients','production','bakery','packaging','dispatch'];

function RequestPanel({ user }) {
  const qc = useQueryClient();
  const fromDept = DEPT_FROM_ROLE[user.role] || 'store';
  const defaultTo = DEPTS.find(d => d !== fromDept) || 'store';
  const [open, setOpen] = useState(false);
  const [toDept, setToDept] = useState(defaultTo);
  const [note, setNote] = useState('');

  const submit = useMutation({
    mutationFn: () => api.post('/requests', { fromDept, toDept, note }),
    onSuccess: () => {
      qc.invalidateQueries(['requests']);
      qc.invalidateQueries(['notif-count']);
      toast.success('Request sent to admin for approval!');
      setNote('');
      setOpen(false);
    },
    onError: e => toast.error(e.message || 'Failed to send request'),
  });

  return (
    <div className="card" style={{ marginBottom: '1.25rem', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem', textAlign: 'left' }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Send size={13} color="#f59e0b" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.875rem' }}>Request Item from Another Department</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.1rem' }}>Submit a request — admin will review and approve</div>
        </div>
        {open ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
      </button>

      {open && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label">Your Department</label>
              <input className="input" value={fromDept.charAt(0).toUpperCase() + fromDept.slice(1)} readOnly style={{ background: 'rgba(100,116,139,0.08)', color: '#64748b' }} />
            </div>
            <div>
              <label className="label">Request From</label>
              <select className="input" value={toDept} onChange={e => setToDept(e.target.value)}>
                {DEPTS.filter(d => d !== fromDept).map(d => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Note — describe what you need</label>
            <textarea
              className="input"
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Need 50kg of flour urgently for tomorrow's batch..."
              style={{ resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={submit.isPending || !note.trim()}
              onClick={() => submit.mutate()}
            >
              <Send size={14} />
              {submit.isPending ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReorderModal({ allItems, onClose, onSave }) {
  const [order, setOrder] = useState(allItems.map(i => i.path));
  const move = (idx, dir) => {
    const next = [...order];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
  };
  const ordered = order.map(p => allItems.find(i => i.path === p)).filter(Boolean);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-container" style={{ width: 380 }} onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Reorder Sidebar</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: 420, overflowY: 'auto', marginBottom: '0.75rem' }}>
          {ordered.map((item, i) => (
            <div key={item.path} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
              <item.icon size={14} color="#64748b" />
              <span style={{ flex: 1, fontSize: '0.825rem', color: '#cbd5e1' }}>{item.label}</span>
              <button onClick={() => move(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', color: i === 0 ? '#2d3748' : '#64748b', cursor: i === 0 ? 'default' : 'pointer', padding: '0.2rem' }}><ChevronUp size={14} /></button>
              <button onClick={() => move(i, 1)} disabled={i === ordered.length - 1} style={{ background: 'none', border: 'none', color: i === ordered.length - 1 ? '#2d3748' : '#64748b', cursor: i === ordered.length - 1 ? 'default' : 'pointer', padding: '0.2rem' }}><ChevronDown size={14} /></button>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(order)}>Save Order</button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ user, onClose }) {
  const [location] = useLocation();
  const { logout, isLoggingOut } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user.role === 'ADMIN';

  const [notifOpen, setNotifOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);

  const { data: unreadData = { count: 0 } } = useQuery({
    queryKey: ['notif-count'], queryFn: () => api.get('/notifications/unread-count'), refetchInterval: 30000,
  });
  const { data: notifs = [] } = useQuery({
    queryKey: ['notifications'], queryFn: () => api.get('/notifications'),
    enabled: notifOpen, refetchInterval: notifOpen ? 30000 : false,
  });
  const { data: sidebarOrder } = useQuery({
    queryKey: ['sidebar-order'], queryFn: () => api.get('/notifications/sidebar-order'),
  });
  const markAllRead = useMutation({
    mutationFn: () => api.put('/notifications/read-all', {}),
    onSuccess: () => { qc.invalidateQueries(['notif-count']); qc.invalidateQueries(['notifications']); },
  });
  const saveOrder = useMutation({
    mutationFn: order => api.put('/notifications/sidebar-order', { order }),
    onSuccess: () => { qc.invalidateQueries(['sidebar-order']); setReorderOpen(false); toast.success('Sidebar order saved!'); },
  });

  const baseItems = ALL_NAV.filter(n => {
    if (n.adminOnly) return isAdmin;
    if (n.section) return canView(user, n.section);
    return true;
  });

  const items = sidebarOrder
    ? [...baseItems].sort((a, b) => {
        const ai = sidebarOrder.indexOf(a.path);
        const bi = sidebarOrder.indexOf(b.path);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : baseItems;

  const unread = unreadData.count;

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
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</div>
            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{user.role}</div>
          </div>
          <button onClick={() => setNotifOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '0.25rem', color: unread > 0 ? '#f59e0b' : '#64748b', flexShrink: 0 }}>
            <Bell size={16} />
            {unread > 0 && (
              <span style={{ position: 'absolute', top: -1, right: -1, background: '#ef4444', borderRadius: '50%', width: 14, height: 14, fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>
      </div>

      {notifOpen && (
        <div style={{ margin: '0 1rem 0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '0.625rem 0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>Notifications</span>
            <button onClick={() => markAllRead.mutate()} style={{ fontSize: '0.65rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {notifs.length === 0 && <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: '#4a5568' }}>No notifications</div>}
            {notifs.slice(0, 12).map(n => {
              const Icon = NOTIF_ICONS[n.type] || Bell;
              const color = NOTIF_COLORS[n.type] || '#64748b';
              return (
                <div key={n.id} style={{ padding: '0.625rem 0.875rem', borderBottom: '1px solid rgba(255,255,255,0.04)', background: n.isRead ? 'transparent' : 'rgba(245,158,11,0.04)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <Icon size={13} color={color} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.75rem', color: '#fff', fontWeight: n.isRead ? 400 : 600 }}>{n.title}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>{n.message}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      <div style={{ padding: '0.5rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {isAdmin && (
          <button onClick={() => setReorderOpen(true)} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', gap: '0.4rem' }}>
            <ChevronUp size={14} /><ChevronDown size={14} style={{ marginLeft: -6 }} /> Reorder Sidebar
          </button>
        )}
        <button onClick={() => logout()} disabled={isLoggingOut} className="btn btn-danger" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}>
          <LogOut size={15} />{isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>

      {reorderOpen && isAdmin && (
        <ReorderModal
          allItems={ALL_NAV}
          onClose={() => setReorderOpen(false)}
          onSave={order => saveOrder.mutate(order)}
        />
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const mainRef = useRef(null);
  const lastScrollY = useRef(0);

  const { data: requestDepts = [] } = useQuery({
    queryKey: ['request-depts'], queryFn: () => api.get('/notifications/request-depts'),
    enabled: !!user,
  });

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const handler = () => {
      const cur = el.scrollTop;
      const delta = cur - lastScrollY.current;
      if (delta > 20) setSidebarVisible(false);
      else if (delta < -10) setSidebarVisible(true);
      lastScrollY.current = cur;
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  if (!user) return null;
  const isAdmin = user.role === 'ADMIN';
  const userDept = DEPT_FROM_ROLE[user.role] || '';
  const canRequest = !isAdmin && requestDepts.includes(userDept);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a18' }}>
      <div id="sidebar-wrapper" style={{ width: sidebarVisible ? 236 : 0, flexShrink: 0, overflow: 'hidden', transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)', display: 'none' }}>
        <aside className="glass" id="desktop-sidebar" style={{ width: 236, flexShrink: 0, display: 'flex', flexDirection: 'column', borderTop: 'none', borderLeft: 'none', borderBottom: 'none', borderRadius: 0, minHeight: '100vh', position: 'sticky', top: 0 }}>
          <Sidebar user={user} onClose={() => {}} />
        </aside>
      </div>

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

      <main ref={mainRef} style={{ flex: 1, padding: '1.5rem', paddingTop: 'calc(56px + 1.5rem)', overflowY: 'auto', maxWidth: '100%' }} id="main-content">
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {canRequest && <RequestPanel user={user} />}
          {children}
        </div>
      </main>

      <style>{`
        @media (min-width: 1024px) {
          #sidebar-wrapper { display: flex !important; }
          #mobile-topbar   { display: none !important; }
        }
      `}</style>
    </div>
  );
}
