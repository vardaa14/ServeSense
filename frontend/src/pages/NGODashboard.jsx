import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api, formatTimeRange, formatMoney } from "../api/client"
import StatCard from "../components/StatCard"
import VolunteerCard from "../components/VolunteerCard"
import EmptyState from "../components/EmptyState"
import Button from "../components/Button"
import Badge from "../components/Badge"
import Skeleton from "../components/Skeleton"
import ChartCard from "../components/ChartCard"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { LayoutGrid, AlertTriangle, Users, Target, Activity, FileText, CheckCircle, Search, PlusCircle } from 'lucide-react'

const emptyTask = {
  title: "",
  description: "",
  category: "food",
  urgency_level: 3,
  start_time: "",
  end_time: "",
  required_headcount: 4,
  location_note: "",
  lat: 19.076,
  lng: 72.8777,
  estimated_beneficiaries: 50,
  community_id: "",
  skill_id: "",
  certification_type: "",
  minimum_level: 3,
  mandatory_flag: true,
}

export default function NGODashboard({ session }) {
  const orgId = session?.organization_id
  const [data, setData] = useState(null)
  const [tab, setTab] = useState("overview")
  const [skills, setSkills] = useState([])
  const [communities, setCommunities] = useState([])
  const [form, setForm] = useState(emptyTask)
  const [selectedTask, setSelectedTask] = useState(null)
  const [matches, setMatches] = useState([])
  const [volunteers, setVolunteers] = useState([])
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [taskDetail, setTaskDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!orgId) return
    setLoading(true)
    try {
      const [dash, skillRows, comms, vols] = await Promise.all([
        api(`/organizations/${orgId}/dashboard`),
        api("/skills"),
        api("/communities"),
        api(`/organizations/${orgId}/volunteers`),
      ])
      setData(dash)
      setSkills(skillRows)
      setCommunities(comms)
      setVolunteers(vols)
      setForm((f) => ({ ...f, skill_id: skillRows[0]?.id || "", community_id: comms[0]?.id || "" }))
      setError("")
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [orgId])

  async function createTask(e) {
    e.preventDefault()
    try {
      const payload = {
        organization_id: orgId,
        community_id: form.community_id || null,
        title: form.title,
        description: form.description,
        category: form.category,
        urgency_level: Number(form.urgency_level),
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        required_headcount: Number(form.required_headcount),
        lat: Number(form.lat),
        lng: Number(form.lng),
        estimated_beneficiaries: Number(form.estimated_beneficiaries),
        created_by: session.user_id,
        requirements: form.skill_id ? [{
          skill_id: form.skill_id,
          certification_type: form.certification_type || null,
          minimum_level: Number(form.minimum_level),
          mandatory_flag: Boolean(form.mandatory_flag),
        }] : [],
      }
      await api("/tasks", { method: "POST", body: JSON.stringify(payload) })
      setMessage("Task created and available for matching.")
      setForm({ ...emptyTask, skill_id: skills[0]?.id || "", community_id: communities[0]?.id || "" })
      setTab("tasks")
      load()
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function findVolunteers(taskId) {
    setSelectedTask(taskId)
    setTab("matching")
    try {
      const rows = await api(`/tasks/${taskId}/recommendations`, { method: "POST", body: "{}" })
      setMatches(rows)
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function assign(volunteerId) {
    try {
      await api("/assignments", {
        method: "POST",
        body: JSON.stringify({ task_id: selectedTask, volunteer_id: volunteerId }),
      })
      setMessage("Volunteer assigned.")
      await findVolunteers(selectedTask)
      load()
    } catch (err) {
      setMessage(err.message)
    }
  }

  if (!orgId) return <EmptyState title="Choose a coordinator" text="Use the role switcher to enter an organization identity." />
  
  const selectedMeta = data?.active_tasks?.find((t) => t.id === selectedTask)

  return (
    <div className="page">
      {error && <div className="message error mb-4">{error}</div>}
      {message && <div className="message success mb-4">{message}</div>}
      
      <div className="flex justify-between items-center flex-wrap gap-4 mb-2">
        <div>
          {loading ? <Skeleton className="h-10 w-64 mb-2" /> : <h1>{data?.name}</h1>}
          <p className="text-muted">Operational Command Center</p>
        </div>
      </div>

      <div className="tabs">
        {[
          { id: "overview", label: "Overview" },
          { id: "tasks", label: "Relief Tasks" },
          { id: "create", label: "Create Task" },
          { id: "matching", label: "Volunteer Matching" },
          { id: "volunteers", label: "My Volunteers" },
          { id: "impact", label: "Impact Metrics" }
        ].map((t) => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {loading && tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      )}

      {!loading && data && tab === "overview" && (
        <>
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard label="Active Tasks" value={data.stats.active_tasks} icon={Target} tone="info" />
            <StatCard label="Volunteers" value={data.stats.volunteers_assigned} icon={Users} />
            <StatCard label="Critical Needs" value={data.stats.open_volunteer_requirements} icon={AlertTriangle} tone="warning" />
            <StatCard label="Completed" value={data.stats.tasks_completed} icon={CheckCircle} tone="success" />
            <StatCard label="Beneficiaries" value={data.stats.beneficiaries_served} icon={Activity} />
            <StatCard label="Donations" value={formatMoney(data.stats.donations_received)} icon={FileText} tone="vivid" />
          </section>

          {data.alerts.length > 0 && (
            <section className="mb-8">
              <h3 className="mb-4 text-error flex items-center gap-2"><AlertTriangle size={20} /> Urgent Operational Alerts</h3>
              <div className="grid gap-3">
                {data.alerts.map((a) => (
                  <div key={a.code} className={`message ${a.level === 'success' ? 'success' : 'error'}`}>
                    {a.message}
                  </div>
                ))}
              </div>
            </section>
          )}
          
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="card">
              <h2 className="mb-4">Urgent Needs & Critical Tasks</h2>
              {data.active_tasks.length === 0 && <p className="text-muted">No active tasks.</p>}
              <div className="flex flex-col gap-3">
                {data.active_tasks.filter(t => t.urgency_level >= 4).slice(0, 4).map(t => (
                  <div key={t.id} className="flex justify-between items-center p-3 border border-border-color rounded-md">
                    <div>
                      <h4 className="m-0 text-error">{t.title}</h4>
                      <div className="text-sm text-muted mt-1">Need {t.required_headcount - t.filled_headcount} more volunteers</div>
                    </div>
                    <Button size="sm" onClick={() => { setTab("matching"); findVolunteers(t.id); }}>Match</Button>
                  </div>
                ))}
              </div>
            </div>

            <ChartCard title="Volunteer Gap Analysis" subtitle="Required vs Assigned by Task">
              {data.gaps.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.gaps} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="title" tickFormatter={(v) => v.length > 10 ? v.substring(0, 10)+'...' : v} />
                    <YAxis />
                    <Tooltip cursor={{ fill: 'rgba(220, 235, 255, 0.4)' }} />
                    <Legend />
                    <Bar dataKey="assigned" name="Assigned" fill="var(--success)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gap" name="Gap (Unfilled)" fill="var(--error)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No gap data" />
              )}
            </ChartCard>
          </section>
        </>
      )}

      {!loading && data && tab === "tasks" && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2>Active Relief Tasks</h2>
            <Button variant="primary" onClick={() => setTab("create")}><PlusCircle size={18}/> Create Task</Button>
          </div>
          {data.active_tasks.length === 0 && <EmptyState title="No active tasks" text="Create a task to start matching volunteers." icon={LayoutGrid} action={<Button onClick={() => setTab("create")}>Create Task</Button>} />}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {data.active_tasks.map((t) => (
              <article className="card flex flex-col" key={t.id}>
                <div className="card-header mb-2">
                  <h3 className="card-title">{t.title}</h3>
                  <Badge variant={t.urgency_level >= 4 ? "error" : "info"}>Urgency {t.urgency_level}</Badge>
                </div>
                <div className="text-sm text-muted mb-4">{formatTimeRange(t.start_time, t.end_time)}</div>
                
                <div className="bg-bg-main p-3 rounded-md mb-4 flex justify-between items-center">
                  <span className="text-sm font-semibold">Fulfillment</span>
                  <span className="text-sm"><strong className={t.filled_headcount < t.required_headcount ? "text-error" : "text-success"}>{t.filled_headcount}</strong> / {t.required_headcount}</span>
                </div>
                
                <div className="mt-auto pt-4 flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={async () => setTaskDetail(await api(`/tasks/${t.id}`))}>View</Button>
                  <Button variant="primary" className="flex-1" onClick={() => findVolunteers(t.id)}>Find Volunteers</Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && data && tab === "create" && (
        <section className="max-w-4xl mx-auto">
          <form className="card" onSubmit={createTask}>
            <div className="mb-6 border-b border-border-color pb-4">
              <h2 className="mb-1">Create Relief Task</h2>
              <p className="text-muted">Define requirements to find the best volunteer matches.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full">
                <label>Task Title <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Emergency Food Distribution" /></label>
              </div>
              
              <div className="col-span-full">
                <label>Description <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe what volunteers will be doing..." /></label>
              </div>
              
              <label>Category <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
              <label>Urgency Level (1-5)
                <select value={form.urgency_level} onChange={(e) => setForm({ ...form, urgency_level: e.target.value })}>
                  {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} {n===5 ? '(Critical)' : ''}</option>)}
                </select>
              </label>
              
              <label>Start time <input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required /></label>
              <label>End time <input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required /></label>
              
              <label>Required Volunteers <input type="number" min="1" value={form.required_headcount} onChange={(e) => setForm({ ...form, required_headcount: e.target.value })} /></label>
              <label>Estimated Beneficiaries <input type="number" value={form.estimated_beneficiaries} onChange={(e) => setForm({ ...form, estimated_beneficiaries: e.target.value })} /></label>

              <div className="col-span-full border-t border-border-color pt-6 mt-2">
                <h3 className="mb-4">Location & Community</h3>
              </div>
              
              <div className="col-span-full">
                <label>Community Segment
                  <select value={form.community_id} onChange={(e) => setForm({ ...form, community_id: e.target.value })}>
                    {communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
              </div>
              
              <label>Latitude <input type="number" step="0.0001" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} /></label>
              <label>Longitude <input type="number" step="0.0001" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} /></label>

              <div className="col-span-full border-t border-border-color pt-6 mt-2">
                <h3 className="mb-4">Skill Requirements</h3>
              </div>
              
              <label>Primary Skill
                <select value={form.skill_id} onChange={(e) => setForm({ ...form, skill_id: e.target.value })}>
                  {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label>Minimum Level (1-5)
                <select value={form.minimum_level} onChange={(e) => setForm({ ...form, minimum_level: e.target.value })}>
                  {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              
              <label>Required Certification <input value={form.certification_type} onChange={(e) => setForm({ ...form, certification_type: e.target.value })} placeholder="e.g. First Aid, CPR (Optional)" /></label>
              <label>Requirement Strictness
                <select value={String(form.mandatory_flag)} onChange={(e) => setForm({ ...form, mandatory_flag: e.target.value === "true" })}>
                  <option value="true">Mandatory Match</option>
                  <option value="false">Preferred Only</option>
                </select>
              </label>
            </div>
            
            <div className="mt-8 flex justify-end">
              <Button type="submit" size="lg">Create Relief Task</Button>
            </div>
          </form>
        </section>
      )}

      {!loading && data && tab === "matching" && (
        <section>
          <div className="card mb-8">
            <h2 className="mb-4">Intelligent Volunteer Matching</h2>
            <div className="flex gap-4 items-end max-w-xl">
              <label className="flex-1 m-0">Target Task
                <select className="mt-1" value={selectedTask || ""} onChange={(e) => findVolunteers(e.target.value)}>
                  <option value="">Select a task to run engine...</option>
                  {data.active_tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </label>
            </div>
            {selectedMeta && (
              <div className="mt-4 p-3 bg-pastel-blue-light border border-border-color rounded-md inline-block">
                <strong>Status:</strong> {selectedMeta.filled_headcount} of {selectedMeta.required_headcount} volunteers assigned.
              </div>
            )}
          </div>
          
          {matches.length === 0 ? (
             <EmptyState title="No recommendations yet" text={selectedTask ? "No matches found for this task's requirements." : "Select a task above to rank available volunteers."} icon={Search} />
          ) : (
            <>
              <h3 className="mb-4">Top Ranked Volunteers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matches.map((v) => (
                  <VolunteerCard
                    key={v.volunteer_id}
                    volunteer={v}
                    actions={<Button className="w-full" onClick={() => assign(v.volunteer_id)}>Assign to Task</Button>}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {!loading && data && tab === "volunteers" && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2>Your Volunteer Roster</h2>
            <Badge variant="info">{volunteers.length} Total</Badge>
          </div>
          {volunteers.length === 0 && <EmptyState title="No assigned volunteers yet" icon={Users} />}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {volunteers.map((v) => <VolunteerCard key={v.id} volunteer={v} />)}
          </div>
        </section>
      )}

      {!loading && data && tab === "impact" && (
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Beneficiaries Served" value={data.impact.beneficiaries_served} icon={Users} />
            <StatCard label="Tasks Completed" value={data.impact.tasks_completed} icon={CheckCircle} tone="success" />
            <StatCard label="Avg Response" value={`${data.impact.average_response_time_minutes}m`} icon={Activity} />
            <StatCard label="Completion Rate" value={`${Math.round(data.impact.service_completion_rate * 100)}%`} icon={Target} tone="vivid" />
          </div>
          
          <ChartCard title="Impact Score by Task" subtitle="Measuring operational effectiveness across recent missions" className="mb-8">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={data.impact.records} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                 <XAxis type="number" domain={[0, 100]} />
                 <YAxis dataKey="task" type="category" width={150} tickFormatter={(v) => v.length > 20 ? v.substring(0, 20)+'...' : v} />
                 <Tooltip cursor={{ fill: 'rgba(220, 235, 255, 0.4)' }} />
                 <Bar dataKey="impact_score" name="Impact Score" fill="var(--royal-blue)" radius={[0, 4, 4, 0]} />
               </BarChart>
             </ResponsiveContainer>
          </ChartCard>
        </section>
      )}

      {taskDetail && (
        <div className="modal-overlay" onClick={() => setTaskDetail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2">{taskDetail.title}</h2>
            <div className="flex flex-wrap gap-2 mb-4">
               <Badge variant="info">{taskDetail.category}</Badge>
               <Badge variant={taskDetail.urgency_level >= 4 ? "error" : "warning"}>Urgency {taskDetail.urgency_level}</Badge>
            </div>
            <p className="mb-4">{taskDetail.description}</p>
            <p className="text-sm font-semibold mb-2">Schedule: {formatTimeRange(taskDetail.start_time, taskDetail.end_time)}</p>
            <div className="p-3 bg-pastel-blue-light border border-border-color rounded-md mb-6 text-sm">
              <strong className="text-vivid-blue">{taskDetail.filled_headcount}/{taskDetail.required_headcount}</strong> volunteers assigned
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setTaskDetail(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
