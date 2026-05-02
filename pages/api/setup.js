import { sql } from '@vercel/postgres'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
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
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        created_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS watchlist (
        id TEXT PRIMARY KEY,
        room_id TEXT DEFAULT 'marvel',
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        poster TEXT DEFAULT '',
        year TEXT DEFAULT '',
        platform TEXT DEFAULT '',
        watch_url TEXT DEFAULT '',
        "order" INTEGER NOT NULL,
        added_by TEXT,
        added_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS watched (
        id TEXT PRIMARY KEY,
        room_id TEXT DEFAULT 'marvel',
        item_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        pseudo TEXT,
        rating INTEGER NOT NULL,
        comment TEXT DEFAULT '',
        watched_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(item_id, user_id)
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        pseudo TEXT,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS chat_typing (
        room_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        pseudo TEXT,
        is_typing BOOLEAN DEFAULT false,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (room_id, user_id)
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS availability (
        room_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        pseudo TEXT,
        day_key TEXT NOT NULL,
        slot_key TEXT NOT NULL,
        slot_label TEXT NOT NULL,
        preference TEXT DEFAULT 'any',
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (room_id, user_id, day_key, slot_key)
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS watchparty_sessions (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        host_user_id TEXT NOT NULL,
        host_pseudo TEXT,
        active BOOLEAN DEFAULT true,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS watchparty_peers (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        viewer_user_id TEXT NOT NULL,
        viewer_pseudo TEXT,
        offer TEXT NOT NULL,
        answer TEXT,
        viewer_candidates TEXT DEFAULT '[]',
        host_candidates TEXT DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      INSERT INTO rooms (id, name, slug, created_by, created_at)
      VALUES ('marvel', 'Marvel', 'marvel', 'setup', NOW())
      ON CONFLICT (id) DO NOTHING
    `
    await sql`ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS room_id TEXT DEFAULT 'marvel'`
    await sql`ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT ''`
    await sql`ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS watch_url TEXT DEFAULT ''`
    await sql`ALTER TABLE watched ADD COLUMN IF NOT EXISTS room_id TEXT DEFAULT 'marvel'`
    await sql`ALTER TABLE watchparty_peers ADD COLUMN IF NOT EXISTS viewer_candidates TEXT DEFAULT '[]'`
    await sql`ALTER TABLE watchparty_peers ADD COLUMN IF NOT EXISTS host_candidates TEXT DEFAULT '[]'`
    await sql`UPDATE watchlist SET room_id = 'marvel' WHERE room_id IS NULL`
    await sql`UPDATE watched SET room_id = 'marvel' WHERE room_id IS NULL`

    return res.status(200).json({ ok: true, message: 'Tables creees avec succes !' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
}
