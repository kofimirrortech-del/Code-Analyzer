import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];
const EMPTY = { name: '', stock: 0, unit: 'kg' };

export default function Ingredients() {
  const qc = useQueryClient();
  const [date, setDate] = useState(today());
  const [modal, setModal] = useState({ open: false, mode: 'create', data: EMPTY });
  const { data = [], isLoading } = useQuery({ queryKey: ['ingredients', date], queryFn: () => api.get(`/ingredients?date=${date}`) });

  const save = useMutation({
    mutationFn: d => modal.mode === 'create' ? api.post('/ingredients', d) : api.put(`/ingredients/${modal.data.id}`, d),
    onSuccess: () => { qc.invalidateQueries(['ingredients']); setModal(m => ({ ...m, open: false })); toast.success(modal.mode === 'create' ? 'Ingredient added!' : 'Ingredient updated!'); },
    onError: e => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: id => api.delete(`/ingredients/${id}`),
    onSuccess: () => { qc.invalidateQueries(['ingredients']); toast.success('Ingredient deleted'); },
    onError: e => toast.error(e.message),
  });

  function set(k, v) { setModal(m => ({ ...m, data: { ...m.data, [k]: v } })); }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ingredients</h1>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Date:</label>
            <input type="date" className="input" style={{ width: 'auto' }} value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'create', data: EMPTY })}><Plus size={16} />Add Ingredient</button>
      </div>

      <div className="card">
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>{['#','Name','Stock','Unit','Date','Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#4a5568', padding: '3rem' }}>No ingredients for {date}. Add one or pick another date.</td></tr>
                ) : data.map((item, i) => (
                  <tr key={item.id}>
                    <td style={{ color: '#4a5568' }}>{i + 1}</td>
                    <td style={{ color: '#fff', fontWeight: 500 }}>{item.name}</td>
                    <td><span className="badge badge-amber">{item.stock}</span></td>
                    <td>{item.unit}</td>
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
              <h2 style={{ fontWeight: 700, color: '#fff', fontSize: '1.25rem' }}>{modal.mode === 'create' ? 'Add Ingredient' : 'Edit Ingredient'}</h2>
              <button onClick={() => setModal(m => ({ ...m, open: false }))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); if (!modal.data.name || !modal.data.unit) { toast.error('Name and unit required'); return; } save.mutate(modal.data); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label className="label">Name *</label><input className="input" value={modal.data.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sugar" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label className="label">Stock</label><input className="input" type="number" step="0.01" value={modal.data.stock} onChange={e => set('stock', e.target.value)} /></div>
                <div><label className="label">Unit *</label><input className="input" value={modal.data.unit} onChange={e => set('unit', e.target.value)} placeholder="kg, liters..." /></div>
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
