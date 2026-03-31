import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, ClipboardList } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];
const EMPTY = { product: '', quantityProduced: 0, unit: 'units', baker: '', note: '' };

export default function TodaysOrder() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const qc = useQueryClient();
  const [modal, setModal] = useState({ open: false, mode: 'create', data: EMPTY });
  const todayDate = today();

  const { data = [], isLoading } = useQuery({
    queryKey: ['production', todayDate],
    queryFn: () => api.get(`/production?date=${todayDate}`),
  });

  const save = useMutation({
    mutationFn: d => modal.mode === 'create'
      ? api.post('/production', d)
      : api.put(`/production/${modal.data.id}`, d),
    onSuccess: () => {
      qc.invalidateQueries(['production']);
      setModal(m => ({ ...m, open: false }));
      toast.success(modal.mode === 'create' ? 'Order added!' : 'Order updated!');
    },
    onError: e => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: id => api.delete(`/production/${id}`),
    onSuccess: () => { qc.invalidateQueries(['production']); toast.success('Order deleted'); },
    onError: e => toast.error(e.message),
  });

  function set(k, v) { setModal(m => ({ ...m, data: { ...m.data, [k]: v } })); }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Today's Order</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>{todayDate}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'create', data: EMPTY })}>
            <Plus size={16} />Add Order
          </button>
        )}
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {['#', 'Product', 'Unit', 'Qty Produced', 'Baker', 'Note', 'Actions'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#4a5568', padding: '3rem' }}>
                      <ClipboardList size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3, display: 'block' }} />
                      No orders logged for today.
                    </td>
                  </tr>
                ) : data.map((item, i) => (
                  <tr key={item.id}>
                    <td style={{ color: '#4a5568' }}>{i + 1}</td>
                    <td style={{ color: '#fff', fontWeight: 500 }}>{item.product}</td>
                    <td>{item.unit}</td>
                    <td><span className="badge badge-amber">{item.quantityProduced}</span></td>
                    <td>{item.baker}</td>
                    <td style={{ color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.note || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" style={{ padding: '0.375rem 0.75rem' }}
                          onClick={() => setModal({ open: true, mode: 'edit', data: { ...item } })}>
                          <Pencil size={14} />
                        </button>
                        {isAdmin && (
                          <button className="btn btn-danger" style={{ padding: '0.375rem 0.75rem' }}
                            onClick={() => { if (confirm('Delete this order?')) del.mutate(item.id); }}>
                            <Trash2 size={14} />
                          </button>
                        )}
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
              <h2 style={{ fontWeight: 700, color: '#fff', fontSize: '1.25rem' }}>
                {modal.mode === 'create' ? 'Add Today\'s Order' : 'Edit Order'}
              </h2>
              <button onClick={() => setModal(m => ({ ...m, open: false }))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              if (!modal.data.product || !modal.data.baker) { toast.error('Product and baker are required'); return; }
              save.mutate(modal.data);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label className="label">Product *</label><input className="input" value={modal.data.product} onChange={e => set('product', e.target.value)} placeholder="e.g. White Bread" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label className="label">Qty Produced *</label><input className="input" type="number" step="0.01" value={modal.data.quantityProduced} onChange={e => set('quantityProduced', e.target.value)} /></div>
                <div><label className="label">Unit</label><input className="input" value={modal.data.unit} onChange={e => set('unit', e.target.value)} placeholder="loaves, kg..." /></div>
              </div>
              <div><label className="label">Baker *</label><input className="input" value={modal.data.baker} onChange={e => set('baker', e.target.value)} placeholder="Baker's name" /></div>
              <div><label className="label">Note</label><textarea className="input" rows={3} value={modal.data.note} onChange={e => set('note', e.target.value)} placeholder="Optional notes..." style={{ resize: 'vertical' }} /></div>
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
