import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import { Plus, Edit2, Trash2, Shield, UserCheck, UserX, Key } from 'lucide-react';

const SECTIONS = [
  { key: 'store',            label: 'Store' },
  { key: 'ingredients',      label: 'Ingredients' },
  { key: 'production',       label: 'Production' },
  { key: 'bakery',           label: 'Bakery' },
  { key: 'packaging',        label: 'Packaging' },
  { key: 'dispatch',         label: 'Dispatch' },
  { key: 'todays-order',     label: "Today's Order" },
  { key: 'todays-production',label: "Today's Production" },
];
const ROLES = ['ADMIN','STORE','INGREDIENT','PRODUCTION','BAKERY','PACKAGE','DISPATCH'];
const ROLE_COLORS = { ADMIN:'#f59e0b', STORE:'#3b82f6', INGREDIENT:'#10b981', PRODUCTION:'#8b5cf6', BAKERY:'#ec4899', PACKAGE:'#14b8a6', DISPATCH:'#f97316' };

function UserModal({ initial, onClose, onSave, isEdit }) {
  const [form, setForm] = useState(initial || { username:'', password:'', role:'STORE' });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-container" style={{ width: 400 }} onClick={e=>e.stopPropagation()}>
        <h3 className="modal-title">{isEdit ? 'Edit User' : 'Add User'}</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div>
            <label className="label">Username</label>
            <input className="input" value={form.username} onChange={e=>set('username',e.target.value)} placeholder="username" disabled={isEdit} />
          </div>
          <div>
            <label className="label">{isEdit ? 'New Password (leave blank to keep)' : 'Password'}</label>
            <input className="input" type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder={isEdit ? '(unchanged)' : 'password'} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={e=>set('role',e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {isEdit && (
            <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', color:'#94a3b8', fontSize:'0.875rem' }}>
              <input type="checkbox" checked={form.isActive !== false} onChange={e=>set('isActive',e.target.checked)} />
              Active account
            </label>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={()=>onSave(form)}>
            {isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PermissionsModal({ user, onClose, onSave }) {
  const { data: def } = useQuery({
    queryKey: ['default-perms', user.role],
    queryFn: () => api.get(`/users/default-permissions/${user.role}`),
  });
  const [perms, setPerms] = useState(user.permissions || def || null);
  const [useCustom, setUseCustom] = useState(user.permissions !== null && user.role !== 'ADMIN');

  React.useEffect(() => {
    if (!perms && def) setPerms(def);
  }, [def]);

  const toggle = (section, type) => {
    setPerms(prev => {
      const p = { ...(prev || {}) };
      p[section] = { ...(p[section] || { view: false, edit: false }) };
      p[section][type] = !p[section][type];
      if (type === 'edit' && p[section].edit) p[section].view = true;
      if (type === 'view' && !p[section].view) p[section].edit = false;
      return p;
    });
  };

  if (user.role === 'ADMIN') return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-container" style={{ width: 420 }} onClick={e=>e.stopPropagation()}>
        <h3 className="modal-title">Permissions — {user.username}</h3>
        <div style={{ textAlign:'center', padding:'2rem', color:'#64748b' }}>
          Admin has full access to all sections.
        </div>
        <div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-container" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e=>e.stopPropagation()}>
        <h3 className="modal-title">Permissions — {user.username}</h3>
        <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', color:'#94a3b8', fontSize:'0.875rem', marginBottom:'1rem' }}>
          <input type="checkbox" checked={useCustom} onChange={e => { setUseCustom(e.target.checked); if(!e.target.checked) setPerms(null); else setPerms(def || {}); }} />
          Use custom permissions (override role defaults)
        </label>
        {useCustom && perms && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:'0.5rem', fontSize:'0.75rem', color:'#64748b', fontWeight:600, marginBottom:'0.5rem', padding:'0 0.5rem' }}>
              <span>Section</span><span>View</span><span>Edit</span>
            </div>
            {SECTIONS.map(s => (
              <div key={s.key} style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:'0.5rem', alignItems:'center', padding:'0.5rem', borderRadius:8, background:'rgba(255,255,255,0.02)', marginBottom:2 }}>
                <span style={{ color:'#fff', fontSize:'0.875rem' }}>{s.label}</span>
                <input type="checkbox" checked={perms[s.key]?.view === true} onChange={()=>toggle(s.key,'view')} style={{ accentColor:'#f59e0b', width:16, height:16 }} />
                <input type="checkbox" checked={perms[s.key]?.edit === true} onChange={()=>toggle(s.key,'edit')} style={{ accentColor:'#f59e0b', width:16, height:16 }} />
              </div>
            ))}
          </div>
        )}
        {!useCustom && (
          <p style={{ color:'#64748b', fontSize:'0.875rem' }}>Using default permissions for role <strong style={{color:'#f59e0b'}}>{user.role}</strong>.</p>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(useCustom ? perms : null)}>Save Permissions</button>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users') });

  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [permsModal, setPermsModal] = useState(null);

  const createMut = useMutation({ mutationFn: d => api.post('/users', d), onSuccess: () => { qc.invalidateQueries(['users']); setAddModal(false); } });
  const updateMut = useMutation({ mutationFn: ({id,...d}) => api.put(`/users/${id}`, d), onSuccess: () => { qc.invalidateQueries(['users']); setEditModal(null); } });
  const deleteMut = useMutation({ mutationFn: id => api.delete(`/users/${id}`), onSuccess: () => qc.invalidateQueries(['users']) });

  const handleCreate = async (form) => {
    if (!form.username || !form.password) return alert('Username and password required');
    await createMut.mutateAsync(form);
  };
  const handleUpdate = async (form) => {
    const payload = { username: form.username, role: form.role, isActive: form.isActive !== false };
    if (form.password) payload.password = form.password;
    await updateMut.mutateAsync({ id: editModal.id, ...payload });
  };
  const handlePerms = async (perms) => {
    await updateMut.mutateAsync({ id: permsModal.id, permissions: perms });
    setPermsModal(null);
  };
  const handleDelete = (u) => {
    if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    deleteMut.mutate(u.id);
  };
  const handleToggle = (u) => {
    updateMut.mutate({ id: u.id, isActive: !u.isActive });
  };

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:'4rem' }}><div className="spinner"/></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p style={{ color:'#64748b', fontSize:'0.875rem', marginTop:'0.25rem' }}>{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddModal(true)}><Plus size={16}/>Add User</button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Username</th><th>Role</th><th>Status</th><th>Created</th><th style={{textAlign:'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight:600, color:'#fff' }}>{u.username}</td>
                  <td><span style={{ padding:'0.2rem 0.6rem', borderRadius:6, fontSize:'0.7rem', fontWeight:700, background:`${ROLE_COLORS[u.role] || '#64748b'}20`, color: ROLE_COLORS[u.role] || '#94a3b8', border:`1px solid ${ROLE_COLORS[u.role] || '#64748b'}30` }}>{u.role}</span></td>
                  <td><span className={u.isActive ? 'badge badge-green' : 'badge badge-red'}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ color:'#64748b', fontSize:'0.8rem' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end' }}>
                      <button className="btn btn-secondary" style={{ padding:'0.35rem 0.6rem' }} onClick={() => setPermsModal(u)} title="Permissions"><Shield size={13}/></button>
                      <button className="btn btn-secondary" style={{ padding:'0.35rem 0.6rem' }} onClick={() => setEditModal({...u, password:''})} title="Edit"><Edit2 size={13}/></button>
                      <button className="btn btn-secondary" style={{ padding:'0.35rem 0.6rem' }} onClick={() => handleToggle(u)} title={u.isActive ? 'Deactivate' : 'Activate'}>
                        {u.isActive ? <UserX size={13}/> : <UserCheck size={13}/>}
                      </button>
                      <button className="btn btn-danger" style={{ padding:'0.35rem 0.6rem' }} onClick={() => handleDelete(u)} title="Delete" disabled={u.username === 'admin'}><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {addModal && <UserModal onClose={()=>setAddModal(false)} onSave={handleCreate} />}
      {editModal && <UserModal initial={editModal} isEdit onClose={()=>setEditModal(null)} onSave={handleUpdate} />}
      {permsModal && <PermissionsModal user={permsModal} onClose={()=>setPermsModal(null)} onSave={handlePerms} />}
    </div>
  );
}
