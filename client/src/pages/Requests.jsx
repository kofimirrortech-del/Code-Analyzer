import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Trash2, Share2, Bell, Settings as SettingsIcon, ChevronDown, ChevronUp } from 'lucide-react';

const DEPTS = ['store','ingredients','production','bakery','packaging','dispatch'];
const STATUS_COLORS = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };
const ALL_DEPTS = DEPTS;

function waLink(req) {
  const text = `*Item Request*\n\nFrom: ${req.fromDept}\nRequesting from: ${req.toDept}\nDetails: ${req.note || 'N/A'}\nStatus: ${req.status}\nRequested by: ${req.requestedBy}\nDate: ${req.date}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function ReviewModal({ req, onClose, onSave }) {
  const [status, setStatus] = useState('approved');
  const [note, setNote] = useState('');
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-container" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Review Request</h3>
        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: '1rem', fontSize: '0.85rem' }}>
          <div style={{ color: '#fff', fontWeight: 600 }}>{req.itemName}</div>
          <div style={{ color: '#64748b', marginTop: '0.25rem' }}>{req.fromDept} → {req.toDept} · {req.quantity} {req.unit}</div>
          {req.note && <div style={{ color: '#94a3b8', marginTop: '0.25rem', fontStyle: 'italic' }}>"{req.note}"</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label className="label">Decision</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="approved">Approve</option>
              <option value="rejected">Reject</option>
            </select>
          </div>
          <div>
            <label className="label">Review Note (optional)</label>
            <textarea className="input" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note for the requesting dept..." style={{ resize: 'vertical' }} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className={`btn ${status === 'approved' ? 'btn-primary' : 'btn-danger'}`} onClick={() => onSave(status, note)}>
            {status === 'approved' ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotifSettings() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: settings = {} } = useQuery({ queryKey: ['notif-settings'], queryFn: () => api.get('/notifications/settings') });
  const { data: requestDepts = [] } = useQuery({ queryKey: ['request-depts'], queryFn: () => api.get('/notifications/request-depts') });

  const saveSetting = useMutation({
    mutationFn: s => api.put('/notifications/settings', s),
    onSuccess: () => { qc.invalidateQueries(['notif-settings']); toast.success('Notification settings saved'); },
  });
  const saveRequestDepts = useMutation({
    mutationFn: d => api.put('/notifications/request-depts', { depts: d }),
    onSuccess: () => { qc.invalidateQueries(['request-depts']); toast.success('Request permissions saved'); },
  });

  const toggleSetting = key => saveSetting.mutate({ ...settings, [key]: !settings[key] });
  const toggleDept = dept => {
    const next = requestDepts.includes(dept) ? requestDepts.filter(d => d !== dept) : [...requestDepts, dept];
    saveRequestDepts.mutate(next);
  };

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left' }}>
        <SettingsIcon size={16} color="#64748b" />
        <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.875rem', flex: 1 }}>Admin Settings — Notifications & Request Permissions</span>
        {open ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
      </button>
      {open && (
        <div style={{ padding: '0 1.5rem 1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <div style={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <Bell size={13} style={{ marginRight: '0.375rem' }} />Notify Admin When
            </div>
            {[
              { key: 'low_stock', label: 'Low stock alert triggered' },
              { key: 'request', label: 'New item request submitted' },
              { key: 'request_approved', label: 'Request approved (dept notified)' },
              { key: 'request_rejected', label: 'Request rejected (dept notified)' },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={settings[key] !== false} onChange={() => toggleSetting(key)} style={{ accentColor: '#f59e0b' }} />
                <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{label}</span>
              </label>
            ))}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Departments That Can Request Items
            </div>
            {ALL_DEPTS.map(dept => (
              <label key={dept} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={requestDepts.includes(dept)} onChange={() => toggleDept(dept)} style={{ accentColor: '#f59e0b' }} />
                <span style={{ fontSize: '0.8rem', color: '#cbd5e1', textTransform: 'capitalize' }}>{dept}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Requests() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const [filter, setFilter] = useState('pending');
  const [reviewReq, setReviewReq] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests', filter],
    queryFn: () => api.get(`/requests${filter ? `?status=${filter}` : ''}`),
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, status, reviewNote }) => api.put(`/requests/${id}`, { status, reviewNote }),
    onSuccess: () => { qc.invalidateQueries(['requests']); qc.invalidateQueries(['notif-count']); setReviewReq(null); toast.success('Request reviewed'); },
    onError: e => toast.error(e.message || 'Failed'),
  });
  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/requests/${id}`),
    onSuccess: () => { qc.invalidateQueries(['requests']); toast.success('Deleted'); },
  });

  const pending = requests.filter(r => r.status === 'pending').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isAdmin ? 'Item Requests' : 'My Requests'}</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {isAdmin ? `${pending} pending approval` : 'Requests submitted by your department'}
          </p>
        </div>
      </div>

      {isAdmin && <NotifSettings />}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['', 'pending', 'approved', 'rejected'].map(s => (
          <button key={s} className={`btn ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setFilter(s)}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
            {s === 'pending' && pending > 0 && (
              <span className="badge badge-red" style={{ marginLeft: '0.35rem', padding: '0.1rem 0.4rem' }}>{pending}</span>
            )}
          </button>
        ))}
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {['#', 'From', 'Requesting From', 'Note / Details', 'Requested By', 'Date', 'Status', 'Actions'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#4a5568', padding: '3rem' }}>No requests found.</td></tr>
                ) : requests.map((r, i) => (
                  <tr key={r.id}>
                    <td style={{ color: '#4a5568' }}>{i + 1}</td>
                    <td style={{ color: '#fff', fontWeight: 500, textTransform: 'capitalize' }}>{r.fromDept}</td>
                    <td style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{r.toDept}</td>
                    <td style={{ color: '#cbd5e1', fontSize: '0.85rem', maxWidth: 260 }}>{r.note || '—'}</td>
                    <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{r.requestedBy}</td>
                    <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{r.date}</td>
                    <td>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600, background: `${STATUS_COLORS[r.status]}18`, color: STATUS_COLORS[r.status] }}>
                        {r.status}
                      </span>
                      {r.reviewNote && <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>{r.reviewNote}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        {isAdmin && r.status === 'pending' && (
                          <>
                            <button className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => setReviewReq(r)}><CheckCircle size={13} /> Review</button>
                          </>
                        )}
                        <a href={waLink(r)} target="_blank" rel="noreferrer"
                          className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Share2 size={12} /> WA
                        </a>
                        {isAdmin && (
                          <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem' }}
                            onClick={() => { if (confirm('Delete?')) deleteMut.mutate(r.id); }}><Trash2 size={12} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reviewReq && (
        <ReviewModal
          req={reviewReq}
          onClose={() => setReviewReq(null)}
          onSave={(status, reviewNote) => reviewMut.mutate({ id: reviewReq.id, status, reviewNote })}
        />
      )}
    </div>
  );
}
