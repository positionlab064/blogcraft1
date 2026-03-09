import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool;

export function getDb(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    pool.on('error', (err) => {
      console.error('[DB] Pool error (connection lost):', err.message);
    });
  }
  return pool;
}

export async function initDb(): Promise<void> {
  const db = getDb();

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      nickname TEXT,
      phone TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 기존 테이블에 누락된 컬럼 마이그레이션
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS generated_content (
      id SERIAL PRIMARY KEY,
      keyword TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'naver',
      tone TEXT NOT NULL DEFAULT 'casual',
      title TEXT,
      content TEXT,
      meta_description TEXT,
      tags TEXT,
      seo_score INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS classified_photos (
      id SERIAL PRIMARY KEY,
      session_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      category TEXT NOT NULL,
      confidence REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS seo_analyses (
      id SERIAL PRIMARY KEY,
      keyword TEXT NOT NULL,
      title TEXT,
      content_length INTEGER,
      score INTEGER,
      issues TEXT,
      suggestions TEXT,
      keyword_density REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('[DB] PostgreSQL database initialized');
}
