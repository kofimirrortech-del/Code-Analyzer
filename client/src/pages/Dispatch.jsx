import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, TrendingUp } from 'lucide-react';

const EMPTY = { notes: '', item: '', quantity: 0, unitCost: 0 };

export default function Dispatch() {
  const qc = useQueryClient();
  const [modal, setModal] = useState({ open: false, mode: 'create', data: EMPTY });
  const { data = [], isLoading } = useQuery({ queryKey: ['dispatch'], queryFn: () => api.get('/dispatch') });

  const save = useMutation({
    mutationFn: d => modal.mode === 'create' ? api.post('/dispatch', d) : api.put(`/dispatch/${modal.data.id}`, d),
    onSuccess: () => { qc.invalidateQueries(['dispatch']); setModal(m => ({ ...m, open: false })); toast.success(modal.mode === 'create' ? 'Order added!' : 'Order updated!'); },
    onError: e => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: id => api.delete(`/dispatch/${id}`),
    onSuccess: () => { qc.invalidateQueries(['dispatch']); toast.success('Order deleted'); },
    onError: e => toast.error(e.message),
  });

  function set(k, v) { setModal(m => ({ ...m, data: { ...m.data, [k]: v } })); }

  const grandTotal = data.reduce((s, o) => s + o.total, 0);
  const liveTotal = (parseFloat(modal.data.quantity) || 0) * (parseFloat(modal.data.unitCost) || 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dispatch / Orders</h1>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'create', data: EMPTY })}><Plus size={16} />Add Order</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontWeight: 600 }}>Total Orders</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>{data.length}</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <TrendingUp size={16} color="#10b981" />
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Grand Total</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>₵{grandTotal.toFixed(2)}</div>
        </div>
      </div>

      <div className="card">
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>{['#','Notes','Item','Quantity','Unit Cost (₵)','Total (₵)','Date','Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#4a5568', padding: '3rem' }}>No orders yet.</td></tr>
                ) : data.map((o, i) => (
                  <tr key={o.id}>
                    <td style={{ color: '#4a5568' }}>{i + 1}</td>
                    <td style={{ color: '#94a3b8', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.notes || '—'}</td>
                    <td style={{ color: '#fff', fontWeight: 500 }}>{o.item}</td>
                    <td>{o.quantity}</td>
                    <td>{o.unitCost.toFixed(2)}</td>
                    <td><span className="badge badge-green">₵{o.total.toFixed(2)}</span></td>
                    <td style={{ color: '#64748b' }}>{o.date}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" style={{ padding: '0.375rem 0.75rem' }} onClick={() => setModal({ open: true, mode: 'edit', data: { ...o } })}><Pencil size={14} /></button>
                        <button className="btn btn-danger" style={{ padding: '0.375rem 0.75rem' }} onClick={() => { if (confirm('Delete?')) del.mutate(o.id); }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.open && (
        <div className="overlay" onClick={() => setModal(m => ({ ...m, open: false }))}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 700, color: '#fff', fontSize: '1.25rem' }}>{modal.mode === 'create' ? 'Add Order' : 'Edit Order'}</h2>
              <button onClick={() => setModal(m => ({ ...m, open: false }))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); if (!modal.data.item) { toast.error('Item is required'); return; } save.mutate(modal.data); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label className="label">Item *</label><input className="input" value={modal.data.item} onChange={e => set('item', e.target.value)} placeholder="Product name" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label className="label">Quantity</label><input className="input" type="number" step="0.01" value={modal.data.quantity} onChange={e => set('quantity', e.target.value)} /></div>
                <div><label className="label">Unit Cost (₵)</label><input className="input" type="number" step="0.01" value={modal.data.unitCost} onChange={e => set('unitCost', e.target.value)} /></div>
              </div>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Total</span>
                <span style={{ fontWeight: 700, color: '#4ade80', fontSize: '1.25rem' }}>₵{liveTotal.toFixed(2)}</span>
              </div>
              <div><label className="label">Notes</label><input className="input" value={modal.data.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." /></div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
