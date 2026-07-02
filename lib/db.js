import { sql } from '@vercel/postgres'

console.log(process.env.POSTGRES_URL)

export { sql }

export async function getUser(pseudo) {
  const { rows } = await sql`SELECT * FROM users WHERE LOWER(pseudo) = LOWER(${pseudo}) LIMIT 1`
  return rows[0] || null
}

export async function getUserById(id) {
  const { rows } = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`
  return rows[0] || null
}

export async function createUser(id, pseudo, hashedPassword) {
  await sql`INSERT INTO users (id, pseudo, password, created_at) VALUES (${id}, ${pseudo}, ${hashedPassword}, NOW())`
}

export async function updateUserPassword(userId, hashedPassword) {
  await sql`UPDATE users SET password = ${hashedPassword} WHERE id = ${userId}`
}

// ─── Réinitialisation de mot de passe ───────────────────────
// Codes à usage unique générés par l'admin, stockés hachés (bcrypt),
// expiration 30 min. La table est créée à la volée si absente (42P01)
// pour éviter d'exiger un re-run de /api/setup.

async function ensurePasswordResetsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS password_resets (
      user_id TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

export async function upsertPasswordReset(userId, codeHash, expiresAt) {
  try {
    await sql`
      INSERT INTO password_resets (user_id, code_hash, expires_at, created_at)
      VALUES (${userId}, ${codeHash}, ${expiresAt}, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET code_hash = ${codeHash}, expires_at = ${expiresAt}, created_at = NOW()
    `
  } catch (err) {
    if (err.code !== '42P01') throw err
    await ensurePasswordResetsTable()
    await sql`
      INSERT INTO password_resets (user_id, code_hash, expires_at, created_at)
      VALUES (${userId}, ${codeHash}, ${expiresAt}, NOW())
    `
  }
}

export async function getPasswordReset(userId) {
  try {
    const { rows } = await sql`SELECT * FROM password_resets WHERE user_id = ${userId} LIMIT 1`
    return rows[0] || null
  } catch (err) {
    if (err.code === '42P01') return null
    throw err
  }
}

export async function deletePasswordReset(userId) {
  try {
    await sql`DELETE FROM password_resets WHERE user_id = ${userId}`
  } catch (err) {
    if (err.code !== '42P01') throw err
  }
}

// ─── Profil (avatar personnalisable) ────────────────────────

export async function updateUserAvatar(userId, avatarEmoji, avatarHue, avatarUrl = '') {
  try {
    await sql`UPDATE users SET avatar_emoji = ${avatarEmoji}, avatar_hue = ${avatarHue}, avatar_url = ${avatarUrl} WHERE id = ${userId}`
    return true
  } catch (err) {
    if (err.code !== '42703') throw err
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT ''`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_hue INTEGER`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT ''`
    await sql`UPDATE users SET avatar_emoji = ${avatarEmoji}, avatar_hue = ${avatarHue}, avatar_url = ${avatarUrl} WHERE id = ${userId}`
    return true
  }
}

/**
 * Avatars personnalisés de tous les membres (une requête par session).
 * Ne renvoie QUE les utilisateurs ayant customisé leur avatar : le payload
 * reste minimal, les autres gardent l'avatar généré côté client.
 */
export async function getCustomAvatars() {
  try {
    const { rows } = await sql`
      SELECT id, pseudo, avatar_emoji, avatar_hue, avatar_url
      FROM users
      WHERE COALESCE(avatar_emoji, '') != ''
         OR COALESCE(avatar_url, '') != ''
         OR avatar_hue IS NOT NULL
    `
    return rows
  } catch (err) {
    if (err.code === '42703') return []
    throw err
  }
}

export async function searchUsers(query, excludeUserId) {
  const { rows } = await sql`
    SELECT id, pseudo FROM users
    WHERE LOWER(pseudo) LIKE ${'%' + query.toLowerCase() + '%'}
      AND id != ${excludeUserId}
    ORDER BY pseudo ASC
    LIMIT 8
  `
  return rows
}

// ─── Amis ───────────────────────────────────────────────────
// Une ligne par demande : (requester, addressee, status pending|accepted).
// Table créée à la volée si absente (42P01).

