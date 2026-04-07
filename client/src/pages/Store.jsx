import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Tag } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];
const EMPTY = { itemName: '', quantity: 0, addedStock: 0, closingStock: 0, lowStockThreshold: 0, unit: 'units', supplier: '' };

export default function Store() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const qc = useQueryClient();
  const [modal, setModal] = useState({ open: false, mode: 'create', data: EMPTY });
  const [newName, setNewName] = useState('');

  const { data: names = [] } = useQuery({ queryKey: ['store-names'], queryFn: () => api.get('/store/names') });
  const { data = [], isLoading } = useQuery({ queryKey: ['store', today()], queryFn: () => api.get(`/store?date=${today()}`) });

  const addName = useMutation({
    mutationFn: name => api.post('/store/names', { name }),
    onSuccess: () => { qc.invalidateQueries(['store-names']); setNewName(''); toast.success('Name added!'); },
    onError: e => toast.error(e.message),
  });
  const deleteName = useMutation({
    mutationFn: id => api.delete(`/store/names/${id}`),
    onSuccess: () => { qc.invalidateQueries(['store-names']); toast.success('Name removed'); },
    onError: e => toast.error(e.message),
  });
  const save = useMutation({
    mutationFn: d => modal.mode === 'create' ? api.post('/store', d) : api.put(`/store/${modal.data.id}`, d),
    onSuccess: () => { qc.invalidateQueries(['store']); qc.invalidateQueries(['store-names']); setModal(m => ({ ...m, open: false })); toast.success(modal.mode === 'create' ? 'Record added!' : 'Record updated!'); },
    onError: e => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: id => api.delete(`/store/${id}`),
    onSuccess: () => { qc.invalidateQueries(['store']); toast.success('Record deleted'); },
    onError: e => toast.error(e.message),
  });

  function set(k, v) { setModal(m => ({ ...m, data: { ...m.data, [k]: v } })); }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Store</h1>
        {isAdmin && <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'create', data: { ...EMPTY } })}><Plus size={16} />Add Record</button>}
      </div>

      {isAdmin && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Tag size={16} color="#f59e0b" />
            <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.875rem' }}>Persistent Item Names</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>— these names survive day changes</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {names.map(n => (
              <span key={n.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 9999, fontSize: '0.8rem', color: '#f59e0b' }}>
                {n.name}
                <button onClick={() => { if (confirm(`Remove "${n.name}"?`)) deleteName.mutate(n.id); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex' }}><X size={12} /></button>
              </span>
            ))}
            {names.length === 0 && <span style={{ color: '#4a5568', fontSize: '0.8rem' }}>No names yet</span>}
          </div>
          <form onSubmit={e => { e.preventDefault(); if (!newName.trim()) return; addName.mutate(newName.trim()); }} style={{ display: 'flex', gap: '0.5rem' }}>
            <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Add new item name..." style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary" disabled={addName.isPending}><Plus size={16} />Add</button>
          </form>
        </div>
      )}

      <div className="card">
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>{['#','Item Name','Qty','Added Stock','Closing','Low Threshold','Unit','Supplier','Date','Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: '#4a5568', padding: '3rem' }}>No records for today. {isAdmin && 'Add one above.'}</td></tr>
                ) : data.map((item, i) => (
                  <tr key={item.id}>
                    <td style={{ color: '#4a5568' }}>{i + 1}</td>
                    <td style={{ color: '#fff', fontWeight: 500 }}>{item.itemName}</td>
                    <td>{item.quantity}</td>
                    <td>{item.addedStock}</td>
                    <td>{item.closingStock}</td>
                    <td>{item.lowStockThreshold}</td>
                    <td>{item.unit}</td>
                    <td>{item.supplier}</td>
                    <td style={{ color: '#64748b' }}>{item.date}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" style={{ padding: '0.375rem 0.75rem' }} onClick={() => setModal({ open: true, mode: 'edit', data: { ...item } })}><Pencil size={14} /></button>
                        {isAdmin && <button className="btn btn-danger" style={{ padding: '0.375rem 0.75rem' }} onClick={() => { if (confirm('Delete?')) del.mutate(item.id); }}><Trash2 size={14} /></button>}
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
              <h2 style={{ fontWeight: 700, color: '#fff', fontSize: '1.25rem' }}>{modal.mode === 'create' ? 'Add Store Record' : 'Edit Record'}</h2>
              <button onClick={() => setModal(m => ({ ...m, open: false }))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); if (!modal.data.itemName) { toast.error('Item name is required'); return; } save.mutate(modal.data); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Item Name *</label>
                <input list="store-names-dl" className="input" value={modal.data.itemName} onChange={e => set('itemName', e.target.value)} placeholder="Select or type item name..." />
                <datalist id="store-names-dl">{names.map(n => <option key={n.id} value={n.name} />)}</datalist>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label className="label">Quantity</label><input className="input" type="number" step="0.01" value={modal.data.quantity} onChange={e => set('quantity', e.target.value)} /></div>
                <div><label className="label">Added Stock</label><input className="input" type="number" step="0.01" value={modal.data.addedStock} onChange={e => set('addedStock', e.target.value)} /></div>
                <div><label className="label">Closing Stock</label><input className="input" type="number" step="0.01" value={modal.data.closingStock} onChange={e => set('closingStock', e.target.value)} /></div>
                <div><label className="label">Low Stock Threshold</label><input className="input" type="number" step="0.01" value={modal.data.lowStockThreshold} onChange={e => set('lowStockThreshold', e.target.value)} /></div>
                <div><label className="label">Unit</label><input className="input" value={modal.data.unit} onChange={e => set('unit', e.target.value)} placeholder="kg, units..." /></div>
                <div><label className="label">Supplier</label><input className="input" value={modal.data.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Supplier name" /></div>
              </div>
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
