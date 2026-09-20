import { formatTimeRange } from "../api/client"

export default function TaskCard({ task, actions, match, distanceKm, reasons }) {
  const urgency = task.urgency_level || task.urgency
  return (
    <article className="card task-card">
      <div className="card-top">
        <div>
          <h3>{task.title}</h3>
          <p className="muted">{task.organization || task.organization_name}{task.location ? ` · ${task.location}` : ""}</p>
        </div>
        {match != null && <div className="match-badge">{match}% Match</div>}
      </div>
      <div className="chip-row">
        {task.category && <span className="chip">{task.category}</span>}
        {urgency != null && <span className={`chip ${urgency >= 4 ? "warn" : ""}`}>Urgency {urgency}/5</span>}
        {task.estimated_beneficiaries != null && <span className="chip">{task.estimated_beneficiaries} beneficiaries</span>}
        {distanceKm != null && <span className="chip teal">{distanceKm} km away</span>}
      </div>
      <p className="muted">{formatTimeRange(task.start_time, task.end_time)}</p>
      {reasons?.length > 0 && (
        <ul className="reason-list">
          {reasons.map((r, i) => <li key={i}>✓ {r}</li>)}
        </ul>
      )}
      {actions && <div className="actions">{actions}</div>}
    </article>
  )
}
