import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

const EMPTY = { itemName: '', quantity: 0, addedStock: 0, closingStock: 0, lowStockThreshold: 0, unit: 'units', supplier: '' };

export default function Store() {
  const qc = useQueryClient();
  const [modal, setModal] = useState({ open: false, mode: 'create', data: EMPTY });
  const { data = [], isLoading } = useQuery({ queryKey: ['store'], queryFn: () => api.get('/store') });

  const save = useMutation({
    mutationFn: d => modal.mode === 'create' ? api.post('/store', d) : api.put(`/store/${modal.data.id}`, d),
    onSuccess: () => { qc.invalidateQueries(['store']); setModal(m => ({ ...m, open: false })); toast.success(modal.mode === 'create' ? 'Item added!' : 'Item updated!'); },
    onError: e => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: id => api.delete(`/store/${id}`),
    onSuccess: () => { qc.invalidateQueries(['store']); toast.success('Item deleted'); },
    onError: e => toast.error(e.message),
  });

  function openEdit(item) { setModal({ open: true, mode: 'edit', data: { ...item } }); }
  function openCreate() { setModal({ open: true, mode: 'create', data: { ...EMPTY } }); }
  function set(k, v) { setModal(m => ({ ...m, data: { ...m.data, [k]: v } })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!modal.data.itemName || !modal.data.supplier) { toast.error('Item name and supplier are required'); return; }
    save.mutate(modal.data);
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Store Inventory</h1>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} />Add Item</button>
      </div>

      <div className="card">
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {['#','Item Name','Qty','Added Stock','Total Stock','Closing Stock','Threshold','Unit','Supplier','Date','Actions'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign: 'center', color: '#4a5568', padding: '3rem' }}>No items yet. Add your first store item.</td></tr>
                ) : data.map((item, i) => (
                  <tr key={item.id}>
                    <td style={{ color: '#4a5568' }}>{i + 1}</td>
                    <td style={{ color: '#fff', fontWeight: 500 }}>{item.itemName}</td>
                    <td>{item.quantity}</td>
                    <td>{item.addedStock}</td>
                    <td><span className={`badge ${item.isLowStock ? 'badge-red' : 'badge-green'}`}>{item.totalStock}</span></td>
                    <td>{item.closingStock}</td>
                    <td>{item.lowStockThreshold}</td>
                    <td>{item.unit}</td>
                    <td>{item.supplier}</td>
                    <td style={{ color: '#64748b' }}>{item.date}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" style={{ padding: '0.375rem 0.75rem' }} onClick={() => openEdit(item)}><Pencil size={14} /></button>
                        <button className="btn btn-danger" style={{ padding: '0.375rem 0.75rem' }} onClick={() => { if (confirm('Delete this item?')) del.mutate(item.id); }}><Trash2 size={14} /></button>
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
              <h2 style={{ fontWeight: 700, color: '#fff', fontSize: '1.25rem' }}>{modal.mode === 'create' ? 'Add Store Item' : 'Edit Item'}</h2>
              <button onClick={() => setModal(m => ({ ...m, open: false }))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label className="label">Item Name *</label><input className="input" value={modal.data.itemName} onChange={e => set('itemName', e.target.value)} placeholder="e.g. Flour" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label className="label">Opening Stock (Qty)</label><input className="input" type="number" step="0.01" value={modal.data.quantity} onChange={e => set('quantity', e.target.value)} /></div>
                <div><label className="label">Added Stock</label><input className="input" type="number" step="0.01" value={modal.data.addedStock} onChange={e => set('addedStock', e.target.value)} /></div>
                <div><label className="label">Closing Stock</label><input className="input" type="number" step="0.01" value={modal.data.closingStock} onChange={e => set('closingStock', e.target.value)} /></div>
                <div><label className="label">Low Stock Threshold</label><input className="input" type="number" step="0.01" value={modal.data.lowStockThreshold} onChange={e => set('lowStockThreshold', e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label className="label">Unit</label><input className="input" value={modal.data.unit} onChange={e => set('unit', e.target.value)} placeholder="kg, bags, units..." /></div>
                <div><label className="label">Supplier *</label><input className="input" value={modal.data.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Supplier name" /></div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
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
