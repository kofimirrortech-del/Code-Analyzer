import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];

const fmt = r => {
  const opening = parseFloat(r.opening_stock ?? 0);
  const added   = parseFloat(r.added_stock ?? 0);
  const closing = parseFloat(r.closing_stock ?? (opening + added));
  const threshold = parseFloat(r.low_stock_threshold ?? 0);
  return {
    id: r.id, name: r.name,
    openingStock: opening, addedStock: added, closingStock: closing,
    stock: closing,
    unit: r.unit, supplier: r.supplier ?? '',
    lowStockThreshold: threshold,
    isLowStock: threshold > 0 && closing < threshold,
    recordedBy: r.recorded_by ?? '', date: r.date, createdAt: r.created_at,
  };
};

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

/* ── Last closing stock for a named ingredient ── */
router.get('/last-closing', requireAuth, async (req, res) => {
  const { name } = req.query;
  if (!name) return res.json({ closingStock: 0 });
  const { rows } = await query(
    `SELECT closing_stock FROM ingredients WHERE name=$1 ORDER BY date DESC, id DESC LIMIT 1`,
    [name]
  );
  res.json({ closingStock: rows[0] ? parseFloat(rows[0].closing_stock) : 0 });
});

/* ── Daily records ── */
router.get('/', requireAuth, async (req, res) => {
  const date = req.query.date || today();
  const { rows } = await query('SELECT * FROM ingredients WHERE date=$1 ORDER BY created_at ASC', [date]);
  res.json(rows.map(fmt));
});

router.post('/', requireAuth, async (req, res) => {
  const { name, openingStock = 0, addedStock = 0, unit = 'units', lowStockThreshold = 0, supplier = '' } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const closing = parseFloat(openingStock) + parseFloat(addedStock);
  await query('INSERT INTO ingredient_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name.trim()]);
  const { rows } = await query(
    `INSERT INTO ingredients (name,stock,opening_stock,added_stock,closing_stock,unit,low_stock_threshold,supplier,recorded_by,date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [name, closing, openingStock, addedStock, closing, unit, lowStockThreshold, supplier, req.user.username, today()]
  );
  res.status(201).json(fmt(rows[0]));
});

router.put('/:id', requireAuth, async (req, res) => {
  const { name, openingStock = 0, addedStock = 0, unit = 'units', lowStockThreshold = 0, supplier = '' } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const closing = parseFloat(openingStock) + parseFloat(addedStock);
  await query('INSERT INTO ingredient_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name.trim()]);
  const { rows } = await query(
    `UPDATE ingredients SET name=$1,stock=$2,opening_stock=$3,added_stock=$4,closing_stock=$5,unit=$6,low_stock_threshold=$7,supplier=$8 WHERE id=$9 RETURNING *`,
    [name, closing, openingStock, addedStock, closing, unit, lowStockThreshold, supplier, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(rows[0]));
});

router.delete('/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM ingredients WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

export default router;
