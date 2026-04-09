import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { canEdit } from '../utils/permissions.js';
import { Plus, Trash2, Edit2, Save, X, ChefHat, ArrowRight, PackageCheck } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];

function SupplyDialog({ names, onClose, onSubmit }) {
  const [form, setForm] = useState({ itemName:'', quantity:'', unit:'units', note:'' });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-container" style={{ width:420 }} onClick={e=>e.stopPropagation()}>
        <h3 className="modal-title" style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <ArrowRight size={18} color="#f59e0b"/> Supply to Packaging
        </h3>
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div>
            <label className="label">Item</label>
            <input className="input" list="bakery-supply-names" value={form.itemName} onChange={e=>set('itemName',e.target.value)} placeholder="Item name" />
            <datalist id="bakery-supply-names">{names.map(n=><option key={n.id} value={n.name}/>)}</datalist>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'0.75rem' }}>
            <div><label className="label">Quantity</label><input className="input" type="number" min="0" step="0.01" value={form.quantity} onChange={e=>set('quantity',e.target.value)} placeholder="0"/></div>
            <div><label className="label">Unit</label><input className="input" value={form.unit} onChange={e=>set('unit',e.target.value)} placeholder="units"/></div>
          </div>
          <div><label className="label">Note (optional)</label><input className="input" value={form.note} onChange={e=>set('note',e.target.value)} placeholder="Optional note"/></div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSubmit(form)}>Supply to Packaging</button>
        </div>
      </div>
    </div>
  );
}

