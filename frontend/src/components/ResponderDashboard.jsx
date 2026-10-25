import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  ZoomControl,
} from "react-leaflet";
import {
  MapPin,
  AlertTriangle,
  Clock,
  LogOut,
  Navigation,
  Route,
  ShieldAlert,
  CheckCircle2,
  Radio,
} from "lucide-react";

import "leaflet/dist/leaflet.css";
import "./ResponderDashboard.css";

const SHARED_INCIDENTS_KEY = "resqconnect_shared_incidents_v1";

// Five sample incidents
const initialIncidents = [
  {
    id: "INC-101",
    title: "Building Fire",
    type: "Fire",
    location: "College Road, Nashik",
    lat: 19.9975,
    lng: 73.7898,
    severity: "Critical",
    status: "Pending",
    time: "5 min ago",
    description: "Fire emergency requiring immediate response.",
  },
  {
    id: "INC-102",
    title: "Road Accident",
    type: "Accident",
    location: "Mumbai Naka, Nashik",
    lat: 19.9868,
    lng: 73.7892,
    severity: "High",
    status: "Assigned",
    time: "12 min ago",
    description: "Vehicle collision; assistance required.",
  },
  {
    id: "INC-103",
    title: "Medical Emergency",
    type: "Medical",
    location: "Panchavati, Nashik",
    lat: 20.0063,
    lng: 73.7905,
    severity: "Medium",
    status: "Assigned",
    time: "18 min ago",
    description: "Medical assistance requested.",
  },
  {
    id: "INC-104",
    title: "Flood Emergency",
    type: "Flood",
    location: "Panchavati Riverside, Nashik",
    lat: 20.0115,
    lng: 73.7900,
    severity: "Critical",
    status: "Assigned",
    time: "8 min ago",
    description:
      "Rising water levels reported near residential buildings. Rescue and evacuation assistance required.",
  },
  {
    id: "INC-105",
    title: "Landslide",
    type: "Landslide",
    location: "Trimbak Road, Nashik",
    lat: 19.9730,
    lng: 73.6840,
    severity: "High",
    status: "Assigned",
    time: "15 min ago",
    description:
      "Debris has blocked part of the road. The area requires inspection and rescue support.",
  },
];

// Road conditions corresponding to the incidents above
const roads = [
  {
    name: "College Road",
    area: "Building Fire",
    condition: "Clear",
    detail: "Road access available. Proceed with caution.",
  },
  {
    name: "Mumbai Naka",
    area: "Road Accident",
    condition: "Heavy Traffic",
    detail: "Traffic congestion near the accident site.",
  },
  {
    name: "Panchavati Riverside",
    area: "Flood Emergency",
    condition: "Flood Risk",
    detail: "Waterlogging reported. Avoid low-lying roads.",
  },
  {
    name: "Trimbak Road",
    area: "Landslide",
    condition: "Blocked",
    detail: "Debris reported. Use an alternate route.",
  },
  {
    name: "Panchavati Main Road",
    area: "Medical Emergency",
    condition: "Clear",
    detail: "Passage available. Check local conditions.",
  },
];

const severityOrder = {
  Critical: 1,
  High: 2,
  Medium: 3,
  Low: 4,
};

const severityColors = {
  Critical: "#dc2626",
  High: "#ea580c",
  Medium: "#d97706",
  Low: "#16a34a",
};

function readSharedIncidents() {
  try {
    const saved = localStorage.getItem(SHARED_INCIDENTS_KEY);

    if (!saved) return initialIncidents;

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) return initialIncidents;

    return initialIncidents.map((incident) => {
      const shared = parsed.find(
        (item) => item.id === incident.id
      );

      return shared ? { ...incident, ...shared } : incident;
    });
  } catch (error) {
    console.error("Could not read incidents:", error);
    return initialIncidents;
  }
}

function writeSharedIncidents(incidentsToSave) {
  try {
    const existing = JSON.parse(
      localStorage.getItem(SHARED_INCIDENTS_KEY) || "[]"
    );

    const merged = Array.isArray(existing) ? [...existing] : [];

    incidentsToSave.forEach((incident) => {
      const index = merged.findIndex(
        (item) => item.id === incident.id
      );

      if (index >= 0) {
        merged[index] = { ...merged[index], ...incident };
      } else {
        merged.push(incident);
      }
    });

    localStorage.setItem(
      SHARED_INCIDENTS_KEY,
      JSON.stringify(merged)
    );
  } catch (error) {
    console.error("Could not save incidents:", error);
  }
}

