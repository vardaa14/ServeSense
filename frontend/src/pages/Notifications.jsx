import React, { useEffect, useState } from "react"
import { api } from "../api/client"
import NotificationPanel from "../components/NotificationPanel"
import EmptyState from "../components/EmptyState"
import { Bell } from 'lucide-react'

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
    return <EmptyState title="Authentication Required" text="Notifications are tied to volunteer and coordinator identities." icon={Bell} />
  }

  return (
    <div className="page max-w-4xl mx-auto">
      <section className="flex justify-between items-end flex-wrap gap-4 mb-2">
        <div>
          <h1>Notifications</h1>
          <p className="text-muted">{data.unread_count} unread message{data.unread_count !== 1 ? 's' : ''}</p>
        </div>
      </section>
      
      {error && <div className="message error mb-4">{error}</div>}
      
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
        compact={false}
      />
    </div>
  )
}
