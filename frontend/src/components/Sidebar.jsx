import { NavLink, useNavigate } from "react-router-dom"

export default function Sidebar({ role, open, onClose }) {
  const navigate = useNavigate()
  const volunteer = [
    ["/volunteer/dashboard", "Volunteer dashboard"],
    ["/donations", "Donations"],
    ["/intelligence", "Local intelligence"],
    ["/notifications", "Notifications"],
  ]
  const coordinator = [
    ["/ngo/dashboard", "NGO dashboard"],
    ["/donations", "Donations"],
    ["/intelligence", "Local intelligence"],
    ["/notifications", "Notifications"],
  ]
  const donor = [
    ["/", "Home"],
    ["/donations", "Donate"],
    ["/intelligence", "Local intelligence"],
  ]
  const links = role === "volunteer" ? volunteer : role === "coordinator" || role === "admin" ? coordinator : donor

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <p className="sidebar-kicker">Navigate</p>
      {links.map(([to, label]) => (
        <NavLink key={to} to={to} onClick={onClose}>{label}</NavLink>
      ))}
      <button className="button ghost" onClick={() => { onClose?.(); navigate("/") }}>Public home</button>
    </aside>
  )
}
