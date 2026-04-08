import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];

const fmt = r => ({
  id: r.id, name: r.name, stock: parseFloat(r.stock ?? 0),
  unit: r.unit, lowStockThreshold: parseFloat(r.low_stock_threshold ?? 0),
  recordedBy: r.recorded_by ?? '', date: r.date, createdAt: r.created_at,
});

/* ── Persistent names ── */
router.get('/names', requireAuth, async (_req, res) => {
  const { rows } = await query('SELECT * FROM ingredient_names ORDER BY name ASC');
  res.json(rows.map(r => ({ id: r.id, name: r.name })));
});

router.post('/names', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const { rows } = await query(
    'INSERT INTO ingredient_names (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING *',
    [name.trim()]
  );
  res.status(201).json({ id: rows[0].id, name: rows[0].name });
});

router.delete('/names/:nameId', requireAuth, async (req, res) => {
  await query('DELETE FROM ingredient_names WHERE id=$1', [req.params.nameId]);
  res.json({ success: true });
});

/* ── Daily records ── */
router.get('/', requireAuth, async (req, res) => {
  const date = req.query.date || today();
  const { rows } = await query('SELECT * FROM ingredients WHERE date=$1 ORDER BY created_at ASC', [date]);
  res.json(rows.map(fmt));
});

router.post('/', requireAuth, async (req, res) => {
  const { name, stock = 0, unit = 'units', lowStockThreshold = 0 } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  await query('INSERT INTO ingredient_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name.trim()]);
  const { rows } = await query(
    'INSERT INTO ingredients (name,stock,unit,low_stock_threshold,recorded_by,date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [name, stock, unit, lowStockThreshold, req.user.username, today()]
  );
  res.status(201).json(fmt(rows[0]));
});

router.put('/:id', requireAuth, async (req, res) => {
  const { name, stock = 0, unit = 'units', lowStockThreshold = 0 } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  await query('INSERT INTO ingredient_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name.trim()]);
  const { rows } = await query(
    'UPDATE ingredients SET name=$1,stock=$2,unit=$3,low_stock_threshold=$4 WHERE id=$5 RETURNING *',
    [name, stock, unit, lowStockThreshold, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(rows[0]));
});

router.delete('/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM ingredients WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

export default router;
