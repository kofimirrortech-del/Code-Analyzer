import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { api } from '../api.js';
import { Package, Wheat, Factory, ChefHat, Archive, Truck, AlertTriangle, TrendingUp } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];

const DEPTS = [
  { key: 'store',       label: 'Store',       icon: Package,  color: '#f59e0b', path: '/store',
    fetch: () => api.get(`/store?date=${today()}`),
    total: d => d.reduce((s, r) => s + (r.closingStock ?? 0), 0),
    low:   d => d.filter(r => r.lowStockThreshold > 0 && r.closingStock < r.lowStockThreshold).length,
  },
  { key: 'ingredients', label: 'Ingredients', icon: Wheat,    color: '#8b5cf6', path: '/ingredients',
    fetch: () => api.get(`/ingredients?date=${today()}`),
    total: d => d.reduce((s, r) => s + (r.closingStock ?? 0), 0),
    low:   d => d.filter(r => r.lowStockThreshold > 0 && r.closingStock < r.lowStockThreshold).length,
  },
  { key: 'production',  label: 'Production',  icon: Factory,  color: '#3b82f6', path: '/production',
    fetch: () => api.get(`/production?date=${today()}`),
    total: d => d.reduce((s, r) => s + (r.quantityProduced ?? 0), 0),
    low:   () => 0,
  },
  { key: 'bakery',      label: 'Bakery',      icon: ChefHat,  color: '#ec4899', path: '/bakery',
    fetch: () => api.get(`/bakery?date=${today()}`),
    total: d => d.reduce((s, r) => s + (r.quantity ?? 0), 0),
    low:   d => d.filter(r => r.lowStockThreshold > 0 && r.quantity < r.lowStockThreshold).length,
  },
  { key: 'packaging',   label: 'Packaging',   icon: Archive,  color: '#14b8a6', path: '/packaging',
    fetch: () => api.get(`/packages?date=${today()}`),
    total: d => d.reduce((s, r) => s + (r.closingStock ?? 0), 0),
    low:   d => d.filter(r => r.lowStockThreshold > 0 && r.closingStock < r.lowStockThreshold).length,
  },
  { key: 'dispatch',    label: 'Dispatch',    icon: Truck,    color: '#ef4444', path: '/dispatch',
    fetch: () => api.get(`/dispatch?date=${today()}`),
    total: d => d.reduce((s, r) => s + (r.quantity ?? 0), 0),
    low:   () => 0,
  },
];

function DeptCard({ dept, navigate }) {
  const { data = [], isLoading } = useQuery({
    queryKey: [dept.key + '-summary', today()],
    queryFn: dept.fetch,
  });

  const total = dept.total(data);
  const lowCount = dept.low(data);
  const itemCount = data.length;
  const Icon = dept.icon;

  return (
    <div
      onClick={() => navigate(dept.path)}
      style={{
        background: 'rgba(255,255,255,0.03)', border: `1px solid ${dept.color}22`,
        borderRadius: 14, padding: '1.25rem', cursor: 'pointer', transition: 'all 0.15s',
        position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${dept.color}0d`; e.currentTarget.style.borderColor = `${dept.color}55`; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = `${dept.color}22`; }}
    >
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `${dept.color}10` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${dept.color}15`, border: `1px solid ${dept.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} color={dept.color} />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.925rem' }}>{dept.label}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Today · {today()}</div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><div className="spinner" style={{ width: 20, height: 20 }} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '0.75rem' }}>
            <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Items</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{itemCount}</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '0.75rem' }}>
            <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
              {dept.key === 'production' ? 'Produced' : 'Stock'}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: dept.color }}>{total.toFixed(0)}</div>
          </div>
          {lowCount > 0 && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
              <AlertTriangle size={13} color="#ef4444" />
              <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>{lowCount} low stock {lowCount === 1 ? 'item' : 'items'}</span>
            </div>
          )}
          {itemCount === 0 && (
            <div style={{ gridColumn: '1 / -1', fontSize: '0.75rem', color: '#4a5568', textAlign: 'center', padding: '0.5rem 0' }}>No records yet today</div>
          )}
        </div>
      )}

      <div style={{ marginTop: '0.875rem', fontSize: '0.75rem', color: dept.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        View Department →
      </div>
    </div>
  );
}

export default function SummaryReport() {
  const [, navigate] = useLocation();

  const totalQueries = DEPTS.map(d => useQuery({
    queryKey: [d.key + '-summary', today()],
    queryFn: d.fetch,
  }));
  const totalLow = totalQueries.reduce((sum, q, i) => sum + DEPTS[i].low(q.data || []), 0);
  const totalItems = totalQueries.reduce((sum, q) => sum + (q.data || []).length, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Summary Report</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>All departments at a glance · {today()}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <TrendingUp size={20} color="#10b981" />
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Departments</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{DEPTS.length}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Package size={20} color="#f59e0b" />
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Items Today</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{totalItems}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} color={totalLow > 0 ? '#ef4444' : '#64748b'} />
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Low Stock</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: totalLow > 0 ? '#ef4444' : '#fff' }}>{totalLow}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {DEPTS.map(dept => <DeptCard key={dept.key} dept={dept} navigate={navigate} />)}
      </div>
    </div>
  );
}
