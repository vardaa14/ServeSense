import { useEffect, useState } from "react";
import { api, getDemandPrediction } from "../api/client";
import MapView from "../components/MapView";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";

export default function LocalIntelligence() {
  // Existing local intelligence state
  const [communities, setCommunities] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [map, setMap] = useState(null);
  const [error, setError] = useState("");

  // Demand prediction state
  const [region, setRegion] = useState("Ward-A");
  const [severity, setSeverity] = useState(5.0);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [predictionError, setPredictionError] = useState("");

  // Load local intelligence data
  useEffect(() => {
    Promise.all([
      api("/intelligence/communities"),
      api("/intelligence/gaps"),
      api("/intelligence/map"),
    ])
      .then(([communitiesData, gapsData, mapData]) => {
        setCommunities(communitiesData);
        setGaps(gapsData);
        setMap(mapData);
      })
      .catch((err) => {
        setError(err.message || "Failed to load local intelligence data.");
      });
  }, []);

  // Generate demand prediction
  const handlePredict = async () => {
    setLoading(true);
    setPredictionError("");

    try {
      const data = await getDemandPrediction({
        region,
        disaster_severity_score: parseFloat(severity),
        vulnerability_index: 0.7,
        population_density_sqkm: 12000,
      });

      setPrediction(data);
    } catch (err) {
      console.error("Demand prediction failed:", err);
      setPredictionError(
        err.message || "Failed to generate demand prediction."
      );
    } finally {
      setLoading(false);
    }
  };

  // Demand badge styling
  const getBadgeColor = (level) => {
    switch (level) {
      case "CRITICAL":
        return "bg-red-500 text-white";
      case "HIGH":
        return "bg-orange-500 text-white";
      case "MODERATE":
        return "bg-yellow-500 text-black";
      default:
        return "bg-green-500 text-white";
    }
  };

  // Build map points
  const points = [];

  map?.communities?.forEach((community) => {
    points.push({
      id: `c-${community.id}`,
      lat: community.lat,
      lng: community.lng,
      label: community.name,
      kind:
        community.need_level === "high" ? "need" : "community",
    });
  });

  map?.tasks?.forEach((task) => {
    points.push({
      id: `t-${task.id}`,
      lat: task.lat,
      lng: task.lng,
      label: task.title,
      kind:
        task.kind === "urgent_task" ? "urgent" : "task",
    });
  });

  map?.volunteers?.forEach((volunteer) => {
    points.push({
      id: `v-${volunteer.id}`,
      lat: volunteer.lat,
      lng: volunteer.lng,
      label: "Volunteer",
      kind: "resource",
    });
  });

  map?.organizations?.forEach((organization) => {
    points.push({
      id: `o-${organization.id}`,
      lat: organization.lat,
      lng: organization.lng,
      label: organization.name,
      kind:
        organization.kind === "relief_center"
          ? "center"
          : "org",
    });
  });

  return (
    <div className="page">
      {/* Page Header */}
      <section className="page-header">
        <div>
          <h1>Local Intelligence</h1>
          <p>
            Where help is needed, how urgent it is, and where volunteer
            capacity exists.
          </p>
        </div>
      </section>

      {/* API Error */}
      {error && (
        <div className="message error">
          {error}
        </div>
      )}

      {/* Map */}
      <MapView points={points} />

      {/* Map Legend */}
      <div className="legend">
        <span className="pin-key need">
          Need / community
        </span>

        <span className="pin-key urgent">
          Urgent task
        </span>

        <span className="pin-key resource">
          Volunteer
        </span>

        <span className="pin-key center">
          Relief center
        </span>
      </div>

      {/* Community Intelligence */}
      <div className="card-grid">
        {communities.length === 0 && (
          <EmptyState title="No community intelligence yet" />
        )}

        {communities.map((community) => (
          <article
            className="card"
            key={community.id}
          >
            <h3>{community.name}</h3>

            <p className="muted">
              {community.city} · Need score{" "}
              {Math.round(community.need_score * 100)}%{" "}
              ({community.need_level})
            </p>

            <label>Vulnerability</label>

            <div className="progress">
              <div
                style={{
                  width: `${community.vulnerability_score * 100}%`,
                }}
              />
            </div>

            <label>Service gap</label>

            <div className="progress">
              <div
                style={{
                  width: `${community.service_gap_score * 100}%`,
                }}
              />
            </div>

            <div className="stats mini">
              <StatCard
                label="Population"
                value={
                  community.population_estimate?.toLocaleString?.() ||
                  "—"
                }
              />

              <StatCard
                label="Open needs"
                value={community.open_tasks}
              />

              <StatCard
                label="Unfilled positions"
                value={community.unfilled_positions}
              />

              <StatCard
                label="Urgent tasks"
                value={community.urgent_tasks}
              />
            </div>

            <h4>
              {community.need_level === "high"
                ? "High need area"
                : "Need reasons"}
            </h4>

            <ul className="reason-list">
              {community.reasons?.map((reason) => (
                <li key={reason}>
                  ✓ {reason}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {/* Volunteer-to-Need Gaps */}
      <section className="local-intelligence-section">
        <h2>Volunteer-to-need gaps</h2>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Community</th>
                <th>Required</th>
                <th>Assigned</th>
                <th>Gap</th>
              </tr>
            </thead>

            <tbody>
              {gaps.map((gap) => (
                <tr key={gap.task_id}>
                  <td>{gap.title}</td>
                  <td>{gap.community}</td>
                  <td>{gap.required}</td>
                  <td>{gap.assigned}</td>
                  <td>{gap.gap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Predictive Volunteer Intelligence */}
      <section className="local-intelligence-section">
        <h2>Predictive Volunteer Intelligence</h2>

        <p className="muted">
          Use disaster severity and local conditions to estimate future
          volunteer demand.
        </p>

        {/* Prediction Form */}
        <div className="card prediction-form">
          <div>
            <label
              htmlFor="region"
              className="block text-sm font-medium"
            >
              Region / Ward
            </label>

            <input
              id="region"
              type="text"
              value={region}
              onChange={(event) =>
                setRegion(event.target.value)
              }
              className="border p-2 rounded w-full mt-1"
            />
          </div>

          <div>
            <label
              htmlFor="severity"
              className="block text-sm font-medium"
            >
              Disaster Severity (0 - 10)
            </label>

            <input
              id="severity"
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={severity}
              onChange={(event) =>
                setSeverity(event.target.value)
              }
              className="w-full mt-1"
            />

            <span className="text-sm text-gray-600">
              Current Rating: {severity}
            </span>
          </div>

          <button
            onClick={handlePredict}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "Calculating..."
              : "Generate Demand Forecast"}
          </button>

          {predictionError && (
            <div className="message error">
              {predictionError}
            </div>
          )}
        </div>

        {/* Prediction Results */}
        {prediction && (
          <div className="card prediction-results">
            <div className="flex justify-between items-center">
              <h3>
                Forecast Results for {prediction.region}
              </h3>

              <span
                className={`px-3 py-1 rounded-full font-bold text-sm ${getBadgeColor(
                  prediction.demand_level
                )}`}
              >
                {prediction.demand_level} DEMAND
              </span>
            </div>

            <div className="text-3xl font-extrabold text-blue-600">
              {prediction.predicted_volunteer_demand}

              <span className="text-base text-gray-500 font-normal">
                {" "}
                volunteers required
              </span>
            </div>

            {/* Historical Context */}
            {prediction.historical_context && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-500 mb-2">
                  Historical Context (Database)
                </h4>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold">
                      {
                        prediction.historical_context
                          .hist_tasks_7d
                      }
                    </div>

                    <div className="text-xs text-gray-500">
                      Tasks (7d)
                    </div>
                  </div>

                  <div className="p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold">
                      {
                        prediction.historical_context
                          .hist_tasks_30d
                      }
                    </div>

                    <div className="text-xs text-gray-500">
                      Tasks (30d)
                    </div>
                  </div>

                  <div className="p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold">
                      {(
                        prediction.historical_context
                          .unfulfilled_task_ratio_30d * 100
                      ).toFixed(1)}
                      %
                    </div>

                    <div className="text-xs text-gray-500">
                      Unfulfilled Ratio
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}