import { query } from './db.js';

export async function requireAuth(req, res, next) {
  const sessionId = req.cookies?.session_id;
  if (!sessionId) return res.status(401).json({ error: 'Not authenticated' });
  const result = await query(
    `SELECT s.username, s.role, u.permissions, u.id as user_id
     FROM sessions s LEFT JOIN users u ON u.username = s.username
     WHERE s.session_id = $1`,
    [sessionId]
  );
  if (result.rows.length === 0) return res.status(401).json({ error: 'Not authenticated' });
  req.user = result.rows[0];
  next();
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
  next();
}
