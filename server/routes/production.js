import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];

function fmt(r) {
  return {
    id: r.id, product: r.product, quantityProduced: parseFloat(r.quantity_produced ?? 0),
    unit: r.unit ?? 'units', baker: r.baker, note: r.note ?? '',
    recordedBy: r.recorded_by ?? '', date: r.date, createdAt: r.created_at,
  };
}

/* ── Persistent product names ── */
router.get('/products', requireAuth, async (_req, res) => {
  const { rows } = await query('SELECT * FROM production_product_names ORDER BY name ASC');
  res.json(rows.map(r => ({ id: r.id, name: r.name })));
});

router.post('/products', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const { rows } = await query(
    'INSERT INTO production_product_names (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING *',
    [name.trim()]
  );
  res.status(201).json({ id: rows[0].id, name: rows[0].name });
});

router.delete('/products/:productId', requireAuth, async (req, res) => {
  await query('DELETE FROM production_product_names WHERE id=$1', [req.params.productId]);
  res.json({ success: true });
});

/* ── Daily records ── */
router.get('/', requireAuth, async (req, res) => {
  const date = req.query.date || today();
  const { rows } = await query('SELECT * FROM production_batches WHERE date=$1 ORDER BY created_at DESC', [date]);
  res.json(rows.map(fmt));
});

router.post('/', requireAuth, async (req, res) => {
  const { product, quantityProduced = 0, unit = 'units', baker, note = '' } = req.body;
  if (!product) return res.status(400).json({ error: 'product is required' });
  const bakerName = baker || req.user.username;
  await query('INSERT INTO production_product_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [product.trim()]);
  const { rows } = await query(
    'INSERT INTO production_batches (product,quantity_produced,unit,baker,note,recorded_by,date) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [product, quantityProduced, unit, bakerName, note, req.user.username, today()]
  );
  res.status(201).json(fmt(rows[0]));
});

router.put('/:id', requireAuth, async (req, res) => {
  const { product, quantityProduced = 0, unit = 'units', baker, note = '' } = req.body;
  if (!product) return res.status(400).json({ error: 'product is required' });
  const bakerName = baker || req.user.username;
  await query('INSERT INTO production_product_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [product.trim()]);
  const { rows } = await query(
    'UPDATE production_batches SET product=$1,quantity_produced=$2,unit=$3,baker=$4,note=$5 WHERE id=$6 RETURNING *',
    [product, quantityProduced, unit, bakerName, note, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(rows[0]));
});

router.delete('/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM production_batches WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

export default router;
