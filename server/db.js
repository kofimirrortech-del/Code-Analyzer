import pg from 'pg';
import { scryptSync, randomBytes } from 'crypto';
const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL environment variable is required');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000,
});

export async function query(text, params) {
  const client = await pool.connect();
  try { return await client.query(text, params); } finally { client.release(); }
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}

export async function initDb() {
  /* ── Auth ── */
  await query(`CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY, session_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL, role TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW()
  )`);

  /* ── Dynamic users ── */
  await query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'STORE',
    permissions JSONB, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW()
  )`);

  /* ── Persistent name tables ── */
  await query(`CREATE TABLE IF NOT EXISTS store_item_names (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT NOW())`);
  await query(`CREATE TABLE IF NOT EXISTS ingredient_names (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT NOW())`);
  await query(`CREATE TABLE IF NOT EXISTS production_product_names (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT NOW())`);
  await query(`CREATE TABLE IF NOT EXISTS bakery_item_names (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT NOW())`);
  await query(`CREATE TABLE IF NOT EXISTS package_type_names (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT NOW())`);
  await query(`CREATE TABLE IF NOT EXISTS dispatch_item_names (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT NOW())`);

  /* ── Daily data tables ── */
  await query(`CREATE TABLE IF NOT EXISTS store_items (
    id SERIAL PRIMARY KEY, item_name TEXT NOT NULL,
    quantity NUMERIC(10,2) DEFAULT 0, added_stock NUMERIC(10,2) DEFAULT 0,
    closing_stock NUMERIC(10,2) DEFAULT 0, low_stock_threshold NUMERIC(10,2) DEFAULT 0,
    unit TEXT DEFAULT 'units', supplier TEXT DEFAULT '', date TEXT, created_at TIMESTAMP DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL,
    stock NUMERIC(10,2) NOT NULL DEFAULT 0, unit TEXT NOT NULL DEFAULT 'units',
    low_stock_threshold NUMERIC(10,2) DEFAULT 0, date TEXT, created_at TIMESTAMP DEFAULT NOW()
  )`);
  await query(`ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS low_stock_threshold NUMERIC(10,2) DEFAULT 0`);
  await query(`CREATE TABLE IF NOT EXISTS production_batches (
    id SERIAL PRIMARY KEY, product TEXT NOT NULL,
    quantity_produced NUMERIC(10,2) NOT NULL DEFAULT 0, unit TEXT DEFAULT 'units',
    baker TEXT NOT NULL, note TEXT DEFAULT '', date TEXT, created_at TIMESTAMP DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS bakery_items (
    id SERIAL PRIMARY KEY, item_name TEXT NOT NULL,
    quantity NUMERIC(10,2) DEFAULT 0, unit TEXT DEFAULT 'units',
    low_stock_threshold NUMERIC(10,2) DEFAULT 0, date TEXT, created_at TIMESTAMP DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY, package_type TEXT NOT NULL,
    stock NUMERIC(10,2) DEFAULT 0, added_stock NUMERIC(10,2) DEFAULT 0,
    supply NUMERIC(10,2) DEFAULT 0, closing_stock NUMERIC(10,2) DEFAULT 0,
    low_stock_threshold NUMERIC(10,2) DEFAULT 0, date TEXT, created_at TIMESTAMP DEFAULT NOW()
  )`);
  await query(`ALTER TABLE packages ADD COLUMN IF NOT EXISTS low_stock_threshold NUMERIC(10,2) DEFAULT 0`);
  await query(`CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY, notes TEXT DEFAULT '', item TEXT DEFAULT '',
    quantity NUMERIC(10,2) DEFAULT 0, unit_cost NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0, date TEXT, created_at TIMESTAMP DEFAULT NOW()
  )`);

  /* ── Standalone note sections ── */
  await query(`CREATE TABLE IF NOT EXISTS todays_order_notes (
    id SERIAL PRIMARY KEY, date TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TIMESTAMP DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS todays_production_notes (
    id SERIAL PRIMARY KEY, date TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TIMESTAMP DEFAULT NOW()
  )`);

  /* ── Inter-dept supply transfers ── */
  await query(`CREATE TABLE IF NOT EXISTS stock_transfers (
    id SERIAL PRIMARY KEY, from_dept TEXT NOT NULL, to_dept TEXT NOT NULL,
    item_name TEXT NOT NULL, quantity NUMERIC(10,2) NOT NULL, unit TEXT DEFAULT 'units',
    note TEXT DEFAULT '', transferred_by TEXT NOT NULL, date TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW()
  )`);

  /* ── Purchase orders / reorder alerts ── */
  await query(`CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY, item_name TEXT NOT NULL, department TEXT NOT NULL,
    quantity_needed NUMERIC(10,2) DEFAULT 0, unit TEXT DEFAULT 'units',
    supplier TEXT DEFAULT '', status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'normal', assigned_to TEXT DEFAULT '',
    notes TEXT DEFAULT '', created_by TEXT NOT NULL, date TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW()
  )`);

  /* ── Settings ── */
  await query(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMP DEFAULT NOW()
  )`);

  /* ── Seed default users if none exist ── */
  const { rows } = await query('SELECT COUNT(*) FROM users');
  if (parseInt(rows[0].count) === 0) {
    const defaults = [
      { u: 'admin',      p: 'admin123',  r: 'ADMIN' },
      { u: 'store_user', p: 'store789',  r: 'STORE' },
      { u: 'ing_user',   p: 'ing789',    r: 'INGREDIENT' },
      { u: 'prod_user',  p: 'prod789',   r: 'PRODUCTION' },
      { u: 'bakery_user',p: 'bakery789', r: 'BAKERY' },
      { u: 'pkg_user',   p: 'pkg789',    r: 'PACKAGE' },
      { u: 'disp_user',  p: 'disp789',   r: 'DISPATCH' },
    ];
    for (const d of defaults) {
      await query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING',
        [d.u, hashPassword(d.p), d.r]
      );
    }
    console.log('Default users seeded');
  }

  console.log('Database initialized');
}
