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
  const { rows } = await sql`SELECT * FROM rooms ORDER BY created_at ASC`
  return rows
}

export async function createRoom(room) {
  await sql`
    INSERT INTO rooms (id, name, slug, created_by, created_at)
    VALUES (${room.id}, ${room.name}, ${room.slug}, ${room.createdBy}, NOW())
  `
}

export async function getWatchlist(roomId) {
  const { rows } = await sql`SELECT * FROM watchlist WHERE room_id = ${roomId} ORDER BY "order" ASC`
  return rows
}

export async function insertWatchlistItem(item) {
  await sql`
    INSERT INTO watchlist (id, room_id, title, type, poster, year, "order", added_by, added_at)
    VALUES (${item.id}, ${item.roomId}, ${item.title}, ${item.type}, ${item.poster}, ${item.year}, ${item.order}, ${item.addedBy}, NOW())
  `
}

export async function deleteWatchlistItem(id) {
  const { rows: itemRows } = await sql`SELECT room_id FROM watchlist WHERE id = ${id} LIMIT 1`
  const roomId = itemRows[0]?.room_id
  await sql`DELETE FROM watched WHERE item_id = ${id}`
  await sql`DELETE FROM watchlist WHERE id = ${id}`
  if (!roomId) return
  const { rows } = await sql`SELECT id FROM watchlist WHERE room_id = ${roomId} ORDER BY "order" ASC`
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
  const { rows } = await sql`SELECT * FROM watched WHERE room_id = ${roomId} ORDER BY watched_at DESC`
  return rows
}

export async function upsertWatched(entry) {
  await sql`
    INSERT INTO watched (id, room_id, item_id, user_id, pseudo, rating, comment, watched_at)
    VALUES (${entry.id}, ${entry.roomId}, ${entry.itemId}, ${entry.userId}, ${entry.pseudo}, ${entry.rating}, ${entry.comment}, NOW())
    ON CONFLICT (item_id, user_id) DO UPDATE
      SET room_id = ${entry.roomId}, rating = ${entry.rating}, comment = ${entry.comment}, watched_at = NOW(), id = ${entry.id}
  `
}

export async function deleteWatched(id) {
  await sql`DELETE FROM watched WHERE id = ${id}`
}

export async function updateWatchlistItem(id, item) {
  await sql`
    UPDATE watchlist
    SET title = ${item.title},
        type = ${item.type},
        poster = ${item.poster},
        year = ${item.year}
    WHERE id = ${id}
  `
}
