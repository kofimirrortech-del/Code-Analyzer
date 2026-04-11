import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { canEdit } from '../utils/permissions.js';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Tag, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];
const EMPTY = { notes: '', item: '', quantity: 0, unitCost: 0, openingStock: 0, addedStock: 0, lowStockThreshold: 0, unit: 'units', supplier: '' };

export default function Dispatch() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const editable = canEdit(user, 'dispatch');
  const qc = useQueryClient();
  const [modal, setModal] = useState({ open: false, mode: 'create', data: { ...EMPTY } });
  const [newItem, setNewItem] = useState('');
  const [namesOpen, setNamesOpen] = useState(false);

  const { data: items = [] } = useQuery({ queryKey: ['dispatch-items'], queryFn: () => api.get('/dispatch/items') });
  const { data = [], isLoading } = useQuery({ queryKey: ['dispatch', today()], queryFn: () => api.get(`/dispatch?date=${today()}`) });

  const addItem = useMutation({
    mutationFn: name => api.post('/dispatch/items', { name }),
    onSuccess: () => { qc.invalidateQueries(['dispatch-items']); setNewItem(''); toast.success('Item added!'); },
    onError: e => toast.error(e.message),
  });
  const deleteItem = useMutation({
    mutationFn: id => api.delete(`/dispatch/items/${id}`),
    onSuccess: () => { qc.invalidateQueries(['dispatch-items']); toast.success('Item removed'); },
    onError: e => toast.error(e.message),
  });
  const save = useMutation({
    mutationFn: d => modal.mode === 'create' ? api.post('/dispatch', d) : api.put(`/dispatch/${modal.data.id}`, d),
    onSuccess: () => { qc.invalidateQueries(['dispatch']); qc.invalidateQueries(['dispatch-items']); setModal(m => ({ ...m, open: false })); toast.success(modal.mode === 'create' ? 'Order added!' : 'Order updated!'); },
    onError: e => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: id => api.delete(`/dispatch/${id}`),
    onSuccess: () => { qc.invalidateQueries(['dispatch']); toast.success('Order deleted'); },
    onError: e => toast.error(e.message),
  });

  function set(k, v) { setModal(m => ({ ...m, data: { ...m.data, [k]: v } })); }

  async function onItemChange(name) {
    set('item', name);
    if (modal.mode === 'create' && name) {
      try {
        const res = await api.get(`/dispatch/last-closing?itemName=${encodeURIComponent(name)}`);
        set('openingStock', res.closingStock ?? 0);
      } catch { /* ignore */ }
    }
  }

  const grandTotal = data.reduce((s, o) => s + o.total, 0);
  const liveTotal = (parseFloat(modal.data.quantity) || 0) * (parseFloat(modal.data.unitCost) || 0);
  const liveClosing = (parseFloat(modal.data.openingStock) || 0) + (parseFloat(modal.data.addedStock) || 0) - (parseFloat(modal.data.quantity) || 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dispatch / Orders</h1>
        {editable && <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'create', data: { ...EMPTY } })}><Plus size={16} />Add Order</button>}
      </div>

      {isAdmin && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <button onClick={() => setNamesOpen(o => !o)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.25rem', textAlign: 'left' }}>
            <Tag size={15} color="#10b981" />
            <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.875rem' }}>Persistent Item Names</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.25rem' }}>({items.length})</span>
            <span style={{ marginLeft: 'auto', color: '#64748b', display: 'flex' }}>{namesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
          </button>
          {namesOpen && (
            <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '0.75rem 0' }}>
                {items.map(it => (
                  <span key={it.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 9999, fontSize: '0.8rem', color: '#4ade80' }}>
                    {it.name}
                    <button onClick={() => { if (confirm(`Remove "${it.name}"?`)) deleteItem.mutate(it.id); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex' }}><X size={12} /></button>
                  </span>
                ))}
                {items.length === 0 && <span style={{ color: '#4a5568', fontSize: '0.8rem' }}>No items yet</span>}
              </div>
              <form onSubmit={e => { e.preventDefault(); if (!newItem.trim()) return; addItem.mutate(newItem.trim()); }} style={{ display: 'flex', gap: '0.5rem' }}>
                <input className="input" value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Add new item name..." style={{ flex: 1 }} />
                <button type="submit" className="btn btn-primary" disabled={addItem.isPending}><Plus size={16} />Add</button>
              </form>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontWeight: 600 }}>Today's Orders</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>{data.length}</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <TrendingUp size={16} color="#10b981" />
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Today's Total</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>₵{grandTotal.toFixed(2)}</div>
        </div>
      </div>

      <div className="card">
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>{['#', 'Item', 'Opening', 'Added', 'Dispatched', 'Closing', 'Threshold', 'Unit Cost (₵)', 'Total (₵)', 'Unit', 'Supplier', 'Notes', 'Recorded By', 'Date', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={15} style={{ textAlign: 'center', color: '#4a5568', padding: '3rem' }}>No orders for today.</td></tr>
                ) : data.map((o, i) => (
                  <tr key={o.id}>
                    <td style={{ color: '#4a5568' }}>{i + 1}</td>
                    <td style={{ color: '#fff', fontWeight: 500 }}>{o.item}</td>
                    <td>{o.openingStock}</td>
                    <td>{o.addedStock}</td>
                    <td>{o.quantity}</td>
                    <td><span className={o.isLowStock ? 'badge badge-red' : 'badge badge-green'}>{o.closingStock}</span></td>
                    <td style={{ color: '#64748b' }}>{o.lowStockThreshold || '—'}</td>
                    <td>{o.unitCost.toFixed(2)}</td>
                    <td><span className="badge badge-green">₵{o.total.toFixed(2)}</span></td>
                    <td style={{ color: '#64748b' }}>{o.unit}</td>
                    <td style={{ color: '#64748b' }}>{o.supplier || '—'}</td>
                    <td style={{ color: '#94a3b8', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.notes || '—'}</td>
                    <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{o.recordedBy || '—'}</td>
                    <td style={{ color: '#64748b' }}>{o.date}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {editable && <button className="btn btn-ghost" style={{ padding: '0.375rem 0.75rem' }} onClick={() => setModal({ open: true, mode: 'edit', data: { ...o } })}><Pencil size={14} /></button>}
                        {isAdmin && <button className="btn btn-danger" style={{ padding: '0.375rem 0.75rem' }} onClick={() => { if (confirm('Delete?')) del.mutate(o.id); }}><Trash2 size={14} /></button>}
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
              <h2 style={{ fontWeight: 700, color: '#fff', fontSize: '1.25rem' }}>{modal.mode === 'create' ? 'Add Dispatch Order' : 'Edit Order'}</h2>
              <button onClick={() => setModal(m => ({ ...m, open: false }))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); if (!modal.data.item) { toast.error('Item is required'); return; } save.mutate(modal.data); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Item *</label>
                <input list="dispatch-items-dl" className="input" value={modal.data.item} onChange={e => onItemChange(e.target.value)} placeholder="Select or type item..." />
                <datalist id="dispatch-items-dl">{items.map(it => <option key={it.id} value={it.name} />)}</datalist>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Opening Stock {modal.mode === 'create' && <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>(auto-filled)</span>}</label>
                  <input className="input" type="number" step="0.01" value={modal.data.openingStock} onChange={e => set('openingStock', e.target.value)} style={modal.mode === 'create' ? { background: 'rgba(100,116,139,0.08)', color: '#94a3b8' } : {}} />
                </div>
                <div><label className="label">Added Stock (Received)</label><input className="input" type="number" step="0.01" value={modal.data.addedStock} onChange={e => set('addedStock', e.target.value)} /></div>
                <div><label className="label">Qty Dispatched</label><input className="input" type="number" step="0.01" value={modal.data.quantity} onChange={e => set('quantity', e.target.value)} /></div>
                <div><label className="label">Unit Cost (₵)</label><input className="input" type="number" step="0.01" value={modal.data.unitCost} onChange={e => set('unitCost', e.target.value)} /></div>
                <div><label className="label">Low Stock Threshold</label><input className="input" type="number" step="0.01" value={modal.data.lowStockThreshold} onChange={e => set('lowStockThreshold', e.target.value)} placeholder="0 = disabled" /></div>
                <div><label className="label">Unit</label><input className="input" value={modal.data.unit} onChange={e => set('unit', e.target.value)} placeholder="units, boxes..." /></div>
                <div style={{ gridColumn: '1 / -1' }}><label className="label">Supplier / Customer</label><input className="input" value={modal.data.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Supplier or customer name" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '0.75rem 1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8 }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Sale</span>
                  <div style={{ fontWeight: 700, color: '#4ade80', fontSize: '1.1rem' }}>₵{liveTotal.toFixed(2)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Closing Stock</span>
                  <div style={{ fontWeight: 700, color: liveClosing < 0 ? '#f87171' : '#fff', fontSize: '1.1rem' }}>{liveClosing.toFixed(2)}</div>
                </div>
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
