import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];
const fmt = r => ({
  id: r.id, itemName: r.item_name, department: r.department,
  quantityNeeded: parseFloat(r.quantity_needed ?? 0), unit: r.unit,
  supplier: r.supplier, status: r.status, priority: r.priority,
  assignedTo: r.assigned_to, notes: r.notes, createdBy: r.created_by,
  date: r.date, createdAt: r.created_at,
});

router.get('/', requireAuth, async (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM purchase_orders';
  const params = [];
  if (status) { params.push(status); sql += ` WHERE status=$${params.length}`; }
  sql += ' ORDER BY created_at DESC';
  const { rows } = await query(sql, params);
  res.json(rows.map(fmt));
});

router.post('/', requireAuth, async (req, res) => {
  const { itemName, department, quantityNeeded = 0, unit = 'units', supplier = '', priority = 'normal', assignedTo = '', notes = '' } = req.body;
  if (!itemName || !department) return res.status(400).json({ error: 'itemName and department required' });
  const { rows } = await query(
    `INSERT INTO purchase_orders (item_name,department,quantity_needed,unit,supplier,status,priority,assigned_to,notes,created_by,date)
     VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8,$9,$10) RETURNING *`,
    [itemName, department, quantityNeeded, unit, supplier, priority, assignedTo, notes, req.user.username, today()]
  );
  res.status(201).json(fmt(rows[0]));
});

router.put('/:id', requireAuth, async (req, res) => {
  const { status, assignedTo, supplier, notes, priority, quantityNeeded } = req.body;
  const { rows: existing } = await query('SELECT * FROM purchase_orders WHERE id=$1', [req.params.id]);
  if (!existing[0]) return res.status(404).json({ error: 'Not found' });
  const e = existing[0];
  const { rows } = await query(
    `UPDATE purchase_orders SET status=$1,assigned_to=$2,supplier=$3,notes=$4,priority=$5,quantity_needed=$6 WHERE id=$7 RETURNING *`,
    [status ?? e.status, assignedTo ?? e.assigned_to, supplier ?? e.supplier, notes ?? e.notes, priority ?? e.priority, quantityNeeded ?? e.quantity_needed, req.params.id]
  );
  res.json(fmt(rows[0]));
});

router.delete('/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM purchase_orders WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

export default router;
