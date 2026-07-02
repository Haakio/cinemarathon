import { useCallback, useEffect, useRef, useState } from 'react'
import { api, getChatPref, saveChatPref } from '../utils/api'

/**
 * Chat de room. Logique STRICTEMENT identique à l'existant :
 * - opt-in par utilisateur (localStorage), avec prompt de consentement
 * - poll 2,5s uniquement quand le panneau est ouvert et l'onglet visible
 * - signal "en train d'écrire" avec timeout 1,5s
 * Seule l'apparence du widget a changé.
 */
export function useChat({ authed, currentUser, currentRoomId, pageVisible, onError }) {
  const [chatEnabled, setChatEnabled] = useState(false)
  const [chatPromptVisible, setChatPromptVisible] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatTypingUsers, setChatTypingUsers] = useState([])
  const chatMessagesRef = useRef(null)

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    window.requestAnimationFrame(() => {
      const box = chatMessagesRef.current
      if (box) box.scrollTo({ top: box.scrollHeight, behavior })
    })
  }, [])

  // Préférence chat par utilisateur
  useEffect(() => {
    if (!authed || !currentUser?.id) return
    const pref = getChatPref(currentUser.id)
    if (!pref) {
      setChatPromptVisible(true)
      setChatEnabled(false)
      return
    }
    setChatEnabled(pref === 'enabled')
  }, [authed, currentUser])

  const loadChat = useCallback(async () => {
    if (!authed || !chatEnabled || !currentRoomId) return
    const roomQuery = `roomId=${encodeURIComponent(currentRoomId)}`
    try {
      const [messages, typing] = await Promise.all([
        api('GET', `/auth/chat?${roomQuery}`),
        api('GET', `/auth/chat/typing?${roomQuery}`),
      ])
      setChatMessages(messages)
      setChatTypingUsers(typing)
    } catch { }
  }, [authed, chatEnabled, currentRoomId])

  // Poll 2,5s quand ouvert + visible
  useEffect(() => {
    if (!chatEnabled || !pageVisible || !chatOpen) return
    loadChat()
    const timer = setInterval(loadChat, 2500)
    return () => clearInterval(timer)
  }, [chatEnabled, chatOpen, pageVisible, loadChat])

  // Retour d'onglet
  useEffect(() => {
    if (authed && pageVisible && chatEnabled) loadChat()
  }, [authed, pageVisible, chatEnabled, loadChat])

  // Scroll auto
  useEffect(() => { if (chatOpen) scrollToBottom('auto') }, [chatOpen, scrollToBottom])
  useEffect(() => { if (chatOpen) scrollToBottom('smooth') }, [chatMessages.length, chatOpen, scrollToBottom])

  // Changement de room : on repart à zéro
  useEffect(() => {
    setChatMessages([])
    setChatTypingUsers([])
  }, [currentRoomId])

  // Signal "en train d'écrire"
  useEffect(() => {
    if (!pageVisible || !chatEnabled || !chatOpen || !chatInput.trim() || !currentRoomId) return
    const roomId = currentRoomId
    api('POST', '/auth/chat/typing', { roomId, isTyping: true }).catch(() => { })
    const timer = setTimeout(() => {
      api('POST', '/auth/chat/typing', { roomId, isTyping: false }).catch(() => { })
    }, 1500)
    return () => clearTimeout(timer)
  }, [chatInput, pageVisible, chatEnabled, chatOpen, currentRoomId])

  const setChatPreference = useCallback(enabled => {
    if (!currentUser?.id) return
    saveChatPref(currentUser.id, enabled ? 'enabled' : 'disabled')
    setChatEnabled(enabled)
    setChatPromptVisible(false)
    setChatOpen(enabled)
    if (!enabled) {
      setChatMessages([])
      setChatTypingUsers([])
      setChatOpen(false)
    }
  }, [currentUser])

  const sendChatMessage = useCallback(async () => {
    const message = chatInput.trim()
    if (!message) return
    try {
      await api('POST', '/auth/chat', { roomId: currentRoomId, message })
      await api('POST', '/auth/chat/typing', { roomId: currentRoomId, isTyping: false })
      setChatInput('')
      loadChat()
      scrollToBottom('smooth')
    } catch (e) {
      onError?.('Erreur chat: ' + e.message)
    }
  }, [chatInput, currentRoomId, loadChat, scrollToBottom, onError])

  const resetChat = useCallback(() => {
    setChatOpen(false)
    setChatEnabled(false)
    setChatMessages([])
    setChatTypingUsers([])
  }, [])

  return {
    chatEnabled, chatPromptVisible, chatOpen, setChatOpen,
    chatMessages, chatInput, setChatInput, chatTypingUsers,
    chatMessagesRef, setChatPreference, sendChatMessage, resetChat,
  }
}
