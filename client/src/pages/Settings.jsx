import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import toast from 'react-hot-toast';
import { HardDrive, Link2, Link2Off, Upload, CheckCircle, AlertCircle, ExternalLink, Info } from 'lucide-react';

export default function Settings() {
  const qc = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['gdrive-status'],
    queryFn: () => api.get('/gdrive/status'),
    refetchInterval: 5000,
  });

  const disconnect = useMutation({
    mutationFn: () => api.delete('/gdrive/disconnect'),
    onSuccess: () => { qc.invalidateQueries(['gdrive-status']); toast.success('Google Drive disconnected'); },
    onError: e => toast.error(e.message),
  });

  const backup = useMutation({
    mutationFn: () => api.post('/gdrive/backup'),
    onSuccess: (data) => { qc.invalidateQueries(['gdrive-status']); toast.success(`Backup saved: ${data.fileName}`); },
    onError: e => toast.error('Backup failed: ' + e.message),
  });

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('success=connected')) { toast.success('Google Drive connected successfully!'); window.location.hash = '/settings'; }
    if (hash.includes('error=auth_failed')) { toast.error('Google authentication failed. Please try again.'); window.location.hash = '/settings'; }
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {/* Google Drive Section */}
      <div className="card" style={{ maxWidth: 640 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HardDrive size={18} color="#4ade80" />
          <span style={{ fontWeight: 600, color: '#fff' }}>Google Drive Backup</span>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>
          ) : !status?.configured ? (
            <div style={{ padding: '1rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertCircle size={18} color="#f59e0b" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ color: '#f59e0b', fontWeight: 600, marginBottom: '0.5rem' }}>Google OAuth Not Configured</p>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6 }}>
                    To enable Google Drive backup, set these environment variables on your Render service:
                  </p>
                  <ul style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem', paddingLeft: '1.25rem', lineHeight: 2 }}>
                    <li><code style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>GOOGLE_CLIENT_ID</code></li>
                    <li><code style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>GOOGLE_CLIENT_SECRET</code></li>
                    <li><code style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>APP_URL</code> — your Render app URL</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: status.connected ? 'rgba(74,222,128,0.08)' : 'rgba(100,116,139,0.08)', border: `1px solid ${status.connected ? 'rgba(74,222,128,0.2)' : 'rgba(100,116,139,0.15)'}`, borderRadius: 8 }}>
                {status.connected ? <CheckCircle size={20} color="#4ade80" /> : <Link2Off size={20} color="#64748b" />}
                <div>
                  <div style={{ fontWeight: 600, color: status.connected ? '#4ade80' : '#94a3b8' }}>
                    {status.connected ? 'Connected' : 'Not Connected'}
                  </div>
                  {status.connected && status.email && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.1rem' }}>{status.email}</div>}
                  {status.connected && status.lastBackup && <div style={{ fontSize: '0.75rem', color: '#4a5568', marginTop: '0.25rem' }}>Last backup: {new Date(status.lastBackup).toLocaleString()}</div>}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {!status.connected ? (
                  <a href="/api/gdrive/auth" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                    <Link2 size={16} />Connect Google Account
                  </a>
                ) : (
                  <>
                    <button className="btn btn-primary" onClick={() => backup.mutate()} disabled={backup.isPending}>
                      <Upload size={16} />{backup.isPending ? 'Backing up...' : 'Backup Now'}
                    </button>
                    <button className="btn btn-danger" onClick={() => { if (confirm('Disconnect Google Drive?')) disconnect.mutate(); }} disabled={disconnect.isPending}>
                      <Link2Off size={16} />{disconnect.isPending ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8, display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <Info size={16} color="#60a5fa" style={{ marginTop: 2, flexShrink: 0 }} />
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                  Backups are saved as <strong style={{ color: '#fff' }}>DEFFIZZY_Backup_YYYY-MM-DD.json</strong> in your Google Drive.
                  Each backup contains all store, ingredients, production, packaging, and dispatch records.
                  Only files created by this app are accessible.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Setup Guide */}
      <div className="card" style={{ maxWidth: 640, marginTop: '1rem' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Info size={16} color="#60a5fa" />
          <span style={{ fontWeight: 600, color: '#fff' }}>Google OAuth Setup Guide</span>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <ol style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 2, paddingLeft: '1.25rem' }}>
            <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>Google Cloud Console <ExternalLink size={12} /></a></li>
            <li>Create a new project or select an existing one</li>
            <li>Go to <strong style={{ color: '#fff' }}>APIs &amp; Services → Library</strong> and enable <strong style={{ color: '#fff' }}>Google Drive API</strong></li>
            <li>Go to <strong style={{ color: '#fff' }}>APIs &amp; Services → Credentials</strong></li>
            <li>Click <strong style={{ color: '#fff' }}>Create Credentials → OAuth 2.0 Client ID</strong></li>
            <li>Choose <strong style={{ color: '#fff' }}>Web application</strong></li>
            <li>Add Authorized redirect URI: <code style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>https://YOUR-APP.onrender.com/api/gdrive/callback</code></li>
            <li>Copy the Client ID and Client Secret to your Render environment variables</li>
            <li>Also set <code style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>APP_URL</code> to your full Render app URL</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
