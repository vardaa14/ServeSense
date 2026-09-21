import React, { useEffect, useState } from "react"
import { api } from "../api/client"
import DonationCard from "../components/DonationCard"
import EmptyState from "../components/EmptyState"
import { Heart, Search } from 'lucide-react'
import Skeleton from "../components/Skeleton"

export default function Donations() {
  const [campaigns, setCampaigns] = useState([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api("/donation-campaigns")
      .then(setCampaigns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <section className="hero mb-8" style={{ padding: '48px 24px', backgroundImage: 'linear-gradient(135deg, var(--pastel-blue-light) 0%, var(--card-bg) 100%)' }}>
        <Heart size={48} className="text-vivid-blue mb-4" />
        <h1 className="mb-2">Make a Direct Impact</h1>
        <p className="hero-subtitle">Support verified organizations and active relief campaigns. Every contribution is tracked transparently.</p>
      </section>

      {error && <div className="message error mb-6">{error}</div>}
      
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading && [1, 2, 3].map(i => <Skeleton key={i} className="h-80 w-full" />)}
          {!loading && campaigns.length === 0 && (
            <div className="col-span-full">
               <EmptyState title="No public campaigns" text="Currently there are no active public donation campaigns." icon={Search} />
            </div>
          )}
          {!loading && campaigns.map((c) => <DonationCard key={c.id} campaign={c} />)}
        </div>
      </section>
    </div>
  )
}
