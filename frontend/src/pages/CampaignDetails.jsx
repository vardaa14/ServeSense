import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api, formatMoney } from "../api/client"

export default function CampaignDetails() {
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [form, setForm] = useState({ donor_name: "", donor_email: "", amount: 1000, is_anonymous: false })
  const [step, setStep] = useState("details")
  const [pending, setPending] = useState(null)
  const [error, setError] = useState("")

  async function load() {
    setCampaign(await api(`/donation-campaigns/${id}`))
  }

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [id])

  async function startDonate(e) {
    e.preventDefault()
    setError("")
    try {
      const created = await api("/donations", {
        method: "POST",
        body: JSON.stringify({
          campaign_id: id,
          donor_name: form.donor_name,
          donor_email: form.donor_email || null,
          amount: Number(form.amount),
          is_anonymous: form.is_anonymous,
        }),
      })
      setPending(created)
      setStep("payment")
    } catch (err) {
      setError(err.message)
    }
  }

  async function finish(success) {
    const result = await api(`/donations/${pending.donation_id}/complete`, {
      method: "POST",
      body: JSON.stringify({ success }),
    })
    setPending(result)
    setStep(success ? "success" : "failed")
    if (success) load()
  }

  if (error) return <div className="message error">{error}</div>
  if (!campaign) return <p className="muted">Loading campaign…</p>
  const pct = Math.min(100, campaign.percent_funded || 0)

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>{campaign.title}</h1>
          <p>
            <Link to={`/ngo/${campaign.organization_id}`}>{campaign.organization_name}</Link>
            {campaign.organization_verified ? " · Verified" : ""} · {campaign.location}
          </p>
        </div>
      </section>

      <div className="split">
        <article className="card">
          <div className="progress large"><div style={{ width: `${pct}%` }} /></div>
          <h2>{formatMoney(campaign.raised_amount, campaign.currency)} raised</h2>
          <p className="muted">of {formatMoney(campaign.target_amount, campaign.currency)} goal · {pct}% funded</p>
          <p>{campaign.description}</p>
          <ul className="muted">
            <li>Beneficiaries targeted: {campaign.beneficiary_count || "—"}</li>
            <li>Estimated supported so far: {campaign.estimated_supported ?? "—"}</li>
            <li>Related tasks at this organization: {campaign.tasks_supported}</li>
          </ul>
          {campaign.impact_tiers?.length > 0 && (
            <>
              <h3>What a gift can support</h3>
              {campaign.impact_tiers.map((t) => (
                <p key={t.amount}>{formatMoney(t.amount, campaign.currency)} → {t.supports}</p>
              ))}
            </>
          )}
          <h3>Recent donations</h3>
          {campaign.recent_donations?.length === 0 && <p className="muted">No public donations yet.</p>}
          {campaign.recent_donations?.map((d) => (
            <p key={d.id}>{d.donor_name} · {formatMoney(d.amount, d.currency)}</p>
          ))}
        </article>

        <article className="card">
          {step === "details" && (
            <form onSubmit={startDonate}>
              <h2>Donate</h2>
              <label>Name <input value={form.donor_name} onChange={(e) => setForm({ ...form, donor_name: e.target.value })} required={!form.is_anonymous} /></label>
              <label>Email <input type="email" value={form.donor_email} onChange={(e) => setForm({ ...form, donor_email: e.target.value })} /></label>
              <label>Amount
                <input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </label>
              <label className="check">
                <input type="checkbox" checked={form.is_anonymous} onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })} />
                Give anonymously
              </label>
              <button type="submit" disabled={campaign.status !== "active"}>Donate now</button>
            </form>
          )}
          {step === "payment" && (
            <div>
              <h2>Mock payment</h2>
              <p>Provider: {pending?.payment?.provider}. No card numbers are collected or stored.</p>
              <p>Amount: {formatMoney(pending.amount, pending.currency)}</p>
              <div className="actions">
                <button onClick={() => finish(true)}>Simulate success</button>
                <button className="button danger" onClick={() => finish(false)}>Simulate failure</button>
              </div>
            </div>
          )}
          {step === "success" && (
            <div>
              <h2>Donation recorded</h2>
              <p>Thank you. Payment status: {pending.payment_status}.</p>
              <button className="button ghost" onClick={() => setStep("details")}>Give again</button>
            </div>
          )}
          {step === "failed" && (
            <div>
              <h2>Payment failed</h2>
              <p>The donation was not added to campaign progress.</p>
              <button onClick={() => setStep("details")}>Try again</button>
            </div>
          )}
        </article>
      </div>
    </div>
  )
}
