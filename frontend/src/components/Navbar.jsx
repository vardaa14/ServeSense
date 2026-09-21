import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api } from "../api/client"
import NotificationPanel from "./NotificationPanel"
import { Menu, Bell, Shield, HeartHandshake, User, Users } from 'lucide-react'
import Button from "./Button"
import Badge from "./Badge"

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
        <button className="menu-btn" onClick={onMenu} aria-label="Open menu">
          <Menu size={24} />
        </button>
        <Link to="/" className="brand">
          <HeartHandshake color="var(--vivid-blue)" size={28} />
          ServeSense
        </Link>
      </div>
      <div className="nav-right">
        <div style={{ position: 'relative' }}>
          <select
            style={{ paddingRight: '36px', appearance: 'none', background: 'var(--bg-main)', cursor: 'pointer' }}
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
          <div style={{ position: 'absolute', right: '12px', top: '16px', pointerEvents: 'none' }}>
            {session?.role === 'admin' ? <Shield size={16} className="text-muted"/> : <User size={16} className="text-muted" />}
          </div>
        </div>

        {session?.user_id && (
          <div style={{ position: 'relative' }}>
            <Button variant="ghost" className="icon-only" onClick={() => setOpen((v) => !v)} aria-label="Notifications" style={{ position: 'relative' }}>
              <Bell size={20} />
              {notes.unread_count > 0 && (
                <span style={{ position: 'absolute', top: '2px', right: '4px', background: 'var(--error)', color: 'white', fontSize: '10px', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {notes.unread_count}
                </span>
              )}
            </Button>
            {open && (
              <div className="notification-panel open">
                <NotificationPanel items={notes.items.slice(0, 6)} onRead={mark} onReadAll={markAll} compact />
                <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
                  <Button variant="ghost" className="w-full" onClick={() => { setOpen(false); navigate("/notifications") }}>
                    View all notifications
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
