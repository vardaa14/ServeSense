const API = "http://127.0.0.1:8000"
const SESSION_KEY = "servesense-session"

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null")
  } catch {
    return null
  }
}

export function setSession(session) {
  if (!session) localStorage.removeItem(SESSION_KEY)
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export async function api(path, options = {}) {
  const session = getSession()
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  }
  if (session?.user_id) headers["X-User-Id"] = session.user_id
  const res = await fetch(API + path, { ...options, headers })
  if (!res.ok) {
    let detail = await res.text()
    try {
      const parsed = JSON.parse(detail)
      detail = parsed.detail || detail
    } catch {
      /* keep text */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail))
  }
  if (res.status === 204) return null
  return res.json()
}

export function formatMoney(amount, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export function formatDateTime(value) {
  if (!value) return "—"
  const d = new Date(value)
  return d.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function formatTimeRange(start, end) {
  if (!start) return "—"
  const s = new Date(start)
  const e = end ? new Date(end) : null
  const day = s.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
  const from = s.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
  const to = e ? e.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : ""
  return to ? `${day} · ${from} – ${to}` : `${day} · ${from}`
}

export function relativeTime(value) {
  if (!value) return ""
  const diff = Date.now() - new Date(value).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return "Just now"
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`
  const day = Math.round(hr / 24)
  if (day === 1) return "Yesterday"
  return `${day} days ago`
}

export function greetingName(name) {
  const hour = new Date().getHours()
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  return `${hello}, ${name || "there"}`
}
