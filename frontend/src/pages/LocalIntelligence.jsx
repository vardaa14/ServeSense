import { useEffect, useState } from "react"
import { api } from "../api/client"
import MapView from "../components/MapView"
import StatCard from "../components/StatCard"
import EmptyState from "../components/EmptyState"

export default function LocalIntelligence() {
  const [communities, setCommunities] = useState([])
  const [gaps, setGaps] = useState([])
  const [map, setMap] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.all([
      api("/intelligence/communities"),
      api("/intelligence/gaps"),
      api("/intelligence/map"),
    ]).then(([c, g, m]) => {
      setCommunities(c)
      setGaps(g)
      setMap(m)
    }).catch((e) => setError(e.message))
  }, [])

  const points = []
  map?.communities?.forEach((c) => points.push({ id: `c-${c.id}`, lat: c.lat, lng: c.lng, label: c.name, kind: c.need_level === "high" ? "need" : "community" }))
  map?.tasks?.forEach((t) => points.push({ id: `t-${t.id}`, lat: t.lat, lng: t.lng, label: t.title, kind: t.kind === "urgent_task" ? "urgent" : "task" }))
  map?.volunteers?.forEach((v) => points.push({ id: `v-${v.id}`, lat: v.lat, lng: v.lng, label: "Volunteer", kind: "resource" }))
  map?.organizations?.forEach((o) => points.push({ id: `o-${o.id}`, lat: o.lat, lng: o.lng, label: o.name, kind: o.kind === "relief_center" ? "center" : "org" }))

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>Local intelligence</h1>
          <p>Where help is needed, how urgent it is, and where volunteer capacity exists.</p>
        </div>
      </section>
      {error && <div className="message error">{error}</div>}
      <MapView points={points} />
      <div className="legend">
        <span className="pin-key need">Need / community</span>
        <span className="pin-key urgent">Urgent task</span>
        <span className="pin-key resource">Volunteer</span>
        <span className="pin-key center">Relief center</span>
      </div>
      <div className="card-grid">
        {communities.length === 0 && <EmptyState title="No community intelligence yet" />}
        {communities.map((c) => (
          <article className="card" key={c.id}>
            <h3>{c.name}</h3>
            <p className="muted">{c.city} · Need score {Math.round(c.need_score * 100)}% ({c.need_level})</p>
            <label>Vulnerability</label>
            <div className="progress"><div style={{ width: `${c.vulnerability_score * 100}%` }} /></div>
            <label>Service gap</label>
            <div className="progress"><div style={{ width: `${c.service_gap_score * 100}%` }} /></div>
            <div className="stats mini">
              <StatCard label="Population" value={c.population_estimate?.toLocaleString?.() || "—"} />
              <StatCard label="Open needs" value={c.open_tasks} />
              <StatCard label="Unfilled positions" value={c.unfilled_positions} />
              <StatCard label="Urgent tasks" value={c.urgent_tasks} />
            </div>
            <h4>{c.need_level === "high" ? "High need area" : "Need reasons"}</h4>
            <ul className="reason-list">{c.reasons.map((r) => <li key={r}>✓ {r}</li>)}</ul>
          </article>
        ))}
      </div>
      <h2>Volunteer-to-need gaps</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Task</th><th>Community</th><th>Required</th><th>Assigned</th><th>Gap</th></tr></thead>
          <tbody>
            {gaps.map((g) => (
              <tr key={g.task_id}>
                <td>{g.title}</td>
                <td>{g.community}</td>
                <td>{g.required}</td>
                <td>{g.assigned}</td>
                <td>{g.gap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
