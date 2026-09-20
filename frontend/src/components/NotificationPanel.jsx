import { relativeTime } from "../api/client"

export default function NotificationPanel({ items, onRead, onReadAll, compact }) {
  return (
    <div className={`notification-panel ${compact ? "compact" : ""}`}>
      <div className="card-top">
        <h3>Notifications</h3>
        {onReadAll && <button className="button ghost" onClick={onReadAll}>Mark all as read</button>}
      </div>
      {(!items || items.length === 0) && <p className="muted">No notifications yet.</p>}
      <ul className="notice-list">
        {items?.map((n) => (
          <li key={n.id} className={n.read_at ? "read" : "unread"} onClick={() => onRead && onRead(n)}>
            <strong>{n.payload?.title || n.template_key}</strong>
            <p>{n.payload?.body}</p>
            <em>{relativeTime(n.created_at)}</em>
          </li>
        ))}
      </ul>
    </div>
  )
}
