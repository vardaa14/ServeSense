import { useEffect, useState } from "react"
import { api, greetingName, formatTimeRange } from "../api/client"
import StatCard from "../components/StatCard"
import TaskCard from "../components/TaskCard"
import EmptyState from "../components/EmptyState"

export default function VolunteerDashboard({ session }) {
  const [data, setData] = useState(null)
  const [tab, setTab] = useState("overview")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [profile, setProfile] = useState(null)
  const [slot, setSlot] = useState({ start_time: "", end_time: "" })
  const [task, setTask] = useState(null)

  const volunteerId = session?.volunteer_id

  async function load() {
    if (!volunteerId) return
    try {
      const dash = await api(`/volunteers/${volunteerId}/dashboard`)
      setData(dash)
      setProfile({
        max_travel_km: dash.profile.max_travel_km,
        transport_mode: dash.profile.transport_mode || "",
        languages: (dash.profile.languages || []).join(", "),
        cause_preferences: (dash.profile.cause_preferences || []).join(", "),
      })
      setError("")
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [volunteerId])

  async function volunteerFor(taskId) {
    try {
      await api(`/volunteers/${volunteerId}/tasks/${taskId}/volunteer`, { method: "POST", body: "{}" })
      setMessage("You volunteered for this task.")
      setTask(null)
      await load()
    } catch (e) {
      setMessage(e.message)
    }
  }

  async function accept(id) {
    try {
      await api(`/assignments/${id}/accept`, { method: "POST", body: "{}" })
      setMessage("Assignment accepted.")
      load()
    } catch (e) {
      setMessage(e.message)
    }
  }

  async function decline(id) {
    try {
      await api(`/assignments/${id}/decline`, { method: "POST", body: "{}" })
      setMessage("Assignment declined.")
      load()
    } catch (e) {
      setMessage(e.message)
    }
  }

  async function saveProfile(e) {
    e.preventDefault()
    await api(`/volunteers/${volunteerId}`, {
      method: "PATCH",
      body: JSON.stringify({
        max_travel_km: Number(profile.max_travel_km),
        transport_mode: profile.transport_mode,
        languages: profile.languages.split(",").map((x) => x.trim()).filter(Boolean),
        cause_preferences: profile.cause_preferences.split(",").map((x) => x.trim()).filter(Boolean),
      }),
    })
    setMessage("Profile updated.")
    load()
  }

  async function addSlot(e) {
    e.preventDefault()
    await api("/availability", {
      method: "POST",
      body: JSON.stringify({
        volunteer_id: volunteerId,
        start_time: new Date(slot.start_time).toISOString(),
        end_time: new Date(slot.end_time).toISOString(),
      }),
    })
    setSlot({ start_time: "", end_time: "" })
    setMessage("Availability added.")
    load()
  }

  async function removeSlot(id) {
    await api(`/availability/${id}`, { method: "DELETE" })
    load()
  }

  async function showTask(id) {
    setTask(await api(`/tasks/${id}`))
  }

  if (!volunteerId) {
    return <EmptyState title="Choose a volunteer" text="Use the role switcher to enter a volunteer identity." />
  }
  if (error) return <div className="message error">{error}</div>
  if (!data) return <p className="muted">Loading volunteer dashboard…</p>

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>{greetingName(data.name)}</h1>
          <p>Ready to make an impact?</p>
        </div>
      </section>
      {message && <div className="message">{message}</div>}

      <div className="tabs">
        {["overview", "profile", "availability", "impact"].map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <section className="stats">
            <StatCard label="Upcoming assignments" value={data.stats.upcoming_assignments} />
            <StatCard label="Completed tasks" value={data.stats.completed_tasks} />
            <StatCard label="Hours volunteered" value={data.stats.hours_volunteered} />
            <StatCard label="Beneficiaries helped" value={data.stats.beneficiaries_helped} />
            <StatCard label="Reliability" value={`${data.stats.reliability_score}%`} />
          </section>

          <section>
            <h2>Recommended opportunities</h2>
            <div className="card-grid">
              {data.recommended.length === 0 && <EmptyState title="No recommendations" text="Add availability or wait for new open tasks." />}
              {data.recommended.map((t) => (
                <TaskCard
                  key={t.task_id}
                  task={t}
                  match={t.match_percentage}
                  distanceKm={t.distance_km}
                  reasons={t.reasons}
                  actions={
                    <>
                      <button className="button ghost" onClick={() => showTask(t.task_id)}>View details</button>
                      <button onClick={() => volunteerFor(t.task_id)}>Volunteer</button>
                    </>
                  }
                />
              ))}
            </div>
          </section>

          <section>
            <h2>Nearby opportunities</h2>
            <div className="card-grid">
              {data.nearby.map((t) => (
                <TaskCard
                  key={t.task_id}
                  task={t}
                  distanceKm={t.distance_km}
                  actions={
                    <>
                      <button className="button ghost" onClick={() => showTask(t.task_id)}>View details</button>
                      <button onClick={() => volunteerFor(t.task_id)}>Volunteer</button>
                    </>
                  }
                />
              ))}
            </div>
          </section>

          <section>
            <h2>Upcoming assignments</h2>
            {data.upcoming_assignments.length === 0 && <EmptyState title="No upcoming assignments" />}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Task</th><th>Organization</th><th>When</th><th>Location</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {data.upcoming_assignments.map((a) => (
                    <tr key={a.id}>
                      <td>{a.title}</td>
                      <td>{a.organization}</td>
                      <td>{formatTimeRange(a.start_time, a.end_time)}</td>
                      <td>{a.location}</td>
                      <td><span className="chip">{a.status}</span></td>
                      <td className="actions">
                        <button className="button ghost" onClick={() => showTask(a.task_id)}>View</button>
                        {a.status === "offered" && <button onClick={() => accept(a.id)}>Accept</button>}
                        {["offered", "accepted"].includes(a.status) && <button className="button danger" onClick={() => decline(a.id)}>Decline</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === "profile" && (
        <section className="split">
          <article className="card">
            <h2>Profile summary</h2>
            <p className="muted">Background check: {data.profile.background_check_status}</p>
            <div className="chip-row">
              {data.profile.skills.map((s) => (
                <span className="chip" key={s.id}>{s.name} · Level {s.proficiency_level}</span>
              ))}
            </div>
            <h3>Certifications</h3>
            {data.profile.certifications.length === 0 && <p className="muted">No certifications on file.</p>}
            {data.profile.certifications.map((c) => (
              <p key={c.id}>{c.cert_type} · {c.verification_status} · expires {c.expires_at || "n/a"}</p>
            ))}
          </article>
          <form className="card" onSubmit={saveProfile}>
            <h2>Update profile</h2>
            <label>Max travel radius (km)
              <input type="number" value={profile.max_travel_km} onChange={(e) => setProfile({ ...profile, max_travel_km: e.target.value })} />
            </label>
            <label>Transport mode
              <input value={profile.transport_mode} onChange={(e) => setProfile({ ...profile, transport_mode: e.target.value })} />
            </label>
            <label>Languages
              <input value={profile.languages} onChange={(e) => setProfile({ ...profile, languages: e.target.value })} />
            </label>
            <label>Causes
              <input value={profile.cause_preferences} onChange={(e) => setProfile({ ...profile, cause_preferences: e.target.value })} />
            </label>
            <button type="submit">Save profile</button>
          </form>
        </section>
      )}

      {tab === "availability" && (
        <section className="split">
          <form className="card" onSubmit={addSlot}>
            <h2>Add availability</h2>
            <label>Start <input type="datetime-local" value={slot.start_time} onChange={(e) => setSlot({ ...slot, start_time: e.target.value })} required /></label>
            <label>End <input type="datetime-local" value={slot.end_time} onChange={(e) => setSlot({ ...slot, end_time: e.target.value })} required /></label>
            <button type="submit">Add window</button>
          </form>
          <article className="card">
            <h2>Upcoming availability</h2>
            {data.availability.map((s) => (
              <div className="row-item" key={s.id}>
                <div>
                  <strong>{formatTimeRange(s.start_time, s.end_time)}</strong>
                  <p className="muted">{s.status}</p>
                </div>
                <button className="button danger" onClick={() => removeSlot(s.id)}>Remove</button>
              </div>
            ))}
          </article>
        </section>
      )}

      {tab === "impact" && (
        <section>
          <div className="stats">
            <StatCard label="Total tasks" value={data.impact.total_tasks} />
            <StatCard label="Total hours" value={data.impact.total_hours} />
            <StatCard label="Beneficiaries helped" value={data.impact.beneficiaries_helped} />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Task</th><th>Date</th><th>Hours</th><th>Organization</th><th>Beneficiaries</th><th>Status</th></tr>
              </thead>
              <tbody>
                {data.impact.history.map((row, i) => (
                  <tr key={i}>
                    <td>{row.task}</td>
                    <td>{row.date ? new Date(row.date).toLocaleDateString() : "—"}</td>
                    <td>{row.hours}</td>
                    <td>{row.organization}</td>
                    <td>{row.beneficiaries_impacted}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {task && (
        <div className="modal" onClick={() => setTask(null)}>
          <article className="card" onClick={(e) => e.stopPropagation()}>
            <h2>{task.title}</h2>
            <p>{task.description}</p>
            <p className="muted">{task.organization} · {task.community} · {formatTimeRange(task.start_time, task.end_time)}</p>
            <p>{task.filled_headcount}/{task.required_headcount} volunteers assigned</p>
            <button className="button ghost" onClick={() => setTask(null)}>Close</button>
          </article>
        </div>
      )}
    </div>
  )
}
