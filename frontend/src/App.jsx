import React, { useEffect, useState } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { api, getSession, setSession } from "./api/client"
import Navbar from "./components/Navbar"
import Sidebar from "./components/Sidebar"
import LandingPage from "./pages/LandingPage"
import VolunteerDashboard from "./pages/VolunteerDashboard"
import NGODashboard from "./pages/NGODashboard"
import Donations from "./pages/Donations"
import CampaignDetails from "./pages/CampaignDetails"
import OrganizationPublic from "./pages/OrganizationPublic"
import LocalIntelligence from "./pages/LocalIntelligence"
import Notifications from "./pages/Notifications"

function Guard({ session, allow, children }) {
  if (!session?.role || !allow.includes(session.role)) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  const [session, setSessionState] = useState(getSession())
  const [identities, setIdentities] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [flash, setFlash] = useState("")
  const location = useLocation()

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  async function loadIdentities() {
    try {
      setIdentities(await api("/demo/identities"))
    } catch {
      setIdentities([])
    }
  }

  useEffect(() => { loadIdentities() }, [])

  function switchIdentity(next) {
    setSession(next)
    setSessionState(next)
  }

  async function seed() {
    const result = await api("/demo/seed", { method: "POST", body: "{}" })
    await loadIdentities()
    setFlash(result.message)
    return result
  }

  return (
    <div className="shell">
      <Navbar
        session={session}
        identities={identities}
        onSwitch={switchIdentity}
        onMenu={() => setMenuOpen((v) => !v)}
      />
      <div className="shell-body">
        <Sidebar role={session?.role} open={menuOpen} onClose={() => setMenuOpen(false)} />
        <main>
          {flash && <div className="message">{flash}</div>}
          <Routes>
            <Route path="/" element={<LandingPage onSeed={seed} />} />
            <Route path="/donations" element={<Donations />} />
            <Route path="/campaign/:id" element={<CampaignDetails />} />
            <Route path="/ngo/:id" element={<OrganizationPublic />} />
            <Route path="/intelligence" element={<LocalIntelligence />} />
            <Route path="/notifications" element={<Notifications session={session} />} />
            <Route
              path="/volunteer/dashboard"
              element={
                <Guard session={session} allow={["volunteer", "admin"]}>
                  <VolunteerDashboard session={session} />
                </Guard>
              }
            />
            <Route
              path="/ngo/dashboard"
              element={
                <Guard session={session} allow={["coordinator", "admin"]}>
                  <NGODashboard session={session} />
                </Guard>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  )
}
