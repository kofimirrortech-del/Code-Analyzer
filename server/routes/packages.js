import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];

function fmt(r) {
  const stock = parseFloat(r.stock ?? 0), added = parseFloat(r.added_stock ?? 0);
  return {
    id: r.id, packageType: r.package_type, stock, addedStock: added,
    supply: parseFloat(r.supply ?? 0), closingStock: parseFloat(r.closing_stock ?? 0),
    lowStockThreshold: parseFloat(r.low_stock_threshold ?? 0),
    totalStock: stock + added, recordedBy: r.recorded_by ?? '',
    date: r.date, createdAt: r.created_at,
  };
}

/* ── Persistent package type names ── */
router.get('/types', requireAuth, async (_req, res) => {
  const { rows } = await query('SELECT * FROM package_type_names ORDER BY name ASC');
  res.json(rows.map(r => ({ id: r.id, name: r.name })));
});

router.post('/types', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const { rows } = await query(
    'INSERT INTO package_type_names (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING *',
    [name.trim()]
  );
  res.status(201).json({ id: rows[0].id, name: rows[0].name });
});

router.delete('/types/:typeId', requireAuth, async (req, res) => {
  await query('DELETE FROM package_type_names WHERE id=$1', [req.params.typeId]);
  res.json({ success: true });
});

/* ── Daily records (with auto carry-forward on new day) ── */
router.get('/', requireAuth, async (req, res) => {
  const date = req.query.date || today();
  const { rows } = await query('SELECT * FROM packages WHERE date=$1 ORDER BY created_at ASC', [date]);

  if (rows.length === 0 && date === today()) {
    const { rows: latest } = await query(
      `SELECT DISTINCT ON (package_type) package_type, closing_stock, low_stock_threshold
       FROM packages WHERE date < $1 ORDER BY package_type, date DESC, id DESC`,
      [date]
    );
    if (latest.length > 0) {
      for (const r of latest) {
        const opening = parseFloat(r.closing_stock ?? 0);
        await query(
          `INSERT INTO packages (package_type,stock,added_stock,supply,closing_stock,low_stock_threshold,date)
           VALUES ($1,$2,0,0,$2,$3,$4)`,
          [r.package_type, opening, r.low_stock_threshold ?? 0, date]
        );
      }
      const { rows: newRows } = await query('SELECT * FROM packages WHERE date=$1 ORDER BY created_at ASC', [date]);
      return res.json(newRows.map(fmt));
    }
  }

  res.json(rows.map(fmt));
});

router.post('/', requireAuth, async (req, res) => {
  const { packageType, stock = 0, addedStock = 0, supply = 0, lowStockThreshold = 0 } = req.body;
  if (!packageType) return res.status(400).json({ error: 'packageType is required' });
  const closingStock = parseFloat(stock) + parseFloat(addedStock) - parseFloat(supply);
  await query('INSERT INTO package_type_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [packageType.trim()]);
  const { rows } = await query(
    'INSERT INTO packages (package_type,stock,added_stock,supply,closing_stock,low_stock_threshold,recorded_by,date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [packageType, stock, addedStock, supply, closingStock, lowStockThreshold, req.user.username, today()]
  );
  res.status(201).json(fmt(rows[0]));
});

router.put('/:id', requireAuth, async (req, res) => {
  const { packageType, stock = 0, addedStock = 0, supply = 0, lowStockThreshold = 0 } = req.body;
  if (!packageType) return res.status(400).json({ error: 'packageType is required' });
  const closingStock = parseFloat(stock) + parseFloat(addedStock) - parseFloat(supply);
  await query('INSERT INTO package_type_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [packageType.trim()]);
  const { rows } = await query(
    'UPDATE packages SET package_type=$1,stock=$2,added_stock=$3,supply=$4,closing_stock=$5,low_stock_threshold=$6 WHERE id=$7 RETURNING *',
    [packageType, stock, addedStock, supply, closingStock, lowStockThreshold, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(rows[0]));
});

router.delete('/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM packages WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

export default router;
