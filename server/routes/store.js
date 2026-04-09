import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];

function fmt(r) {
  const qty = parseFloat(r.quantity ?? 0);
  const added = parseFloat(r.added_stock ?? 0);
  const threshold = parseFloat(r.low_stock_threshold ?? 0);
  const closing = parseFloat(r.closing_stock ?? 0);
  return {
    id: r.id, itemName: r.item_name, quantity: qty, addedStock: added,
    totalStock: qty + added, closingStock: closing,
    lowStockThreshold: threshold, isLowStock: threshold > 0 && closing < threshold,
    unit: r.unit ?? 'units', supplier: r.supplier ?? '',
    recordedBy: r.recorded_by ?? '', date: r.date, createdAt: r.created_at,
  };
}

/* ── Persistent names ── */
router.get('/names', requireAuth, async (_req, res) => {
  const { rows } = await query('SELECT * FROM store_item_names ORDER BY name ASC');
  res.json(rows.map(r => ({ id: r.id, name: r.name })));
});

router.post('/names', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const { rows } = await query(
    'INSERT INTO store_item_names (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING *',
    [name.trim()]
  );
  res.status(201).json({ id: rows[0].id, name: rows[0].name });
});

router.delete('/names/:nameId', requireAuth, async (req, res) => {
  await query('DELETE FROM store_item_names WHERE id=$1', [req.params.nameId]);
  res.json({ success: true });
});

/* ── Last closing stock for a named item ── */
router.get('/last-closing', requireAuth, async (req, res) => {
  const { itemName } = req.query;
  if (!itemName) return res.json({ closingStock: 0 });
  const { rows } = await query(
    `SELECT closing_stock FROM store_items WHERE item_name=$1 ORDER BY date DESC, id DESC LIMIT 1`,
    [itemName]
  );
  res.json({ closingStock: rows[0] ? parseFloat(rows[0].closing_stock) : 0 });
});

/* ── Daily records (with auto carry-forward on new day) ── */
router.get('/', requireAuth, async (req, res) => {
  const date = req.query.date || today();
  const { rows } = await query('SELECT * FROM store_items WHERE date=$1 ORDER BY created_at ASC', [date]);

  if (rows.length === 0 && date === today()) {
    const { rows: latest } = await query(
      `SELECT DISTINCT ON (item_name) item_name, closing_stock, low_stock_threshold, unit, supplier
       FROM store_items WHERE date < $1 ORDER BY item_name, date DESC, id DESC`,
      [date]
    );
    if (latest.length > 0) {
      for (const r of latest) {
        const opening = parseFloat(r.closing_stock ?? 0);
        await query(
          `INSERT INTO store_items (item_name,quantity,added_stock,closing_stock,low_stock_threshold,unit,supplier,date)
           VALUES ($1,$2,0,$2,$3,$4,$5,$6)`,
          [r.item_name, opening, r.low_stock_threshold ?? 0, r.unit ?? 'units', r.supplier ?? '', date]
        );
      }
      const { rows: newRows } = await query('SELECT * FROM store_items WHERE date=$1 ORDER BY created_at ASC', [date]);
      return res.json(newRows.map(fmt));
    }
  }

  res.json(rows.map(fmt));
});

router.post('/', requireAuth, async (req, res) => {
  const { itemName, quantity = 0, addedStock = 0, lowStockThreshold = 0, unit = 'units', supplier = '' } = req.body;
  if (!itemName) return res.status(400).json({ error: 'itemName is required' });
  const closingStock = parseFloat(quantity) + parseFloat(addedStock);
  await query('INSERT INTO store_item_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [itemName.trim()]);
  const { rows } = await query(
    `INSERT INTO store_items (item_name,quantity,added_stock,closing_stock,low_stock_threshold,unit,supplier,recorded_by,date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [itemName, quantity, addedStock, closingStock, lowStockThreshold, unit, supplier, req.user.username, today()]
  );
  res.status(201).json(fmt(rows[0]));
});

router.put('/:id', requireAuth, async (req, res) => {
  const { itemName, quantity = 0, addedStock = 0, lowStockThreshold = 0, unit = 'units', supplier = '' } = req.body;
  if (!itemName) return res.status(400).json({ error: 'itemName is required' });
  const closingStock = parseFloat(quantity) + parseFloat(addedStock);
  await query('INSERT INTO store_item_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [itemName.trim()]);
  const { rows } = await query(
    `UPDATE store_items SET item_name=$1,quantity=$2,added_stock=$3,closing_stock=$4,low_stock_threshold=$5,unit=$6,supplier=$7 WHERE id=$8 RETURNING *`,
    [itemName, quantity, addedStock, closingStock, lowStockThreshold, unit, supplier, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(rows[0]));
});

router.delete('/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM store_items WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

export default router;
