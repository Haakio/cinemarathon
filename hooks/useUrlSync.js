import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { VIEWS } from '../utils/constants'

const VALID_VIEWS = new Set(Object.values(VIEWS))

function buildPath(roomSlug, view) {
  if (!roomSlug) return '/'
  return view && view !== VIEWS.OVERVIEW ? `/${roomSlug}/${view}` : `/${roomSlug}`
}

/**
 * Synchronise l'URL avec la room + vue courantes : liens partageables, F5 qui
 * revient exactement là où on était, et bouton précédent/suivant du navigateur
 * qui rejoue bien les vues internes.
 *
 * L'URL est TOUJOURS dérivée de l'état (source de vérité) ; on ne la LIT qu'au
 * chargement (deep-link) et sur précédent/suivant, jamais en continu.
 *
 * `push` vs `replace` : une navigation VOULUE par l'utilisateur (clic dans la
 * sidebar, changement de room) fait un `push` — sans quoi le bouton retour
 * saute par-dessus toute la navigation interne et renvoie à la dernière page
 * réellement visitée. En revanche, une simple CORRECTION d'URL (normalisation
 * de "/" vers la room restaurée, slug de vue inconnu, vue indisponible dans
 * cette room) se fait en `replace` : sinon le retour retomberait sur l'URL
 * fautive, qui se corrigerait à nouveau — et l'utilisateur serait piégé.
 */
export function useUrlSync({ authed, rooms, roomsLoaded, currentRoom, view, onSelectRoom, setView, isViewAllowed }) {
  const router = useRouter()
  // État (pas une ref) : doit se mettre à jour dans le MÊME commit que
  // setView/onSelectRoom ci-dessous (React 18 batche les deux), sinon
  // l'effet d'écriture d'URL repartirait avec l'ancienne valeur de `view`
  // pendant un rendu transitoire et écraserait le deep-link.
  const [initialApplied, setInitialApplied] = useState(false)
  // La toute première écriture normalise l'URL d'arrivée : jamais d'entrée
  // d'historique pour ça. Repasse à true dès qu'on corrige une URL invalide.
  const replaceNextRef = useRef(true)

  // URL → état (deep-link au chargement + navigation précédent/suivant)
  useEffect(() => {
    if (!authed || !router.isReady) return

    const segments = Array.isArray(router.query.params) ? router.query.params : []
    const [roomSlug, viewSlug] = segments

    if (!roomSlug) {
      // "/" nu : useMarathon a déjà restauré la room via localStorage, on
      // laisse l'effet d'écriture poser l'URL correspondante (en replace).
      replaceNextRef.current = true
      setInitialApplied(true)
      return
    }

    // On attend les rooms pour résoudre le slug — mais UNIQUEMENT tant que le
    // premier chargement est en cours. S'il a échoué (jeton expiré, réseau),
    // on continue quand même : sinon l'écran de chargement resterait affiché
    // pour toujours et le site serait inaccessible.
    if (!rooms.length && !roomsLoaded) return

    const room = rooms.find(r => r.slug === roomSlug || r.id === roomSlug)
    if (room && room.id !== currentRoom.id) onSelectRoom(room.id)

    // Vue inconnue, ou indisponible dans cette room (ex: calendrier retiré des
    // rooms publiques) : on retombe sur la vue d'ensemble, et cette correction
    // ne doit pas créer d'entrée d'historique.
    const targetRoom = room || currentRoom
    let targetView = VALID_VIEWS.has(viewSlug) ? viewSlug : VIEWS.OVERVIEW
    if (targetView !== VIEWS.OVERVIEW && isViewAllowed && !isViewAllowed(targetView, targetRoom)) {
      targetView = VIEWS.OVERVIEW
    }
    if (targetView !== viewSlug && !(targetView === VIEWS.OVERVIEW && !viewSlug)) {
      replaceNextRef.current = true
    }

    if (targetView !== view) setView(targetView)

    setInitialApplied(true)
  }, [authed, router.isReady, router.asPath, rooms, roomsLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // État → URL (une fois le deep-link initial appliqué)
  useEffect(() => {
    if (!authed || !initialApplied) return
    const path = buildPath(currentRoom.slug || currentRoom.id, view)
    if (path === router.asPath) {
      replaceNextRef.current = false // URL déjà juste : la prochaine écriture sera une vraie navigation
      return
    }
    const navigate = replaceNextRef.current ? router.replace : router.push
    replaceNextRef.current = false
    navigate.call(router, path, undefined, { shallow: true })
  }, [authed, initialApplied, currentRoom.id, currentRoom.slug, view]) // eslint-disable-line react-hooks/exhaustive-deps

  // Exposé pour que la page retienne l'écran de chargement tant que le
  // deep-link n'est pas résolu — évite un flash "Vue d'ensemble" avant de
  // basculer sur la vraie vue demandée par l'URL (ex: Calendrier).
  return { ready: initialApplied }
}
