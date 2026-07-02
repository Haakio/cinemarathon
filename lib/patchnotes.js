/**
 * Historique des patchnotes.
 * Alimente le centre de notifications (onglet Notifications du profil) :
 * chaque entrée non lue incrémente la pastille rouge. Ajoutez simplement
 * une nouvelle entrée EN PREMIER dans le tableau à chaque mise à jour.
 */
export const patchnoteHistory = [
  {
    version: '2026-07-02-votes',
    date: '2026-07-02',
    title: 'Votes de séance',
    intro: 'À vous de choisir le prochain film — démocratiquement (ou presque).',
    items: [
      "L'admin lance un vote entre 2 à 5 films avec une heure de fin.",
      'Votez en un clic depuis la vue d\'ensemble, résultats en direct.',
      'Clôture automatique à l\'échéance, le gagnant devient le prochain film.',
      'En cas d\'égalité parfaite... Jimmy tranche. 🚪',
    ],
  },
  {
    version: '2026-07-02-social',
    date: '2026-07-02',
    title: 'Profils, amis et discussions',
    intro: 'Cinémarathon devient social.',
    items: [
      'Profil personnalisable : avatar en image ou GIF animé (ou emoji + couleur) et badges.',
      'Système d\'amis : recherche, demandes, acceptation.',
      'Centre de notifications avec pastille — fini les popups.',
      'Nouvelle page Discussions : débattez de chaque film, façon forum.',
    ],
  },
  {
    version: '2026-07-02-refonte-dashboard',
    date: '2026-07-02',
    title: 'Nouvelle expérience Cinémarathon',
    intro: 'Le site fait peau neuve : nouveau dashboard, nouvelles pages, et des fiches films enrichies.',
    items: [
      "Vue d'ensemble : progression animée, objectif du marathon, prochain film, activité en direct et membres.",
      'Recherche globale dans le header pour retrouver un titre instantanément.',
      'Fiches films complètes : synopsis, casting, genres et notes des membres.',
      'Ajout de titres via la recherche TMDB : tout se remplit automatiquement.',
      'Nouvelles pages Statistiques et Classement (XP + badges).',
      'Le calendrier des dispos devient plus lisible pour planifier les soirées.',
    ],
  },
  {
    version: '2026-05-06-private-rooms',
    date: '2026-05-06',
    title: 'Salles privées',
    intro: 'Les marathons peuvent maintenant être séparés proprement par groupe.',
    items: [
      'Création de salles privées avec un code d\'accès.',
      'Rejoindre une salle existante avec son nom et son code.',
      'Suppression possible uniquement par la personne qui a créé la salle.',
    ],
  },
]

/** Dernière version (compatibilité avec l'existant). */
export const patchnotes = patchnoteHistory[0]
