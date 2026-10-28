import React, { useMemo, useState } from "react";
import {
  LayoutDashboard,
  MapPin,
  Bell,
  Users,
  BrainCircuit,
  ClipboardList,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Activity,
  Menu,
  X,
  UserCheck,
  ArrowUpRight,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  ZoomControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./AdminDashboard.css";

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
    assignedTo: "",
    people: 12,
  },
  {
    id: "INC-102",
    title: "Road Accident",
    type: "Accident",
    location: "Mumbai Naka, Nashik",
    lat: 19.9868,
    lng: 73.7892,
    severity: "High",
    status: "Pending",
    time: "12 min ago",
    assignedTo: "",
    people: 3,
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
    assignedTo: "RSP-002",
    people: 1,
  },
  {
    id: "INC-104",
    title: "Waterlogging",
    type: "Flood",
    location: "Gangapur Road, Nashik",
    lat: 20.005,
    lng: 73.762,
    severity: "Low",
    status: "Resolved",
    time: "35 min ago",
    assignedTo: "",
    people: 0,
  },
];

const initialTeams = [
  {
    id: "RSP-001",
    team: "Fire & Rescue",
    speciality: "Fire response",
    status: "Available",
  },
  {
    id: "RSP-002",
    team: "Medical Team",
    speciality: "Medical assistance",
    status: "Busy",
  },
  {
    id: "RSP-003",
    team: "Rescue Team A",
    speciality: "Search & rescue",
    status: "Available",
  },
  {
    id: "RSP-004",
    team: "Traffic & Safety",
    speciality: "Road safety",
    status: "Offline",
  },
];

const initialRoads = [
  { name: "College Road", status: "Clear" },
  { name: "Mumbai Naka", status: "Heavy Traffic" },
  { name: "Panchavati Main Road", status: "Blocked" },
];

const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "map", label: "Incident Map", icon: MapPin },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "teams", label: "Rescue Teams", icon: Users },
  { id: "ai", label: "AI Priority & Scheduling", icon: BrainCircuit },
  { id: "allotment", label: "Team Allotment", icon: ClipboardList },
];

const severityRank = {
  Critical: 1,
  High: 2,
  Medium: 3,
  Low: 4,
};

const severityDescription = (incident) => {
  if (incident.status === "Resolved") {
    return "This incident is marked resolved. Retain the record for review and reporting.";
  }

  switch (incident.severity) {
    case "Critical":
      return `Immediate review recommended. The report lists ${incident.people} people affected. Verify the situation and prioritize an appropriate response team.`;
    case "High":
      return `Prompt assessment recommended. The report lists ${incident.people} people affected. Check the situation and arrange a suitable response.`;
    case "Medium":
      return `Moderate priority based on the current report. Check response progress and reassess if new information indicates greater risk.`;
    default:
      return "Lower priority based on the current report. Continue monitoring and reassess if conditions change.";
  }
};

