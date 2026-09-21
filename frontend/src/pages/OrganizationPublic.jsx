import React, { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api } from "../api/client"
import DonationCard from "../components/DonationCard"
import EmptyState from "../components/EmptyState"
import Badge from "../components/Badge"
import Skeleton from "../components/Skeleton"
import { ShieldCheck, MapPin, Building, Search, ArrowLeft } from 'lucide-react'

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
  if (!org) return <div className="page flex justify-center py-20"><Skeleton className="w-full h-96" /></div>

  return (
    <div className="page">
      <Link to="/donations" className="flex items-center gap-2 text-muted hover:text-vivid-blue mb-2 w-fit font-semibold text-sm">
        <ArrowLeft size={16} /> Back to donations
      </Link>
      
      <section className="card p-8 mb-8 text-center flex flex-col items-center">
        <div className="w-24 h-24 bg-pastel-blue rounded-full flex items-center justify-center mb-4 text-vivid-blue">
          <Building size={40} />
        </div>
        <h1 className="mb-2">{org.name}</h1>
        <div className="flex flex-wrap justify-center items-center gap-4 text-sm font-semibold text-muted mb-6">
          {org.verified && <div className="flex items-center gap-1 text-success"><ShieldCheck size={16} /> Verified Organization</div>}
          <div className="flex items-center gap-1"><MapPin size={16} /> {org.address}</div>
        </div>
        <p className="max-w-3xl text-lg text-text-main leading-relaxed">{org.description}</p>
      </section>

      <section className="mb-12">
        <h2 className="mb-6">Active Relief Campaigns</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.length === 0 && (
            <div className="col-span-full">
              <EmptyState title="No active campaigns" text="This organization currently has no public donation campaigns." icon={Search} />
            </div>
          )}
          {campaigns.map((c) => <DonationCard key={c.id} campaign={c} />)}
        </div>
      </section>

      <section>
        <h2 className="mb-6">Open Relief Tasks</h2>
        {org.active_tasks?.length === 0 ? (
          <p className="text-muted">No public tasks available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {org.active_tasks.map((t) => (
              <div key={t.id} className="card p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="m-0 text-base">{t.title}</h4>
                  <Badge variant={t.urgency_level >= 4 ? "error" : "warning"}>Urgency {t.urgency_level}</Badge>
                </div>
                <div className="text-sm text-muted mb-2"><Badge variant="info">{t.category}</Badge></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
