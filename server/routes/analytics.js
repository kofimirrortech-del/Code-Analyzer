import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, adminOnly } from '../middleware.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];

router.get('/overview', requireAuth, adminOnly, async (req, res) => {
  const t = req.query.date || today();

  const [storeRes, ingRes, prodRes, bakRes, pkgRes, dispRes, tfRes, poRes] = await Promise.all([
    query('SELECT COUNT(*) as count, COALESCE(SUM(closing_stock),0) as stock FROM store_items WHERE date=$1', [t]),
    query('SELECT COUNT(*) as count, COALESCE(SUM(stock),0) as stock FROM ingredients WHERE date=$1', [t]),
    query('SELECT COUNT(*) as count, COALESCE(SUM(quantity_produced),0) as stock FROM production_batches WHERE date=$1', [t]),
    query('SELECT COUNT(*) as count, COALESCE(SUM(quantity),0) as stock FROM bakery_items WHERE date=$1', [t]),
    query('SELECT COUNT(*) as count, COALESCE(SUM(closing_stock),0) as stock FROM packages WHERE date=$1', [t]),
    query('SELECT COUNT(*) as count, COALESCE(SUM(total),0) as revenue FROM orders WHERE date=$1', [t]),
    query('SELECT COUNT(*) as count FROM stock_transfers WHERE date=$1', [t]),
    query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status='pending' THEN 1 END) as pending FROM purchase_orders`, []),
  ]);

  res.json({
    store:      { count: parseInt(storeRes.rows[0].count), stock: parseFloat(storeRes.rows[0].stock) },
    ingredients:{ count: parseInt(ingRes.rows[0].count),   stock: parseFloat(ingRes.rows[0].stock) },
    production: { count: parseInt(prodRes.rows[0].count),  stock: parseFloat(prodRes.rows[0].stock) },
    bakery:     { count: parseInt(bakRes.rows[0].count),   stock: parseFloat(bakRes.rows[0].stock) },
    packaging:  { count: parseInt(pkgRes.rows[0].count),   stock: parseFloat(pkgRes.rows[0].stock) },
    dispatch:   { count: parseInt(dispRes.rows[0].count),  revenue: parseFloat(dispRes.rows[0].revenue) },
    transfers:  parseInt(tfRes.rows[0].count),
    purchaseOrders: { total: parseInt(poRes.rows[0].total), pending: parseInt(poRes.rows[0].pending) },
  });
});

router.get('/low-stock', requireAuth, adminOnly, async (_req, res) => {
  const [sRes, iRes, bRes, pRes] = await Promise.all([
    query(`SELECT item_name as name, 'Store' as dept, closing_stock as stock, low_stock_threshold as threshold, unit
           FROM store_items WHERE low_stock_threshold > 0 AND closing_stock < low_stock_threshold`),
    query(`SELECT name, 'Ingredients' as dept, stock, low_stock_threshold as threshold, unit
           FROM ingredients WHERE low_stock_threshold > 0 AND stock < low_stock_threshold`),
    query(`SELECT item_name as name, 'Bakery' as dept, quantity as stock, low_stock_threshold as threshold, unit
           FROM bakery_items WHERE low_stock_threshold > 0 AND quantity < low_stock_threshold`),
    query(`SELECT package_type as name, 'Packaging' as dept, closing_stock as stock, low_stock_threshold as threshold, 'units' as unit
           FROM packages WHERE low_stock_threshold > 0 AND closing_stock < low_stock_threshold`),
  ]);
  res.json([...sRes.rows, ...iRes.rows, ...bRes.rows, ...pRes.rows].map(r => ({
    name: r.name, dept: r.dept, stock: parseFloat(r.stock ?? 0), threshold: parseFloat(r.threshold ?? 0), unit: r.unit,
  })));
});

router.get('/transfers', requireAuth, adminOnly, async (req, res) => {
  const { from, to } = req.query;
  const { rows } = await query(
    'SELECT * FROM stock_transfers ORDER BY created_at DESC LIMIT 100'
  );
  res.json(rows.map(r => ({
    id: r.id, fromDept: r.from_dept, toDept: r.to_dept,
    itemName: r.item_name, quantity: parseFloat(r.quantity), unit: r.unit,
    transferredBy: r.transferred_by, date: r.date, createdAt: r.created_at,
  })));
});

router.get('/dispatch-trends', requireAuth, adminOnly, async (_req, res) => {
  const { rows } = await query(
    `SELECT date, COALESCE(SUM(total),0) as revenue, COUNT(*) as orders
     FROM orders GROUP BY date ORDER BY date DESC LIMIT 30`
  );
  res.json(rows.map(r => ({ date: r.date, revenue: parseFloat(r.revenue), orders: parseInt(r.orders) })));
});

export default router;
