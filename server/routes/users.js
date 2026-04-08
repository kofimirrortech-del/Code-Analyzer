import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, adminOnly } from '../middleware.js';
import crypto from 'crypto';

const router = Router();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(password, salt, 64).toString('hex');
}

const ROLES = ['ADMIN', 'STORE', 'INGREDIENT', 'PRODUCTION', 'BAKERY', 'PACKAGE', 'DISPATCH'];

const DEFAULT_PERMISSIONS = {
  ADMIN: null,
  STORE:      { store: {view:true,edit:true}, 'todays-production': {view:true,edit:false} },
  INGREDIENT: { ingredients: {view:true,edit:true}, 'todays-production': {view:true,edit:false} },
  PRODUCTION: { production: {view:true,edit:true}, 'todays-production': {view:true,edit:false} },
  BAKERY:     { bakery: {view:true,edit:true}, 'todays-production': {view:true,edit:false} },
  PACKAGE:    { packaging: {view:true,edit:true}, 'todays-order': {view:true,edit:false} },
  DISPATCH:   { dispatch: {view:true,edit:true}, 'todays-order': {view:true,edit:false} },
};

function fmt(u) {
  return {
    id: u.id, username: u.username, role: u.role,
    permissions: u.permissions ?? DEFAULT_PERMISSIONS[u.role] ?? null,
    isActive: u.is_active, createdAt: u.created_at,
  };
}

/* GET all users */
router.get('/', requireAuth, adminOnly, async (_req, res) => {
  const { rows } = await query('SELECT * FROM users ORDER BY created_at ASC');
  res.json(rows.map(fmt));
});

/* GET roles list */
router.get('/roles', requireAuth, adminOnly, (_req, res) => {
  res.json(ROLES);
});

/* GET default permissions for a role */
router.get('/default-permissions/:role', requireAuth, adminOnly, (req, res) => {
  res.json(DEFAULT_PERMISSIONS[req.params.role] ?? null);
});

/* CREATE user */
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { username, password, role = 'STORE', permissions } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const hash = hashPassword(password);
  const perms = permissions ?? DEFAULT_PERMISSIONS[role] ?? null;
  const { rows } = await query(
    'INSERT INTO users (username, password_hash, role, permissions) VALUES ($1,$2,$3,$4) RETURNING *',
    [username.toLowerCase().trim(), hash, role, perms ? JSON.stringify(perms) : null]
  );
  res.status(201).json(fmt(rows[0]));
});

/* UPDATE user */
router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const { username, password, role, permissions, isActive } = req.body;
  const { rows: existing } = await query('SELECT * FROM users WHERE id=$1', [req.params.id]);
  if (!existing[0]) return res.status(404).json({ error: 'User not found' });
  const u = existing[0];
  const newHash = password ? hashPassword(password) : u.password_hash;
  const newRole = ROLES.includes(role) ? role : u.role;
  const newPerms = permissions !== undefined ? (permissions ? JSON.stringify(permissions) : null) : u.permissions;
  const newActive = isActive !== undefined ? isActive : u.is_active;
  const { rows } = await query(
    `UPDATE users SET username=$1, password_hash=$2, role=$3, permissions=$4, is_active=$5 WHERE id=$6 RETURNING *`,
    [username ?? u.username, newHash, newRole, newPerms, newActive, req.params.id]
  );
  res.json(fmt(rows[0]));
});

/* DELETE user */
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  const { rows } = await query('SELECT username FROM users WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  if (rows[0].username === 'admin') return res.status(400).json({ error: 'Cannot delete admin' });
  await query('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

export { DEFAULT_PERMISSIONS };
export default router;
