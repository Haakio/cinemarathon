import { useEffect, useRef, useState } from 'react'

/**
 * Compteur animé : la valeur "monte" en douceur vers sa cible.
 * Utilisé pour les chiffres de progression du dashboard.
 * @param {{value: number, duration?: number, format?: (n: number) => string}} props
 */
export default function AnimatedNumber({ value, duration = 900, format }) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const from = fromRef.current
    const to = Number(value) || 0
    const start = performance.now()

    function tick(now) {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      const current = from + (to - from) * eased
      setDisplay(current)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = to
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  const rounded = Math.round(display)
  return <>{format ? format(rounded) : rounded}</>
}
