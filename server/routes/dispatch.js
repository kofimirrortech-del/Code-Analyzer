import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];

function fmt(r) {
  const qty = parseFloat(r.quantity ?? 0);
  const unitCost = parseFloat(r.unit_cost ?? 0);
  return {
    id: r.id,
    notes: r.notes ?? '',
    item: r.item ?? '',
    quantity: qty,
    unitCost,
    total: qty * unitCost,
    date: r.date,
    createdAt: r.created_at,
  };
}

router.get('/', requireAuth, async (_req, res) => {
  const { rows } = await query('SELECT * FROM orders ORDER BY created_at DESC');
  res.json(rows.map(fmt));
});

router.post('/', requireAuth, async (req, res) => {
  const { notes = '', item, quantity, unitCost } = req.body;
  if (!item || quantity == null || unitCost == null) return res.status(400).json({ error: 'item, quantity, unitCost are required' });
  const total = parseFloat(quantity) * parseFloat(unitCost);
  const { rows } = await query(
    'INSERT INTO orders (notes, item, quantity, unit_cost, total, date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [notes, item, quantity, unitCost, total, today()]
  );
  res.status(201).json(fmt(rows[0]));
});

router.put('/:id', requireAuth, async (req, res) => {
  const { notes = '', item, quantity, unitCost } = req.body;
  if (!item || quantity == null || unitCost == null) return res.status(400).json({ error: 'item, quantity, unitCost are required' });
  const total = parseFloat(quantity) * parseFloat(unitCost);
  const { rows } = await query(
    'UPDATE orders SET notes=$1, item=$2, quantity=$3, unit_cost=$4, total=$5 WHERE id=$6 RETURNING *',
    [notes, item, quantity, unitCost, total, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(rows[0]));
});

router.delete('/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM orders WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

export default router;
