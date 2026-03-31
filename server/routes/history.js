import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();

router.get('/dates', requireAuth, async (_req, res) => {
  const [s, i, p, pk, o] = await Promise.all([
    query('SELECT DISTINCT date FROM store_items WHERE date IS NOT NULL'),
    query('SELECT DISTINCT date FROM ingredients WHERE date IS NOT NULL'),
    query('SELECT DISTINCT date FROM production_batches WHERE date IS NOT NULL'),
    query('SELECT DISTINCT date FROM packages WHERE date IS NOT NULL'),
    query('SELECT DISTINCT date FROM orders WHERE date IS NOT NULL'),
  ]);

  const allDates = new Set();
  [...s.rows, ...i.rows, ...p.rows, ...pk.rows, ...o.rows].forEach(r => {
    if (r.date) allDates.add(r.date);
  });

  res.json(Array.from(allDates).sort((a, b) => b.localeCompare(a)));
});

router.get('/summary', requireAuth, async (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).json({ error: 'date query param required' });

  const [si, ii, pi, pki, oi] = await Promise.all([
    query('SELECT * FROM store_items WHERE date = $1 ORDER BY created_at ASC', [date]),
    query('SELECT * FROM ingredients WHERE date = $1 ORDER BY created_at ASC', [date]),
    query('SELECT * FROM production_batches WHERE date = $1 ORDER BY created_at ASC', [date]),
    query('SELECT * FROM packages WHERE date = $1 ORDER BY created_at ASC', [date]),
    query('SELECT * FROM orders WHERE date = $1 ORDER BY created_at ASC', [date]),
  ]);

  res.json({
    date,
    store: si.rows.map(r => ({ id: r.id, itemName: r.item_name, quantity: parseFloat(r.quantity), addedStock: parseFloat(r.added_stock), unit: r.unit, supplier: r.supplier })),
    ingredients: ii.rows.map(r => ({ id: r.id, name: r.name, stock: parseFloat(r.stock), unit: r.unit })),
    production: pi.rows.map(r => ({ id: r.id, product: r.product, quantityProduced: parseFloat(r.quantity_produced), unit: r.unit, baker: r.baker, note: r.note })),
    packages: pki.rows.map(r => ({ id: r.id, packageType: r.package_type, stock: parseFloat(r.stock), addedStock: parseFloat(r.added_stock), supply: parseFloat(r.supply), closingStock: parseFloat(r.closing_stock) })),
    orders: oi.rows.map(r => ({ id: r.id, notes: r.notes, item: r.item, quantity: parseFloat(r.quantity), unitCost: parseFloat(r.unit_cost), total: parseFloat(r.total) })),
    stats: {
      totalInventory: si.rows.reduce((s, r) => s + parseFloat(r.quantity), 0),
      totalProduced: pi.rows.reduce((s, r) => s + parseFloat(r.quantity_produced), 0),
      totalOrders: oi.rows.length,
      totalRevenue: oi.rows.reduce((s, r) => s + parseFloat(r.total), 0),
    },
  });
});

export default router;
