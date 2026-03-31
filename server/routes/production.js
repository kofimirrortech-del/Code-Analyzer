import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];

function fmt(r) {
  return {
    id: r.id,
    product: r.product,
    quantityProduced: parseFloat(r.quantity_produced ?? 0),
    unit: r.unit ?? 'units',
    baker: r.baker,
    note: r.note ?? '',
    date: r.date,
    createdAt: r.created_at,
  };
}

router.get('/', requireAuth, async (req, res) => {
  const { date } = req.query;
  let sql = 'SELECT * FROM production_batches';
  const params = [];
  if (date) { sql += ' WHERE date = $1'; params.push(date); }
  sql += ' ORDER BY created_at DESC';
  const { rows } = await query(sql, params);
  res.json(rows.map(fmt));
});

router.post('/', requireAuth, async (req, res) => {
  const { product, quantityProduced, unit = 'units', baker, note = '' } = req.body;
  if (!product || quantityProduced == null || !baker) return res.status(400).json({ error: 'product, quantityProduced, baker are required' });
  const { rows } = await query(
    'INSERT INTO production_batches (product, quantity_produced, unit, baker, note, date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [product, quantityProduced, unit, baker, note, today()]
  );
  res.status(201).json(fmt(rows[0]));
});

router.put('/:id', requireAuth, async (req, res) => {
  const { product, quantityProduced, unit = 'units', baker, note = '' } = req.body;
  if (!product || quantityProduced == null || !baker) return res.status(400).json({ error: 'product, quantityProduced, baker are required' });
  const { rows } = await query(
    'UPDATE production_batches SET product=$1, quantity_produced=$2, unit=$3, baker=$4, note=$5 WHERE id=$6 RETURNING *',
    [product, quantityProduced, unit, baker, note, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(rows[0]));
});

router.delete('/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM production_batches WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

export default router;
