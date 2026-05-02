import { sql } from '@vercel/postgres'

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

export async function getRooms() {
  try {
    const { rows } = await sql`SELECT * FROM rooms ORDER BY created_at ASC`
    return rows
  } catch (err) {
    if (err.code === '42P01') return [{ id: 'marvel', name: 'Marvel', slug: 'marvel' }]
    throw err
  }
}

export async function createRoom(room) {
  await sql`
    INSERT INTO rooms (id, name, slug, created_by, created_at)
    VALUES (${room.id}, ${room.name}, ${room.slug}, ${room.createdBy}, NOW())
  `
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
    if (err.code === '42P01') return false
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
