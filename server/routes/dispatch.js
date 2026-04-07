import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];

function fmt(r) {
  const qty = parseFloat(r.quantity ?? 0), unitCost = parseFloat(r.unit_cost ?? 0);
  return { id: r.id, notes: r.notes ?? '', item: r.item ?? '', quantity: qty, unitCost, total: qty * unitCost, date: r.date, createdAt: r.created_at };
}

/* ── Persistent item names ── */
router.get('/items', requireAuth, async (_req, res) => {
  const { rows } = await query('SELECT * FROM dispatch_item_names ORDER BY name ASC');
  res.json(rows.map(r => ({ id: r.id, name: r.name })));
});

router.post('/items', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const { rows } = await query(
    'INSERT INTO dispatch_item_names (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING *',
    [name.trim()]
  );
  res.status(201).json({ id: rows[0].id, name: rows[0].name });
});

router.delete('/items/:itemId', requireAuth, async (req, res) => {
  await query('DELETE FROM dispatch_item_names WHERE id=$1', [req.params.itemId]);
  res.json({ success: true });
});

/* ── Daily records ── */
router.get('/', requireAuth, async (req, res) => {
  const date = req.query.date || today();
  const { rows } = await query('SELECT * FROM orders WHERE date=$1 ORDER BY created_at DESC', [date]);
  res.json(rows.map(fmt));
});

router.post('/', requireAuth, async (req, res) => {
  const { notes = '', item, quantity = 0, unitCost = 0 } = req.body;
  if (!item) return res.status(400).json({ error: 'item is required' });
  await query('INSERT INTO dispatch_item_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [item.trim()]);
  const total = parseFloat(quantity) * parseFloat(unitCost);
  const { rows } = await query(
    'INSERT INTO orders (notes,item,quantity,unit_cost,total,date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [notes, item, quantity, unitCost, total, today()]
  );
  res.status(201).json(fmt(rows[0]));
});

router.put('/:id', requireAuth, async (req, res) => {
  const { notes = '', item, quantity = 0, unitCost = 0 } = req.body;
  if (!item) return res.status(400).json({ error: 'item is required' });
  await query('INSERT INTO dispatch_item_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [item.trim()]);
  const total = parseFloat(quantity) * parseFloat(unitCost);
  const { rows } = await query(
    'UPDATE orders SET notes=$1,item=$2,quantity=$3,unit_cost=$4,total=$5 WHERE id=$6 RETURNING *',
    [notes, item, quantity, unitCost, total, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(rows[0]));
});

router.delete('/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM orders WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

export default router;
