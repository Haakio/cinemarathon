import { useEffect, useRef, useState } from 'react'

/**
 * Détection d'inactivité : true si aucune interaction (souris, clavier,
 * scroll, toucher) depuis `timeoutMs`. Combiné à la visibilité de l'onglet,
 * ça suspend tous les pollings quand l'utilisateur laisse le site ouvert
 * sans s'en servir — et tout repart au premier mouvement.
 *
 * Implémentation à coût nul : les événements n'écrivent que dans une ref
 * (aucun re-render), une vérification toutes les 5 s bascule l'état.
 */
export function useIdle(timeoutMs = 60000) {
  const [idle, setIdle] = useState(false)
  const lastActivityRef = useRef(Date.now())
  const idleRef = useRef(false)

  useEffect(() => {
    const onActivity = () => {
      lastActivityRef.current = Date.now()
      if (idleRef.current) {
        idleRef.current = false
        setIdle(false) // réveil immédiat
      }
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'wheel', 'scroll', 'touchstart']
    events.forEach(name => window.addEventListener(name, onActivity, { passive: true }))

    const timer = setInterval(() => {
      if (!idleRef.current && Date.now() - lastActivityRef.current >= timeoutMs) {
        idleRef.current = true
        setIdle(true)
      }
    }, 5000)

    return () => {
      events.forEach(name => window.removeEventListener(name, onActivity))
      clearInterval(timer)
    }
  }, [timeoutMs])

  return idle
}
