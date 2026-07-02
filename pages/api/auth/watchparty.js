/**
 * FONCTIONNALITÉ SUPPRIMÉE — Watch Party (zone secrète) retirée du site.
 * Ce fichier peut être supprimé, il ne répond plus que 410 Gone.
 * (Historique complet disponible dans git si besoin de la restaurer.)
 */
export default function handler(req, res) {
  return res.status(410).json({ error: 'Fonctionnalité retirée' })
}
