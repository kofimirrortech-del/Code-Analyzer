import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';
import crypto from 'crypto';

const router = Router();

function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const hashBuffer = Buffer.from(hash, 'hex');
    const derivedHash = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(hashBuffer, derivedHash);
  } catch { return false; }
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const { rows } = await query(
    'SELECT * FROM users WHERE username = $1 AND is_active = true',
    [(username || '').toLowerCase().trim()]
  );
  if (!rows[0] || !verifyPassword(password, rows[0].password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const user = rows[0];
  const sessionId = crypto.randomBytes(32).toString('hex');
  await query('INSERT INTO sessions (session_id, username, role) VALUES ($1, $2, $3)', [sessionId, user.username, user.role]);
  res.cookie('session_id', sessionId, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ username: user.username, role: user.role, permissions: user.permissions });
});

router.post('/logout', async (req, res) => {
  const sessionId = req.cookies?.session_id;
  if (sessionId) await query('DELETE FROM sessions WHERE session_id = $1', [sessionId]);
  res.clearCookie('session_id');
  res.json({ success: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username, role: req.user.role, permissions: req.user.permissions });
});

export default router;
