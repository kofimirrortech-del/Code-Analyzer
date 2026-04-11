import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { canEdit } from '../utils/permissions.js';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Tag, ArrowRight, PackageCheck, ChevronDown, ChevronUp } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];
const EMPTY = { name: '', openingStock: 0, addedStock: 0, lowStockThreshold: 0, unit: 'kg', supplier: '' };

export default function Ingredients() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const editable = canEdit(user, 'ingredients');
  const qc = useQueryClient();
  const [modal, setModal] = useState({ open: false, mode: 'create', data: { ...EMPTY } });
  const [newName, setNewName] = useState('');
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [namesOpen, setNamesOpen] = useState(false);
  const [supplyForm, setSupplyForm] = useState({ itemName: '', quantity: '', unit: 'units', note: '' });

  const { data: names = [] } = useQuery({ queryKey: ['ingredient-names'], queryFn: () => api.get('/ingredients/names') });
  const { data = [], isLoading } = useQuery({ queryKey: ['ingredients', today()], queryFn: () => api.get(`/ingredients?date=${today()}`) });
  const { data: receivedRaw = [] } = useQuery({ queryKey: ['transfers-to-ingredients', today()], queryFn: () => api.get(`/transfers?date=${today()}&dept=ingredients`) });
  const received = receivedRaw.filter(r => r.toDept === 'ingredients');

  const addName = useMutation({
    mutationFn: name => api.post('/ingredients/names', { name }),
    onSuccess: () => { qc.invalidateQueries(['ingredient-names']); setNewName(''); toast.success('Name added!'); },
    onError: e => toast.error(e.message),
  });
  const deleteName = useMutation({
    mutationFn: id => api.delete(`/ingredients/names/${id}`),
    onSuccess: () => { qc.invalidateQueries(['ingredient-names']); toast.success('Name removed'); },
    onError: e => toast.error(e.message),
  });
  const save = useMutation({
    mutationFn: d => modal.mode === 'create' ? api.post('/ingredients', d) : api.put(`/ingredients/${modal.data.id}`, d),
    onSuccess: () => { qc.invalidateQueries(['ingredients']); qc.invalidateQueries(['ingredient-names']); setModal(m => ({ ...m, open: false })); toast.success(modal.mode === 'create' ? 'Added!' : 'Updated!'); },
    onError: e => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: id => api.delete(`/ingredients/${id}`),
    onSuccess: () => { qc.invalidateQueries(['ingredients']); toast.success('Deleted'); },
    onError: e => toast.error(e.message),
  });
  const supply = useMutation({
    mutationFn: d => api.post('/transfers', d),
    onSuccess: () => { qc.invalidateQueries(['ingredients']); qc.invalidateQueries(['transfers-to-ingredients']); setSupplyOpen(false); setSupplyForm({ itemName: '', quantity: '', unit: 'units', note: '' }); toast.success('Supplied to Production!'); },
    onError: e => toast.error(e.message || 'Transfer failed'),
  });

  function set(k, v) { setModal(m => ({ ...m, data: { ...m.data, [k]: v } })); }
  const setSF = (k, v) => setSupplyForm(p => ({ ...p, [k]: v }));

  async function onNameChange(name) {
    set('name', name);
    if (modal.mode === 'create' && name) {
      try {
        const res = await api.get(`/ingredients/last-closing?name=${encodeURIComponent(name)}`);
        set('openingStock', res.closingStock ?? 0);
      } catch { /* ignore */ }
    }
  }

  const handleSupply = () => {
    if (!supplyForm.itemName || !supplyForm.quantity) { toast.error('Item and quantity required'); return; }
    supply.mutate({ fromDept: 'ingredients', toDept: 'production', itemName: supplyForm.itemName, quantity: parseFloat(supplyForm.quantity), unit: supplyForm.unit, note: supplyForm.note });
  };

  const grandTotal = data.reduce((s, d) => s + d.closingStock, 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Ingredients</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {editable && <button className="btn btn-secondary" onClick={() => setSupplyOpen(true)} style={{ gap: '0.4rem' }}><ArrowRight size={15} />Supply to Production</button>}
          {editable && <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'create', data: { ...EMPTY } })}><Plus size={16} />Add Record</button>}
        </div>
      </div>

      {isAdmin && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <button onClick={() => setNamesOpen(o => !o)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.25rem', textAlign: 'left' }}>
            <Tag size={15} color="#8b5cf6" />
            <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.875rem' }}>Persistent Ingredient Names</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.25rem' }}>({names.length})</span>
            <span style={{ marginLeft: 'auto', color: '#64748b', display: 'flex' }}>{namesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
          </button>
          {namesOpen && (
            <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '0.75rem 0' }}>
                {names.map(n => (
                  <span key={n.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 9999, fontSize: '0.8rem', color: '#a78bfa' }}>
                    {n.name}
                    <button onClick={() => { if (confirm(`Remove "${n.name}"?`)) deleteName.mutate(n.id); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex' }}><X size={12} /></button>
                  </span>
                ))}
                {names.length === 0 && <span style={{ color: '#4a5568', fontSize: '0.8rem' }}>No names yet</span>}
              </div>
              <form onSubmit={e => { e.preventDefault(); if (!newName.trim()) return; addName.mutate(newName.trim()); }} style={{ display: 'flex', gap: '0.5rem' }}>
                <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Add new ingredient name..." style={{ flex: 1 }} />
                <button type="submit" className="btn btn-primary" disabled={addName.isPending}><Plus size={16} />Add</button>
              </form>
            </div>
          )}
        </div>
      )}

      <div className="card">
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>{['#', 'Name', 'Opening', 'Added', 'Closing', 'Threshold', 'Unit', 'Supplier', 'Recorded By', 'Date', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign: 'center', color: '#4a5568', padding: '3rem' }}>No ingredients for today. {editable && 'Add one above.'}</td></tr>
                ) : data.map((item, i) => (
                  <tr key={item.id}>
                    <td style={{ color: '#4a5568' }}>{i + 1}</td>
                    <td style={{ color: '#fff', fontWeight: 500 }}>{item.name}</td>
                    <td>{item.openingStock}</td>
                    <td>{item.addedStock}</td>
                    <td><span className={item.isLowStock ? 'badge badge-red' : 'badge badge-green'}>{item.closingStock}</span></td>
                    <td>{item.lowStockThreshold || '—'}</td>
                    <td>{item.unit}</td>
                    <td>{item.supplier || '—'}</td>
                    <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{item.recordedBy || '—'}</td>
                    <td style={{ color: '#64748b' }}>{item.date}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {editable && <button className="btn btn-ghost" style={{ padding: '0.375rem 0.75rem' }} onClick={() => setModal({ open: true, mode: 'edit', data: { ...item, openingStock: item.openingStock, addedStock: item.addedStock } })}><Pencil size={14} /></button>}
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

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PackageCheck size={16} color="#f59e0b" />
          <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.875rem' }}>Received from Store</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#64748b' }}>{today()}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr>{['#', 'Item Name', 'Qty', 'Unit', 'Note', 'Transferred By', 'Time'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {received.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#4a5568', padding: '2rem' }}>No items received from Store today.</td></tr>
              ) : received.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ color: '#4a5568' }}>{i + 1}</td>
                  <td style={{ color: '#fff', fontWeight: 500 }}>{r.itemName}</td>
                  <td><span className="badge badge-amber">{r.quantity}</span></td>
                  <td style={{ color: '#64748b' }}>{r.unit}</td>
                  <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{r.note || '—'}</td>
                  <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{r.transferredBy}</td>
                  <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {supplyOpen && (
        <div className="overlay" onClick={() => setSupplyOpen(false)}>
          <div className="modal-container" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={18} color="#8b5cf6" /> Supply to Production</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label className="label">Ingredient Name</label><input className="input" list="ing-supply-names" value={supplyForm.itemName} onChange={e => setSF('itemName', e.target.value)} placeholder="Ingredient name" /><datalist id="ing-supply-names">{names.map(n => <option key={n.id} value={n.name} />)}</datalist></div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div><label className="label">Quantity</label><input className="input" type="number" min="0" step="0.01" value={supplyForm.quantity} onChange={e => setSF('quantity', e.target.value)} placeholder="0" /></div>
                <div><label className="label">Unit</label><input className="input" value={supplyForm.unit} onChange={e => setSF('unit', e.target.value)} placeholder="units" /></div>
              </div>
              <div><label className="label">Note (optional)</label><input className="input" value={supplyForm.note} onChange={e => setSF('note', e.target.value)} placeholder="Optional note" /></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSupplyOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSupply} disabled={supply.isPending}>{supply.isPending ? 'Logging...' : 'Log Supply'}</button>
            </div>
          </div>
        </div>
      )}

      {modal.open && (
        <div className="overlay" onClick={() => setModal(m => ({ ...m, open: false }))}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 700, color: '#fff', fontSize: '1.25rem' }}>{modal.mode === 'create' ? 'Add Ingredient Record' : 'Edit Ingredient'}</h2>
              <button onClick={() => setModal(m => ({ ...m, open: false }))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); if (!modal.data.name) { toast.error('Name is required'); return; } save.mutate(modal.data); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Name *</label>
                <input list="ingredient-names-dl" className="input" value={modal.data.name} onChange={e => onNameChange(e.target.value)} placeholder="Select or type ingredient name..." />
                <datalist id="ingredient-names-dl">{names.map(n => <option key={n.id} value={n.name} />)}</datalist>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Opening Stock {modal.mode === 'create' && <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>(auto-filled)</span>}</label>
                  <input className="input" type="number" step="0.01" value={modal.data.openingStock} onChange={e => set('openingStock', e.target.value)} style={modal.mode === 'create' ? { background: 'rgba(100,116,139,0.08)', color: '#94a3b8' } : {}} />
                </div>
                <div><label className="label">Added Stock (Received)</label><input className="input" type="number" step="0.01" value={modal.data.addedStock} onChange={e => set('addedStock', e.target.value)} /></div>
                <div><label className="label">Low Stock Threshold</label><input className="input" type="number" step="0.01" value={modal.data.lowStockThreshold} onChange={e => set('lowStockThreshold', e.target.value)} placeholder="0 = disabled" /></div>
                <div><label className="label">Unit</label><input className="input" value={modal.data.unit} onChange={e => set('unit', e.target.value)} placeholder="kg, liters..." /></div>
                <div style={{ gridColumn: '1 / -1' }}><label className="label">Supplier</label><input className="input" value={modal.data.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Supplier name" /></div>
              </div>
              <div style={{ padding: '0.6rem 0.9rem', background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', borderRadius: 8, fontSize: '0.8rem', color: '#94a3b8' }}>
                Opening stock is auto-filled from the last closing stock for that ingredient. Closing = Opening + Added.
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
