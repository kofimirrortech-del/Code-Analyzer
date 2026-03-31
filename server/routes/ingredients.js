import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];

function fmt(r) {
  return { id: r.id, name: r.name, stock: parseFloat(r.stock ?? 0), unit: r.unit, date: r.date, createdAt: r.created_at };
}

router.get('/', requireAuth, async (req, res) => {
  const date = req.query.date || today();
  const { rows } = await query('SELECT * FROM ingredients WHERE date = $1 ORDER BY created_at ASC', [date]);
  res.json(rows.map(fmt));
});

router.post('/', requireAuth, async (req, res) => {
  const { name, stock, unit } = req.body;
  if (!name || stock == null || !unit) return res.status(400).json({ error: 'name, stock, unit are required' });
  const { rows } = await query(
    'INSERT INTO ingredients (name, stock, unit, date) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, stock, unit, today()]
  );
  res.status(201).json(fmt(rows[0]));
});

router.put('/:id', requireAuth, async (req, res) => {
  const { name, stock, unit } = req.body;
  if (!name || stock == null || !unit) return res.status(400).json({ error: 'name, stock, unit are required' });
  const { rows } = await query(
    'UPDATE ingredients SET name=$1, stock=$2, unit=$3 WHERE id=$4 RETURNING *',
    [name, stock, unit, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(rows[0]));
});

router.delete('/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM ingredients WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

export default router;
