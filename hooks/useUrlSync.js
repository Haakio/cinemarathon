import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { VIEWS } from '../utils/constants'

const VALID_VIEWS = new Set(Object.values(VIEWS))

function buildPath(roomSlug, view) {
  if (!roomSlug) return '/'
  return view && view !== VIEWS.OVERVIEW ? `/${roomSlug}/${view}` : `/${roomSlug}`
}

/**
 * Synchronise l'URL avec la room + vue courantes : liens partageables, et un
 * F5 revient exactement là où on était (au lieu de retomber sur la Vue
 * d'ensemble). L'URL est TOUJOURS dérivée de l'état (source de vérité) — on
 * ne la LIT qu'au chargement initial (deep-link) et à la navigation
 * précédent/suivant du navigateur, jamais en continu.
 *
 * Volontairement `router.replace` (pas `push`) : évite d'empiler une entrée
 * d'historique à chaque clic dans la sidebar — précédent/suivant ne "rejoue"
 * donc pas les vues internes, mais le lien partageable et la persistance au
 * F5 (ce qui a été demandé) fonctionnent.
 */
export function useUrlSync({ authed, rooms, currentRoom, view, onSelectRoom, setView }) {
  const router = useRouter()
  // État (pas une ref) : doit se mettre à jour dans le MÊME commit que
  // setView/onSelectRoom ci-dessous (React 18 batche les deux), sinon
  // l'effet d'écriture d'URL repartirait avec l'ancienne valeur de `view`
  // pendant un rendu transitoire et écraserait le deep-link avant qu'il
  // n'ait eu le temps de s'appliquer.
  const [initialApplied, setInitialApplied] = useState(false)
  const lastPushedRef = useRef(null)

  // URL → état (deep-link au chargement + navigation précédent/suivant)
  useEffect(() => {
    if (!authed || !router.isReady) return
    if (router.asPath === lastPushedRef.current) return // c'est nous-mêmes qui venons de pousser cette URL

    const segments = Array.isArray(router.query.params) ? router.query.params : []
    const [roomSlug, viewSlug] = segments

    if (!roomSlug) {
      // "/" nu : on ne touche à rien, useMarathon restaure déjà la room via localStorage
      setInitialApplied(true)
      return
    }

    if (!rooms.length) return // attend le chargement des rooms pour résoudre le slug

    const room = rooms.find(r => r.slug === roomSlug || r.id === roomSlug)
    if (room && room.id !== currentRoom.id) onSelectRoom(room.id)

    const targetView = VALID_VIEWS.has(viewSlug) ? viewSlug : VIEWS.OVERVIEW
    if (targetView !== view) setView(targetView)

    setInitialApplied(true)
  }, [authed, router.isReady, router.asPath, rooms]) // eslint-disable-line react-hooks/exhaustive-deps

  // État → URL (une fois le deep-link initial appliqué)
  useEffect(() => {
    if (!authed || !initialApplied) return
    const path = buildPath(currentRoom.slug || currentRoom.id, view)
    if (path === router.asPath) return
    lastPushedRef.current = path
    router.replace(path, undefined, { shallow: true })
  }, [authed, initialApplied, currentRoom.id, currentRoom.slug, view]) // eslint-disable-line react-hooks/exhaustive-deps

  // Exposé pour que la page retienne l'écran de chargement tant que le
  // deep-link n'est pas résolu — évite un flash "Vue d'ensemble" avant de
  // basculer sur la vraie vue demandée par l'URL (ex: Calendrier).
  return { ready: initialApplied }
}
