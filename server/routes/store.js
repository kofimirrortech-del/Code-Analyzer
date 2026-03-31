import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];

function fmt(r) {
  const qty = parseFloat(r.quantity ?? 0);
  const added = parseFloat(r.added_stock ?? 0);
  const threshold = parseFloat(r.low_stock_threshold ?? 0);
  const totalStock = qty + added;
  return {
    id: r.id,
    itemName: r.item_name,
    quantity: qty,
    addedStock: added,
    totalStock,
    closingStock: parseFloat(r.closing_stock ?? 0),
    lowStockThreshold: threshold,
    isLowStock: threshold > 0 && totalStock < threshold,
    unit: r.unit ?? 'units',
    supplier: r.supplier,
    date: r.date,
    createdAt: r.created_at,
  };
}

router.get('/', requireAuth, async (_req, res) => {
  const { rows } = await query('SELECT * FROM store_items ORDER BY created_at ASC');
  res.json(rows.map(fmt));
});

router.post('/', requireAuth, async (req, res) => {
  const { itemName, quantity = 0, addedStock = 0, closingStock = 0, lowStockThreshold = 0, unit = 'units', supplier } = req.body;
  if (!itemName || !supplier) return res.status(400).json({ error: 'itemName and supplier are required' });
  const { rows } = await query(
    `INSERT INTO store_items (item_name, quantity, added_stock, closing_stock, low_stock_threshold, unit, supplier, date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [itemName, quantity, addedStock, closingStock, lowStockThreshold, unit, supplier, today()]
  );
  res.status(201).json(fmt(rows[0]));
});

router.put('/:id', requireAuth, async (req, res) => {
  const { itemName, quantity = 0, addedStock = 0, closingStock = 0, lowStockThreshold = 0, unit = 'units', supplier } = req.body;
  if (!itemName || !supplier) return res.status(400).json({ error: 'itemName and supplier are required' });
  const { rows } = await query(
    `UPDATE store_items SET item_name=$1, quantity=$2, added_stock=$3, closing_stock=$4, low_stock_threshold=$5, unit=$6, supplier=$7
     WHERE id=$8 RETURNING *`,
    [itemName, quantity, addedStock, closingStock, lowStockThreshold, unit, supplier, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(rows[0]));
});

router.delete('/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM store_items WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

export default router;