async function ensureFriendshipsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS friendships (
      requester_id TEXT NOT NULL,
      addressee_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (requester_id, addressee_id)
    )
  `
}

export async function getFriendships(userId) {
  try {
    const { rows } = await sql`
      SELECT f.requester_id, f.addressee_id, f.status, f.created_at,
             ru.pseudo AS requester_pseudo, au.pseudo AS addressee_pseudo,
             ru.avatar_emoji AS requester_avatar_emoji, ru.avatar_hue AS requester_avatar_hue, ru.avatar_url AS requester_avatar_url,
             au.avatar_emoji AS addressee_avatar_emoji, au.avatar_hue AS addressee_avatar_hue, au.avatar_url AS addressee_avatar_url
      FROM friendships f
      LEFT JOIN users ru ON ru.id = f.requester_id
      LEFT JOIN users au ON au.id = f.addressee_id
      WHERE f.requester_id = ${userId} OR f.addressee_id = ${userId}
      ORDER BY f.created_at DESC
    `
    return rows
  } catch (err) {
    if (err.code === '42P01') return []
    if (err.code !== '42703') throw err
    // Colonnes avatar absentes : version sans avatars
    try {
      const { rows } = await sql`
        SELECT f.requester_id, f.addressee_id, f.status, f.created_at,
               ru.pseudo AS requester_pseudo, au.pseudo AS addressee_pseudo
        FROM friendships f
        LEFT JOIN users ru ON ru.id = f.requester_id
        LEFT JOIN users au ON au.id = f.addressee_id
        WHERE f.requester_id = ${userId} OR f.addressee_id = ${userId}
        ORDER BY f.created_at DESC
      `
      return rows
    } catch (fallbackErr) {
      if (fallbackErr.code === '42P01') return []
      throw fallbackErr
    }
  }
}

export async function getFriendship(userA, userB) {
  try {
    const { rows } = await sql`
      SELECT * FROM friendships
      WHERE (requester_id = ${userA} AND addressee_id = ${userB})
         OR (requester_id = ${userB} AND addressee_id = ${userA})
      LIMIT 1
    `
    return rows[0] || null
  } catch (err) {
    if (err.code === '42P01') return null
    throw err
  }
}

export async function createFriendRequest(requesterId, addresseeId) {
  try {
    await sql`
      INSERT INTO friendships (requester_id, addressee_id, status, created_at)
      VALUES (${requesterId}, ${addresseeId}, 'pending', NOW())
      ON CONFLICT (requester_id, addressee_id) DO NOTHING
    `
  } catch (err) {
    if (err.code !== '42P01') throw err
    await ensureFriendshipsTable()
    await sql`
      INSERT INTO friendships (requester_id, addressee_id, status, created_at)
      VALUES (${requesterId}, ${addresseeId}, 'pending', NOW())
      ON CONFLICT (requester_id, addressee_id) DO NOTHING
    `
  }
}

export async function acceptFriendRequest(requesterId, addresseeId) {
  await sql`
    UPDATE friendships SET status = 'accepted'
    WHERE requester_id = ${requesterId} AND addressee_id = ${addresseeId}
  `
}

export async function deleteFriendship(userA, userB) {
  await sql`
    DELETE FROM friendships
    WHERE (requester_id = ${userA} AND addressee_id = ${userB})
       OR (requester_id = ${userB} AND addressee_id = ${userA})
  `
}

// ─── Discussions (posts par film) ───────────────────────────
// Posts et réponses dans la même table (parent_id NULL = post racine).

async function ensureFilmPostsTable() {
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
}

export async function getFilmPosts(roomId) {
  try {
    const { rows } = await sql`
      SELECT recent.*, u.avatar_emoji, u.avatar_hue, u.avatar_url FROM (
        SELECT * FROM film_posts
        WHERE room_id = ${roomId}
        ORDER BY created_at DESC
        LIMIT 200
      ) recent
      LEFT JOIN users u ON u.id = recent.user_id
      ORDER BY recent.created_at ASC
    `
    return rows
  } catch (err) {
    if (err.code === '42P01') return []
    if (err.code !== '42703') throw err
    // Colonnes avatar absentes : version sans avatars
    try {
      const { rows } = await sql`
        SELECT * FROM (
          SELECT * FROM film_posts
          WHERE room_id = ${roomId}
          ORDER BY created_at DESC
          LIMIT 200
        ) recent
        ORDER BY created_at ASC
      `
      return rows
    } catch (fallbackErr) {
      if (fallbackErr.code === '42P01') return []
      throw fallbackErr
    }
  }
}

export async function createFilmPost(post) {
  try {
    await sql`
      INSERT INTO film_posts (id, room_id, item_id, parent_id, user_id, pseudo, title, body, created_at)
      VALUES (${post.id}, ${post.roomId}, ${post.itemId}, ${post.parentId}, ${post.userId}, ${post.pseudo}, ${post.title}, ${post.body}, NOW())
    `
  } catch (err) {
    if (err.code !== '42P01') throw err
    await ensureFilmPostsTable()
    await sql`
      INSERT INTO film_posts (id, room_id, item_id, parent_id, user_id, pseudo, title, body, created_at)
      VALUES (${post.id}, ${post.roomId}, ${post.itemId}, ${post.parentId}, ${post.userId}, ${post.pseudo}, ${post.title}, ${post.body}, NOW())
    `
  }
}

export async function getFilmPost(id) {
  try {
    const { rows } = await sql`SELECT * FROM film_posts WHERE id = ${id} LIMIT 1`
    return rows[0] || null
  } catch (err) {
    if (err.code === '42P01') return null
    throw err
  }
}

export async function deleteFilmPost(id) {
  await sql`DELETE FROM film_posts WHERE id = ${id} OR parent_id = ${id}`
}

export async function getRooms(userId) {
  try {
    if (!userId) {
      const { rows } = await sql`SELECT * FROM rooms ORDER BY created_at ASC`
      return rows
    }

    const { rows } = await sql`
      SELECT DISTINCT rooms.*,
        CASE WHEN rooms.created_by = ${userId} THEN true ELSE false END AS can_delete,
        CASE
          WHEN rooms.created_by = ${userId} THEN true
          WHEN EXISTS (
            SELECT 1 FROM room_members manager
            WHERE manager.room_id = rooms.id
              AND manager.user_id = ${userId}
              AND manager.role IN ('owner', 'admin')
          ) THEN true
          ELSE false
        END AS can_manage
      FROM rooms
      LEFT JOIN room_members ON room_members.room_id = rooms.id
      WHERE rooms.id = 'marvel'
        OR rooms.created_by = ${userId}
        OR room_members.user_id = ${userId}
      ORDER BY rooms.created_at ASC
    `
    return rows
  } catch (err) {
    if (err.code === '42P01' || err.code === '42703') return [{ id: 'marvel', name: 'Marvel', slug: 'marvel' }]
    throw err
  }
}

export async function createRoom(room) {
  await sql`
    INSERT INTO rooms (id, name, slug, join_code_hash, is_private, created_by, created_at)
    VALUES (${room.id}, ${room.name}, ${room.slug}, ${room.joinCodeHash}, true, ${room.createdBy}, NOW())
  `
  await sql`
    INSERT INTO room_members (room_id, user_id, role, joined_at)
    VALUES (${room.id}, ${room.createdBy}, 'owner', NOW())
    ON CONFLICT (room_id, user_id) DO UPDATE SET role = 'owner'
  `
}

export async function getRoomByName(name) {
  try {
    const { rows } = await sql`
      SELECT * FROM rooms
      WHERE LOWER(name) = LOWER(${name}) OR LOWER(slug) = LOWER(${name})
      ORDER BY created_at DESC
      LIMIT 1
    `
    return rows[0] || null
  } catch (err) {
    if (err.code === '42P01') return null
    throw err
  }
}

export async function getRoomById(roomId) {
  try {
    const { rows } = await sql`SELECT * FROM rooms WHERE id = ${roomId} LIMIT 1`
    return rows[0] || null
  } catch (err) {
    if (err.code === '42P01') return null
    throw err
  }
}

export async function updateRoomCode(roomId, joinCodeHash) {
  await sql`UPDATE rooms SET join_code_hash = ${joinCodeHash}, is_private = true WHERE id = ${roomId}`
}

export async function getRoomMembers(roomId) {
  try {
    const { rows } = await sql`
      SELECT room_members.room_id, room_members.user_id, room_members.role, room_members.joined_at, users.pseudo
      FROM room_members
      LEFT JOIN users ON users.id = room_members.user_id
      WHERE room_members.room_id = ${roomId}
      ORDER BY
        CASE WHEN room_members.role = 'owner' THEN 0 ELSE 1 END,
        room_members.joined_at ASC
    `
    return rows
  } catch (err) {
    if (err.code === '42P01') return []
    throw err
  }
}

export async function removeRoomMember(roomId, userId) {
  await sql`DELETE FROM room_members WHERE room_id = ${roomId} AND user_id = ${userId}`
}

export async function setRoomMemberRole(roomId, userId, role) {
  await sql`UPDATE room_members SET role = ${role} WHERE room_id = ${roomId} AND user_id = ${userId}`
}

export async function deleteRoom(roomId) {
  if (!roomId || roomId === 'marvel') return false

  await sql`DELETE FROM watched WHERE room_id = ${roomId}`
  await sql`DELETE FROM watchlist WHERE room_id = ${roomId}`
  await sql`DELETE FROM chat_typing WHERE room_id = ${roomId}`
  await sql`DELETE FROM chat_messages WHERE room_id = ${roomId}`
  await sql`DELETE FROM availability WHERE room_id = ${roomId}`
  await sql`DELETE FROM watchparty_peers WHERE room_id = ${roomId}`
  await sql`DELETE FROM watchparty_sessions WHERE room_id = ${roomId}`
  await sql`DELETE FROM room_members WHERE room_id = ${roomId}`
  await sql`DELETE FROM rooms WHERE id = ${roomId}`
  return true
}

export async function addRoomMember(roomId, userId, role = 'member') {
  await sql`
    INSERT INTO room_members (room_id, user_id, role, joined_at)
    VALUES (${roomId}, ${userId}, ${role}, NOW())
    ON CONFLICT (room_id, user_id) DO UPDATE SET role = room_members.role
  `
}

export async function hasRoomAccess(roomId, userId) {
  if (!roomId || roomId === 'marvel') return true
  try {
    const { rows } = await sql`
      SELECT rooms.id
      FROM rooms
      LEFT JOIN room_members ON room_members.room_id = rooms.id AND room_members.user_id = ${userId}
      WHERE rooms.id = ${roomId}
        AND (rooms.created_by = ${userId} OR room_members.user_id = ${userId})
      LIMIT 1
    `
    return rows.length > 0
  } catch (err) {
    if (err.code === '42P01' || err.code === '42703') return true
    throw err
  }
}

export async function hasRoomManageAccess(roomId, userId) {
  if (!roomId) return false
  try {
    const { rows } = await sql`
      SELECT rooms.id
      FROM rooms
      LEFT JOIN room_members ON room_members.room_id = rooms.id AND room_members.user_id = ${userId}
      WHERE rooms.id = ${roomId}
        AND (
          rooms.created_by = ${userId}
          OR room_members.role IN ('owner', 'admin')
        )
      LIMIT 1
    `
    return rows.length > 0
  } catch (err) {
    if (err.code === '42P01' || err.code === '42703') return false
    throw err
  }
}

export async function getChatMessages(roomId) {
  try {
    const { rows } = await sql`
      SELECT * FROM (
        SELECT * FROM chat_messages
        WHERE room_id = ${roomId}
        ORDER BY created_at DESC
        LIMIT 80
      ) recent
      ORDER BY created_at ASC
    `
    return rows
  } catch (err) {
    if (err.code === '42P01') return []
    throw err
  }
}

export async function createChatMessage(message) {
  try {
    await sql`
      INSERT INTO chat_messages (id, room_id, user_id, pseudo, message, created_at)
      VALUES (${message.id}, ${message.roomId}, ${message.userId}, ${message.pseudo}, ${message.text}, NOW())
    `
    return true
  } catch (err) {
    if (err.code === '42P01' || err.code === '42703') return false
    throw err
  }
}

export async function setChatTyping(entry) {
  try {
    await sql`
      INSERT INTO chat_typing (room_id, user_id, pseudo, is_typing, updated_at)
      VALUES (${entry.roomId}, ${entry.userId}, ${entry.pseudo}, ${entry.isTyping}, NOW())
      ON CONFLICT (room_id, user_id) DO UPDATE
        SET pseudo = ${entry.pseudo}, is_typing = ${entry.isTyping}, updated_at = NOW()
    `
    return true
  } catch (err) {
    if (err.code === '42P01') return false
    throw err
  }
}

export async function getChatTyping(roomId, userId) {
  try {
    const { rows } = await sql`
      SELECT pseudo FROM chat_typing
      WHERE room_id = ${roomId}
        AND user_id != ${userId}
        AND is_typing = true
        AND updated_at > NOW() - INTERVAL '5 seconds'
      ORDER BY updated_at DESC
    `
    return rows
  } catch (err) {
    if (err.code === '42P01') return []
    throw err
  }
}

export async function getAvailability(roomId) {
  try {
    const { rows } = await sql`
      SELECT * FROM availability
      WHERE room_id = ${roomId}
      ORDER BY day_key ASC, slot_key ASC, pseudo ASC
    `
    return rows
  } catch (err) {
    if (err.code === '42P01') return []
    throw err
  }
}

export async function setAvailability(entry) {
  try {
    if (!entry.available) {
      await sql`
        DELETE FROM availability
        WHERE room_id = ${entry.roomId}
          AND user_id = ${entry.userId}
          AND day_key = ${entry.dayKey}
          AND slot_key = ${entry.slotKey}
      `
      return true
    }

    await sql`
      INSERT INTO availability (room_id, user_id, pseudo, day_key, slot_key, slot_label, preference, updated_at)
      VALUES (${entry.roomId}, ${entry.userId}, ${entry.pseudo}, ${entry.dayKey}, ${entry.slotKey}, ${entry.slotLabel}, ${entry.preference}, NOW())
      ON CONFLICT (room_id, user_id, day_key, slot_key) DO UPDATE
        SET pseudo = ${entry.pseudo}, slot_label = ${entry.slotLabel}, preference = ${entry.preference}, updated_at = NOW()
    `
    return true
  } catch (err) {
    if (err.code === '42P01') return false
    throw err
  }
}

// NOTE : les fonctions Watch Party ont été supprimées avec la zone secrète.
// deleteRoom() continue de purger les tables watchparty_* existantes,
// et setup.js les crée encore : sans impact, données historiques seulement.

export async function getWatchlist(roomId) {
  try {
    if (roomId === 'marvel') {
      const { rows } = await sql`
        SELECT * FROM watchlist
        WHERE room_id = ${roomId} OR room_id IS NULL
        ORDER BY "order" ASC
      `
      return rows
    }

    const { rows } = await sql`SELECT * FROM watchlist WHERE room_id = ${roomId} ORDER BY "order" ASC`
    return rows
  } catch (err) {
    if (err.code === '42703') {
      const { rows } = await sql`SELECT * FROM watchlist ORDER BY "order" ASC`
      return roomId === 'marvel' ? rows : []
    }
    throw err
  }
}

export async function insertWatchlistItem(item) {
  // Tentative avec métadonnées TMDB (colonnes récentes), puis fallback
  // progressif si la base n'a pas encore été migrée (code 42703).
  try {
    await sql`
      INSERT INTO watchlist (id, room_id, title, type, poster, year, platform, watch_url, "order", added_by, added_at, synopsis, runtime, genres, tmdb_id, backdrop, cast_json)
      VALUES (${item.id}, ${item.roomId}, ${item.title}, ${item.type}, ${item.poster}, ${item.year}, ${item.platform}, ${item.watchUrl}, ${item.order}, ${item.addedBy}, NOW(), ${item.synopsis || ''}, ${item.runtime || 0}, ${item.genres || ''}, ${item.tmdbId || ''}, ${item.backdrop || ''}, ${item.castJson || '[]'})
    `
    return
  } catch (err) {
    if (err.code !== '42703') throw err
  }
  try {
    await sql`
      INSERT INTO watchlist (id, room_id, title, type, poster, year, platform, watch_url, "order", added_by, added_at)
      VALUES (${item.id}, ${item.roomId}, ${item.title}, ${item.type}, ${item.poster}, ${item.year}, ${item.platform}, ${item.watchUrl}, ${item.order}, ${item.addedBy}, NOW())
    `
  } catch (err) {
    if (err.code !== '42703') throw err
    await sql`
      INSERT INTO watchlist (id, title, type, poster, year, "order", added_by, added_at)
      VALUES (${item.id}, ${item.title}, ${item.type}, ${item.poster}, ${item.year}, ${item.order}, ${item.addedBy}, NOW())
    `
  }
}

export async function deleteWatchlistItem(id) {
  let roomId = null
  try {
    const { rows: itemRows } = await sql`SELECT room_id FROM watchlist WHERE id = ${id} LIMIT 1`
    roomId = itemRows[0]?.room_id
  } catch (err) {
    if (err.code !== '42703') throw err
  }
  await sql`DELETE FROM watched WHERE item_id = ${id}`
  await sql`DELETE FROM watchlist WHERE id = ${id}`
  const { rows } = roomId
    ? await sql`SELECT id FROM watchlist WHERE room_id = ${roomId} ORDER BY "order" ASC`
    : await sql`SELECT id FROM watchlist ORDER BY "order" ASC`
  for (let i = 0; i < rows.length; i++) {
    await sql`UPDATE watchlist SET "order" = ${i + 1} WHERE id = ${rows[i].id}`
  }
}

export async function updateWatchlistOrder(id, newOrder) {
  await sql`UPDATE watchlist SET "order" = ${newOrder} WHERE id = ${id}`
}

export async function getWatched(roomId) {
  if (!roomId) {
    const { rows } = await sql`SELECT * FROM watched ORDER BY watched_at DESC`
    return rows
  }
  try {
    if (roomId === 'marvel') {
      const { rows } = await sql`
        SELECT * FROM watched
        WHERE room_id = ${roomId} OR room_id IS NULL
        ORDER BY watched_at DESC
      `
      return rows
    }

    const { rows } = await sql`SELECT * FROM watched WHERE room_id = ${roomId} ORDER BY watched_at DESC`
    return rows
  } catch (err) {
    if (err.code === '42703') {
      const { rows } = await sql`SELECT * FROM watched ORDER BY watched_at DESC`
      return roomId === 'marvel' ? rows : []
    }
    throw err
  }
}

export async function upsertWatched(entry) {
  try {
    await sql`
      INSERT INTO watched (id, room_id, item_id, user_id, pseudo, rating, comment, watched_at)
      VALUES (${entry.id}, ${entry.roomId}, ${entry.itemId}, ${entry.userId}, ${entry.pseudo}, ${entry.rating}, ${entry.comment}, NOW())
      ON CONFLICT (item_id, user_id) DO UPDATE
        SET room_id = ${entry.roomId}, rating = ${entry.rating}, comment = ${entry.comment}, watched_at = NOW(), id = ${entry.id}
    `
  } catch (err) {
    if (err.code !== '42703') throw err
    await sql`
      INSERT INTO watched (id, item_id, user_id, pseudo, rating, comment, watched_at)
      VALUES (${entry.id}, ${entry.itemId}, ${entry.userId}, ${entry.pseudo}, ${entry.rating}, ${entry.comment}, NOW())
      ON CONFLICT (item_id, user_id) DO UPDATE
        SET rating = ${entry.rating}, comment = ${entry.comment}, watched_at = NOW(), id = ${entry.id}
    `
  }
}

export async function deleteWatched(id) {
  await sql`DELETE FROM watched WHERE id = ${id}`
}

export async function updateWatchlistItem(id, item) {
  // Même stratégie de fallback progressif que insertWatchlistItem.
  if (item.tmdbId !== undefined) {
    try {
      await sql`
        UPDATE watchlist
        SET title = ${item.title},
            type = ${item.type},
            poster = ${item.poster},
            year = ${item.year},
            platform = ${item.platform},
            watch_url = ${item.watchUrl},
            synopsis = ${item.synopsis || ''},
            runtime = ${item.runtime || 0},
            genres = ${item.genres || ''},
            tmdb_id = ${item.tmdbId || ''},
            backdrop = ${item.backdrop || ''},
            cast_json = ${item.castJson || '[]'}
        WHERE id = ${id}
      `
      return
    } catch (err) {
      if (err.code !== '42703') throw err
    }
  }
  try {
    await sql`
      UPDATE watchlist
      SET title = ${item.title},
          type = ${item.type},
          poster = ${item.poster},
          year = ${item.year},
          platform = ${item.platform},
          watch_url = ${item.watchUrl}
      WHERE id = ${id}
    `
  } catch (err) {
    if (err.code !== '42703') throw err
    await sql`
      UPDATE watchlist
      SET title = ${item.title},
          type = ${item.type},
          poster = ${item.poster},
          year = ${item.year}
      WHERE id = ${id}
    `
  }
}
