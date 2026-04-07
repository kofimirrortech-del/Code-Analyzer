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
    totalStock: stock + added, date: r.date, createdAt: r.created_at,
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

/* ── Daily records ── */
router.get('/', requireAuth, async (req, res) => {
  const date = req.query.date || today();
  const { rows } = await query('SELECT * FROM packages WHERE date=$1 ORDER BY created_at ASC', [date]);
  res.json(rows.map(fmt));
});

router.post('/', requireAuth, async (req, res) => {
  const { packageType, stock = 0, addedStock = 0, supply = 0, closingStock = 0 } = req.body;
  if (!packageType) return res.status(400).json({ error: 'packageType is required' });
  await query('INSERT INTO package_type_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [packageType.trim()]);
  const { rows } = await query(
    'INSERT INTO packages (package_type,stock,added_stock,supply,closing_stock,date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [packageType, stock, addedStock, supply, closingStock, today()]
  );
  res.status(201).json(fmt(rows[0]));
});

router.put('/:id', requireAuth, async (req, res) => {
  const { packageType, stock = 0, addedStock = 0, supply = 0, closingStock = 0 } = req.body;
  if (!packageType) return res.status(400).json({ error: 'packageType is required' });
  await query('INSERT INTO package_type_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [packageType.trim()]);
  const { rows } = await query(
    'UPDATE packages SET package_type=$1,stock=$2,added_stock=$3,supply=$4,closing_stock=$5 WHERE id=$6 RETURNING *',
    [packageType, stock, addedStock, supply, closingStock, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(rows[0]));
});

router.delete('/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM packages WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

export default router;
