import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';
import crypto from 'crypto';

const router = Router();

const USERS = {
  admin:     { pass: 'admin123', role: 'ADMIN' },
  store_user:{ pass: 'store789', role: 'STORE' },
  ing_user:  { pass: 'ing789',   role: 'INGREDIENT' },
  prod_user: { pass: 'prod789',  role: 'PRODUCTION' },
  pkg_user:  { pass: 'pkg789',   role: 'PACKAGE' },
  disp_user: { pass: 'disp789',  role: 'DISPATCH' },
};

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = USERS[(username || '').toLowerCase()];
  if (!user || user.pass !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const sessionId = crypto.randomBytes(32).toString('hex');
  await query(
    'INSERT INTO sessions (session_id, username, role) VALUES ($1, $2, $3)',
    [sessionId, username.toLowerCase(), user.role]
  );
  res.cookie('session_id', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  res.json({ username: username.toLowerCase(), role: user.role });
});

router.post('/logout', async (req, res) => {
  const sessionId = req.cookies?.session_id;
  if (sessionId) {
    await query('DELETE FROM sessions WHERE session_id = $1', [sessionId]);
  }
  res.clearCookie('session_id');
  res.json({ success: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username, role: req.user.role });
});

export default router;
