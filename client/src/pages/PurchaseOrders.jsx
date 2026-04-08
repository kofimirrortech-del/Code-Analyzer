import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import { Plus, Edit2, Trash2, CheckCircle, Clock, Package, XCircle } from 'lucide-react';

const DEPTS = ['store','ingredients','production','bakery','packaging','dispatch'];
const STATUS_META = {
  pending:  { label:'Pending',  color:'#f59e0b', icon:Clock },
  approved: { label:'Approved', color:'#3b82f6', icon:CheckCircle },
  received: { label:'Received', color:'#10b981', icon:Package },
  closed:   { label:'Closed',   color:'#64748b', icon:XCircle },
};
const PRIORITY_COLORS = { high:'#ef4444', normal:'#64748b', low:'#4a5568' };

function POModal({ initial, users=[], onClose, onSave }) {
  const [form, setForm] = useState(initial || { itemName:'', department:'store', quantityNeeded:'', unit:'units', supplier:'', priority:'normal', assignedTo:'', notes:'' });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-container" style={{ width:460 }} onClick={e=>e.stopPropagation()}>
        <h3 className="modal-title">{initial ? 'Edit Purchase Order' : 'New Purchase Order'}</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
          <div style={{ gridColumn:'1/-1' }}><label className="label">Item Name</label><input className="input" value={form.itemName} onChange={e=>set('itemName',e.target.value)} placeholder="Item name"/></div>
          <div><label className="label">Department</label><select className="input" value={form.department} onChange={e=>set('department',e.target.value)}>{DEPTS.map(d=><option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}</select></div>
          <div><label className="label">Priority</label><select className="input" value={form.priority} onChange={e=>set('priority',e.target.value)}><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></div>
          <div><label className="label">Quantity Needed</label><input className="input" type="number" min="0" step="0.01" value={form.quantityNeeded} onChange={e=>set('quantityNeeded',e.target.value)} placeholder="0"/></div>
          <div><label className="label">Unit</label><input className="input" value={form.unit} onChange={e=>set('unit',e.target.value)} placeholder="units"/></div>
          <div style={{ gridColumn:'1/-1' }}><label className="label">Supplier (optional)</label><input className="input" value={form.supplier} onChange={e=>set('supplier',e.target.value)} placeholder="Supplier name"/></div>
          <div style={{ gridColumn:'1/-1' }}>
            <label className="label">Assign To (optional)</label>
            <select className="input" value={form.assignedTo} onChange={e=>set('assignedTo',e.target.value)}>
              <option value="">Unassigned</option>
              {users.map(u=><option key={u.id} value={u.username}>{u.username} ({u.role})</option>)}
            </select>
          </div>
          <div style={{ gridColumn:'1/-1' }}><label className="label">Notes</label><textarea className="input" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Additional notes" rows={2} style={{ resize:'vertical' }}/></div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={()=>onSave(form)}>{initial ? 'Save Changes' : 'Create PO'}</button>
        </div>
      </div>
    </div>
  );
}

function StatusSelect({ po, onUpdate }) {
  return (
    <select
      className="input"
      style={{ padding:'0.25rem 0.5rem', fontSize:'0.75rem', width:'auto' }}
      value={po.status}
      onChange={e => onUpdate({ id:po.id, status:e.target.value })}
    >
      {Object.keys(STATUS_META).map(s=><option key={s} value={s}>{STATUS_META[s].label}</option>)}
    </select>
  );
}

export default function PurchaseOrders() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);

  const { data: pos = [], isLoading } = useQuery({
    queryKey: ['purchase-orders', filter],
    queryFn: () => api.get(`/purchase-orders${filter ? `?status=${filter}` : ''}`),
  });
  const { data: users = [] } = useQuery({ queryKey:['users'], queryFn:()=>api.get('/users') });

  const createMut = useMutation({ mutationFn:d=>api.post('/purchase-orders',d), onSuccess:()=>{ qc.invalidateQueries(['purchase-orders']); setAddModal(false); } });
  const updateMut = useMutation({ mutationFn:({id,...d})=>api.put(`/purchase-orders/${id}`,d), onSuccess:()=>{ qc.invalidateQueries(['purchase-orders']); setEditModal(null); } });
  const deleteMut = useMutation({ mutationFn:id=>api.delete(`/purchase-orders/${id}`), onSuccess:()=>qc.invalidateQueries(['purchase-orders']) });

  const pending = pos.filter(p=>p.status==='pending').length;

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:'4rem' }}><div className="spinner"/></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p style={{ color:'#64748b', fontSize:'0.875rem', marginTop:'0.25rem' }}>{pending} pending · {pos.length} total</p>
        </div>
        <button className="btn btn-primary" onClick={()=>setAddModal(true)}><Plus size={16}/>New PO</button>
      </div>

      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem', flexWrap:'wrap' }}>
        {['','pending','approved','received','closed'].map(s=>(
          <button key={s} className={`btn ${filter===s?'btn-primary':'btn-secondary'}`} style={{ padding:'0.35rem 0.8rem', fontSize:'0.8rem' }} onClick={()=>setFilter(s)}>
            {s ? STATUS_META[s]?.label : 'All'}
            {s==='pending'&&pending>0&&<span className="badge badge-red" style={{ marginLeft:'0.35rem', padding:'0.1rem 0.4rem' }}>{pending}</span>}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Item</th><th>Dept</th><th>Qty</th><th>Priority</th><th>Assigned To</th><th>Status</th><th>Date</th><th style={{textAlign:'right'}}>Actions</th></tr></thead>
            <tbody>
              {!pos.length && <tr><td colSpan={8} style={{ textAlign:'center', color:'#4a5568', padding:'2rem' }}>No purchase orders found</td></tr>}
              {pos.map(po => {
                const Meta = STATUS_META[po.status] || STATUS_META.pending;
                return (
                  <tr key={po.id}>
                    <td style={{ fontWeight:500, color:'#fff' }}>
                      {po.itemName}
                      {po.supplier && <div style={{ fontSize:'0.7rem', color:'#64748b' }}>{po.supplier}</div>}
                    </td>
                    <td style={{ color:'#94a3b8', textTransform:'capitalize' }}>{po.department}</td>
                    <td style={{ color:'#fff' }}>{po.quantityNeeded} {po.unit}</td>
                    <td><span style={{ fontSize:'0.7rem', fontWeight:700, color:PRIORITY_COLORS[po.priority]||'#64748b', textTransform:'uppercase' }}>{po.priority}</span></td>
                    <td style={{ color:'#94a3b8', fontSize:'0.8rem' }}>{po.assignedTo || '—'}</td>
                    <td><StatusSelect po={po} onUpdate={d=>updateMut.mutate(d)}/></td>
                    <td style={{ color:'#64748b', fontSize:'0.8rem' }}>{po.date}</td>
                    <td>
                      <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end' }}>
                        <button className="btn btn-secondary" style={{ padding:'0.35rem 0.6rem' }} onClick={()=>setEditModal(po)}><Edit2 size={13}/></button>
                        <button className="btn btn-danger" style={{ padding:'0.35rem 0.6rem' }} onClick={()=>{ if(confirm('Delete this purchase order?')) deleteMut.mutate(po.id); }}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {addModal && <POModal users={users} onClose={()=>setAddModal(false)} onSave={d=>createMut.mutate(d)}/>}
      {editModal && <POModal initial={editModal} users={users} onClose={()=>setEditModal(null)} onSave={d=>updateMut.mutate({id:editModal.id,...d})}/>}
    </div>
  );
}
