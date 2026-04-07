import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];

const fmt = r => ({ id: r.id, date: r.date, note: r.note, createdAt: r.created_at });

router.get('/', requireAuth, async (_req, res) => {
  const { rows } = await query('SELECT * FROM todays_order_notes ORDER BY created_at DESC');
  res.json(rows.map(fmt));
});

router.post('/', requireAuth, async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  const { note = '' } = req.body;
  const { rows } = await query(
    'INSERT INTO todays_order_notes (date, note) VALUES ($1,$2) RETURNING *',
    [today(), note]
  );
  res.status(201).json(fmt(rows[0]));
});

router.put('/:id', requireAuth, async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  const { note = '' } = req.body;
  const { rows } = await query(
    'UPDATE todays_order_notes SET note=$1 WHERE id=$2 RETURNING *',
    [note, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(rows[0]));
});

router.delete('/:id', requireAuth, async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  await query('DELETE FROM todays_order_notes WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

export default router;
