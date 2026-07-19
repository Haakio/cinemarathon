// Catch-all optionnel : absorbe les liens partageables /{roomSlug}/{view}.
// Next.js priorise toujours les routes littérales (/, /cgu, /ordre-marvel...)
// sur ce catch-all, donc rien d'autre n'est affecté. Même composant que "/".
export { default } from './index'
