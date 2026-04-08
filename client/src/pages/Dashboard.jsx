import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { api } from '../api.js';
import { TrendingUp, Package, ShoppingCart, DollarSign, AlertTriangle, ChefHat, ArrowRightLeft, ShoppingBag } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, suffix = '', onClick }) {
  return (
    <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'1rem' }}>
        <div style={{ width:44, height:44, borderRadius:12, background:`${color}20`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={22} color={color}/>
        </div>
        <span style={{ fontSize:'0.7rem', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600 }}>Today</span>
      </div>
      <div style={{ fontSize:'1.875rem', fontWeight:700, color:'#fff', marginBottom:'0.25rem' }}>
        {suffix}{typeof value === 'number' ? (value % 1 === 0 ? value : value.toFixed(1)) : value}
      </div>
      <div style={{ fontSize:'0.875rem', color:'#64748b' }}>{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const today = new Date().toISOString().split('T')[0];
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', today],
    queryFn: () => api.get(`/dashboard?date=${today}`),
    refetchInterval: 30000,
  });
  const { data: allLowStock = [] } = useQuery({
    queryKey: ['analytics-low-stock'],
    queryFn: () => api.get('/analytics/low-stock'),
  });

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:'4rem' }}><div className="spinner"/></div>;
  if (error) return <div style={{ color:'#f87171', padding:'1rem' }}>Failed to load dashboard: {error.message}</div>;

  const d = data || {};
  const totalLowStock = allLowStock.length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ color:'#64748b', fontSize:'0.875rem', marginTop:'0.25rem' }}>{new Date().toLocaleDateString('en-GH', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
        <StatCard icon={Package}       label="Store Stock"          value={d.totalInventory ?? 0}   color="#f59e0b"/>
        <StatCard icon={ChefHat}       label="Produced Today"       value={d.totalProduced ?? 0}    color="#8b5cf6"/>
        <StatCard icon={ShoppingCart}  label="Orders Today"         value={d.totalOrders ?? 0}      color="#3b82f6"/>
        <StatCard icon={DollarSign}    label="Revenue Today"        value={d.totalRevenue ?? 0}     color="#10b981" suffix="₵"/>
        <StatCard icon={ArrowRightLeft}label="Transfers Today"      value={d.todayTransfers ?? 0}   color="#14b8a6" onClick={()=>navigate('/analytics')}/>
        <StatCard icon={ShoppingBag}   label="Pending Purchase Orders" value={d.pendingPOs ?? 0}   color={d.pendingPOs > 0 ? '#ef4444' : '#64748b'} onClick={()=>navigate('/purchase-orders')}/>
      </div>

      {/* Alert banner for pending POs */}
      {d.pendingPOs > 0 && (
        <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:12, padding:'0.875rem 1.25rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.75rem', cursor:'pointer' }} onClick={()=>navigate('/purchase-orders')}>
          <AlertTriangle size={18} color="#ef4444"/>
          <span style={{ color:'#fca5a5', fontWeight:500 }}>
            {d.pendingPOs} pending purchase order{d.pendingPOs !== 1 ? 's' : ''} require attention
          </span>
          <span style={{ marginLeft:'auto', fontSize:'0.8rem', color:'#ef4444' }}>View →</span>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(360px,1fr))', gap:'1rem' }}>
        {/* Low Stock Alerts (all depts) */}
        <div className="card">
          <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <AlertTriangle size={18} color="#f59e0b"/>
            <span style={{ fontWeight:600, color:'#fff' }}>Low Stock Alerts</span>
            {totalLowStock > 0 && <span className="badge badge-red" style={{ marginLeft:'auto' }}>{totalLowStock}</span>}
          </div>
          <div style={{ padding:'0.5rem 0' }}>
            {!totalLowStock ? (
              <div style={{ padding:'2rem 1.5rem', textAlign:'center', color:'#4a5568', fontSize:'0.875rem' }}>✅ All stock levels are healthy</div>
            ) : (
              allLowStock.map((item, i) => (
                <div key={i} style={{ padding:'0.75rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.03)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:500, color:'#fff', fontSize:'0.875rem' }}>{item.name}</div>
                    <div style={{ fontSize:'0.75rem', color:'#64748b' }}>{item.dept} · Reorder at {item.threshold}</div>
                  </div>
                  <span className="badge badge-red">Qty: {item.stock}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Today's Production */}
        <div className="card">
          <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <ChefHat size={18} color="#8b5cf6"/>
            <span style={{ fontWeight:600, color:'#fff' }}>Today's Production</span>
          </div>
          <div style={{ padding:'0.5rem 0' }}>
            {!d.todayProduction?.length ? (
              <div style={{ padding:'2rem 1.5rem', textAlign:'center', color:'#4a5568', fontSize:'0.875rem' }}>No production batches logged today</div>
            ) : (
              d.todayProduction.map(batch => (
                <div key={batch.id} style={{ padding:'0.75rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.03)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:500, color:'#fff', fontSize:'0.875rem' }}>{batch.product}</div>
                    <div style={{ fontSize:'0.75rem', color:'#64748b' }}>Baker: {batch.baker}</div>
                  </div>
                  <span className="badge badge-amber">{batch.quantityProduced} {batch.unit}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
