import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';
import { sendPush } from '../push.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];

const CHAIN = { store: 'ingredients', ingredients: 'production', production: 'bakery', bakery: 'packaging', packaging: 'dispatch' };

async function autoCreatePO(itemName, dept, unit, neededQty, username, date) {
  const { rows } = await query(
    `SELECT id FROM purchase_orders WHERE item_name=$1 AND department=$2 AND status='pending' AND date=$3`,
    [itemName, dept, date]
  );
  if (rows.length === 0) {
    await query(
      `INSERT INTO purchase_orders (item_name,department,quantity_needed,unit,status,priority,created_by,date) VALUES ($1,$2,$3,$4,'pending','high',$5,$6)`,
      [itemName, dept, neededQty, unit, username, date]
    );
    const { rows: ns } = await query(`SELECT value FROM settings WHERE key='notification_settings'`);
    const notifSettings = ns[0] ? JSON.parse(ns[0].value) : { low_stock: true };
    if (notifSettings.low_stock !== false) {
      const msg = `${itemName} in ${dept} is low — ${neededQty} ${unit} needed`;
      await query(
        `INSERT INTO notifications (type,title,message,department,target_role) VALUES ('low_stock','Low Stock Alert',$1,$2,'ADMIN')`,
        [msg, dept]
      );
      sendPush('ADMIN', 'Low Stock Alert', msg);
    }
  }
}

