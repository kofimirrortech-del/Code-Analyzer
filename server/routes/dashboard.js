import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];

router.get('/', requireAuth, async (req, res) => {
  const date = req.query.date || today();
  const [storeRes, batchRes, ordersRes, transferRes, poRes] = await Promise.all([
    query('SELECT * FROM store_items WHERE date=$1', [date]),
    query('SELECT * FROM production_batches WHERE date=$1 ORDER BY created_at DESC', [date]),
    query('SELECT * FROM orders WHERE date=$1', [date]),
    query('SELECT COUNT(*) as count FROM stock_transfers WHERE date=$1', [date]),
    query(`SELECT COUNT(*) as count FROM purchase_orders WHERE status='pending'`),
  ]);

  const storeItems = storeRes.rows;
  const batches = batchRes.rows;
  const orders = ordersRes.rows;

  const totalInventory = storeItems.reduce((s, i) => s + parseFloat(i.closing_stock ?? 0), 0);
  const totalProduced = batches.reduce((s, b) => s + parseFloat(b.quantity_produced ?? 0), 0);
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total ?? 0), 0);
  const todayTransfers = parseInt(transferRes.rows[0].count);
  const pendingPOs = parseInt(poRes.rows[0].count);

  const lowStockItems = storeItems
    .filter(i => {
      const threshold = parseFloat(i.low_stock_threshold ?? 0);
      const stock = parseFloat(i.closing_stock ?? 0);
      return threshold > 0 && stock < threshold;
    })
    .map(i => ({ name: i.item_name, quantity: parseFloat(i.closing_stock ?? 0), threshold: parseFloat(i.low_stock_threshold ?? 0), dept: 'Store' }));

  const todayProduction = batches.map(b => ({
    id: b.id, product: b.product, quantityProduced: parseFloat(b.quantity_produced ?? 0),
    unit: b.unit ?? 'units', baker: b.baker, note: b.note ?? '', date: b.date,
  }));

  res.json({ totalInventory, totalProduced, totalOrders, totalRevenue, todayTransfers, pendingPOs, lowStockItems, todayProduction });
});

export default router;
