import { useEffect, useState } from "react"
import { api } from "../api/client"
import NotificationPanel from "../components/NotificationPanel"
import EmptyState from "../components/EmptyState"

export default function Notifications({ session }) {
  const [data, setData] = useState({ items: [], unread_count: 0 })
  const [error, setError] = useState("")

  async function load() {
    if (!session?.user_id) return
    try {
      setData(await api(`/notifications/${session.user_id}`))
      setError("")
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [session?.user_id])

  if (!session?.user_id) {
    return <EmptyState title="Sign in with a demo role" text="Notifications are tied to volunteer and coordinator identities." />
  }

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>{data.unread_count} unread</p>
        </div>
      </section>
      {error && <div className="message error">{error}</div>}
      <article className="card">
        <NotificationPanel
          items={data.items}
          onRead={async (n) => {
            await api(`/notifications/${n.id}/read`, { method: "PATCH", body: "{}" })
            load()
          }}
          onReadAll={async () => {
            await api("/notifications/mark-all-read", {
              method: "POST",
              body: JSON.stringify({ user_id: session.user_id }),
            })
            load()
          }}
        />
      </article>
    </div>
  )
}
