import pg from 'pg'

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway's internal Postgres doesn't need SSL; their public proxy URL does.
  ssl: process.env.DATABASE_URL?.includes('proxy.rlwy.net') ? { rejectUnauthorized: false } : false,
})

export const q = (text, params) => pool.query(text, params)
