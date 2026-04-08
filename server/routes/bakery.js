import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];
const fmt = r => ({
  id: r.id, itemName: r.item_name, quantity: parseFloat(r.quantity ?? 0),
  unit: r.unit ?? 'units', lowStockThreshold: parseFloat(r.low_stock_threshold ?? 0),
  recordedBy: r.recorded_by ?? '', date: r.date, createdAt: r.created_at,
});

/* Persistent names */
router.get('/names', requireAuth, async (_req, res) => {
  const { rows } = await query('SELECT * FROM bakery_item_names ORDER BY name ASC');
  res.json(rows.map(r => ({ id: r.id, name: r.name })));
});
router.post('/names', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const { rows } = await query('INSERT INTO bakery_item_names (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING *', [name.trim()]);
  res.status(201).json({ id: rows[0].id, name: rows[0].name });
});
router.delete('/names/:nameId', requireAuth, async (req, res) => {
  await query('DELETE FROM bakery_item_names WHERE id=$1', [req.params.nameId]);
  res.json({ success: true });
});

/* Daily records */
router.get('/', requireAuth, async (req, res) => {
  const date = req.query.date || today();
  const { rows } = await query('SELECT * FROM bakery_items WHERE date=$1 ORDER BY created_at ASC', [date]);
  res.json(rows.map(fmt));
});
router.post('/', requireAuth, async (req, res) => {
  const { itemName, quantity = 0, unit = 'units', lowStockThreshold = 0 } = req.body;
  if (!itemName) return res.status(400).json({ error: 'itemName required' });
  await query('INSERT INTO bakery_item_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [itemName.trim()]);
  const { rows } = await query(
    'INSERT INTO bakery_items (item_name,quantity,unit,low_stock_threshold,recorded_by,date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [itemName, quantity, unit, lowStockThreshold, req.user.username, today()]
  );
  res.status(201).json(fmt(rows[0]));
});
router.put('/:id', requireAuth, async (req, res) => {
  const { itemName, quantity = 0, unit = 'units', lowStockThreshold = 0 } = req.body;
  if (!itemName) return res.status(400).json({ error: 'itemName required' });
  await query('INSERT INTO bakery_item_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [itemName.trim()]);
  const { rows } = await query(
    'UPDATE bakery_items SET item_name=$1,quantity=$2,unit=$3,low_stock_threshold=$4 WHERE id=$5 RETURNING *',
    [itemName, quantity, unit, lowStockThreshold, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(rows[0]));
});
router.delete('/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM bakery_items WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

export default router;
