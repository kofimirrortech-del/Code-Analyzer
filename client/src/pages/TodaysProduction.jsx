import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { canEdit } from '../utils/permissions.js';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, ClipboardCheck } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];

function autoResize(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

export default function TodaysProduction() {
  const { user } = useAuth();
  const isAdmin = canEdit(user, 'todays-production');
  const qc = useQueryClient();
  const [modal, setModal] = useState({ open: false, mode: 'create', note: '', editId: null });

  const { data = [], isLoading } = useQuery({
    queryKey: ['todays-production-notes'],
    queryFn: () => api.get('/todays-production-note'),
  });

  const save = useMutation({
    mutationFn: d => modal.mode === 'create'
      ? api.post('/todays-production-note', d)
      : api.put(`/todays-production-note/${modal.editId}`, d),
    onSuccess: () => {
      qc.invalidateQueries(['todays-production-notes']);
      setModal({ open: false, mode: 'create', note: '', editId: null });
      toast.success(modal.mode === 'create' ? 'Entry added!' : 'Entry updated!');
    },
    onError: e => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: id => api.delete(`/todays-production-note/${id}`),
    onSuccess: () => { qc.invalidateQueries(['todays-production-notes']); toast.success('Entry deleted'); },
    onError: e => toast.error(e.message),
  });

  const todayDate = today();
  const todayEntries = data.filter(d => d.date === todayDate);
  const pastEntries = data.filter(d => d.date !== todayDate);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Today's Production</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>{todayDate}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'create', note: '', editId: null })}>
            <Plus size={16} />Add Note
          </button>
        )}
      </div>

      {/* Today's entries */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ClipboardCheck size={16} color="#8b5cf6" />
          <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>Today — {todayDate}</span>
          <span className="badge" style={{ marginLeft: 'auto', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>{todayEntries.length}</span>
        </div>
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : todayEntries.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#4a5568' }}>No production notes for today yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th style={{ width: 130 }}>Date</th><th>Note</th>{isAdmin && <th style={{ width: 100 }}>Actions</th>}</tr></thead>
              <tbody>
                {todayEntries.map(item => (
                  <tr key={item.id}>
                    <td style={{ color: '#a78bfa', fontWeight: 600, verticalAlign: 'top', paddingTop: '0.75rem' }}>{item.date}</td>
                    <td style={{ color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7 }}>{item.note}</td>
                    {isAdmin && (
                      <td style={{ verticalAlign: 'top', paddingTop: '0.6rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-ghost" style={{ padding: '0.375rem 0.75rem' }}
                            onClick={() => setModal({ open: true, mode: 'edit', note: item.note, editId: item.id })}>
                            <Pencil size={14} />
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.375rem 0.75rem' }}
                            onClick={() => { if (confirm('Delete this entry?')) del.mutate(item.id); }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pastEntries.length > 0 && (
        <div className="card">
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.9rem' }}>Previous Entries</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th style={{ width: 130 }}>Date</th><th>Note</th>{isAdmin && <th style={{ width: 100 }}>Actions</th>}</tr></thead>
              <tbody>
                {pastEntries.map(item => (
                  <tr key={item.id}>
                    <td style={{ color: '#64748b', verticalAlign: 'top', paddingTop: '0.75rem' }}>{item.date}</td>
                    <td style={{ color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7 }}>{item.note}</td>
                    {isAdmin && (
                      <td style={{ verticalAlign: 'top', paddingTop: '0.6rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-ghost" style={{ padding: '0.375rem 0.75rem' }}
                            onClick={() => setModal({ open: true, mode: 'edit', note: item.note, editId: item.id })}>
                            <Pencil size={14} />
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.375rem 0.75rem' }}
                            onClick={() => { if (confirm('Delete this entry?')) del.mutate(item.id); }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal.open && (
        <div className="overlay" onClick={() => setModal(m => ({ ...m, open: false }))}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 700, color: '#fff', fontSize: '1.25rem' }}>
                {modal.mode === 'create' ? "Add Today's Production Note" : 'Edit Note'}
              </h2>
              <button onClick={() => setModal(m => ({ ...m, open: false }))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              if (!modal.note.trim()) { toast.error('Note cannot be empty'); return; }
              save.mutate({ note: modal.note });
            }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Note</label>
                <textarea
                  className="input"
                  value={modal.note}
                  onChange={e => { setModal(m => ({ ...m, note: e.target.value })); autoResize(e.target); }}
                  ref={el => { if (el) autoResize(el); }}
                  placeholder="Type your production notes here — no character limit..."
                  style={{ resize: 'none', minHeight: 140, overflow: 'hidden', lineHeight: 1.7, width: '100%' }}
                />
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
