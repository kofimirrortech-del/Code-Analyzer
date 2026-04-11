import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();
const today = () => new Date().toISOString().split('T')[0];

const DEPT_TO_ROLE = {
  store: 'STORE', ingredients: 'INGREDIENT', production: 'PRODUCTION',
  bakery: 'BAKERY', packaging: 'PACKAGE', dispatch: 'DISPATCH',
};

router.get('/', requireAuth, async (req, res) => {
  const { status } = req.query;
  const isAdmin = req.user.role === 'ADMIN';
  let sql = 'SELECT * FROM department_requests';
  const params = [];
  const conds = [];
  if (status) { params.push(status); conds.push(`status=$${params.length}`); }
  if (!isAdmin) {
    const role = req.user.role;
    const dept = Object.keys(DEPT_TO_ROLE).find(k => DEPT_TO_ROLE[k] === role) || '';
    params.push(dept);
    conds.push(`(from_dept=$${params.length} OR to_dept=$${params.length})`);
  }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY created_at DESC';
  const { rows } = await query(sql, params);
  res.json(rows.map(r => ({
    id: r.id, fromDept: r.from_dept, toDept: r.to_dept,
    itemName: r.item_name, quantity: parseFloat(r.quantity), unit: r.unit,
    note: r.note, status: r.status, requestedBy: r.requested_by,
    reviewedBy: r.reviewed_by, reviewNote: r.review_note,
    date: r.date, createdAt: r.created_at,
  })));
});

router.post('/', requireAuth, async (req, res) => {
  const { fromDept, toDept, itemName, quantity, unit = 'units', note = '' } = req.body;
  if (!fromDept || !toDept || !itemName || !quantity)
    return res.status(400).json({ error: 'fromDept, toDept, itemName, quantity required' });
  const { rows } = await query(
    `INSERT INTO department_requests (from_dept,to_dept,item_name,quantity,unit,note,requested_by,date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [fromDept, toDept, itemName, parseFloat(quantity), unit, note, req.user.username, today()]
  );
  await query(
    `INSERT INTO notifications (type,title,message,department,related_id,target_role) VALUES ($1,$2,$3,$4,$5,'ADMIN')`,
    ['request', 'New Item Request',
     `${req.user.username} (${fromDept}) requested ${quantity} ${unit} of "${itemName}" from ${toDept}`,
     fromDept, rows[0].id]
  );
  res.status(201).json({ id: rows[0].id });
});

router.put('/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  const { status, reviewNote = '' } = req.body;
  if (!['approved', 'rejected'].includes(status))
    return res.status(400).json({ error: 'status must be approved or rejected' });
  const { rows } = await query(
    `UPDATE department_requests SET status=$1,reviewed_by=$2,review_note=$3 WHERE id=$4 RETURNING *`,
    [status, req.user.username, reviewNote, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  const r = rows[0];
  const targetRole = DEPT_TO_ROLE[r.from_dept] || 'ADMIN';
  await query(
    `INSERT INTO notifications (type,title,message,department,related_id,target_role) VALUES ($1,$2,$3,$4,$5,$6)`,
    [status === 'approved' ? 'request_approved' : 'request_rejected',
     `Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
     `Your request for "${r.item_name}" (${r.quantity} ${r.unit}) was ${status}${reviewNote ? ': ' + reviewNote : ''}`,
     r.from_dept, r.id, targetRole]
  );
  res.json({ success: true });
});

router.delete('/:id', requireAuth, async (req, res) => {
  await query('DELETE FROM department_requests WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

export default router;
