import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { canEdit } from '../utils/permissions.js';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Tag, ArrowRight, PackageCheck } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];
const EMPTY = (username = '') => ({ product: '', quantityProduced: 0, unit: 'units', baker: username, note: '' });

export default function Production() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const editable = canEdit(user, 'production');
  const qc = useQueryClient();
  const [modal, setModal] = useState({ open: false, mode: 'create', data: EMPTY() });
  const [newProduct, setNewProduct] = useState('');
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [supplyForm, setSupplyForm] = useState({ itemName:'', quantity:'', unit:'units', note:'' });

  const { data: products = [] } = useQuery({ queryKey: ['production-products'], queryFn: () => api.get('/production/products') });
  const { data = [], isLoading } = useQuery({ queryKey: ['production', today()], queryFn: () => api.get(`/production?date=${today()}`) });
  const { data: receivedRaw = [] } = useQuery({ queryKey: ['transfers-to-production', today()], queryFn: () => api.get(`/transfers?date=${today()}&dept=production`) });
  const received = receivedRaw.filter(r => r.toDept === 'production');

  const addProduct = useMutation({
    mutationFn: name => api.post('/production/products', { name }),
    onSuccess: () => { qc.invalidateQueries(['production-products']); setNewProduct(''); toast.success('Product added!'); },
    onError: e => toast.error(e.message),
  });
  const deleteProduct = useMutation({
    mutationFn: id => api.delete(`/production/products/${id}`),
    onSuccess: () => { qc.invalidateQueries(['production-products']); toast.success('Product removed'); },
    onError: e => toast.error(e.message),
  });
  const save = useMutation({
    mutationFn: d => modal.mode === 'create' ? api.post('/production', d) : api.put(`/production/${modal.data.id}`, d),
    onSuccess: () => { qc.invalidateQueries(['production']); qc.invalidateQueries(['production-products']); setModal(m => ({ ...m, open: false })); toast.success(modal.mode === 'create' ? 'Record added!' : 'Record updated!'); },
    onError: e => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: id => api.delete(`/production/${id}`),
    onSuccess: () => { qc.invalidateQueries(['production']); toast.success('Record deleted'); },
    onError: e => toast.error(e.message),
  });
  const supply = useMutation({
    mutationFn: d => api.post('/transfers', d),
    onSuccess: () => { qc.invalidateQueries(['production']); qc.invalidateQueries(['transfers-to-production']); setSupplyOpen(false); setSupplyForm({ itemName:'', quantity:'', unit:'units', note:'' }); toast.success('Supplied to Bakery!'); },
    onError: e => toast.error(e.message || 'Transfer failed'),
  });

  function set(k, v) { setModal(m => ({ ...m, data: { ...m.data, [k]: v } })); }
  const setSF = (k, v) => setSupplyForm(p => ({ ...p, [k]: v }));
  const handleSupply = () => {
    if (!supplyForm.itemName || !supplyForm.quantity) { toast.error('Item and quantity required'); return; }
    supply.mutate({ fromDept:'production', toDept:'bakery', itemName:supplyForm.itemName, quantity:parseFloat(supplyForm.quantity), unit:supplyForm.unit, note:supplyForm.note });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Production</h1>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          {editable && <button className="btn btn-secondary" onClick={() => setSupplyOpen(true)} style={{ gap:'0.4rem' }}><ArrowRight size={15}/>Supply to Bakery</button>}
          {editable && <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'create', data: EMPTY(user?.username) })}><Plus size={16} />Add Record</button>}
        </div>
      </div>

      {isAdmin && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Tag size={16} color="#3b82f6" />
            <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.875rem' }}>Persistent Product Names</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {products.map(p => (
              <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 9999, fontSize: '0.8rem', color: '#60a5fa' }}>
                {p.name}
                <button onClick={() => { if (confirm(`Remove "${p.name}"?`)) deleteProduct.mutate(p.id); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex' }}><X size={12} /></button>
              </span>
            ))}
            {products.length === 0 && <span style={{ color: '#4a5568', fontSize: '0.8rem' }}>No products yet</span>}
          </div>
          <form onSubmit={e => { e.preventDefault(); if (!newProduct.trim()) return; addProduct.mutate(newProduct.trim()); }} style={{ display: 'flex', gap: '0.5rem' }}>
            <input className="input" value={newProduct} onChange={e => setNewProduct(e.target.value)} placeholder="Add new product name..." style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary" disabled={addProduct.isPending}><Plus size={16} />Add</button>
          </form>
        </div>
      )}

      <div className="card">
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>{['#','Product','Unit','Qty Produced','Baker','Note','Recorded By','Date','Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: '#4a5568', padding: '3rem' }}>No production records for today.</td></tr>
                ) : data.map((item, i) => (
                  <tr key={item.id}>
                    <td style={{ color: '#4a5568' }}>{i + 1}</td>
                    <td style={{ color: '#fff', fontWeight: 500 }}>{item.product}</td>
                    <td>{item.unit}</td>
                    <td><span className="badge badge-amber">{item.quantityProduced}</span></td>
                    <td>{item.baker}</td>
                    <td style={{ color: '#64748b', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.note || '—'}</td>
                    <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{item.recordedBy || '—'}</td>
                    <td style={{ color: '#64748b' }}>{item.date}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {editable && <button className="btn btn-ghost" style={{ padding: '0.375rem 0.75rem' }} onClick={() => setModal({ open: true, mode: 'edit', data: { ...item } })}><Pencil size={14} /></button>}
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
          <PackageCheck size={16} color="#8b5cf6" />
          <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.875rem' }}>Received from Ingredients</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#64748b' }}>{today()}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr>{['#', 'Item Name', 'Qty', 'Unit', 'Note', 'Transferred By', 'Time'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {received.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#4a5568', padding: '2rem' }}>No items received from Ingredients today.</td></tr>
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
          <div className="modal-container" style={{ width:420 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title" style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}><ArrowRight size={18} color="#3b82f6"/> Supply to Bakery</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div><label className="label">Product Name</label><input className="input" list="prod-supply-names" value={supplyForm.itemName} onChange={e=>setSF('itemName',e.target.value)} placeholder="Product name"/><datalist id="prod-supply-names">{products.map(p=><option key={p.id} value={p.name}/>)}</datalist></div>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'0.75rem' }}>
                <div><label className="label">Quantity</label><input className="input" type="number" min="0" step="0.01" value={supplyForm.quantity} onChange={e=>setSF('quantity',e.target.value)} placeholder="0"/></div>
                <div><label className="label">Unit</label><input className="input" value={supplyForm.unit} onChange={e=>setSF('unit',e.target.value)} placeholder="units"/></div>
              </div>
              <div><label className="label">Note (optional)</label><input className="input" value={supplyForm.note} onChange={e=>setSF('note',e.target.value)} placeholder="Optional note"/></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSupplyOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSupply} disabled={supply.isPending}>{supply.isPending ? 'Transferring...' : 'Supply to Bakery'}</button>
            </div>
          </div>
        </div>
      )}

      {modal.open && (
        <div className="overlay" onClick={() => setModal(m => ({ ...m, open: false }))}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 700, color: '#fff', fontSize: '1.25rem' }}>{modal.mode === 'create' ? 'Add Production Record' : 'Edit Record'}</h2>
              <button onClick={() => setModal(m => ({ ...m, open: false }))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); if (!modal.data.product) { toast.error('Product is required'); return; } save.mutate(modal.data); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Product *</label>
                <input list="production-products-dl" className="input" value={modal.data.product} onChange={e => set('product', e.target.value)} placeholder="Select or type product..." />
                <datalist id="production-products-dl">{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label className="label">Qty Produced *</label><input className="input" type="number" step="0.01" value={modal.data.quantityProduced} onChange={e => set('quantityProduced', e.target.value)} /></div>
                <div><label className="label">Unit</label><input className="input" value={modal.data.unit} onChange={e => set('unit', e.target.value)} placeholder="loaves, kg..." /></div>
              </div>
              <div><label className="label">Baker (defaults to your name)</label><input className="input" value={modal.data.baker} onChange={e => set('baker', e.target.value)} placeholder="Baker's name" /></div>
              <div><label className="label">Note</label><textarea className="input" rows={2} value={modal.data.note} onChange={e => set('note', e.target.value)} placeholder="Optional notes..." style={{ resize: 'vertical' }} /></div>
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
