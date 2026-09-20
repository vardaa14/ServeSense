import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../api/client"
import StatCard from "../components/StatCard"
import DonationCard from "../components/DonationCard"
import EmptyState from "../components/EmptyState"

export default function LandingPage({ onSeed }) {
  const [stats, setStats] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const [d, c] = await Promise.all([api("/dashboard"), api("/donation-campaigns")])
      setStats(d)
      setCampaigns(c)
      setError("")
    } catch {
      setError("Start the FastAPI backend first.")
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="page">
      <section className="hero">
        <p className="eyebrow">Volunteer-to-need coordination</p>
        <h1>Match people to needs when it matters.</h1>
        <p>
          ServeSense helps volunteers, NGOs and donors coordinate relief work with explainable matching,
          local intelligence and accountable impact.
        </p>
        <div className="actions">
          <Link className="button" to="/donations">Browse campaigns</Link>
          <Link className="button ghost" to="/intelligence">View local needs</Link>
          <button disabled={busy} onClick={async () => {
            setBusy(true)
            try {
              await onSeed()
              await load()
            } finally {
              setBusy(false)
            }
          }}>{busy ? "Loading demo…" : "Load demo data"}</button>
        </div>
        {error && <div className="message error">{error}</div>}
      </section>

      {stats && (
        <section className="stats">
          <StatCard label="Volunteers" value={stats.volunteers} />
          <StatCard label="Organizations" value={stats.organizations} />
          <StatCard label="Open tasks" value={stats.open_tasks} />
          <StatCard label="Assignments" value={stats.assignments} />
          <StatCard label="Beneficiaries served" value={stats.beneficiaries_served} />
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>Active relief campaigns</h2>
          <Link to="/donations">View all</Link>
        </div>
        <div className="card-grid">
          {campaigns.length === 0 && <EmptyState title="No campaigns yet" text="Load demo data to see verified relief funds." />}
          {campaigns.slice(0, 3).map((c) => <DonationCard key={c.id} campaign={c} />)}
        </div>
      </section>
    </div>
  )
}
