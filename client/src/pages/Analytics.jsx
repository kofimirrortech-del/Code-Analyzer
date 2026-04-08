import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import { BarChart2, AlertTriangle, ArrowRightLeft, TrendingUp, Package, Wheat, Factory, Archive, Truck, ChefHat } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];

const DEPT_META = {
  store:       { label:'Store',       icon:Package, color:'#3b82f6' },
  ingredients: { label:'Ingredients', icon:Wheat,   color:'#10b981' },
  production:  { label:'Production',  icon:Factory, color:'#8b5cf6' },
  bakery:      { label:'Bakery',      icon:ChefHat, color:'#ec4899' },
  packaging:   { label:'Packaging',   icon:Archive, color:'#14b8a6' },
  dispatch:    { label:'Dispatch',    icon:Truck,   color:'#f97316' },
};

function DeptCard({ deptKey, data }) {
  const meta = DEPT_META[deptKey] || {};
  const Icon = meta.icon || Package;
  const val = deptKey === 'dispatch' ? (data?.revenue ?? 0) : (data?.stock ?? 0);
  const label = deptKey === 'dispatch' ? 'Revenue (₵)' : 'Total Stock';
  return (
    <div className="stat-card">
      <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1rem' }}>
        <div style={{ width:40, height:40, borderRadius:10, background:`${meta.color}20`, border:`1px solid ${meta.color}30`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={20} color={meta.color}/>
        </div>
        <div style={{ fontSize:'0.875rem', fontWeight:600, color:'#94a3b8' }}>{meta.label}</div>
      </div>
      <div style={{ fontSize:'1.75rem', fontWeight:700, color:'#fff' }}>{val.toLocaleString()}</div>
      <div style={{ fontSize:'0.75rem', color:'#64748b', marginTop:'0.25rem' }}>{label} · {data?.count ?? 0} items</div>
    </div>
  );
}

function StockBar({ name, dept, stock, threshold }) {
  const pct = threshold > 0 ? Math.min(100, (stock / threshold) * 100) : 0;
  const color = stock < threshold * 0.5 ? '#ef4444' : stock < threshold ? '#f59e0b' : '#10b981';
  return (
    <div style={{ marginBottom:'0.75rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.3rem', fontSize:'0.8rem' }}>
        <span style={{ color:'#fff', fontWeight:500 }}>{name} <span style={{ color:'#64748b', fontSize:'0.7rem' }}>({dept})</span></span>
        <span style={{ color }}>{stock} / {threshold}</span>
      </div>
      <div style={{ height:6, borderRadius:3, background:'rgba(255,255,255,0.06)' }}>
        <div style={{ height:'100%', borderRadius:3, background:color, width:`${pct}%`, transition:'width 0.3s' }}/>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [date] = useState(today());
  const { data: overview } = useQuery({ queryKey:['analytics-overview',date], queryFn:()=>api.get(`/analytics/overview?date=${date}`) });
  const { data: lowStock = [] } = useQuery({ queryKey:['analytics-low-stock'], queryFn:()=>api.get('/analytics/low-stock') });
  const { data: transfers = [] } = useQuery({ queryKey:['analytics-transfers'], queryFn:()=>api.get('/analytics/transfers') });
  const { data: trends = [] } = useQuery({ queryKey:['analytics-trends'], queryFn:()=>api.get('/analytics/dispatch-trends') });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics & Reports</h1>
          <p style={{ color:'#64748b', fontSize:'0.875rem', marginTop:'0.25rem' }}>Real-time inventory performance</p>
        </div>
      </div>

      {/* Department overview */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
        {Object.keys(DEPT_META).map(k => <DeptCard key={k} deptKey={k} data={overview?.[k]} />)}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(360px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
        {/* Low Stock */}
        <div className="card">
          <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <AlertTriangle size={18} color="#f59e0b"/>
            <span style={{ fontWeight:600, color:'#fff' }}>Low Stock Alerts</span>
            {lowStock.length > 0 && <span className="badge badge-red" style={{ marginLeft:'auto' }}>{lowStock.length}</span>}
          </div>
          <div style={{ padding:'1rem 1.5rem' }}>
            {!lowStock.length
              ? <p style={{ color:'#4a5568', textAlign:'center', padding:'1.5rem 0', fontSize:'0.875rem' }}>✅ All stock levels healthy</p>
              : lowStock.map((i,idx) => <StockBar key={idx} name={i.name} dept={i.dept} stock={i.stock} threshold={i.threshold}/>)
            }
          </div>
        </div>

        {/* Transfer summary */}
        <div className="card">
          <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <ArrowRightLeft size={18} color="#8b5cf6"/>
            <span style={{ fontWeight:600, color:'#fff' }}>Recent Transfers</span>
            <span style={{ marginLeft:'auto', fontSize:'0.75rem', color:'#64748b' }}>{transfers.length} total</span>
          </div>
          <div style={{ maxHeight:320, overflowY:'auto' }}>
            {!transfers.length
              ? <p style={{ color:'#4a5568', textAlign:'center', padding:'2rem', fontSize:'0.875rem' }}>No transfers yet</p>
              : transfers.slice(0,20).map(t => (
                <div key={t.id} style={{ padding:'0.75rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.03)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:500, color:'#fff', fontSize:'0.8rem' }}>{t.itemName}</div>
                    <div style={{ fontSize:'0.7rem', color:'#64748b' }}>{t.fromDept} → {t.toDept} · {t.date}</div>
                  </div>
                  <span className="badge badge-amber">{t.quantity} {t.unit}</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* Dispatch Trends */}
      <div className="card">
        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <TrendingUp size={18} color="#10b981"/>
          <span style={{ fontWeight:600, color:'#fff' }}>Dispatch Trends (last 30 days)</span>
        </div>
        <div style={{ padding:'0.5rem 0' }}>
          {!trends.length
            ? <p style={{ color:'#4a5568', textAlign:'center', padding:'2rem', fontSize:'0.875rem' }}>No dispatch data yet</p>
            : trends.slice(0,14).map(d => {
                const maxRev = Math.max(...trends.map(t=>t.revenue), 1);
                const pct = (d.revenue / maxRev) * 100;
                return (
                  <div key={d.date} style={{ padding:'0.5rem 1.5rem', display:'flex', alignItems:'center', gap:'1rem', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ width:90, fontSize:'0.75rem', color:'#64748b', flexShrink:0 }}>{d.date}</span>
                    <div style={{ flex:1, height:16, background:'rgba(255,255,255,0.04)', borderRadius:4 }}>
                      <div style={{ height:'100%', borderRadius:4, background:'linear-gradient(90deg,#10b981,#059669)', width:`${pct}%` }}/>
                    </div>
                    <span style={{ width:70, textAlign:'right', fontSize:'0.75rem', color:'#10b981', fontWeight:600 }}>₵{d.revenue.toFixed(0)}</span>
                    <span style={{ width:50, textAlign:'right', fontSize:'0.7rem', color:'#64748b' }}>{d.orders} orders</span>
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}
