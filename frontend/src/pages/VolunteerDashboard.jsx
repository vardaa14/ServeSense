import React, { useEffect, useState } from "react"
import { api, greetingName, formatTimeRange } from "../api/client"
import StatCard from "../components/StatCard"
import TaskCard from "../components/TaskCard"
import EmptyState from "../components/EmptyState"
import Button from "../components/Button"
import Badge from "../components/Badge"
import Skeleton from "../components/Skeleton"
import { Calendar, User, Activity, MapPin, Search, CheckCircle, Clock, Heart } from 'lucide-react'

export default function VolunteerDashboard({ session }) {
  const [data, setData] = useState(null)
  const [tab, setTab] = useState("overview")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [profile, setProfile] = useState(null)
  const [slot, setSlot] = useState({ start_time: "", end_time: "" })
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)

  const volunteerId = session?.volunteer_id

  async function load() {
    if (!volunteerId) return
    setLoading(true)
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
    } finally {
      setLoading(false)
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

  return (
    <div className="page">
      {error && <div className="message error">{error}</div>}
      {message && <div className="message success mb-4">{message}</div>}

      <div className="flex justify-between items-center flex-wrap gap-4 mb-2">
        <div>
          {loading ? <Skeleton className="h-10 w-64 mb-2" /> : <h1>{greetingName(data?.name)}</h1>}
          <p className="text-muted">Here's where your help can make the biggest difference today.</p>
        </div>
      </div>

      <div className="tabs">
        {[
          { id: "overview", label: "Command Center" },
          { id: "profile", label: "Profile & Skills" },
          { id: "availability", label: "Schedule" },
          { id: "impact", label: "My Impact" }
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
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard label="Active Assignments" value={data.stats.upcoming_assignments} icon={Calendar} tone="info" />
            <StatCard label="Hours Contributed" value={data.stats.hours_volunteered} icon={Activity} />
            <StatCard label="People Helped" value={data.stats.beneficiaries_helped} icon={User} tone="success" />
            <StatCard label="Impact Score" value={data.stats.completed_tasks * 15} icon={Activity} tone="vivid" />
            <StatCard label="Reliability" value={`${data.stats.reliability_score}%`} icon={User} />
          </section>

          <section className="mb-10">
            <h2 className="mb-4">Recommended Opportunities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.recommended.length === 0 && (
                <div className="col-span-full">
                   <EmptyState title="No recommendations" text="Add availability or wait for new open tasks." icon={Search} />
                </div>
              )}
              {data.recommended.map((t) => (
                <TaskCard
                  key={t.task_id}
                  task={t}
                  match={t.match_percentage}
                  distanceKm={t.distance_km}
                  reasons={t.reasons}
                  actions={
                    <>
                      <Button variant="ghost" onClick={() => showTask(t.task_id)}>Details</Button>
                      <Button variant="primary" onClick={() => volunteerFor(t.task_id)}>Volunteer</Button>
                    </>
                  }
                />
              ))}
            </div>
          </section>

          <section className="mb-10">
            <h2 className="mb-4">Nearby Needs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.nearby.map((t) => (
                <TaskCard
                  key={t.task_id}
                  task={t}
                  distanceKm={t.distance_km}
                  actions={
                    <>
                      <Button variant="ghost" onClick={() => showTask(t.task_id)}>Details</Button>
                      <Button variant="secondary" onClick={() => volunteerFor(t.task_id)}>Volunteer</Button>
                    </>
                  }
                />
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-4">Your Assignments</h2>
            {data.upcoming_assignments.length === 0 && <EmptyState title="No upcoming assignments" icon={Calendar} />}
            {data.upcoming_assignments.length > 0 && (
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Task</th><th>Organization</th><th>When</th><th>Location</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {data.upcoming_assignments.map((a) => (
                      <tr key={a.id}>
                        <td className="font-semibold">{a.title}</td>
                        <td>{a.organization}</td>
                        <td>{formatTimeRange(a.start_time, a.end_time)}</td>
                        <td><div className="flex items-center gap-1"><MapPin size={14} className="text-muted"/>{a.location}</div></td>
                        <td><Badge variant={a.status === 'accepted' ? 'success' : 'warning'}>{a.status}</Badge></td>
                        <td className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => showTask(a.task_id)}>View</Button>
                          {a.status === "offered" && <Button size="sm" onClick={() => accept(a.id)}>Accept</Button>}
                          {["offered", "accepted"].includes(a.status) && <Button variant="danger" size="sm" onClick={() => decline(a.id)}>Decline</Button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {!loading && data && tab === "profile" && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card">
            <h2 className="mb-4">Profile summary</h2>
            <p className="text-sm mb-4">Background check: <strong>{data.profile.background_check_status}</strong></p>
            <h3 className="text-sm uppercase text-muted mb-2 tracking-wider">Verified Skills</h3>
            <div className="flex flex-wrap gap-2 mb-6">
              {data.profile.skills.map((s) => (
                <Badge variant="info" key={s.id}>{s.name} · L{s.proficiency_level}</Badge>
              ))}
            </div>
            <h3 className="text-sm uppercase text-muted mb-2 tracking-wider">Certifications</h3>
            {data.profile.certifications.length === 0 && <p className="text-muted text-sm">No certifications on file.</p>}
            {data.profile.certifications.map((c) => (
              <div key={c.id} className="mb-2 p-3 bg-pastel-blue-light rounded-md text-sm border border-border-color">
                <strong>{c.cert_type}</strong> · <span className="text-success">{c.verification_status}</span>
                <br/><span className="text-muted">Expires: {c.expires_at || "N/A"}</span>
              </div>
            ))}
          </div>
          <form className="card" onSubmit={saveProfile}>
            <h2 className="mb-4">Update Preferences</h2>
            <label>Max travel radius (km)
              <input type="number" value={profile.max_travel_km} onChange={(e) => setProfile({ ...profile, max_travel_km: e.target.value })} />
            </label>
            <label>Transport mode
              <input value={profile.transport_mode} onChange={(e) => setProfile({ ...profile, transport_mode: e.target.value })} />
            </label>
            <label>Languages (comma separated)
              <input value={profile.languages} onChange={(e) => setProfile({ ...profile, languages: e.target.value })} />
            </label>
            <label>Causes (comma separated)
              <input value={profile.cause_preferences} onChange={(e) => setProfile({ ...profile, cause_preferences: e.target.value })} />
            </label>
            <div className="mt-4">
              <Button type="submit">Save profile</Button>
            </div>
          </form>
        </section>
      )}

      {!loading && data && tab === "availability" && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <form className="card" onSubmit={addSlot}>
            <h2 className="mb-4">Add availability window</h2>
            <label>Start time <input type="datetime-local" value={slot.start_time} onChange={(e) => setSlot({ ...slot, start_time: e.target.value })} required /></label>
            <label>End time <input type="datetime-local" value={slot.end_time} onChange={(e) => setSlot({ ...slot, end_time: e.target.value })} required /></label>
            <div className="mt-4">
              <Button type="submit">Add window</Button>
            </div>
          </form>
          <div className="card">
            <h2 className="mb-4">Upcoming Schedule</h2>
            {data.availability.length === 0 && <p className="text-muted">No availability set.</p>}
            {data.availability.map((s) => (
              <div className="flex justify-between items-center p-3 mb-2 border border-border-color rounded-md" key={s.id}>
                <div>
                  <strong className="block text-sm">{formatTimeRange(s.start_time, s.end_time)}</strong>
                  <Badge variant="neutral" className="mt-1">{s.status}</Badge>
                </div>
                <Button variant="danger" size="sm" onClick={() => removeSlot(s.id)}>Remove</Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && data && tab === "impact" && (
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard label="Total Tasks Completed" value={data.impact.total_tasks} icon={CheckCircle} tone="success" />
            <StatCard label="Total Hours" value={data.impact.total_hours} icon={Clock} />
            <StatCard label="Beneficiaries Reached" value={data.impact.beneficiaries_helped} icon={Heart} tone="vivid" />
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Task</th><th>Date</th><th>Hours</th><th>Organization</th><th>Impact</th><th>Status</th></tr>
              </thead>
              <tbody>
                {data.impact.history.length === 0 && <tr><td colSpan="6" className="text-center text-muted py-8">No impact history yet.</td></tr>}
                {data.impact.history.map((row, i) => (
                  <tr key={i}>
                    <td className="font-semibold">{row.task}</td>
                    <td>{row.date ? new Date(row.date).toLocaleDateString() : "—"}</td>
                    <td>{row.hours}h</td>
                    <td>{row.organization}</td>
                    <td>{row.beneficiaries_impacted} pax</td>
                    <td><Badge variant="success">{row.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {task && (
        <div className="modal-overlay" onClick={() => setTask(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2">{task.title}</h2>
            <div className="flex flex-wrap gap-2 mb-4">
               <Badge variant="info">{task.organization}</Badge>
               <Badge variant="neutral">{task.community}</Badge>
            </div>
            <p className="mb-4">{task.description}</p>
            <p className="text-sm font-semibold mb-2">Schedule: {formatTimeRange(task.start_time, task.end_time)}</p>
            <div className="p-3 bg-pastel-blue-light border border-border-color rounded-md mb-6 text-sm">
              <strong className="text-vivid-blue">{task.filled_headcount}/{task.required_headcount}</strong> volunteers assigned
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setTask(null)}>Close</Button>
              <Button variant="primary" onClick={() => volunteerFor(task.id)}>Volunteer Now</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
