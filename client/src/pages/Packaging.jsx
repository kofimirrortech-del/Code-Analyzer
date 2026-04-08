import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Tag, ArrowRight } from 'lucide-react';
import { canEdit } from '../utils/permissions.js';

const today = () => new Date().toISOString().split('T')[0];
const EMPTY = { packageType: '', stock: 0, addedStock: 0, supply: 0, closingStock: 0 };

export default function Packaging() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const editable = canEdit(user, 'packaging');
  const qc = useQueryClient();
  const [modal, setModal] = useState({ open: false, mode: 'create', data: EMPTY });
  const [newType, setNewType] = useState('');
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [supplyForm, setSupplyForm] = useState({ itemName:'', quantity:'', unit:'units', note:'' });

  const { data: types = [] } = useQuery({ queryKey: ['package-types'], queryFn: () => api.get('/packages/types') });
  const { data = [], isLoading } = useQuery({ queryKey: ['packages', today()], queryFn: () => api.get(`/packages?date=${today()}`) });

  const addType = useMutation({
    mutationFn: name => api.post('/packages/types', { name }),
    onSuccess: () => { qc.invalidateQueries(['package-types']); setNewType(''); toast.success('Type added!'); },
    onError: e => toast.error(e.message),
  });
  const deleteType = useMutation({
    mutationFn: id => api.delete(`/packages/types/${id}`),
    onSuccess: () => { qc.invalidateQueries(['package-types']); toast.success('Type removed'); },
    onError: e => toast.error(e.message),
  });
  const save = useMutation({
    mutationFn: d => modal.mode === 'create' ? api.post('/packages', d) : api.put(`/packages/${modal.data.id}`, d),
    onSuccess: () => { qc.invalidateQueries(['packages']); qc.invalidateQueries(['package-types']); setModal(m => ({ ...m, open: false })); toast.success(modal.mode === 'create' ? 'Added!' : 'Updated!'); },
    onError: e => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: id => api.delete(`/packages/${id}`),
    onSuccess: () => { qc.invalidateQueries(['packages']); toast.success('Deleted'); },
    onError: e => toast.error(e.message),
  });

  const supply = useMutation({
    mutationFn: d => api.post('/transfers', d),
    onSuccess: () => { qc.invalidateQueries(['packages']); setSupplyOpen(false); setSupplyForm({ itemName:'', quantity:'', unit:'units', note:'' }); toast.success('Supplied to Dispatch!'); },
    onError: e => toast.error(e.message || 'Transfer failed'),
  });

  function set(k, v) { setModal(m => ({ ...m, data: { ...m.data, [k]: v } })); }
  const setSF = (k, v) => setSupplyForm(p => ({ ...p, [k]: v }));
  const handleSupply = () => {
    if (!supplyForm.itemName || !supplyForm.quantity) { toast.error('Item and quantity required'); return; }
    supply.mutate({ fromDept:'packaging', toDept:'dispatch', itemName:supplyForm.itemName, quantity:parseFloat(supplyForm.quantity), unit:supplyForm.unit, note:supplyForm.note });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Packaging</h1>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          {editable && <button className="btn btn-secondary" onClick={() => setSupplyOpen(true)} style={{ gap:'0.4rem' }}><ArrowRight size={15}/>Supply to Dispatch</button>}
          {isAdmin && <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'create', data: { ...EMPTY } })}><Plus size={16} />Add Record</button>}
        </div>
      </div>

      {supplyOpen && (
        <div className="overlay" onClick={() => setSupplyOpen(false)}>
          <div className="modal-container" style={{ width:420 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title" style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}><ArrowRight size={18} color="#14b8a6"/> Supply to Dispatch</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div><label className="label">Package Type</label><input className="input" list="pkg-supply-types" value={supplyForm.itemName} onChange={e=>setSF('itemName',e.target.value)} placeholder="Package type"/><datalist id="pkg-supply-types">{types.map(t=><option key={t.id} value={t.name}/>)}</datalist></div>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'0.75rem' }}>
                <div><label className="label">Quantity</label><input className="input" type="number" min="0" step="0.01" value={supplyForm.quantity} onChange={e=>setSF('quantity',e.target.value)} placeholder="0"/></div>
                <div><label className="label">Unit</label><input className="input" value={supplyForm.unit} onChange={e=>setSF('unit',e.target.value)} placeholder="units"/></div>
              </div>
              <div><label className="label">Note (optional)</label><input className="input" value={supplyForm.note} onChange={e=>setSF('note',e.target.value)} placeholder="Optional note"/></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSupplyOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSupply} disabled={supply.isPending}>{supply.isPending ? 'Transferring...' : 'Supply to Dispatch'}</button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Tag size={16} color="#ec4899" />
            <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.875rem' }}>Persistent Package Types</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {types.map(t => (
              <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)', borderRadius: 9999, fontSize: '0.8rem', color: '#f472b6' }}>
                {t.name}
                <button onClick={() => { if (confirm(`Remove "${t.name}"?`)) deleteType.mutate(t.id); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex' }}><X size={12} /></button>
              </span>
            ))}
            {types.length === 0 && <span style={{ color: '#4a5568', fontSize: '0.8rem' }}>No types yet</span>}
          </div>
          <form onSubmit={e => { e.preventDefault(); if (!newType.trim()) return; addType.mutate(newType.trim()); }} style={{ display: 'flex', gap: '0.5rem' }}>
            <input className="input" value={newType} onChange={e => setNewType(e.target.value)} placeholder="Add new package type..." style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary" disabled={addType.isPending}><Plus size={16} />Add</button>
          </form>
        </div>
      )}

      <div className="card">
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>{['#','Package Type','Opening Stock','Added Stock','Supply','Closing Stock','Total Stock','Date','Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: '#4a5568', padding: '3rem' }}>No records for today.</td></tr>
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
              <h2 style={{ fontWeight: 700, color: '#fff', fontSize: '1.25rem' }}>{modal.mode === 'create' ? 'Add Packaging Record' : 'Edit Record'}</h2>
              <button onClick={() => setModal(m => ({ ...m, open: false }))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); if (!modal.data.packageType) { toast.error('Package type is required'); return; } save.mutate(modal.data); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Package Type *</label>
                <input list="package-types-dl" className="input" value={modal.data.packageType} onChange={e => set('packageType', e.target.value)} placeholder="Select or type package type..." />
                <datalist id="package-types-dl">{types.map(t => <option key={t.id} value={t.name} />)}</datalist>
              </div>
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
