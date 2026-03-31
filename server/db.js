import pg from 'pg';
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

export async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      session_id TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS store_items (
      id SERIAL PRIMARY KEY,
      item_name TEXT NOT NULL,
      quantity NUMERIC(10,2) DEFAULT 0,
      added_stock NUMERIC(10,2) DEFAULT 0,
      closing_stock NUMERIC(10,2) DEFAULT 0,
      low_stock_threshold NUMERIC(10,2) DEFAULT 0,
      unit TEXT DEFAULT 'units',
      supplier TEXT NOT NULL,
      date TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      stock NUMERIC(10,2) NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'units',
      date TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS production_batches (
      id SERIAL PRIMARY KEY,
      product TEXT NOT NULL,
      quantity_produced NUMERIC(10,2) NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'units',
      baker TEXT NOT NULL,
      note TEXT DEFAULT '',
      date TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS packages (
      id SERIAL PRIMARY KEY,
      package_type TEXT NOT NULL,
      stock NUMERIC(10,2) DEFAULT 0,
      added_stock NUMERIC(10,2) DEFAULT 0,
      supply NUMERIC(10,2) DEFAULT 0,
      closing_stock NUMERIC(10,2) DEFAULT 0,
      date TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      notes TEXT DEFAULT '',
      item TEXT DEFAULT '',
      quantity NUMERIC(10,2) DEFAULT 0,
      unit_cost NUMERIC(12,2) DEFAULT 0,
      total NUMERIC(12,2) DEFAULT 0,
      date TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  console.log('Database initialized');
}
