/** Toast global (inchangé fonctionnellement, extrait du monolithe). */
export default function Toast({ message, visible }) {
  return <div className={`toast ${visible ? 'show' : ''}`}>{message}</div>
}
