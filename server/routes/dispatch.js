import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];

function fmt(r) {
  const qty = parseFloat(r.quantity ?? 0), unitCost = parseFloat(r.unit_cost ?? 0);
  const opening = parseFloat(r.opening_stock ?? 0);
  const added   = parseFloat(r.added_stock ?? 0);
  const closing = parseFloat(r.closing_stock ?? 0);
  const threshold = parseFloat(r.low_stock_threshold ?? 0);
  return {
    id: r.id, notes: r.notes ?? '', item: r.item ?? '',
    quantity: qty, unitCost, total: qty * unitCost,
    openingStock: opening, addedStock: added, closingStock: closing,
    lowStockThreshold: threshold, isLowStock: threshold > 0 && closing < threshold,
    unit: r.unit ?? 'units', supplier: r.supplier ?? '',
    recordedBy: r.recorded_by ?? '', date: r.date, createdAt: r.created_at,
  };
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

/* ── Last closing stock for a named item ── */
router.get('/last-closing', requireAuth, async (req, res) => {
  const { itemName } = req.query;
  if (!itemName) return res.json({ closingStock: 0 });
  const { rows } = await query(
    `SELECT closing_stock FROM orders WHERE item=$1 ORDER BY date DESC, id DESC LIMIT 1`,
    [itemName]
  );
  res.json({ closingStock: rows[0] ? parseFloat(rows[0].closing_stock) : 0 });
});

/* ── Daily records ── */
router.get('/', requireAuth, async (req, res) => {
  const date = req.query.date || today();
  const { rows } = await query('SELECT * FROM orders WHERE date=$1 ORDER BY created_at DESC', [date]);
  res.json(rows.map(fmt));
});

router.post('/', requireAuth, async (req, res) => {
  const { notes = '', item, quantity = 0, unitCost = 0,
          openingStock = 0, addedStock = 0, lowStockThreshold = 0, unit = 'units', supplier = '' } = req.body;
  if (!item) return res.status(400).json({ error: 'item is required' });
  await query('INSERT INTO dispatch_item_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [item.trim()]);
  const total = parseFloat(quantity) * parseFloat(unitCost);
  const closing = parseFloat(openingStock) + parseFloat(addedStock) - parseFloat(quantity);
  const { rows } = await query(
    `INSERT INTO orders (notes,item,quantity,unit_cost,total,opening_stock,added_stock,closing_stock,low_stock_threshold,unit,supplier,recorded_by,date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [notes, item, quantity, unitCost, total, openingStock, addedStock, closing, lowStockThreshold, unit, supplier, req.user.username, today()]
  );
  res.status(201).json(fmt(rows[0]));
});

router.put('/:id', requireAuth, async (req, res) => {
  const { notes = '', item, quantity = 0, unitCost = 0,
          openingStock = 0, addedStock = 0, lowStockThreshold = 0, unit = 'units', supplier = '' } = req.body;
  if (!item) return res.status(400).json({ error: 'item is required' });
  await query('INSERT INTO dispatch_item_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [item.trim()]);
  const total = parseFloat(quantity) * parseFloat(unitCost);
  const closing = parseFloat(openingStock) + parseFloat(addedStock) - parseFloat(quantity);
  const { rows } = await query(
    `UPDATE orders SET notes=$1,item=$2,quantity=$3,unit_cost=$4,total=$5,opening_stock=$6,added_stock=$7,closing_stock=$8,low_stock_threshold=$9,unit=$10,supplier=$11 WHERE id=$12 RETURNING *`,
    [notes, item, quantity, unitCost, total, openingStock, addedStock, closing, lowStockThreshold, unit, supplier, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(rows[0]));
});

router.delete('/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM orders WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

export default router;
