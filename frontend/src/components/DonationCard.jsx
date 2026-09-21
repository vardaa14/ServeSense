import React from 'react';
import { Link } from "react-router-dom"
import { formatMoney } from "../api/client"
import Badge from "./Badge"
import Progress from "./Progress"
import { ShieldCheck, MapPin, Users } from 'lucide-react'
import Button from "./Button"

export default function DonationCard({ campaign }) {
  const pct = Math.min(100, campaign.percent_funded || 0)
  
  return (
    <article className="card card-hoverable donation-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{campaign.title}</h3>
          <p className="text-muted text-sm flex items-center gap-2 mt-1">
            {campaign.organization_name}
            {campaign.organization_verified && <ShieldCheck size={14} className="text-success" />}
            {campaign.location && <><MapPin size={14} /> {campaign.location}</>}
          </p>
        </div>
        <Badge variant={campaign.status === "active" ? "success" : "neutral"}>{campaign.status}</Badge>
      </div>
      
      <div className="mb-4">
        <Progress value={pct} max={100} variant="vivid" />
        <div className="flex justify-between items-center mt-2">
          <div>
            <strong className="text-lg">{formatMoney(campaign.raised_amount, campaign.currency)}</strong>
            <span className="text-muted text-sm"> of {formatMoney(campaign.target_amount, campaign.currency)}</span>
          </div>
          <span className="text-sm font-semibold text-vivid-blue">{pct}% funded</span>
        </div>
      </div>
      
      {campaign.beneficiary_count && (
        <p className="text-sm text-muted flex items-center gap-2 mb-4">
          <Users size={14} /> {campaign.beneficiary_count} beneficiaries supported
        </p>
      )}
      
      <div className="card-actions">
        <Link to={`/campaign/${campaign.id}`} className="w-full">
          <Button variant="primary" className="w-full">Donate Now</Button>
        </Link>
      </div>
    </article>
  )
}
