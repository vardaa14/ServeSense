import React, { useEffect, useState } from "react"
import { api, getDemandPrediction } from "../api/client"
import MapView from "../components/MapView"
import StatCard from "../components/StatCard"
import EmptyState from "../components/EmptyState"
import Button from "../components/Button"
import Badge from "../components/Badge"
import Progress from "../components/Progress"
import ChartCard from "../components/ChartCard"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Map, AlertTriangle, Users, TrendingUp, ShieldAlert, Activity, Check } from 'lucide-react'

export default function LocalIntelligence() {
  const [communities, setCommunities] = useState([])
  const [gaps, setGaps] = useState([])
  const [map, setMap] = useState(null)
  const [error, setError] = useState("")
  const [region, setRegion] = useState("Ward-A")
  const [severity, setSeverity] = useState(5.0)
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [predictionError, setPredictionError] = useState("")

  useEffect(() => {
    Promise.all([
      api("/intelligence/communities"),
      api("/intelligence/gaps"),
      api("/intelligence/map"),
    ])
      .then(([communitiesData, gapsData, mapData]) => {
        setCommunities(communitiesData)
        setGaps(gapsData)
        setMap(mapData)
      })
      .catch((err) => {
        setError(err.message || "Failed to load local intelligence data.")
      })
  }, [])

  const handlePredict = async () => {
    setLoading(true)
    setPredictionError("")
    try {
      const data = await getDemandPrediction({
        region,
        disaster_severity_score: parseFloat(severity),
        vulnerability_index: 0.7,
        population_density_sqkm: 12000,
      })
      setPrediction(data)
    } catch (err) {
      setPredictionError(err.message || "Failed to generate demand prediction.")
    } finally {
      setLoading(false)
    }
  }

  const getBadgeVariant = (level) => {
    if (level === "CRITICAL") return "error"
    if (level === "HIGH") return "warning"
    if (level === "MODERATE") return "info"
    return "success"
  }

  const points = []
  map?.communities?.forEach((community) => {
    points.push({
      id: `c-${community.id}`, lat: community.lat, lng: community.lng,
      label: community.name, kind: community.need_level === "high" ? "need" : "community",
    })
  })
  map?.tasks?.forEach((task) => {
    points.push({
      id: `t-${task.id}`, lat: task.lat, lng: task.lng,
      label: task.title, kind: task.kind === "urgent_task" ? "urgent" : "task",
    })
  })
  map?.volunteers?.forEach((volunteer) => {
    points.push({ id: `v-${volunteer.id}`, lat: volunteer.lat, lng: volunteer.lng, label: "Volunteer", kind: "resource" })
  })
  map?.organizations?.forEach((organization) => {
    points.push({
      id: `o-${organization.id}`, lat: organization.lat, lng: organization.lng,
      label: organization.name, kind: organization.kind === "relief_center" ? "center" : "org",
    })
  })

  // Prepare chart data for Predictive Insights
  const chartData = prediction?.historical_context ? [
    { name: '7 Days Ago', tasks: prediction.historical_context.hist_tasks_7d },
    { name: 'Last 30 Days (Avg/Wk)', tasks: Math.round(prediction.historical_context.hist_tasks_30d / 4) },
    { name: 'Predicted Demand', tasks: prediction.predicted_volunteer_demand }
  ] : []

  return (
    <div className="page">
      <section className="flex justify-between items-end flex-wrap gap-4 mb-2">
        <div>
          <h1>Local Intelligence</h1>
          <p className="text-muted">Real-time situational awareness and predictive capacity planning.</p>
        </div>
      </section>

      {error && <div className="message error mb-4">{error}</div>}

      <div className="flex flex-col gap-10">
        
        {/* Top Row: Map & Predictive Intelligence */}
        <div className="dashboard-layout">
          {/* Map Column */}
          <div className="card h-full" style={{ padding: '16px' }}>
            <MapView points={points} />
            <div className="flex gap-4 flex-wrap mt-4 text-sm font-semibold">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{background: 'var(--error)'}}></span> Need / Urgent</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{background: 'var(--vivid-blue)'}}></span> Community / Task</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{background: 'var(--success)'}}></span> Volunteer</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{background: 'var(--warning)'}}></span> Relief Center</div>
            </div>
          </div>

          {/* Predictive Intelligence Column */}
          <div className="card bg-pastel-blue-light border-vivid-blue h-full flex flex-col">
            <div className="flex items-center gap-2 mb-2 text-vivid-blue">
              <TrendingUp size={24} />
              <h2 className="m-0 text-dark-blue">Predictive Intelligence</h2>
            </div>
            <p className="text-sm text-muted mb-4">Anticipate where volunteer capacity will be needed next using LightGBM forecasting.</p>
            
            <div className="flex flex-col gap-3 mb-6">
              <label>Region / Ward
                <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} />
              </label>
              <label>Disaster Severity ({severity}/10)
                <input type="range" min="0" max="10" step="0.5" value={severity} onChange={(e) => setSeverity(e.target.value)} />
              </label>
              <Button variant="primary" onClick={handlePredict} loading={loading} icon={Activity} className="w-full mt-2">
                Generate Forecast
              </Button>
              {predictionError && <div className="message error p-2 text-sm">{predictionError}</div>}
            </div>

            {prediction && (
              <div className="bg-white p-4 rounded-lg border border-border-color shadow-sm mt-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="m-0 text-base">Forecast: {prediction.region}</h3>
                  <Badge variant={getBadgeVariant(prediction.demand_level)}>{prediction.demand_level}</Badge>
                </div>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-extrabold text-vivid-blue leading-none">{prediction.predicted_volunteer_demand}</span>
                  <span className="text-sm text-muted font-semibold">volunteers req.</span>
                </div>
                
                {prediction.historical_context && (
                  <>
                    <h4 className="text-xs uppercase text-muted tracking-wider mb-2">Demand Trend</h4>
                    <div style={{ height: '120px', width: '100%', marginBottom: '16px' }}>
                      <ResponsiveContainer>
                        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                          <XAxis dataKey="name" tick={{fontSize: 10}} />
                          <YAxis tick={{fontSize: 10}} />
                          <Tooltip />
                          <Bar dataKey="tasks" fill="var(--royal-blue)" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                       <div className="bg-bg-main p-2 rounded">
                          <strong className="block text-lg">{prediction.historical_context.hist_tasks_30d}</strong>
                          <span className="text-muted">Tasks (30d)</span>
                       </div>
                       <div className="bg-bg-main p-2 rounded">
                          <strong className="block text-lg text-error">{(prediction.historical_context.unfulfilled_task_ratio_30d * 100).toFixed(1)}%</strong>
                          <span className="text-muted">Unfulfilled</span>
                       </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: Community Need Overview & Volunteer Shortages */}
        <div className="dashboard-layout">
          
          {/* Community Need Column */}
          <div className="w-full">
            <h2 className="mb-4">Community Need Overview</h2>
            {communities.length === 0 && <EmptyState title="No community intelligence yet" icon={Map} />}
            <div className="grid-auto-fit">
              {communities.map((community) => (
                <article className="card card-hoverable" key={community.id}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="m-0 text-lg">{community.name}</h3>
                      <p className="text-sm text-muted m-0">{community.city}</p>
                    </div>
                    <Badge variant={community.need_level === 'high' ? 'error' : 'warning'}>Need {Math.round(community.need_score * 100)}%</Badge>
                  </div>
                  
                  <div className="mb-4 mt-2">
                    <Progress value={community.vulnerability_score * 100} label="Vulnerability" variant="error" />
                    <div className="mt-2" />
                    <Progress value={community.service_gap_score * 100} label="Service Gap" variant="warning" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted mb-4 border-t border-border-color pt-4">
                    <div><span className="font-bold text-text-main">{community.open_tasks}</span> Open Needs</div>
                    <div><span className="font-bold text-text-main">{community.unfilled_positions}</span> Unfilled Roles</div>
                    <div className={community.urgent_tasks > 0 ? "text-error font-semibold" : ""}><span className="font-bold">{community.urgent_tasks}</span> Urgent Tasks</div>
                    <div><span className="font-bold text-text-main">{community.population_estimate?.toLocaleString() || "—"}</span> Population</div>
                  </div>
                  
                  {community.reasons?.length > 0 && (
                    <div className="bg-bg-main p-3 rounded-md text-sm mt-auto">
                      <p className="font-bold mb-2 m-0 text-xs uppercase tracking-wider text-muted">Risk Factors</p>
                      {community.reasons.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 mb-1">
                          <Check size={14} className="text-vivid-blue flex-shrink-0 mt-1" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>

          {/* Volunteer Shortages Column */}
          <div className="card h-full">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={20} className="text-warning" />
              <h2 className="m-0 text-lg">Volunteer Shortages</h2>
            </div>
            
            {gaps.length === 0 ? (
              <p className="text-sm text-muted">No identified gaps at this time.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {gaps.map((gap) => (
                  <div key={gap.task_id} className="border border-border-color rounded-md p-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-error"></div>
                    <h4 className="m-0 mb-1 text-sm">{gap.title}</h4>
                    <p className="text-xs text-muted mb-2">{gap.community}</p>
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span>{gap.assigned} / {gap.required} Assigned</span>
                      <span className="text-error">Gap: {gap.gap}</span>
                    </div>
                    <div className="mt-2">
                       <Progress value={gap.assigned} max={gap.required} variant="error" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  )
}