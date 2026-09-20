import { useEffect, useState } from "react"
import { api } from "../api/client"
import DonationCard from "../components/DonationCard"
import EmptyState from "../components/EmptyState"

export default function Donations() {
  const [campaigns, setCampaigns] = useState([])
  const [error, setError] = useState("")

  useEffect(() => {
    api("/donation-campaigns")
      .then(setCampaigns)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>Donation portal</h1>
          <p>Support verified organizations and active relief campaigns. No card numbers are stored.</p>
        </div>
      </section>
      {error && <div className="message error">{error}</div>}
      <div className="card-grid">
        {campaigns.length === 0 && <EmptyState title="No public campaigns" text="Load demo data from the home page." />}
        {campaigns.map((c) => <DonationCard key={c.id} campaign={c} />)}
      </div>
    </div>
  )
}
