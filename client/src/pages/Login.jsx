import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { ChefHat, User, Lock } from 'lucide-react';

export default function Login() {
  const { login, isLoggingIn, user, isLoading } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a18' }}>
      <div className="spinner" />
    </div>
  );

  if (user) { window.location.hash = '/'; return null; }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.username || !form.password) { setError('Please enter username and password'); return; }
    try {
      await login(form);
    } catch {
      setError('Invalid credentials. Please check and try again.');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a18', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 20%, rgba(79,70,229,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(245,158,11,0.1) 0%, transparent 60%)', pointerEvents: 'none' }} />

      <div className="glass" style={{ width: '100%', maxWidth: 420, borderRadius: '1.5rem', padding: '2.5rem', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 8px 32px rgba(245,158,11,0.3)' }}>
            <ChefHat size={32} color="#000" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Welcome Back</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Sign in to DEFFIZZY Cloud ERP</p>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#f87171', fontSize: '0.875rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div>
            <label className="label">Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Enter your username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} autoComplete="username" />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input className="input" type="password" style={{ paddingLeft: '2.5rem' }} placeholder="Enter your password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} autoComplete="current-password" />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: 52, justifyContent: 'center', fontSize: '1rem', marginTop: '0.5rem' }} disabled={isLoggingIn}>
            {isLoggingIn ? 'Signing in...' : 'Sign In to System'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.7rem', color: '#4a5568', fontFamily: 'monospace' }}>DEFFIZZY BAKE V2.0</p>
      </div>
    </div>
  );
}
