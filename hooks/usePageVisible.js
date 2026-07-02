import { useEffect, useState } from 'react'

/**
 * Vrai quand l'onglet est visible. Sert à suspendre tous les pollings
 * quand l'utilisateur n'est pas sur la page (économie Neon).
 */
export function usePageVisible() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible')
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  return visible
}
