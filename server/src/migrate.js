// Runs every .sql file in migrations/ once, in order, tracked in a schema_migrations table.
// `npm run migrate` — safe to run on every deploy.
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './db.js'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations')

async function main() {
  await pool.query(`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`)
  const { rows } = await pool.query('select name from schema_migrations')
  const applied = new Set(rows.map((r) => r.name))

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    console.log(`applying ${file}`)
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query(sql)
      await client.query('insert into schema_migrations (name) values ($1)', [file])
      await client.query('commit')
    } catch (e) {
      await client.query('rollback')
      throw e
    } finally {
      client.release()
    }
  }
  console.log('migrations up to date')
  await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
