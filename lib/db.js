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

export async function getWatchlist() {
  const { rows } = await sql`SELECT * FROM watchlist ORDER BY "order" ASC`
  return rows
}

export async function insertWatchlistItem(item) {
  await sql`
    INSERT INTO watchlist (id, title, type, poster, year, "order", added_by, added_at)
    VALUES (${item.id}, ${item.title}, ${item.type}, ${item.poster}, ${item.year}, ${item.order}, ${item.addedBy}, NOW())
  `
}

export async function deleteWatchlistItem(id) {
  await sql`DELETE FROM watched WHERE item_id = ${id}`
  await sql`DELETE FROM watchlist WHERE id = ${id}`
  // Re-order
  const { rows } = await sql`SELECT id FROM watchlist ORDER BY "order" ASC`
  for (let i = 0; i < rows.length; i++) {
    await sql`UPDATE watchlist SET "order" = ${i + 1} WHERE id = ${rows[i].id}`
  }
}

export async function updateWatchlistOrder(id, newOrder) {
  await sql`UPDATE watchlist SET "order" = ${newOrder} WHERE id = ${id}`
}

export async function getWatched() {
  const { rows } = await sql`SELECT * FROM watched ORDER BY watched_at DESC`
  return rows
}

export async function upsertWatched(entry) {
  await sql`
    INSERT INTO watched (id, item_id, user_id, pseudo, rating, comment, watched_at)
    VALUES (${entry.id}, ${entry.itemId}, ${entry.userId}, ${entry.pseudo}, ${entry.rating}, ${entry.comment}, NOW())
    ON CONFLICT (item_id, user_id) DO UPDATE
      SET rating = ${entry.rating}, comment = ${entry.comment}, watched_at = NOW(), id = ${entry.id}
  `
}