import React from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { LayoutDashboard, HeartHandshake, Map, Bell, Home, LayoutGrid } from 'lucide-react'

export default function Sidebar({ role, open, onClose }) {
  const navigate = useNavigate()
  
  const volunteer = [
    { to: "/volunteer/dashboard", label: "Volunteer Dashboard", icon: LayoutDashboard },
    { to: "/donations", label: "Donations & Relief", icon: HeartHandshake },
    { to: "/intelligence", label: "Local Intelligence", icon: Map },
    { to: "/notifications", label: "Notifications", icon: Bell },
  ]
  const coordinator = [
    { to: "/ngo/dashboard", label: "NGO Command Center", icon: LayoutGrid },
    { to: "/donations", label: "Donations & Relief", icon: HeartHandshake },
    { to: "/intelligence", label: "Local Intelligence", icon: Map },
    { to: "/notifications", label: "Notifications", icon: Bell },
  ]
  const donor = [
    { to: "/", label: "Home", icon: Home },
    { to: "/donations", label: "Donate", icon: HeartHandshake },
    { to: "/intelligence", label: "Local Intelligence", icon: Map },
  ]
  
  const links = role === "volunteer" ? volunteer : role === "coordinator" || role === "admin" ? coordinator : donor

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <p className="sidebar-kicker">Menu</p>
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink 
          key={to} 
          to={to} 
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
      <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
        <button className="sidebar-link" onClick={() => { onClose?.(); navigate("/") }}>
          <Home size={20} />
          Public Home
        </button>
      </div>
    </aside>
  )
}
