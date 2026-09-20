import { Link } from "react-router-dom"
import { formatMoney } from "../api/client"

export default function DonationCard({ campaign }) {
  const pct = Math.min(100, campaign.percent_funded || 0)
  return (
    <article className="card donation-card">
      <div className="card-top">
        <div>
          <h3>{campaign.title}</h3>
          <p className="muted">
            {campaign.organization_name}
            {campaign.organization_verified ? " · Verified" : ""}
            {campaign.location ? ` · ${campaign.location}` : ""}
          </p>
        </div>
        <span className={`chip ${campaign.status === "active" ? "ok" : ""}`}>{campaign.status}</span>
      </div>
      <div className="progress">
        <div style={{ width: `${pct}%` }} />
      </div>
      <p>
        <strong>{formatMoney(campaign.raised_amount, campaign.currency)}</strong>
        <span className="muted"> of {formatMoney(campaign.target_amount, campaign.currency)}</span>
      </p>
      <p className="muted">{pct}% funded{campaign.beneficiary_count ? ` · ${campaign.beneficiary_count} beneficiaries` : ""}</p>
      <div className="actions">
        <Link className="button" to={`/campaign/${campaign.id}`}>Donate Now</Link>
      </div>
    </article>
  )
}
