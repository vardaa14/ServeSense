export default function VolunteerCard({ volunteer, actions }) {
  const reliability = volunteer.reliability_score > 1
    ? volunteer.reliability_score
    : Math.round((volunteer.reliability_score || 0) * 100)
  return (
    <article className="card volunteer-card">
      <div className="card-top">
        <div>
          <h3>{volunteer.name || "Volunteer"}</h3>
          <p className="muted">
            Reliability {reliability}%
            {volunteer.background_check_status ? ` · ${volunteer.background_check_status}` : ""}
          </p>
        </div>
        {volunteer.score != null && <div className="match-badge">{Math.round(volunteer.score * 100)}% Match</div>}
      </div>
      {volunteer.skill_score != null && (
        <div className="metrics">
          <span>Skills {Math.round(volunteer.skill_score * 100)}%</span>
          <span>Availability {Math.round(volunteer.availability_score * 100)}%</span>
          <span>Distance {Math.round(volunteer.distance_score * 100)}%</span>
          <span>Reliability {Math.round(volunteer.reliability_score * 100)}%</span>
        </div>
      )}
      {volunteer.skills?.length > 0 && (
        <div className="chip-row">
          {volunteer.skills.map((s) => (
            <span className="chip" key={s.name}>{s.name}{s.level ? ` · L${s.level}` : ""}</span>
          ))}
        </div>
      )}
      {volunteer.reasons?.length > 0 && (
        <ul className="reason-list">
          {volunteer.reasons.map((r, i) => <li key={i}>✓ {r}</li>)}
        </ul>
      )}
      {actions && <div className="actions">{actions}</div>}
    </article>
  )
}
