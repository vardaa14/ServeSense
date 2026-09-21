import React, { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api, formatMoney } from "../api/client"
import Button from "../components/Button"
import Progress from "../components/Progress"
import Badge from "../components/Badge"
import { ShieldCheck, MapPin, Users, Target, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react'

export default function CampaignDetails() {
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [form, setForm] = useState({ donor_name: "", donor_email: "", amount: 1000, is_anonymous: false })
  const [step, setStep] = useState("details") // details, payment, success, failed
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
  if (!campaign) return <div className="page flex justify-center py-20"><div className="skeleton w-full h-96"></div></div>
  
  const pct = Math.min(100, campaign.percent_funded || 0)

  return (
    <div className="page">
      <Link to="/donations" className="flex items-center gap-2 text-muted hover:text-vivid-blue mb-2 w-fit font-semibold text-sm">
        <ArrowLeft size={16} /> Back to campaigns
      </Link>
      
      <section className="mb-6">
        <h1 className="mb-4">{campaign.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-muted">
          <Link to={`/ngo/${campaign.organization_id}`} className="flex items-center gap-1 text-dark-blue hover:text-vivid-blue">
            {campaign.organization_name}
            {campaign.organization_verified && <ShieldCheck size={16} className="text-success" />}
          </Link>
          <div className="flex items-center gap-1"><MapPin size={16} /> {campaign.location}</div>
          <Badge variant={campaign.status === 'active' ? 'success' : 'neutral'}>{campaign.status}</Badge>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Campaign Info */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <article className="card p-8">
            <div className="mb-8">
              <Progress value={pct} max={100} variant="vivid" />
              <div className="flex justify-between items-end mt-4">
                <div>
                  <div className="text-4xl font-extrabold text-dark-blue mb-1">{formatMoney(campaign.raised_amount, campaign.currency)}</div>
                  <div className="text-muted font-semibold">raised of {formatMoney(campaign.target_amount, campaign.currency)} goal</div>
                </div>
                <div className="text-2xl font-bold text-vivid-blue">{pct}%</div>
              </div>
            </div>
            
            <h3 className="mb-4 text-xl">About this campaign</h3>
            <p className="text-lg leading-relaxed text-text-main mb-8">{campaign.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 border-t border-b border-border-color py-6">
              <div className="flex flex-col items-center text-center gap-2">
                <Users size={32} className="text-pastel-blue" />
                <span className="font-bold text-lg">{campaign.beneficiary_count || "—"}</span>
                <span className="text-xs uppercase tracking-wider text-muted font-semibold">Target Beneficiaries</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <CheckCircle2 size={32} className="text-success" />
                <span className="font-bold text-lg">{campaign.estimated_supported ?? "—"}</span>
                <span className="text-xs uppercase tracking-wider text-muted font-semibold">Currently Supported</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <Target size={32} className="text-warning" />
                <span className="font-bold text-lg">{campaign.tasks_supported}</span>
                <span className="text-xs uppercase tracking-wider text-muted font-semibold">Related Relief Tasks</span>
              </div>
            </div>

            {campaign.impact_tiers?.length > 0 && (
              <>
                <h3 className="mb-4 text-xl">What your gift supports</h3>
                <div className="grid gap-3">
                  {campaign.impact_tiers.map((t) => (
                    <div key={t.amount} className="flex items-center p-4 bg-bg-main border border-border-color rounded-lg gap-4">
                      <div className="font-extrabold text-vivid-blue text-xl w-24 flex-shrink-0">{formatMoney(t.amount, campaign.currency)}</div>
                      <div className="text-text-main font-semibold">→ {t.supports}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </article>
        </div>

        {/* Donation Portal / Form */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24">
            
            {step === "details" && (
              <form onSubmit={startDonate} className="flex flex-col gap-4">
                <h2 className="mb-2">Make a Donation</h2>
                
                <div className="flex flex-wrap gap-2 mb-2">
                  {[500, 1000, 2500, 5000].map(amt => (
                    <Button 
                      key={amt} 
                      type="button" 
                      variant={form.amount === amt ? "primary" : "secondary"} 
                      onClick={() => setForm({ ...form, amount: amt })}
                      className="flex-1"
                    >
                      {formatMoney(amt, 'INR')}
                    </Button>
                  ))}
                </div>

                <label>Custom Amount (₹)
                  <input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required className="text-xl font-bold" />
                </label>

                <div className="border-t border-border-color my-2"></div>

                <label>Full Name
                  <input value={form.donor_name} onChange={(e) => setForm({ ...form, donor_name: e.target.value })} required={!form.is_anonymous} disabled={form.is_anonymous} placeholder="John Doe" />
                </label>
                
                <label>Email Address
                  <input type="email" value={form.donor_email} onChange={(e) => setForm({ ...form, donor_email: e.target.value })} placeholder="receipts@example.com" />
                </label>
                
                <label className="check-group mt-2 mb-4 p-3 bg-bg-main rounded-md border border-border-color cursor-pointer">
                  <input type="checkbox" checked={form.is_anonymous} onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })} />
                  <span className="font-semibold text-sm">Make my donation anonymous</span>
                </label>
                
                <Button type="submit" size="lg" className="w-full" disabled={campaign.status !== "active"}>
                  Donate {formatMoney(form.amount, campaign.currency)}
                </Button>
              </form>
            )}

            {step === "payment" && (
              <div className="flex flex-col gap-6 text-center py-4">
                <div className="w-16 h-16 bg-pastel-blue rounded-full flex items-center justify-center mx-auto text-vivid-blue">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h2 className="mb-2">Secure Checkout</h2>
                  <p className="text-muted mb-4">Provider: <strong>{pending?.payment?.provider}</strong><br/>No card numbers are stored.</p>
                  <div className="text-3xl font-extrabold text-dark-blue mb-6">{formatMoney(pending.amount, pending.currency)}</div>
                </div>
                <div className="flex flex-col gap-3">
                  <Button onClick={() => finish(true)} className="w-full" variant="primary">Simulate Successful Payment</Button>
                  <Button variant="danger" onClick={() => finish(false)} className="w-full">Simulate Failed Payment</Button>
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="flex flex-col gap-6 text-center py-4">
                <div className="w-20 h-20 bg-success-bg rounded-full flex items-center justify-center mx-auto text-success">
                  <CheckCircle2 size={40} />
                </div>
                <div>
                  <h2 className="mb-2">Thank You!</h2>
                  <p className="text-muted mb-4">Your donation of {formatMoney(pending.amount, pending.currency)} was successful. Payment ID: {pending.payment_status}.</p>
                </div>
                <Button variant="ghost" onClick={() => setStep("details")} className="w-full">Make Another Donation</Button>
              </div>
            )}

            {step === "failed" && (
              <div className="flex flex-col gap-6 text-center py-4">
                <div className="w-20 h-20 bg-error-bg rounded-full flex items-center justify-center mx-auto text-error">
                  <AlertTriangle size={40} />
                </div>
                <div>
                  <h2 className="mb-2 text-error">Payment Failed</h2>
                  <p className="text-muted mb-4">The transaction could not be completed. Your card was not charged.</p>
                </div>
                <Button variant="primary" onClick={() => setStep("details")} className="w-full">Try Again</Button>
              </div>
            )}
          </div>
          
          <div className="card mt-6">
            <h3 className="mb-4 text-base">Recent Supporters</h3>
            {campaign.recent_donations?.length === 0 && <p className="text-sm text-muted m-0">Be the first to donate!</p>}
            <div className="flex flex-col gap-3">
              {campaign.recent_donations?.map((d) => (
                <div key={d.id} className="flex justify-between items-center text-sm border-b border-border-color pb-3 last:border-0 last:pb-0">
                  <span className="font-semibold text-text-main">{d.donor_name}</span>
                  <Badge variant="success">{formatMoney(d.amount, d.currency)}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