export default function AdminDashboard({ onLogout = () => {} }) {
  const [activeSection, setActiveSection] = useState("overview");
  const [incidents, setIncidents] = useState(initialIncidents);
  const [teams, setTeams] = useState(initialTeams);
  const [selectedTeams, setSelectedTeams] = useState({});
  const [notice, setNotice] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sortedIncidents = useMemo(
    () =>
      [...incidents].sort(
        (a, b) => severityRank[a.severity] - severityRank[b.severity]
      ),
    [incidents]
  );

  const activeIncidents = incidents.filter(
    (incident) => incident.status !== "Resolved"
  );

  const criticalCount = activeIncidents.filter(
    (incident) => incident.severity === "Critical"
  ).length;

  const availableTeams = teams.filter(
    (team) => team.status === "Available"
  );

  const resolvedCount = incidents.filter(
    (incident) => incident.status === "Resolved"
  ).length;

  const pendingCount = activeIncidents.filter(
    (incident) => incident.status === "Pending"
  ).length;

  const getTeamName = (teamId) =>
    teams.find((team) => team.id === teamId)?.team || "Unassigned";

  const showNotice = (message) => {
    setNotice(message);
  };

  function assignTeam(incidentId) {
    const teamId = selectedTeams[incidentId];

    if (!teamId) {
      showNotice("Select a rescue team before assigning the incident.");
      return;
    }

    const team = teams.find((item) => item.id === teamId);

    if (!team || team.status !== "Available") {
      showNotice("This rescue team is not currently available.");
      return;
    }

    const incident = incidents.find((item) => item.id === incidentId);

    if (!incident || incident.status === "Resolved") {
      showNotice("Resolved incidents cannot be assigned.");
      return;
    }

    setIncidents((current) =>
      current.map((item) =>
        item.id === incidentId
          ? { ...item, assignedTo: teamId, status: "Assigned" }
          : item
      )
    );

    setTeams((current) =>
      current.map((item) =>
        item.id === teamId ? { ...item, status: "Busy" } : item
      )
    );

    showNotice(`${team.team} assigned to ${incidentId}.`);
  }

  function updateStatus(incidentId, nextStatus) {
    const incident = incidents.find((item) => item.id === incidentId);
    if (!incident) return;

    setIncidents((current) =>
      current.map((item) =>
        item.id === incidentId ? { ...item, status: nextStatus } : item
      )
    );

    if (nextStatus === "Resolved" && incident.assignedTo) {
      setTeams((current) =>
        current.map((team) =>
          team.id === incident.assignedTo
            ? { ...team, status: "Available" }
            : team
        )
      );
    }

    showNotice(`${incidentId} status updated to ${nextStatus}.`);
  }

  function changeSection(section) {
    setActiveSection(section);
    setMobileMenuOpen(false);
    setNotice("");
  }

  function SectionHeading({ eyebrow, title, description }) {
    return (
      <div className="ad-section-heading">
        <p className="ad-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {description && <span>{description}</span>}
      </div>
    );
  }

  function SummaryCard({ icon: Icon, label, value, color }) {
    return (
      <div className="ad-summary-card">
        <div className={`ad-summary-icon ${color}`}>
          <Icon size={21} />
        </div>
        <div>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      </div>
    );
  }

  function IncidentCard({ incident }) {
    return (
      <article className="ad-incident-card">
        <div
          className="ad-severity-line"
          style={{
            background:
              {
                Critical: "#dc363f",
                High: "#e87527",
                Medium: "#d6a21e",
                Low: "#26975d",
              }[incident.severity],
          }}
        />

        <div className="ad-incident-content">
          <div className="ad-incident-topline">
            <span className="ad-incident-id">{incident.id}</span>
            <span className={`ad-severity-pill ${incident.severity.toLowerCase()}`}>
              {incident.severity}
            </span>
            <span
              className={`ad-status-pill ${incident.status
                .toLowerCase()
                .replace(" ", "-")}`}
            >
              {incident.status}
            </span>
          </div>

          <h3>{incident.title}</h3>
          <p className="ad-incident-location">
            <MapPin size={14} />
            {incident.location}
          </p>

          <div className="ad-incident-meta">
            <span>
              <Clock size={13} /> {incident.time}
            </span>
            <span>
              <Users size={13} /> {incident.people} people reported affected
            </span>
          </div>

          <p className="ad-assigned-name">
            <ShieldCheck size={14} />
            Assigned team: {getTeamName(incident.assignedTo)}
          </p>

          <div className="ad-assignment-controls">
            <select
              aria-label={`Select rescue team for ${incident.id}`}
              value={selectedTeams[incident.id] || ""}
              onChange={(event) =>
                setSelectedTeams((current) => ({
                  ...current,
                  [incident.id]: event.target.value,
                }))
              }
              disabled={incident.status === "Resolved"}
            >
              <option value="">Select available rescue team</option>
              {teams
                .filter(
                  (team) =>
                    team.status === "Available" ||
                    team.id === incident.assignedTo
                )
                .map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.team}
                  </option>
                ))}
            </select>

            <button
              className="ad-primary-button"
              onClick={() => assignTeam(incident.id)}
              disabled={incident.status === "Resolved"}
            >
              <UserCheck size={15} />
              Assign team
            </button>
          </div>

          <div className="ad-status-control">
            <label htmlFor={`status-${incident.id}`}>Update status</label>
            <select
              id={`status-${incident.id}`}
              value={incident.status}
              onChange={(event) =>
                updateStatus(incident.id, event.target.value)
              }
            >
              <option>Pending</option>
              <option>Assigned</option>
              <option>In Progress</option>
              <option>Resolved</option>
            </select>
          </div>
        </div>
      </article>
    );
  }

  function Overview() {
    return (
      <>
        <SectionHeading
          eyebrow="OPERATIONS CENTRE"
          title="Admin Overview"
          description="Monitor reported incidents, coordinate rescue teams, and review response priorities."
        />

        <div className="ad-summary-grid">
          <SummaryCard
            icon={Activity}
            label="Active incidents"
            value={activeIncidents.length}
            color="blue"
          />
          <SummaryCard
            icon={AlertTriangle}
            label="Critical incidents"
            value={criticalCount}
            color="red"
          />
          <SummaryCard
            icon={Users}
            label="Available teams"
            value={availableTeams.length}
            color="green"
          />
          <SummaryCard
            icon={CheckCircle2}
            label="Resolved incidents"
            value={resolvedCount}
            color="purple"
          />
        </div>

        <div className="ad-overview-grid">
          <section className="ad-panel">
            <div className="ad-panel-heading">
              <div>
                <h3>
                  <MapPin size={18} /> Incident locations
                </h3>
                <p>Reported incident locations around Nashik.</p>
              </div>
              <button
                className="ad-text-button"
                onClick={() => changeSection("map")}
              >
                Open map <ArrowUpRight size={14} />
              </button>
            </div>

            <IncidentMap />
          </section>

          <section className="ad-panel">
            <div className="ad-panel-heading">
              <div>
                <h3>
                  <BrainCircuit size={18} /> Priority overview
                </h3>
                <p>Incidents ordered by recorded severity.</p>
              </div>
            </div>

            <PriorityList incidents={sortedIncidents.slice(0, 4)} />
          </section>
        </div>

        <section className="ad-panel">
          <div className="ad-panel-heading">
            <div>
              <h3>
                <Activity size={18} /> Incident queue
              </h3>
              <p>Review details and assign an available rescue team.</p>
            </div>
            <button
              className="ad-text-button"
              onClick={() => changeSection("allotment")}
            >
              Manage allotment <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="ad-incident-list">
            {sortedIncidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        </section>
      </>
    );
  }

  function IncidentMap() {
    return (
      <div className="ad-map-layout">
        <div className="ad-map">
          <MapContainer
            center={[19.9975, 73.7898]}
            zoom={13}
            scrollWheelZoom
            zoomControl={false}
            className="ad-leaflet-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ZoomControl position="topright" />
            {incidents.map((incident) => (
              <CircleMarker
                key={incident.id}
                center={[incident.lat, incident.lng]}
                radius={incident.severity === "Critical" ? 10 : 7}
                pathOptions={{
                  color:
                    {
                      Critical: "#dc363f",
                      High: "#e87527",
                      Medium: "#d6a21e",
                      Low: "#26975d",
                    }[incident.severity],
                  fillOpacity: 0.75,
                }}
              >
                <Popup>
                  <strong>{incident.title}</strong>
                  <br />
                  {incident.location}
                  <br />
                  Severity: {incident.severity}
                  <br />
                  Status: {incident.status}
                  <br />
                  Team: {getTeamName(incident.assignedTo)}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="ad-map-legend">
          <h4>Severity</h4>
          {Object.entries({
            Critical: "#dc363f",
            High: "#e87527",
            Medium: "#d6a21e",
            Low: "#26975d",
          }).map(([label, color]) => (
            <div className="ad-legend-row" key={label}>
              <span style={{ background: color }} />
              {label}
            </div>
          ))}
          <div className="ad-map-help">
            <ShieldCheck size={18} />
            <p>Verify incident details before dispatching teams.</p>
          </div>
        </div>
      </div>
    );
  }

  function PriorityList({ incidents: list }) {
    return (
      <div className="ad-priority-list">
        {list.map((incident) => (
          <div className="ad-priority-row" key={incident.id}>
            <span
              className="ad-priority-dot"
              style={{
                background:
                  {
                    Critical: "#dc363f",
                    High: "#e87527",
                    Medium: "#d6a21e",
                    Low: "#26975d",
                  }[incident.severity],
              }}
            />
            <div>
              <strong>{incident.title}</strong>
              <small>
                {incident.id} · {incident.status}
              </small>
            </div>
            <span
              className={`ad-mini-severity ${incident.severity.toLowerCase()}`}
            >
              {incident.severity}
            </span>
          </div>
        ))}
      </div>
    );
  }

  function Alerts() {
    const alerts = activeIncidents.filter(
      (incident) =>
        incident.severity === "Critical" || incident.status === "Pending"
    );

    return (
      <>
        <SectionHeading
          eyebrow="ATTENTION REQUIRED"
          title="Incident Alerts"
          description="Review high-priority and pending incidents that may require action."
        />

        {alerts.length ? (
          <div className="ad-alert-list">
            {alerts.map((incident) => (
              <article
                key={incident.id}
                className={`ad-alert-card ${
                  incident.severity === "Critical" ? "critical-alert" : ""
                }`}
              >
                <AlertTriangle size={22} />
                <div>
                  <div className="ad-incident-topline">
                    <span className="ad-incident-id">{incident.id}</span>
                    <span
                      className={`ad-severity-pill ${incident.severity.toLowerCase()}`}
                    >
                      {incident.severity}
                    </span>
                  </div>
                  <h3>{incident.title}</h3>
                  <p>
                    {incident.location}. {severityDescription(incident)}
                  </p>
                  <button
                    onClick={() => {
                      changeSection("allotment");
                    }}
                  >
                    Review and assign <ArrowUpRight size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState message="There are no critical or pending active incidents." />
        )}
      </>
    );
  }

  function RescueTeams() {
    return (
      <>
        <SectionHeading
          eyebrow="RESPONSE RESOURCES"
          title="Rescue Team Management"
          description="Review team availability and their response specialities."
        />

        <div className="ad-responder-summary">
          <SummaryCard
            icon={Users}
            label="Total teams"
            value={teams.length}
            color="blue"
          />
          <SummaryCard
            icon={UserCheck}
            label="Available teams"
            value={availableTeams.length}
            color="green"
          />
          <SummaryCard
            icon={Activity}
            label="Busy teams"
            value={teams.filter((team) => team.status === "Busy").length}
            color="orange"
          />
        </div>

        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Rescue team</th>
                <th>Speciality</th>
                <th>Availability</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id}>
                  <td>
                    <div className="ad-team-cell">
                      <div className="ad-team-icon">
                        <ShieldCheck size={18} />
                      </div>
                      <strong>{team.team}</strong>
                    </div>
                  </td>
                  <td>{team.speciality}</td>
                  <td>
                    <span
                      className={`ad-status-pill ${team.status.toLowerCase()}`}
                    >
                      {team.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function AIRecommendations() {
    return (
      <>
        <SectionHeading
          eyebrow="DECISION SUPPORT"
          title="AI Priority & Scheduling"
          description="Review incident priorities and the reasons behind each recommendation."
        />

        <div className="ad-ai-banner">
          <div className="ad-ai-icon">
            <BrainCircuit size={25} />
          </div>
          <div>
            <h3>How priority is assessed</h3>
            <p>
              Recommendations use the recorded severity, reported number of
              people affected, and current incident status. This version uses
              rule-based logic, not a connected AI model. An administrator
              should verify every recommendation.
            </p>
          </div>
        </div>

        <div className="ad-priority-guide">
          {[
            {
              name: "Critical",
              color: "#dc363f",
              description:
                "Immediate review and rapid response are recommended because the reported severity is critical.",
            },
            {
              name: "High",
              color: "#e87527",
              description:
                "Prompt assessment is recommended after critical incidents have been considered.",
            },
            {
              name: "Medium",
              color: "#d6a21e",
              description:
                "Check the response progress and reassess if new details indicate greater risk.",
            },
            {
              name: "Low",
              color: "#26975d",
              description:
                "Continue monitoring and reassess if the situation or reported impact changes.",
            },
          ].map((item) => (
            <div className="ad-guide-item" key={item.name}>
              <span style={{ background: item.color }} />
              <div>
                <strong>{item.name} priority</strong>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="ad-panel">
          <div className="ad-panel-heading">
            <div>
              <h3>
                <BrainCircuit size={18} /> Incident recommendations
              </h3>
              <p>Sorted from highest to lowest recorded severity.</p>
            </div>
          </div>

          <div className="ad-ai-list">
            {sortedIncidents.map((incident, index) => (
              <article className="ad-ai-item" key={incident.id}>
                <div className="ad-ai-rank">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="ad-ai-item-main">
                  <div className="ad-ai-title">
                    <h3>{incident.title}</h3>
                    <span
                      className={`ad-severity-pill ${incident.severity.toLowerCase()}`}
                    >
                      {incident.severity}
                    </span>
                  </div>
                  <p>{severityDescription(incident)}</p>
                  <small>
                    {incident.id} · {incident.location} · {incident.status}
                  </small>
                </div>
                <button
                  className="ad-outline-button"
                  onClick={() => changeSection("allotment")}
                >
                  Manage team
                </button>
              </article>
            ))}
          </div>
        </section>
      </>
    );
  }

  function TeamAllotment() {
    return (
      <>
        <SectionHeading
          eyebrow="RESOURCE COORDINATION"
          title="Team Allotment"
          description="Assign available rescue teams and update incident progress."
        />

        <div className="ad-allotment-notice">
          <ShieldCheck size={22} />
          <p>
            Team assignments update this dashboard session. Connect your
            backend to save assignments across users and sessions.
          </p>
        </div>

        <div className="ad-incident-list">
          {sortedIncidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>

        <section className="ad-assignment-history">
          <h3>Current assignment overview</h3>
          {incidents.map((incident) => (
            <div className="ad-history-row" key={incident.id}>
              <span>
                <strong>{incident.id}</strong> · {incident.title}
              </span>
              <span>{getTeamName(incident.assignedTo)}</span>
              <span
                className={`ad-status-pill ${incident.status
                  .toLowerCase()
                  .replace(" ", "-")}`}
              >
                {incident.status}
              </span>
            </div>
          ))}
        </section>
      </>
    );
  }

  function EmptyState({ message }) {
    return (
      <div className="ad-empty">
        <CheckCircle2 size={35} />
        <h3>All clear</h3>
        <p>{message}</p>
      </div>
    );
  }

  const pageTitles = {
    overview: "Overview",
    map: "Incident Map",
    alerts: "Alerts",
    teams: "Rescue Teams",
    ai: "AI Priority & Scheduling",
    allotment: "Team Allotment",
  };

  return (
    <div className="admin-dashboard">
      {mobileMenuOpen && (
        <button
          className="ad-mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`ad-sidebar ${mobileMenuOpen ? "ad-sidebar-open" : ""}`}
      >
        <div className="ad-sidebar-brand">
          <div className="ad-logo">
            <ShieldCheck size={23} />
          </div>
          <div>
            <h1>ResQConnect</h1>
            <p>EMERGENCY RESPONSE</p>
          </div>
          <button
            className="ad-mobile-close"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="ad-admin-profile">
          <div className="ad-admin-avatar">
            <ShieldCheck size={19} />
          </div>
          <div>
            <strong>Administrator</strong>
            <span>Operations Manager</span>
          </div>
        </div>

        <p className="ad-nav-label">MAIN MENU</p>
        <nav className="ad-navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`ad-nav-item ${
                  activeSection === item.id ? "ad-nav-active" : ""
                }`}
                onClick={() => changeSection(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.id === "alerts" && pendingCount > 0 && (
                  <span className="ad-nav-count">{pendingCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="ad-sidebar-bottom">
          <div className="ad-sidebar-status">
            <span />
            <div>
              <strong>Dashboard ready</strong>
              <small>Local session</small>
            </div>
          </div>
          <button className="ad-sidebar-logout" onClick={onLogout}>
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="ad-main">
        <header className="ad-topbar">
          <button
            className="ad-mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="ad-breadcrumb">
            <span>ResQConnect</span>
            <span>/</span>
            <strong>{pageTitles[activeSection]}</strong>
          </div>
          <div className="ad-topbar-right">
            <span className="ad-topbar-live">
              <span /> Operations dashboard
            </span>
            <div className="ad-topbar-avatar">
              <ShieldCheck size={18} />
            </div>
          </div>
        </header>

        <div className="ad-page-content">
          {notice && (
            <div className="ad-notice" role="status">
              <CheckCircle2 size={18} />
              <span>{notice}</span>
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}

          {activeSection === "overview" && <Overview />}

          {activeSection === "map" && (
            <>
              <SectionHeading
                eyebrow="LOCATION MONITORING"
                title="Incident Map"
                description="View reported incident locations and their current statuses."
              />
              <section className="ad-panel">
                <IncidentMap />
              </section>
              <p className="ad-data-note">
                Map markers use the incident coordinates entered in this
                dashboard. Road conditions are predefined and are not live
                traffic reports.
              </p>
            </>
          )}

          {activeSection === "alerts" && <Alerts />}

          {activeSection === "teams" && <RescueTeams />}

          {activeSection === "ai" && <AIRecommendations />}

          {activeSection === "allotment" && <TeamAllotment />}
        </div>

        <footer className="ad-footer">
          <span>ResQConnect · Admin Operations</span>
          <span>Live updates require connected data sources.</span>
        </footer>
      </main>
    </div>
  );
}