router.get('/', requireAuth, async (req, res) => {
  const { date, dept } = req.query;
  let sql = 'SELECT * FROM stock_transfers';
  const params = [];
  const conds = [];
  if (date) { params.push(date); conds.push(`date=$${params.length}`); }
  if (dept) { params.push(dept); conds.push(`(from_dept=$${params.length} OR to_dept=$${params.length})`); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY created_at DESC LIMIT 200';
  const { rows } = await query(sql, params);
  res.json(rows.map(r => ({
    id: r.id, fromDept: r.from_dept, toDept: r.to_dept,
    itemName: r.item_name, quantity: parseFloat(r.quantity), unit: r.unit,
    note: r.note, transferredBy: r.transferred_by, date: r.date, createdAt: r.created_at,
  })));
});

router.post('/', requireAuth, async (req, res) => {
  const { fromDept, toDept, itemName, quantity, unit = 'units', note = '', logOnly = false } = req.body;
  const qty = parseFloat(quantity);
  if (!fromDept || !toDept || !itemName || !qty || qty <= 0) {
    return res.status(400).json({ error: 'fromDept, toDept, itemName, quantity (>0) required' });
  }
  if (CHAIN[fromDept] !== toDept) {
    return res.status(400).json({ error: `Invalid supply chain: ${fromDept} → ${toDept}` });
  }
  const t = today();

  /* ── logOnly: just record the transfer, no stock changes ── */
  if (logOnly) {
    const { rows: tf } = await query(
      'INSERT INTO stock_transfers (from_dept,to_dept,item_name,quantity,unit,note,transferred_by,date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [fromDept, toDept, itemName, qty, unit, note, req.user.username, t]
    );
    return res.status(201).json({ id: tf[0].id, fromDept, toDept, itemName, quantity: qty, unit, note, transferredBy: req.user.username, date: t });
  }

  /* ── Deduct from source ── */
  if (fromDept === 'store') {
    const { rows } = await query('SELECT * FROM store_items WHERE item_name=$1 AND date=$2 ORDER BY id ASC LIMIT 1', [itemName, t]);
    if (!rows[0]) return res.status(400).json({ error: `No store record for "${itemName}" today` });
    const available = parseFloat(rows[0].closing_stock ?? 0);
    if (available < qty) return res.status(400).json({ error: `Insufficient stock: ${available} available` });
    await query('UPDATE store_items SET closing_stock=closing_stock-$1 WHERE id=$2', [qty, rows[0].id]);
    const newStock = available - qty;
    const threshold = parseFloat(rows[0].low_stock_threshold ?? 0);
    if (threshold > 0 && newStock < threshold) await autoCreatePO(itemName, 'store', unit, threshold - newStock, req.user.username, t);

  } else if (fromDept === 'ingredients') {
    const { rows } = await query('SELECT * FROM ingredients WHERE name=$1 AND date=$2 ORDER BY id ASC LIMIT 1', [itemName, t]);
    if (!rows[0]) return res.status(400).json({ error: `No ingredient record for "${itemName}" today` });
    const available = parseFloat(rows[0].stock ?? 0);
    if (available < qty) return res.status(400).json({ error: `Insufficient stock: ${available} available` });
    await query('UPDATE ingredients SET stock=stock-$1 WHERE id=$2', [qty, rows[0].id]);
    const threshold = parseFloat(rows[0].low_stock_threshold ?? 0);
    if (threshold > 0 && (available - qty) < threshold) await autoCreatePO(itemName, 'ingredients', unit, threshold - (available - qty), req.user.username, t);

  } else if (fromDept === 'production') {
    const { rows: bRes } = await query('SELECT COALESCE(SUM(quantity_produced),0) AS total FROM production_batches WHERE product=$1 AND date=$2', [itemName, t]);
    const { rows: oRes } = await query(`SELECT COALESCE(SUM(quantity),0) AS total FROM stock_transfers WHERE from_dept='production' AND item_name=$1 AND date=$2`, [itemName, t]);
    const available = parseFloat(bRes[0].total) - parseFloat(oRes[0].total);
    if (available < qty) return res.status(400).json({ error: `Insufficient production output: ${available.toFixed(2)} available` });

  } else if (fromDept === 'bakery') {
    const { rows } = await query('SELECT * FROM bakery_items WHERE item_name=$1 AND date=$2 ORDER BY id ASC LIMIT 1', [itemName, t]);
    if (!rows[0]) return res.status(400).json({ error: `No bakery record for "${itemName}" today` });
    const available = parseFloat(rows[0].quantity ?? 0);
    if (available < qty) return res.status(400).json({ error: `Insufficient stock: ${available} available` });
    await query('UPDATE bakery_items SET quantity=quantity-$1 WHERE id=$2', [qty, rows[0].id]);
    const threshold = parseFloat(rows[0].low_stock_threshold ?? 0);
    if (threshold > 0 && (available - qty) < threshold) await autoCreatePO(itemName, 'bakery', unit, threshold - (available - qty), req.user.username, t);

  } else if (fromDept === 'packaging') {
    const { rows } = await query('SELECT * FROM packages WHERE package_type=$1 AND date=$2 ORDER BY id ASC LIMIT 1', [itemName, t]);
    if (!rows[0]) return res.status(400).json({ error: `No packaging record for "${itemName}" today` });
    const available = parseFloat(rows[0].closing_stock ?? 0);
    if (available < qty) return res.status(400).json({ error: `Insufficient stock: ${available} available` });
    await query('UPDATE packages SET closing_stock=closing_stock-$1 WHERE id=$2', [qty, rows[0].id]);
    const threshold = parseFloat(rows[0].low_stock_threshold ?? 0);
    if (threshold > 0 && (available - qty) < threshold) await autoCreatePO(itemName, 'packaging', unit, threshold - (available - qty), req.user.username, t);
  }

  /* ── Add to destination ── */
  if (toDept === 'ingredients') {
    const { rows } = await query('SELECT id FROM ingredients WHERE name=$1 AND date=$2 LIMIT 1', [itemName, t]);
    if (rows[0]) { await query('UPDATE ingredients SET stock=stock+$1 WHERE id=$2', [qty, rows[0].id]); }
    else {
      await query('INSERT INTO ingredient_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [itemName]);
      await query('INSERT INTO ingredients (name,stock,unit,date) VALUES ($1,$2,$3,$4)', [itemName, qty, unit, t]);
    }
  } else if (toDept === 'production') {
    await query('INSERT INTO production_product_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [itemName]);
    await query('INSERT INTO production_batches (product,quantity_produced,unit,baker,note,date) VALUES ($1,$2,$3,$4,$5,$6)', [itemName, qty, unit, `Transfer from ${fromDept}`, note || 'Auto-supply', t]);
  } else if (toDept === 'bakery') {
    const { rows } = await query('SELECT id FROM bakery_items WHERE item_name=$1 AND date=$2 LIMIT 1', [itemName, t]);
    if (rows[0]) { await query('UPDATE bakery_items SET quantity=quantity+$1 WHERE id=$2', [qty, rows[0].id]); }
    else {
      await query('INSERT INTO bakery_item_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [itemName]);
      await query('INSERT INTO bakery_items (item_name,quantity,unit,date) VALUES ($1,$2,$3,$4)', [itemName, qty, unit, t]);
    }
  } else if (toDept === 'packaging') {
    const { rows } = await query('SELECT id FROM packages WHERE package_type=$1 AND date=$2 LIMIT 1', [itemName, t]);
    if (rows[0]) { await query('UPDATE packages SET added_stock=added_stock+$1,closing_stock=closing_stock+$1 WHERE id=$2', [qty, rows[0].id]); }
    else {
      await query('INSERT INTO package_type_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [itemName]);
      await query('INSERT INTO packages (package_type,stock,added_stock,supply,closing_stock,date) VALUES ($1,0,$2,0,$2,$3)', [itemName, qty, t]);
    }
  } else if (toDept === 'dispatch') {
    await query('INSERT INTO dispatch_item_names (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [itemName]);
    await query('INSERT INTO orders (notes,item,quantity,unit_cost,total,date) VALUES ($1,$2,$3,0,0,$4)', [`Supplied from ${fromDept}`, itemName, qty, t]);
  }

  /* ── Record transfer ── */
  const { rows: tf } = await query(
    'INSERT INTO stock_transfers (from_dept,to_dept,item_name,quantity,unit,note,transferred_by,date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [fromDept, toDept, itemName, qty, unit, note, req.user.username, t]
  );
  res.status(201).json({ id: tf[0].id, fromDept, toDept, itemName, quantity: qty, unit, note, transferredBy: req.user.username, date: t });
});

export default router;
