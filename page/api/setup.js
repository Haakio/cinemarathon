import { sql } from '@vercel/postgres'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  // Simple protection: require a secret query param
  if (req.query.secret !== process.env.SETUP_SECRET) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        pseudo TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS watchlist (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        poster TEXT DEFAULT '',
        year TEXT DEFAULT '',
        "order" INTEGER NOT NULL,
        added_by TEXT,
        added_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS watched (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        pseudo TEXT,
        rating INTEGER NOT NULL,
        comment TEXT DEFAULT '',
        watched_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(item_id, user_id)
      )
    `
    return res.status(200).json({ ok: true, message: 'Tables créées avec succès !' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
}