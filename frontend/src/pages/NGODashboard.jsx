import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api, formatTimeRange, formatMoney } from "../api/client"
import StatCard from "../components/StatCard"
import VolunteerCard from "../components/VolunteerCard"
import EmptyState from "../components/EmptyState"

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

  async function load() {
    if (!orgId) return
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
  if (error) return <div className="message error">{error}</div>
  if (!data) return <p className="muted">Loading NGO dashboard…</p>

  const selectedMeta = data.active_tasks.find((t) => t.id === selectedTask)

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>{data.name}</h1>
          <p>Coordinate tasks, volunteers, donations and local need.</p>
        </div>
      </section>
      {message && <div className="message">{message}</div>}

      <div className="tabs">
        {["overview", "tasks", "create", "matching", "volunteers", "impact"].map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <section className="stats">
            <StatCard label="Active tasks" value={data.stats.active_tasks} />
            <StatCard label="Volunteers assigned" value={data.stats.volunteers_assigned} />
            <StatCard label="Open requirements" value={data.stats.open_volunteer_requirements} />
            <StatCard label="Tasks completed" value={data.stats.tasks_completed} />
            <StatCard label="Beneficiaries served" value={data.stats.beneficiaries_served} />
            <StatCard label="Donations received" value={formatMoney(data.stats.donations_received)} />
          </section>
          <section className="alert-list">
            {data.alerts.map((a) => (
              <div key={a.code} className={`alert ${a.level}`}>{a.level === "success" ? "✓" : "⚠"} {a.message}</div>
            ))}
          </section>
        </>
      )}

      {tab === "tasks" && (
        <section>
          {data.active_tasks.length === 0 && <EmptyState title="No active tasks" text="Create a task to start matching." />}
          {data.active_tasks.map((t) => (
            <article className="card row-item" key={t.id}>
              <div>
                <h3>{t.title}</h3>
                <p className="muted">Urgency: {t.urgency_level >= 4 ? "HIGH" : t.urgency_level} · {t.filled_headcount} / {t.required_headcount} volunteers assigned · {formatTimeRange(t.start_time, t.end_time)}</p>
              </div>
              <div className="actions">
                <button className="button ghost" onClick={async () => setTaskDetail(await api(`/tasks/${t.id}`))}>View task</button>
                <button onClick={() => findVolunteers(t.id)}>Find volunteers</button>
              </div>
            </article>
          ))}
          <h3>Volunteer gaps</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Task</th><th>Required</th><th>Assigned</th><th>Gap</th></tr></thead>
              <tbody>
                {data.gaps.map((g) => (
                  <tr key={g.task_id}>
                    <td>{g.title}</td>
                    <td>{g.required}</td>
                    <td>{g.assigned}</td>
                    <td>{g.gap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "create" && (
        <form className="card form-grid" onSubmit={createTask}>
          <h2>Create task</h2>
          <label>Title <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label>Description <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label>Category <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
          <label>Urgency
            <select value={form.urgency_level} onChange={(e) => setForm({ ...form, urgency_level: e.target.value })}>
              {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>Start time <input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required /></label>
          <label>End time <input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required /></label>
          <label>Required headcount <input type="number" min="1" value={form.required_headcount} onChange={(e) => setForm({ ...form, required_headcount: e.target.value })} /></label>
          <label>Community
            <select value={form.community_id} onChange={(e) => setForm({ ...form, community_id: e.target.value })}>
              {communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>Latitude <input type="number" step="0.0001" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} /></label>
          <label>Longitude <input type="number" step="0.0001" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} /></label>
          <label>Estimated beneficiaries <input type="number" value={form.estimated_beneficiaries} onChange={(e) => setForm({ ...form, estimated_beneficiaries: e.target.value })} /></label>
          <label>Required skill
            <select value={form.skill_id} onChange={(e) => setForm({ ...form, skill_id: e.target.value })}>
              {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label>Required certification <input value={form.certification_type} onChange={(e) => setForm({ ...form, certification_type: e.target.value })} placeholder="Optional, e.g. First Aid" /></label>
          <label>Minimum skill level
            <select value={form.minimum_level} onChange={(e) => setForm({ ...form, minimum_level: e.target.value })}>
              {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>Requirement
            <select value={String(form.mandatory_flag)} onChange={(e) => setForm({ ...form, mandatory_flag: e.target.value === "true" })}>
              <option value="true">Mandatory</option>
              <option value="false">Optional</option>
            </select>
          </label>
          <button type="submit">Create task</button>
        </form>
      )}

      {tab === "matching" && (
        <section>
          <h2>Find volunteers</h2>
          <label>Task
            <select value={selectedTask || ""} onChange={(e) => findVolunteers(e.target.value)}>
              <option value="">Select a task</option>
              {data.active_tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </label>
          {selectedMeta && <p className="muted">{selectedMeta.filled_headcount}/{selectedMeta.required_headcount} filled</p>}
          {matches.length === 0 && <EmptyState title="No ranked volunteers yet" text="Select a task to run the matching engine." />}
          <div className="card-grid">
            {matches.map((v) => (
              <VolunteerCard
                key={v.volunteer_id}
                volunteer={v}
                actions={<button onClick={() => assign(v.volunteer_id)}>Assign</button>}
              />
            ))}
          </div>
        </section>
      )}

      {tab === "volunteers" && (
        <section className="card-grid">
          {volunteers.length === 0 && <EmptyState title="No assigned volunteers yet" />}
          {volunteers.map((v) => <VolunteerCard key={v.id} volunteer={v} />)}
        </section>
      )}

      {tab === "impact" && (
        <section>
          <div className="stats">
            <StatCard label="Beneficiaries served" value={data.impact.beneficiaries_served} />
            <StatCard label="Tasks completed" value={data.impact.tasks_completed} />
            <StatCard label="Avg response (min)" value={data.impact.average_response_time_minutes} />
            <StatCard label="Completion rate" value={`${Math.round(data.impact.service_completion_rate * 100)}%`} />
            <StatCard label="Underserved communities" value={data.impact.underserved_communities_reached} />
            <StatCard label="Volunteer participation" value={data.impact.volunteer_participation} />
            <StatCard label="Impact score" value={data.impact.impact_score} />
          </div>
          <div className="bar-chart">
            {data.impact.records.map((r, i) => (
              <div key={i}>
                <span>{r.task}</span>
                <div className="progress"><div style={{ width: `${Math.min(100, r.impact_score)}%` }} /></div>
                <em>{r.impact_score}</em>
              </div>
            ))}
          </div>
          <p><Link to="/donations">View donation campaigns</Link> · <Link to="/intelligence">Open local intelligence</Link></p>
        </section>
      )}

      {taskDetail && (
        <div className="modal" onClick={() => setTaskDetail(null)}>
          <article className="card" onClick={(e) => e.stopPropagation()}>
            <h2>{taskDetail.title}</h2>
            <p>{taskDetail.description}</p>
            <p>{taskDetail.filled_headcount}/{taskDetail.required_headcount} volunteers</p>
            <button className="button ghost" onClick={() => setTaskDetail(null)}>Close</button>
          </article>
        </div>
      )}
    </div>
  )
}
