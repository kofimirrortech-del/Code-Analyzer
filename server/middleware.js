import { query } from './db.js';

export async function requireAuth(req, res, next) {
  const sessionId = req.cookies?.session_id;
  if (!sessionId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const result = await query(
    'SELECT username, role FROM sessions WHERE session_id = $1',
    [sessionId]
  );
  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.user = result.rows[0];
  next();
}
