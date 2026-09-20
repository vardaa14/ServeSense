export default function MapView({ points = [], height = 360 }) {
  const usable = points.filter((p) => p.lat != null && p.lng != null)
  if (usable.length === 0) {
    return <div className="map empty-map">No mapped locations yet. Seed demo data to plot communities and tasks.</div>
  }
  const lats = usable.map((p) => p.lat)
  const lngs = usable.map((p) => p.lng)
  const minLat = Math.min(...lats) - 0.02
  const maxLat = Math.max(...lats) + 0.02
  const minLng = Math.min(...lngs) - 0.02
  const maxLng = Math.max(...lngs) + 0.02
  const project = (lat, lng) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 100
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * 100
    return { x, y }
  }

  return (
    <div className="map" style={{ height }}>
      <div className="map-grid" />
      {usable.map((p) => {
        const { x, y } = project(p.lat, p.lng)
        return (
          <button
            key={p.id}
            className={`pin ${p.kind || "need"}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            title={p.label}
            type="button"
          >
            <span />
            <em>{p.label}</em>
          </button>
        )
      })}
    </div>
  )
}
