import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../api/client"
import StatCard from "../components/StatCard"
import DonationCard from "../components/DonationCard"
import EmptyState from "../components/EmptyState"
import Button from "../components/Button"
import { ShieldCheck, Map, Users, HeartHandshake, ArrowRight } from 'lucide-react'

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
        <p className="eyebrow">ServeSense Platform</p>
        <h1>Coordinating Compassion, Intelligently.</h1>
        <p className="hero-subtitle">
          ServeSense intelligently connects volunteers, NGOs and donors with communities that need help — using real-time matching, local intelligence and predictive analytics.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          <Link to="/donations">
            <Button variant="primary" style={{ padding: '12px 24px', fontSize: '1.1rem' }}>
              Explore Platform <ArrowRight size={18} />
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            disabled={busy} 
            onClick={async () => {
              setBusy(true)
              try {
                await onSeed()
                await load()
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? "Loading demo…" : "Load demo data"}
          </Button>
        </div>
        {error && <div className="message error mt-4">{error}</div>}
      </section>

      <section className="mb-8">
        <div className="text-center mb-8">
          <h2>How ServeSense Works</h2>
          <p className="text-muted">An integrated ecosystem for disaster relief and NGO coordination.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card text-center items-center">
            <div className="w-12 h-12 rounded-full bg-pastel-blue text-vivid-blue flex items-center justify-center mb-4">
              <Users size={24} />
            </div>
            <h3 className="font-bold mb-2">1. Volunteers</h3>
            <p className="text-sm text-muted">Sign up, list skills, and set availability for intelligent matching.</p>
          </div>
          <div className="card text-center items-center">
            <div className="w-12 h-12 rounded-full bg-pastel-blue text-vivid-blue flex items-center justify-center mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="font-bold mb-2">2. NGOs</h3>
            <p className="text-sm text-muted">Post relief tasks and track assignments via command center.</p>
          </div>
          <div className="card text-center items-center">
            <div className="w-12 h-12 rounded-full bg-pastel-blue text-vivid-blue flex items-center justify-center mb-4">
              <Map size={24} />
            </div>
            <h3 className="font-bold mb-2">3. Communities</h3>
            <p className="text-sm text-muted">Local intelligence maps real-time needs and vulnerability.</p>
          </div>
          <div className="card text-center items-center">
            <div className="w-12 h-12 rounded-full bg-pastel-blue text-vivid-blue flex items-center justify-center mb-4">
              <HeartHandshake size={24} />
            </div>
            <h3 className="font-bold mb-2">4. Impact</h3>
            <p className="text-sm text-muted">Donors fund critical campaigns with trackable outcomes.</p>
          </div>
        </div>
      </section>

      {stats && (
        <section className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Volunteers" value={stats.volunteers} />
            <StatCard label="Organizations" value={stats.organizations} />
            <StatCard label="Open tasks" value={stats.open_tasks} />
            <StatCard label="Assignments" value={stats.assignments} />
            <StatCard label="Beneficiaries" value={stats.beneficiaries_served} />
          </div>
        </section>
      )}

      <section className="mb-12">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2>Active Relief Campaigns</h2>
            <p className="text-muted">Support verified organizations making a difference on the ground.</p>
          </div>
          <Link to="/donations">
            <Button variant="ghost">View all</Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.length === 0 && (
            <div className="col-span-full">
              <EmptyState title="No campaigns yet" text="Load demo data to see verified relief funds." />
            </div>
          )}
          {campaigns.slice(0, 3).map((c) => <DonationCard key={c.id} campaign={c} />)}
        </div>
      </section>
    </div>
  )
}
