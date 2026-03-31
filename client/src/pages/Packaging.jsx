import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

const EMPTY = { packageType: '', stock: 0, addedStock: 0, supply: 0, closingStock: 0 };

export default function Packaging() {
  const qc = useQueryClient();
  const [modal, setModal] = useState({ open: false, mode: 'create', data: EMPTY });
  const { data = [], isLoading } = useQuery({ queryKey: ['packages'], queryFn: () => api.get('/packages') });

  const save = useMutation({
    mutationFn: d => modal.mode === 'create' ? api.post('/packages', d) : api.put(`/packages/${modal.data.id}`, d),
    onSuccess: () => { qc.invalidateQueries(['packages']); setModal(m => ({ ...m, open: false })); toast.success(modal.mode === 'create' ? 'Package added!' : 'Package updated!'); },
    onError: e => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: id => api.delete(`/packages/${id}`),
    onSuccess: () => { qc.invalidateQueries(['packages']); toast.success('Package deleted'); },
    onError: e => toast.error(e.message),
  });

  function set(k, v) { setModal(m => ({ ...m, data: { ...m.data, [k]: v } })); }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Packaging</h1>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'create', data: EMPTY })}><Plus size={16} />Add Package</button>
      </div>

      <div className="card">
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>{['#','Package Type','Opening Stock','Added Stock','Supply','Closing Stock','Total Stock','Date','Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: '#4a5568', padding: '3rem' }}>No packages yet.</td></tr>
                ) : data.map((item, i) => (
                  <tr key={item.id}>
                    <td style={{ color: '#4a5568' }}>{i + 1}</td>
                    <td style={{ color: '#fff', fontWeight: 500 }}>{item.packageType}</td>
                    <td>{item.stock}</td>
                    <td>{item.addedStock}</td>
                    <td>{item.supply}</td>
                    <td>{item.closingStock}</td>
                    <td><span className="badge badge-amber">{item.totalStock}</span></td>
                    <td style={{ color: '#64748b' }}>{item.date}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" style={{ padding: '0.375rem 0.75rem' }} onClick={() => setModal({ open: true, mode: 'edit', data: { ...item } })}><Pencil size={14} /></button>
                        <button className="btn btn-danger" style={{ padding: '0.375rem 0.75rem' }} onClick={() => { if (confirm('Delete?')) del.mutate(item.id); }}><Trash2 size={14} /></button>
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
              <h2 style={{ fontWeight: 700, color: '#fff', fontSize: '1.25rem' }}>{modal.mode === 'create' ? 'Add Package' : 'Edit Package'}</h2>
              <button onClick={() => setModal(m => ({ ...m, open: false }))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); if (!modal.data.packageType) { toast.error('Package type required'); return; } save.mutate(modal.data); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label className="label">Package Type *</label><input className="input" value={modal.data.packageType} onChange={e => set('packageType', e.target.value)} placeholder="e.g. Small Box, Large Bag..." /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label className="label">Opening Stock</label><input className="input" type="number" step="0.01" value={modal.data.stock} onChange={e => set('stock', e.target.value)} /></div>
                <div><label className="label">Added Stock</label><input className="input" type="number" step="0.01" value={modal.data.addedStock} onChange={e => set('addedStock', e.target.value)} /></div>
                <div><label className="label">Supply</label><input className="input" type="number" step="0.01" value={modal.data.supply} onChange={e => set('supply', e.target.value)} /></div>
                <div><label className="label">Closing Stock</label><input className="input" type="number" step="0.01" value={modal.data.closingStock} onChange={e => set('closingStock', e.target.value)} /></div>
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
