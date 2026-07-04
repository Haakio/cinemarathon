/**
 * Client API + gestion de session côté navigateur.
 * Unique point d'entrée réseau du frontend : toutes les vues passent par ici,
 * ce qui permet de contrôler (et limiter) les appels vers Neon.
 */

/** @returns {string|null} JWT stocké localement */
export function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('cm_token') : null
}

/** @returns {{id: string, pseudo: string}|null} utilisateur courant */
export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('cm_user')) } catch { return null }
}

export function saveSession(token, user) {
  localStorage.setItem('cm_token', token)
  localStorage.setItem('cm_user', JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem('cm_token')
  localStorage.removeItem('cm_user')
}

export function getStoredRoom() {
  return typeof window !== 'undefined' ? localStorage.getItem('cm_room') || 'marvel' : 'marvel'
}

export function saveStoredRoom(roomId) {
  localStorage.setItem('cm_room', roomId)
}

export function getChatPref(userId) {
  return typeof window !== 'undefined' ? localStorage.getItem(`cm_chat_pref_${userId}`) : null
}

export function saveChatPref(userId, value) {
  localStorage.setItem(`cm_chat_pref_${userId}`, value)
}

export function getPatchPref(userId) {
  return typeof window !== 'undefined' ? localStorage.getItem(`cm_patchnotes_${userId}`) : null
}

export function savePatchPref(userId, version) {
  localStorage.setItem(`cm_patchnotes_${userId}`, version)
}

/** Objectif du marathon, stocké par room. @returns {{label: string, date: string}|null} */
export function getStoredGoal(roomId) {
  try { return JSON.parse(localStorage.getItem(`cm_goal_${roomId}`)) } catch { return null }
}

export function saveStoredGoal(roomId, goal) {
  localStorage.setItem(`cm_goal_${roomId}`, JSON.stringify(goal))
}

/**
 * Appel API authentifié.
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} method
 * @param {string} path - chemin après /api (ex: '/auth/watchlist')
 * @param {object} [body]
 */
export async function api(method, path, body) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) {
    const error = new Error(data.error || 'Erreur')
    error.status = res.status // permet de détecter les sessions fantômes (404 profil)
    throw error
  }
  return data
}
