import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api } from "../api/client"
import DonationCard from "../components/DonationCard"
import EmptyState from "../components/EmptyState"

export default function OrganizationPublic() {
  const { id } = useParams()
  const [org, setOrg] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.all([api(`/ngo/${id}`), api("/donation-campaigns")])
      .then(([o, all]) => {
        setOrg(o)
        setCampaigns(all.filter((c) => c.organization_id === id))
      })
      .catch((e) => setError(e.message))
  }, [id])

  if (error) return <div className="message error">{error}</div>
  if (!org) return <p className="muted">Loading organization…</p>

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>{org.name}</h1>
          <p>{org.verified ? "Verified organization" : "Organization"} · {org.address}</p>
        </div>
      </section>
      <p>{org.description}</p>
      <h2>Campaigns</h2>
      <div className="card-grid">
        {campaigns.length === 0 && <EmptyState title="No public campaigns" />}
        {campaigns.map((c) => <DonationCard key={c.id} campaign={c} />)}
      </div>
      <h2>Open public needs</h2>
      <ul>
        {org.active_tasks.map((t) => <li key={t.id}>{t.title} · {t.category} · urgency {t.urgency_level}/5</li>)}
      </ul>
      <p><Link to="/donations">Back to donations</Link></p>
    </div>
  )
}
