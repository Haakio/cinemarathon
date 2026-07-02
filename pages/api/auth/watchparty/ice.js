/**
 * FONCTIONNALITÉ SUPPRIMÉE — Watch Party (zone secrète) retirée du site.
 * Ce fichier (et le dossier watchparty/) peut être supprimé.
 */
export default function handler(req, res) {
  return res.status(410).json({ error: 'Fonctionnalité retirée' })
}
