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
        join_code_hash TEXT,
        is_private BOOLEAN DEFAULT true,
        created_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS room_members (
        room_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (room_id, user_id)
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
      CREATE TABLE IF NOT EXISTS friendships (
        requester_id TEXT NOT NULL,
        addressee_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (requester_id, addressee_id)
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS film_posts (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        item_id TEXT,
        parent_id TEXT,
        user_id TEXT NOT NULL,
        pseudo TEXT,
        title TEXT DEFAULT '',
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT ''`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_hue INTEGER`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT ''`
    await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS invite_token TEXT`
    await sql`
      CREATE TABLE IF NOT EXISTS room_invites (
        room_id TEXT NOT NULL,
        to_user_id TEXT NOT NULL,
        from_user_id TEXT,
        from_pseudo TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (room_id, to_user_id)
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS votes (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        item_ids TEXT NOT NULL,
        winner_item_id TEXT,
        tie_break TEXT DEFAULT '',
        ends_at TIMESTAMPTZ NOT NULL,
        created_by TEXT,
        created_pseudo TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS vote_ballots (
        vote_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        pseudo TEXT,
        item_id TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (vote_id, user_id)
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS password_resets (
        user_id TEXT PRIMARY KEY,
        code_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
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
    await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS join_code_hash TEXT`
    await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT true`
    await sql`ALTER TABLE watchparty_peers ADD COLUMN IF NOT EXISTS viewer_candidates TEXT DEFAULT '[]'`
    await sql`ALTER TABLE watchparty_peers ADD COLUMN IF NOT EXISTS host_candidates TEXT DEFAULT '[]'`
    // Métadonnées TMDB (fiche film : synopsis, durée, genres, casting)
    await sql`ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS synopsis TEXT DEFAULT ''`
    await sql`ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS runtime INTEGER DEFAULT 0`
    await sql`ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS genres TEXT DEFAULT ''`
    await sql`ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS tmdb_id TEXT DEFAULT ''`
    await sql`ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS backdrop TEXT DEFAULT ''`
    await sql`ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS cast_json TEXT DEFAULT '[]'`
    await sql`UPDATE watchlist SET room_id = 'marvel' WHERE room_id IS NULL`
    await sql`UPDATE watched SET room_id = 'marvel' WHERE room_id IS NULL`
    await sql`UPDATE rooms SET is_private = false WHERE id = 'marvel'`
    await sql`
      INSERT INTO room_members (room_id, user_id, role, joined_at)
      SELECT id, created_by, 'owner', NOW()
      FROM rooms
      WHERE created_by IS NOT NULL AND created_by != 'setup'
      ON CONFLICT (room_id, user_id) DO NOTHING
    `
    await sql`
      INSERT INTO room_members (room_id, user_id, role, joined_at)
      SELECT rooms.id, users.id, 'member', NOW()
      FROM rooms
      CROSS JOIN users
      WHERE rooms.id != 'marvel'
        AND rooms.join_code_hash IS NULL
      ON CONFLICT (room_id, user_id) DO NOTHING
    `

    return res.status(200).json({ ok: true, message: 'Tables creees avec succes !' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
}
