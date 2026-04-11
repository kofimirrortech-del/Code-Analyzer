import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const role = req.user.role;
  const { rows } = await query(
    `SELECT * FROM notifications WHERE target_role='ADMIN' OR target_role=$1 ORDER BY created_at DESC LIMIT 60`,
    [role]
  );
  res.json(rows.map(r => ({
    id: r.id, type: r.type, title: r.title, message: r.message,
    department: r.department, relatedId: r.related_id,
    isRead: r.is_read, createdAt: r.created_at,
  })));
});

router.get('/unread-count', requireAuth, async (req, res) => {
  const role = req.user.role;
  const { rows } = await query(
    `SELECT COUNT(*) FROM notifications WHERE is_read=false AND (target_role='ADMIN' OR target_role=$1)`,
    [role]
  );
  res.json({ count: parseInt(rows[0].count) });
});

router.put('/read-all', requireAuth, async (req, res) => {
  const role = req.user.role;
  await query(
    `UPDATE notifications SET is_read=true WHERE target_role='ADMIN' OR target_role=$1`, [role]
  );
  res.json({ success: true });
});

router.put('/:id/read', requireAuth, async (req, res) => {
  await query('UPDATE notifications SET is_read=true WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

router.get('/settings', requireAuth, async (req, res) => {
  const { rows } = await query(`SELECT value FROM settings WHERE key='notification_settings'`);
  const defaults = { low_stock: true, request: true, request_approved: true, request_rejected: true };
  res.json(rows[0] ? JSON.parse(rows[0].value) : defaults);
});

router.put('/settings', requireAuth, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  await query(
    `INSERT INTO settings (key,value) VALUES ('notification_settings',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
    [JSON.stringify(req.body)]
  );
  res.json({ success: true });
});

router.get('/sidebar-order', requireAuth, async (req, res) => {
  const { rows } = await query(`SELECT value FROM settings WHERE key='sidebar_order'`);
  res.json(rows[0] ? JSON.parse(rows[0].value) : null);
});

router.put('/sidebar-order', requireAuth, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  await query(
    `INSERT INTO settings (key,value) VALUES ('sidebar_order',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
    [JSON.stringify(req.body.order)]
  );
  res.json({ success: true });
});

router.get('/request-depts', requireAuth, async (req, res) => {
  const { rows } = await query(`SELECT value FROM settings WHERE key='request_enabled_depts'`);
  const defaults = ['store','ingredients','production','bakery','packaging','dispatch'];
  res.json(rows[0] ? JSON.parse(rows[0].value) : defaults);
});

router.put('/request-depts', requireAuth, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  await query(
    `INSERT INTO settings (key,value) VALUES ('request_enabled_depts',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
    [JSON.stringify(req.body.depts)]
  );
  res.json({ success: true });
});

export default router;