export default function Bakery() {
  const { user } = useAuth();
  const editable = canEdit(user, 'bakery');
  const qc = useQueryClient();
  const date = today();

  const { data: items = [], isLoading } = useQuery({ queryKey:['bakery',date], queryFn:()=>api.get(`/bakery?date=${date}`) });
  const { data: names = [] } = useQuery({ queryKey:['bakery-names'], queryFn:()=>api.get('/bakery/names') });
  const { data: receivedRaw = [] } = useQuery({ queryKey:['transfers-to-bakery',date], queryFn:()=>api.get(`/transfers?date=${date}&dept=bakery`) });
  const received = receivedRaw.filter(r => r.toDept === 'bakery');

  const [addName, setAddName] = useState(''); const [editId, setEditId] = useState(null); const [editRow, setEditRow] = useState({});
  const [showAdd, setShowAdd] = useState(false); const [newRow, setNewRow] = useState({ itemName:'', quantity:'', unit:'units', lowStockThreshold:'0', note:'' });
  const [supplyDialog, setSupplyDialog] = useState(false);

  const createNameMut = useMutation({ mutationFn: d=>api.post('/bakery/names',d), onSuccess:()=>qc.invalidateQueries(['bakery-names']) });
  const deleteNameMut = useMutation({ mutationFn: id=>api.delete(`/bakery/names/${id}`), onSuccess:()=>qc.invalidateQueries(['bakery-names']) });
  const createMut = useMutation({ mutationFn:d=>api.post('/bakery',d), onSuccess:()=>{ qc.invalidateQueries(['bakery',date]); setShowAdd(false); setNewRow({itemName:'',quantity:'',unit:'units',lowStockThreshold:'0',note:''}); } });
  const updateMut = useMutation({ mutationFn:({id,...d})=>api.put(`/bakery/${id}`,d), onSuccess:()=>{ qc.invalidateQueries(['bakery',date]); setEditId(null); } });
  const deleteMut = useMutation({ mutationFn:id=>api.delete(`/bakery/${id}`), onSuccess:()=>qc.invalidateQueries(['bakery',date]) });
  const transferMut = useMutation({ mutationFn:d=>api.post('/transfers',d), onSuccess:()=>{ qc.invalidateQueries(['bakery',date]); qc.invalidateQueries(['transfers-to-bakery',date]); setSupplyDialog(false); } });

  const handleAddName = () => { if(addName.trim()) { createNameMut.mutate({name:addName.trim()}); setAddName(''); } };
  const startEdit = (r) => { setEditId(r.id); setEditRow({itemName:r.itemName, quantity:r.quantity, unit:r.unit, lowStockThreshold:r.lowStockThreshold, note:r.note||''}); };
  const saveEdit = () => updateMut.mutate({ id:editId, ...editRow });
  const handleSupply = async (form) => {
    if(!form.itemName||!form.quantity) return alert('Item and quantity required');
    await transferMut.mutateAsync({ fromDept:'bakery', toDept:'packaging', itemName:form.itemName, quantity:parseFloat(form.quantity), unit:form.unit, note:form.note });
  };

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:'4rem' }}><div className="spinner"/></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bakery</h1>
          <p style={{ color:'#64748b', fontSize:'0.875rem', marginTop:'0.25rem' }}>{date}</p>
        </div>
        {editable && (
          <div style={{ display:'flex', gap:'0.5rem' }}>
            <button className="btn btn-secondary" onClick={()=>setSupplyDialog(true)} style={{ gap:'0.4rem' }}><ArrowRight size={15}/>Supply to Packaging</button>
            <button className="btn btn-primary" onClick={()=>setShowAdd(true)}><Plus size={15}/>Add Item</button>
          </div>
        )}
      </div>

      {editable && (
        <div className="card" style={{ marginBottom:'1rem' }}>
          <div style={{ padding:'1rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontWeight:600, color:'#fff', fontSize:'0.875rem' }}>Bakery Item Names</span>
          </div>
          <div style={{ padding:'1rem 1.5rem', display:'flex', gap:'0.75rem', flexWrap:'wrap', alignItems:'center' }}>
            {names.map(n => (
              <span key={n.id} style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.25rem 0.6rem', background:'rgba(236,72,153,0.1)', border:'1px solid rgba(236,72,153,0.2)', borderRadius:20, fontSize:'0.8rem', color:'#fff' }}>
                {n.name}
                <button onClick={()=>deleteNameMut.mutate(n.id)} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', padding:0, lineHeight:1 }}><X size={12}/></button>
              </span>
            ))}
            <div style={{ display:'flex', gap:'0.5rem' }}>
              <input className="input" style={{ width:160, padding:'0.35rem 0.6rem', fontSize:'0.8rem' }} value={addName} onChange={e=>setAddName(e.target.value)} placeholder="Add item name" onKeyDown={e=>e.key==='Enter'&&handleAddName()} />
              <button className="btn btn-secondary" style={{ padding:'0.35rem 0.75rem', fontSize:'0.8rem' }} onClick={handleAddName}>Add</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {showAdd && editable && (
          <div style={{ padding:'1rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:'0.75rem', flexWrap:'wrap', alignItems:'flex-end' }}>
            <div><label className="label">Item Name</label><input className="input" list="bk-names" value={newRow.itemName} onChange={e=>setNewRow(p=>({...p,itemName:e.target.value}))} placeholder="Bakery item"/><datalist id="bk-names">{names.map(n=><option key={n.id} value={n.name}/>)}</datalist></div>
            <div><label className="label">Quantity</label><input className="input" type="number" min="0" step="0.01" value={newRow.quantity} onChange={e=>setNewRow(p=>({...p,quantity:e.target.value}))} placeholder="0"/></div>
            <div><label className="label">Unit</label><input className="input" value={newRow.unit} onChange={e=>setNewRow(p=>({...p,unit:e.target.value}))} placeholder="units"/></div>
            <div><label className="label">Reorder Point</label><input className="input" type="number" min="0" step="0.01" value={newRow.lowStockThreshold} onChange={e=>setNewRow(p=>({...p,lowStockThreshold:e.target.value}))} placeholder="0"/></div>
            <div><label className="label">Note</label><input className="input" value={newRow.note} onChange={e=>setNewRow(p=>({...p,note:e.target.value}))} placeholder="Optional note"/></div>
            <div style={{ display:'flex', gap:'0.5rem' }}>
              <button className="btn btn-primary" onClick={()=>createMut.mutate(newRow)}><Save size={14}/>Save</button>
              <button className="btn btn-secondary" onClick={()=>setShowAdd(false)}><X size={14}/></button>
            </div>
          </div>
        )}
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Item Name</th><th>Quantity</th><th>Unit</th><th>Reorder Point</th><th>Note</th><th>Recorded By</th>{editable&&<th style={{textAlign:'right'}}>Actions</th>}</tr></thead>
            <tbody>
              {!items.length && <tr><td colSpan={editable?7:6} style={{textAlign:'center',color:'#4a5568',padding:'2rem'}}>No bakery items recorded today</td></tr>}
              {items.map(r => editId===r.id ? (
                <tr key={r.id}>
                  <td><input className="input" list="bk-names-edit" value={editRow.itemName} onChange={e=>setEditRow(p=>({...p,itemName:e.target.value}))}/><datalist id="bk-names-edit">{names.map(n=><option key={n.id} value={n.name}/>)}</datalist></td>
                  <td><input className="input" type="number" min="0" step="0.01" value={editRow.quantity} onChange={e=>setEditRow(p=>({...p,quantity:e.target.value}))}/></td>
                  <td><input className="input" value={editRow.unit} onChange={e=>setEditRow(p=>({...p,unit:e.target.value}))}/></td>
                  <td><input className="input" type="number" min="0" step="0.01" value={editRow.lowStockThreshold} onChange={e=>setEditRow(p=>({...p,lowStockThreshold:e.target.value}))}/></td>
                  <td><input className="input" value={editRow.note||''} onChange={e=>setEditRow(p=>({...p,note:e.target.value}))} placeholder="Note"/></td>
                  <td><div style={{display:'flex',gap:'0.5rem',justifyContent:'flex-end'}}><button className="btn btn-primary" style={{padding:'0.35rem 0.6rem'}} onClick={saveEdit}><Save size={13}/></button><button className="btn btn-secondary" style={{padding:'0.35rem 0.6rem'}} onClick={()=>setEditId(null)}><X size={13}/></button></div></td>
                </tr>
              ) : (
                <tr key={r.id}>
                  <td style={{fontWeight:500,color:'#fff'}}>{r.itemName}</td>
                  <td><span style={{fontWeight:700,color: r.lowStockThreshold>0&&r.quantity<r.lowStockThreshold?'#f87171':'#fff'}}>{r.quantity}</span></td>
                  <td style={{color:'#64748b'}}>{r.unit}</td>
                  <td style={{color:'#64748b'}}>{r.lowStockThreshold>0?r.lowStockThreshold:'—'}</td>
                  <td style={{color:'#94a3b8',fontSize:'0.8rem',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.note||'—'}</td>
                  <td style={{color:'#94a3b8',fontSize:'0.8rem'}}>{r.recordedBy||'—'}</td>
                  {editable&&<td><div style={{display:'flex',gap:'0.5rem',justifyContent:'flex-end'}}><button className="btn btn-secondary" style={{padding:'0.35rem 0.6rem'}} onClick={()=>startEdit(r)}><Edit2 size={13}/></button><button className="btn btn-danger" style={{padding:'0.35rem 0.6rem'}} onClick={()=>deleteMut.mutate(r.id)}><Trash2 size={13}/></button></div></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PackageCheck size={16} color="#3b82f6" />
          <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.875rem' }}>Received from Production</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#64748b' }}>{date}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr>{['#', 'Item Name', 'Qty', 'Unit', 'Note', 'Transferred By', 'Time'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {received.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#4a5568', padding: '2rem' }}>No items received from Production today.</td></tr>
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

      {supplyDialog && <SupplyDialog names={names} onClose={()=>setSupplyDialog(false)} onSubmit={handleSupply}/>}
    </div>
  );
}