function ResponderDashboard({ onLogout }) {
  const [incidents, setIncidents] = useState(readSharedIncidents);

  // Listen for updates from the admin dashboard in another tab.
  useEffect(() => {
    function handleStorage(event) {
      if (
        event.key !== SHARED_INCIDENTS_KEY ||
        !event.newValue
      ) {
        return;
      }

      try {
        const saved = JSON.parse(event.newValue);

        if (!Array.isArray(saved)) return;

        setIncidents((current) =>
          current.map((incident) => {
            const updated = saved.find(
              (item) => item.id === incident.id
            );

            return updated
              ? { ...incident, ...updated }
              : incident;
          })
        );
      } catch (error) {
        console.error("Could not sync incidents:", error);
      }
    }

    window.addEventListener("storage", handleStorage);

    return () =>
      window.removeEventListener("storage", handleStorage);
  }, []);

  // Start a rescue operation.
  const startRescueOperation = (incidentId) => {
    const incident = incidents.find(
      (item) => item.id === incidentId
    );

    if (!incident || incident.status !== "Assigned") return;

    const updatedIncidents = incidents.map((item) =>
      item.id === incidentId
        ? { ...item, status: "In Progress" }
        : item
    );

    setIncidents(updatedIncidents);
    writeSharedIncidents(updatedIncidents);
  };

  // Display assigned and ongoing incidents.
  const allocatedIncidents = [...incidents]
    .filter(
      (incident) =>
        incident.status === "Assigned" ||
        incident.status === "In Progress"
    )
    .sort(
      (a, b) =>
        (severityOrder[a.severity] || 99) -
        (severityOrder[b.severity] || 99)
    );

  const criticalCount = allocatedIncidents.filter(
    (incident) => incident.severity === "Critical"
  ).length;

  const affectedPeople = 28;

  return (
    <main className="responder-dashboard">
      {/* Header */}
      <header className="rd-topbar">
        <div className="rd-brand">
          <div className="rd-brand-icon">
            <ShieldAlert size={24} />
          </div>

          <div>
            <h1>ResQ Connect</h1>
            <p>Responder Operations</p>
          </div>
        </div>

        <div className="rd-header-right">
          <span className="rd-live-status">
            <span className="rd-live-dot" />
            Operations Active
          </span>

          <button
            className="rd-logout-button"
            type="button"
            onClick={onLogout}
          >
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Welcome section */}
      <section className="rd-welcome">
        <div>
          <p className="rd-eyebrow">RESPONDER WORKSPACE</p>
          <h2>Emergency Operations</h2>
          <p className="rd-subtitle">
            View allocated emergencies, incident locations and road
            conditions across Nashik.
          </p>
        </div>

        <div className="rd-priority-summary">
          <div className="rd-summary-icon">
            <AlertTriangle size={21} />
          </div>

          <div>
            <span>Critical emergencies</span>
            <strong>{criticalCount}</strong>
          </div>
        </div>
      </section>

      {/* Incident map */}
      <section className="rd-map-section">
        <div className="rd-section-heading">
          <div>
            <h3>
              <MapPin size={20} />
              Incident Map
            </h3>
            <p>Emergency locations and severity levels</p>
          </div>

          <span className="rd-count-badge">
            {incidents.length} incidents
          </span>
        </div>

        <div className="rd-map-layout">
          <div className="rd-map">
            <MapContainer
              center={[19.9975, 73.7898]}
              zoom={12}
              scrollWheelZoom={true}
              zoomControl={false}
              className="rd-leaflet-map"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <ZoomControl position="bottomright" />

              {incidents.map((incident) => (
                <CircleMarker
                  key={incident.id}
                  center={[incident.lat, incident.lng]}
                  radius={
                    incident.severity === "Critical" ? 12 : 9
                  }
                  pathOptions={{
                    color: severityColors[incident.severity],
                    fillColor: severityColors[incident.severity],
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="rd-map-popup">
                      <strong>{incident.title}</strong>
                      <p>{incident.location}</p>
                      <span>
                        Severity: {incident.severity}
                      </span>
                      <br />
                      <span>Status: {incident.status}</span>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          <aside className="rd-map-legend">
            <h4>Severity Legend</h4>

            {Object.entries(severityColors).map(
              ([severity, color]) => (
                <div className="rd-legend-item" key={severity}>
                  <span
                    className="rd-legend-dot"
                    style={{ backgroundColor: color }}
                  />
                  <span>{severity}</span>
                </div>
              )
            )}

            <div className="rd-map-note">
              <Navigation size={17} />
              <p>
                Select a map marker to inspect an incident.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* Summary cards */}
      <section className="rd-incidents-section">
        <div className="rd-section-heading">
          <div>
            <h3>
              <Radio size={20} />
              Allocated Emergencies
            </h3>
            <p>
              Assigned incidents sorted by severity
            </p>
          </div>

          <span className="rd-count-badge">
            {allocatedIncidents.length} allocated
          </span>
        </div>

        <div className="rd-incident-list">
          {allocatedIncidents.map((incident) => (
            <article
              className={`rd-incident-card rd-${incident.severity.toLowerCase()}`}
              key={incident.id}
            >
              <div
                className="rd-incident-severity"
                style={{
                  backgroundColor: severityColors[incident.severity],
                }}
              />

              <div className="rd-incident-main">
                <div className="rd-incident-title-row">
                  <span className="rd-incident-id">
                    {incident.id}
                  </span>

                  <span
                    className="rd-severity-badge"
                    style={{
                      color: severityColors[incident.severity],
                      backgroundColor:
                        `${severityColors[incident.severity]}15`,
                    }}
                  >
                    {incident.severity}
                  </span>
                </div>

                <h4>{incident.title}</h4>

                <p className="rd-incident-description">
                  {incident.description}
                </p>

                <div className="rd-incident-meta">
                  <span>
                    <MapPin size={15} />
                    {incident.location}
                  </span>

                  <span>
                    <Clock size={15} />
                    {incident.time}
                  </span>
                </div>
              </div>

              <div className="rd-incident-right">
                <span
                  className={`rd-assigned-status rd-status-${incident.status
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                >
                  <CheckCircle2 size={15} />
                  {incident.status}
                </span>

                {incident.status === "Assigned" && (
                  <button
                    className="rd-start-button"
                    type="button"
                    onClick={() =>
                      startRescueOperation(incident.id)
                    }
                  >
                    <Navigation size={15} />
                    Start Rescue Operation
                  </button>
                )}

                {incident.status === "In Progress" && (
                  <span
                    className="rd-operation-started"
                    role="status"
                  >
                    <CheckCircle2 size={15} />
                    Operation In Progress
                  </span>
                )}
              </div>
            </article>
          ))}

          {allocatedIncidents.length === 0 && (
            <div className="rd-empty-state">
              <CheckCircle2 size={30} />
              <h4>No allocated emergencies</h4>
              <p>New assignments will appear here.</p>
            </div>
          )}
        </div>
      </section>

      {/* Road conditions */}
      <section className="rd-roads-section">
        <div className="rd-section-heading">
          <div>
            <h3>
              <Route size={20} />
              Road Conditions
            </h3>
            <p>
              Check road access before travelling to an incident
            </p>
          </div>
        </div>

        <div className="rd-road-grid">
          {roads.map((road) => (
            <article className="rd-road-card" key={road.name}>
              <div className="rd-road-icon">
                <Navigation size={21} />
              </div>

              <div className="rd-road-info">
                <h4>{road.name}</h4>
                <p>{road.area}</p>

                <span
                  className={`rd-road-status rd-road-${road.condition
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                >
                  {road.condition}
                </span>

                <p className="rd-road-detail">
                  {road.detail}
                </p>
              </div>
            </article>
          ))}
        </div>

        <p className="rd-road-disclaimer">
          Road conditions are illustrative sample data and are not
          verified live traffic or emergency information.
        </p>
      </section>

      <footer className="rd-footer">
        <span>ResQ Connect · Responder Operations</span>
        <span>Stay alert. Respond safely.</span>
      </footer>
    </main>
  );
}

export default ResponderDashboard;