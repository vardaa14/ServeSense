import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api } from "../api/client"
import NotificationPanel from "./NotificationPanel"

export default function Navbar({ session, identities, onSwitch, onMenu }) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState({ items: [], unread_count: 0 })
  const navigate = useNavigate()

  async function loadNotes() {
    if (!session?.user_id) return
    try {
      const data = await api(`/notifications/${session.user_id}`)
      setNotes(data)
    } catch {
      setNotes({ items: [], unread_count: 0 })
    }
  }

  useEffect(() => { loadNotes() }, [session?.user_id])

  async function mark(n) {
    await api(`/notifications/${n.id}/read`, { method: "PATCH", body: "{}" })
    loadNotes()
  }

  async function markAll() {
    await api("/notifications/mark-all-read", {
      method: "POST",
      body: JSON.stringify({ user_id: session.user_id }),
    })
    loadNotes()
  }

  return (
    <header className="navbar">
      <div className="nav-left">
        <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open menu">☰</button>
        <Link to="/" className="brand">ServeSense</Link>
      </div>
      <div className="nav-right">
        <select
          value={session?.user_id || ""}
          onChange={(e) => {
            const next = identities.find((i) => i.user_id === e.target.value)
            onSwitch(next || null)
            if (!next) navigate("/")
            else if (next.role === "volunteer") navigate("/volunteer/dashboard")
            else if (next.role === "coordinator" || next.role === "admin") navigate("/ngo/dashboard")
            else navigate("/donations")
          }}
        >
          <option value="">Public / donor</option>
          {identities.map((i) => (
            <option key={i.user_id} value={i.user_id}>
              {i.name} ({i.role})
            </option>
          ))}
        </select>
        {session?.user_id && (
          <div className="bell-wrap">
            <button className="icon-btn" onClick={() => setOpen((v) => !v)} aria-label="Notifications">
              🔔 {notes.unread_count > 0 && <b>{notes.unread_count}</b>}
            </button>
            {open && (
              <div className="bell-drop">
                <NotificationPanel items={notes.items.slice(0, 6)} onRead={mark} onReadAll={markAll} compact />
                <button className="button ghost" onClick={() => { setOpen(false); navigate("/notifications") }}>
                  View all
                </button>
              </div>
            )}
          </div>
        )}
        {session?.name && <span className="who">{session.name}</span>}
      </div>
    </header>
  )
}
