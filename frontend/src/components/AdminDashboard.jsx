import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
  RefreshCw,
  Navigation,
} from "lucide-react";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  ZoomControl,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./AdminDashboard.css";

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const API_BASE = "http://127.0.0.1:8000/api";
const RESPONDER_RADIUS = 5000;
const DEFAULT_CENTER = [20.012512, 73.823212];

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

const severityColors = {
  Critical: "#dc363f",
  High: "#e87527",
  Medium: "#d6a21e",
  Low: "#26975d",
};

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

function isValidCoordinate(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);

  return (
    lat !== null &&
    lng !== null &&
    lat !== "" &&
    lng !== "" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

function getResponderLatitude(responder) {
  return responder?.latitude ?? responder?.lat ?? null;
}

function getResponderLongitude(responder) {
  return responder?.longitude ?? responder?.lng ?? null;
}

function getAssignmentForCase(assignments, caseId) {
  return assignments.find(
    (item) => String(item.case_id) === String(caseId)
  );
}

function formatIncident(caseData, assignments = []) {
  const severityMap = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  };

  const statusMap = {
    new: "Pending",
    pending: "Pending",
    assigned: "Assigned",
    in_progress: "In Progress",
    completed: "Resolved",
    resolved: "Resolved",
  };

  const assignment = getAssignmentForCase(
    assignments,
    caseData.case_id
  );

  const latitude = Number(caseData.latitude);
  const longitude = Number(caseData.longitude);
  const message = caseData.message || "";

  const peopleMatch = message.match(
    /People needing help:\s*(\d+)/i
  );

  return {
    id: `CASE-${caseData.case_id}`,
    caseId: caseData.case_id,
    title: `${caseData.disaster_type || "Emergency"} Emergency`,
    type: caseData.disaster_type || "Unknown",

    location: isValidCoordinate(latitude, longitude)
      ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
      : "Location unavailable",

    lat: latitude,
    lng: longitude,

    hasValidLocation: isValidCoordinate(latitude, longitude),

    severity:
      severityMap[
        String(caseData.severity || "low").toLowerCase()
      ] || "Low",

    status:
      statusMap[
        String(caseData.case_status || "new").toLowerCase()
      ] || "Pending",

    time: caseData.created_at
      ? new Date(caseData.created_at).toLocaleString()
      : "Time unavailable",

    assignedTo: assignment?.responder_name || "",
    assignedResponderId: assignment?.responder_id ?? null,
    assignmentId: assignment?.assignment_id ?? null,
    assignmentStatus: assignment?.assignment_status || "",
    responderStatus: assignment?.responder_status || "",

    assignedAt: assignment?.assigned_at || null,
    acceptedAt: assignment?.accepted_at || null,
    completedAt: assignment?.completed_at || null,

    people: peopleMatch ? Number(peopleMatch[1]) : 0,
    message,

    contactNumber: caseData.contact_number || "Not provided",
    priorityScore: caseData.priority_score ?? 0,
    verificationStatus:
      caseData.verification_status || "pending",
  };
}

function getAvailability(responder) {
  return String(
    responder?.responder_status ||
      responder?.status ||
      "unknown"
  ).toLowerCase();
}

function getDistance(distance) {
  const value = Number(distance);

  if (!Number.isFinite(value)) {
    return "Not available";
  }

  return `${(value / 1000).toFixed(2)} km`;
}

function formatDate(value) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleString();
}

// --------------------------------------------------
// MAP AUTO FIT
// --------------------------------------------------

function MapAutoFit({ incidents }) {
  const map = useMap();

  useEffect(() => {
    if (!incidents.length) return;

    const locations = incidents
      .filter((incident) => incident.hasValidLocation)
      .map((incident) => [incident.lat, incident.lng]);

    if (!locations.length) return;

    const uniqueLocations = [
      ...new Map(
        locations.map((location) => [
          `${location[0]},${location[1]}`,
          location,
        ])
      ).values(),
    ];

    if (uniqueLocations.length === 1) {
      map.setView(uniqueLocations[0], 14);
      return;
    }

    map.fitBounds(uniqueLocations, {
      padding: [35, 35],
      maxZoom: 14,
    });
  }, [incidents, map]);

  return null;
}

// ==================================================
// MAIN ADMIN DASHBOARD
// ==================================================

export default function AdminDashboard({
  onLogout = () => {},
}) {
  // ------------------------------------------------
  // STATE
  // ------------------------------------------------

  const [activeSection, setActiveSection] = useState("overview");

  const [incidents, setIncidents] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [incidentError, setIncidentError] = useState("");

  const [responders, setResponders] = useState([]);
  const [loadingResponders, setLoadingResponders] = useState(true);
  const [responderError, setResponderError] = useState("");

  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");

  const [selectedNearbyCase, setSelectedNearbyCase] = useState("");

  const [nearbyResponders, setNearbyResponders] = useState([]);
  const [loadingNearbyResponders, setLoadingNearbyResponders] = useState(false);
  const [nearbyResponderError, setNearbyResponderError] = useState("");

  const [recommendations, setRecommendations] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");

  const [selectedTeams, setSelectedTeams] = useState({});
  const [assigningCase, setAssigningCase] = useState(null);

  const [notice, setNotice] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const nearbyRequestRef = useRef(0);
  const recommendationRequestRef = useRef(0);

  // ------------------------------------------------
  // API REQUEST
  // ------------------------------------------------

  const apiRequest = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem("resqToken");

    if (!token) {
      throw new Error(
        "Authentication token missing. Please log in again."
      );
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || data.message || "Request failed."
      );
    }

    return data;
  }, []);

  // ------------------------------------------------
  // FETCH ASSIGNMENTS
  // ------------------------------------------------

  const fetchAssignments = useCallback(async () => {
    try {
      setLoadingAssignments(true);
      setAssignmentError("");

      const data = await apiRequest(
        `${API_BASE}/admin/assignments`
      );

      if (!Array.isArray(data)) {
        throw new Error(
          "Unexpected assignment history response."
        );
      }

      setAssignments(data);
      return data;
    } catch (error) {
      setAssignmentError(
        error.message || "Unable to load assignment history."
      );

      setAssignments([]);
      return [];
    } finally {
      setLoadingAssignments(false);
    }
  }, [apiRequest]);

  // ------------------------------------------------
  // FETCH RESPONDERS
  // ------------------------------------------------

  const fetchResponders = useCallback(async () => {
    try {
      setLoadingResponders(true);
      setResponderError("");

      const data = await apiRequest(
        `${API_BASE}/admin/responders`
      );

      if (!Array.isArray(data)) {
        throw new Error(
          "Unexpected responder data received from server."
        );
      }

      setResponders(data);
      return data;
    } catch (error) {
      setResponderError(
        error.message || "Unable to load responders."
      );

      setResponders([]);
      return [];
    } finally {
      setLoadingResponders(false);
    }
  }, [apiRequest]);

  // ------------------------------------------------
  // FETCH INCIDENTS
  // ------------------------------------------------

  const fetchIncidents = useCallback(async () => {
    try {
      setLoadingIncidents(true);
      setIncidentError("");

      const [caseData, assignmentData] = await Promise.all([
        apiRequest(`${API_BASE}/cases/`),
        apiRequest(`${API_BASE}/admin/assignments`).catch(() => []),
      ]);

      if (!Array.isArray(caseData)) {
        throw new Error(
          "Unexpected response received for SOS cases."
        );
      }

      const safeAssignments = Array.isArray(assignmentData)
        ? assignmentData
        : [];

      setAssignments(safeAssignments);

      const formatted = caseData.map((item) =>
        formatIncident(item, safeAssignments)
      );

      setIncidents(formatted);

      setSelectedNearbyCase((current) => {
        const stillExists = formatted.some(
          (incident) => String(incident.caseId) === String(current)
        );

        if (stillExists) {
          return String(current);
        }

        const firstPending = formatted.find(
          (incident) => incident.status === "Pending"
        );

        const firstActive = formatted.find(
          (incident) =>
            incident.status === "Assigned" ||
            incident.status === "In Progress"
        );

        const firstCase =
          firstPending || firstActive || formatted[0];

        return firstCase ? String(firstCase.caseId) : "";
      });

      return formatted;
    } catch (error) {
      setIncidentError(
        error.message || "Unable to load SOS cases."
      );

      return [];
    } finally {
      setLoadingIncidents(false);
    }
  }, [apiRequest]);

  // ------------------------------------------------
  // REFRESH DASHBOARD
  // ------------------------------------------------

  const refreshDashboard = useCallback(async () => {
    await Promise.all([
      fetchIncidents(),
      fetchResponders(),
      fetchAssignments(),
    ]);
  }, [
    fetchIncidents,
    fetchResponders,
    fetchAssignments,
  ]);

  // ------------------------------------------------
  // SELECTED INCIDENT
  // ------------------------------------------------

  const selectedIncident = useMemo(
    () =>
      incidents.find(
        (incident) =>
          String(incident.caseId) === String(selectedNearbyCase)
      ),
    [incidents, selectedNearbyCase]
  );

  const isPendingSelected =
    selectedIncident?.status === "Pending";

  // ------------------------------------------------
  // FETCH NEARBY RESPONDERS
  // ------------------------------------------------

  const fetchNearbyResponders = useCallback(
    async (caseId = selectedNearbyCase) => {
      const requestId = ++nearbyRequestRef.current;

      const incident = incidents.find(
        (item) => String(item.caseId) === String(caseId)
      );

      if (!incident || incident.status !== "Pending") {
        setNearbyResponders([]);
        setNearbyResponderError("");
        setLoadingNearbyResponders(false);
        return;
      }

      if (!incident.hasValidLocation) {
        setNearbyResponders([]);
        setLoadingNearbyResponders(false);

        setNearbyResponderError(
          "This SOS case does not have valid coordinates."
        );

        return;
      }

      try {
        setLoadingNearbyResponders(true);
        setNearbyResponderError("");
        setNearbyResponders([]);

        const params = new URLSearchParams({
          latitude: String(incident.lat),
          longitude: String(incident.lng),
          radius_meters: String(RESPONDER_RADIUS),
        });

        const data = await apiRequest(
          `${API_BASE}/locations/nearby-responders?${params.toString()}`
        );

        if (requestId !== nearbyRequestRef.current) return;

        const nearbyList = Array.isArray(data)
          ? data
          : Array.isArray(data?.responders)
            ? data.responders
            : [];

        const merged = nearbyList.map((nearby) => {
          const registered = responders.find(
            (item) =>
              String(item.responder_id) ===
              String(nearby.responder_id)
          );

          return {
            ...registered,
            ...nearby,

            name:
              nearby.name ||
              registered?.name ||
              "Unnamed responder",

            skills:
              nearby.skills ??
              registered?.skills ??
              "",

            equipment:
              nearby.equipment ??
              registered?.equipment ??
              "",

            responder_status:
              nearby.responder_status ||
              registered?.responder_status ||
              nearby.status ||
              registered?.status ||
              "unknown",

            email:
              nearby.email ||
              registered?.email ||
              "",

            latitude: getResponderLatitude(nearby) ??
              getResponderLatitude(registered),

            longitude: getResponderLongitude(nearby) ??
              getResponderLongitude(registered),
          };
        });

        setNearbyResponders(merged);
      } catch (error) {
        if (requestId !== nearbyRequestRef.current) return;

        setNearbyResponders([]);

        setNearbyResponderError(
          error.message ||
            "Unable to load nearby responders."
        );
      } finally {
        if (requestId === nearbyRequestRef.current) {
          setLoadingNearbyResponders(false);
        }
      }
    },
    [
      apiRequest,
      incidents,
      responders,
      selectedNearbyCase,
    ]
  );

  // ------------------------------------------------
  // FETCH AI RECOMMENDATIONS
  // ------------------------------------------------

  const fetchRecommendations = useCallback(
    async (caseId = selectedNearbyCase) => {
      const requestId = ++recommendationRequestRef.current;

      const incident = incidents.find(
        (item) => String(item.caseId) === String(caseId)
      );

      if (!incident || incident.status !== "Pending") {
        setRecommendations([]);
        setAiAnalysis(null);
        setRecommendationError("");
        setLoadingRecommendations(false);
        return;
      }

      try {
        setLoadingRecommendations(true);
        setRecommendationError("");

        setRecommendations([]);
        setAiAnalysis(null);

        const data = await apiRequest(
          `${API_BASE}/admin/recommend-responders/${caseId}`
        );

        if (requestId !== recommendationRequestRef.current) return;

        if (!Array.isArray(data.recommendations)) {
          throw new Error(
            "The recommendation endpoint did not return a recommendations list."
          );
        }

        const mergedRecommendations =
          data.recommendations.map((item) => {
            const registered = responders.find(
              (responder) =>
                String(responder.responder_id) ===
                String(item.responder_id)
            );

            return {
              ...registered,
              ...item,

              name:
                item.name ||
                registered?.name ||
                "Unnamed responder",

              skills:
                item.skills ??
                registered?.skills ??
                "",

              equipment:
                item.equipment ??
                registered?.equipment ??
                "",

              responder_status:
                item.responder_status ||
                registered?.responder_status ||
                item.status ||
                registered?.status ||
                "available",
            };
          });

        setRecommendations(mergedRecommendations);
        setAiAnalysis(data.ai_analysis || null);
      } catch (error) {
        if (requestId !== recommendationRequestRef.current) return;

        setRecommendationError(
          error.message ||
            "Unable to fetch AI recommendations."
        );
      } finally {
        if (requestId === recommendationRequestRef.current) {
          setLoadingRecommendations(false);
        }
      }
    },
    [
      apiRequest,
      incidents,
      responders,
      selectedNearbyCase,
    ]
  );

  // ------------------------------------------------
  // INITIAL DATA FETCH
  // ------------------------------------------------

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  // ------------------------------------------------
  // UPDATE SELECTED CASE DATA
  // ------------------------------------------------

  useEffect(() => {
    nearbyRequestRef.current += 1;
    recommendationRequestRef.current += 1;

    setNearbyResponders([]);
    setRecommendations([]);
    setAiAnalysis(null);

    setNearbyResponderError("");
    setRecommendationError("");

    setLoadingNearbyResponders(false);
    setLoadingRecommendations(false);

    if (!selectedIncident || selectedIncident.status !== "Pending") {
      return;
    }

    fetchNearbyResponders(selectedNearbyCase);
    fetchRecommendations(selectedNearbyCase);

    return () => {
      nearbyRequestRef.current += 1;
      recommendationRequestRef.current += 1;
    };
  }, [
    selectedNearbyCase,
    selectedIncident?.status,
    fetchNearbyResponders,
    fetchRecommendations,
  ]);

  // ------------------------------------------------
  // DERIVED DATA
  // ------------------------------------------------

  const sortedIncidents = useMemo(
    () =>
      [...incidents].sort(
        (a, b) =>
          severityRank[a.severity] -
            severityRank[b.severity] ||
          Number(b.caseId) - Number(a.caseId)
      ),
    [incidents]
  );

  const activeIncidents = incidents.filter(
    (incident) => incident.status !== "Resolved"
  );

  const criticalCount = activeIncidents.filter(
    (incident) => incident.severity === "Critical"
  ).length;

  const availableTeams = responders.filter(
    (responder) =>
      getAvailability(responder) === "available"
  );

  const busyTeams = responders.filter(
    (responder) =>
      getAvailability(responder) === "busy"
  );

  const resolvedCount = incidents.filter(
    (incident) => incident.status === "Resolved"
  ).length;

  const pendingCount = incidents.filter(
    (incident) => incident.status === "Pending"
  ).length;

  // ------------------------------------------------
  // GET ASSIGNED TEAM NAME
  // ------------------------------------------------

  const getTeamName = (incident) => {
    if (!incident) return "Not assigned";

    if (incident.assignedTo) {
      return incident.assignedTo;
    }

    if (incident.assignedResponderId) {
      const responder = responders.find(
        (item) =>
          String(item.responder_id) ===
          String(incident.assignedResponderId)
      );

      if (responder?.name) {
        return responder.name;
      }
    }

    return "Not assigned";
  };

  const showNotice = (message) => {
    setNotice(message);
  };

  // ------------------------------------------------
  // ASSIGN RESPONDER
  // ------------------------------------------------

  async function assignTeam(
    incidentId,
    responderIdOverride = null
  ) {
    const incident = incidents.find(
      (item) => item.id === incidentId
    );

    if (!incident || incident.status !== "Pending") {
      showNotice(
        "Only pending cases can receive a new assignment."
      );
      return;
    }

    const responderId =
      responderIdOverride || selectedTeams[incidentId];

    if (!responderId) {
      showNotice("Please select a responder.");
      return;
    }

    const responder = responders.find(
      (item) =>
        String(item.responder_id) === String(responderId)
    );

    if (!responder) {
      showNotice("Selected responder was not found.");
      return;
    }

    if (getAvailability(responder) !== "available") {
      showNotice(
        "This responder is busy and cannot be assigned."
      );
      return;
    }

    try {
      setAssigningCase(incidentId);
      setNotice("");

      const data = await apiRequest(
        `${API_BASE}/admin/assign-case`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            case_id: Number(incident.caseId),
            responder_id: Number(responderId),
          }),
        }
      );

      setSelectedTeams((current) => ({
        ...current,
        [incidentId]: "",
      }));

      showNotice(
        `Case ${data.case_id || incident.caseId} successfully assigned to ${responder.name}.`
      );

      await refreshDashboard();
    } catch (error) {
      showNotice(
        error.message || "Unable to assign responder."
      );
    } finally {
      setAssigningCase(null);
    }
  }

  // ------------------------------------------------
  // NAVIGATION
  // ------------------------------------------------

  function changeSection(section) {
    setActiveSection(section);
    setMobileMenuOpen(false);
    setNotice("");
  }

  // ==================================================
  // REUSABLE COMPONENTS
  // ==================================================

  function SectionHeading({
    eyebrow,
    title,
    description,
  }) {
    return (
      <div className="ad-section-heading">
        <p className="ad-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>

        {description && <span>{description}</span>}
      </div>
    );
  }

  function SummaryCard({
    icon: Icon,
    label,
    value,
    color,
  }) {
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

  function EmptyState({ message }) {
    return (
      <div className="ad-empty">
        <CheckCircle2 size={35} />
        <h3>No data to display</h3>
        <p>{message}</p>
      </div>
    );
  }

  // --------------------------------------------------
  // CASE SELECTOR
  // --------------------------------------------------

  function CaseSelector() {
    return (
      <section className="ad-panel ad-case-selector">
        <div className="ad-panel-heading">
          <div>
            <h3>
              <MapPin size={18} />
              Select SOS Case
            </h3>

            <p>
              Select any case to view its location and assignment
              details. AI recommendations are available only
              for pending cases.
            </p>
          </div>
        </div>

        <select
          value={selectedNearbyCase}
          onChange={(event) => {
            setSelectedNearbyCase(String(event.target.value));
          }}
        >
          <option value="">Select an SOS case</option>

          {incidents.map((incident) => (
            <option
              key={incident.caseId}
              value={String(incident.caseId)}
            >
              {incident.id} — {incident.title} ({incident.status})
            </option>
          ))}
        </select>

        {selectedIncident && (
          <div className="ad-selected-case-info">
            <strong>{selectedIncident.id}</strong>
            <span>{selectedIncident.title}</span>
            <span>Severity: {selectedIncident.severity}</span>
            <span>Status: {selectedIncident.status}</span>
            <span>Location: {selectedIncident.location}</span>
          </div>
        )}
      </section>
    );
  }

  // --------------------------------------------------
  // ASSIGNMENT DETAILS
  // --------------------------------------------------

  function AssignmentDetailsPanel({
    incident = selectedIncident,
  }) {
    if (!incident) return null;

    const history = assignments.filter(
      (item) =>
        String(item.case_id) === String(incident.caseId)
    );

    return (
      <section className="ad-panel ad-assignment-details">
        <div className="ad-panel-heading">
          <div>
            <h3>
              <ClipboardList size={18} />
              Assignment Details
            </h3>

            <p>
              Assignment information saved by the backend
              for {incident.id}.
            </p>
          </div>

          <span
            className={`ad-status-pill ${incident.status
              .toLowerCase()
              .replace(" ", "-")}`}
          >
            {incident.status}
          </span>
        </div>

        <div className="ad-assignment-detail-grid">
          <div>
            <span>Assigned responder</span>
            <strong>{getTeamName(incident)}</strong>
          </div>

          <div>
            <span>Responder ID</span>
            <strong>
              {incident.assignedResponderId ?? "Not assigned"}
            </strong>
          </div>

          <div>
            <span>Assignment status</span>
            <strong>
              {incident.assignmentStatus || "No assignment record"}
            </strong>
          </div>

          <div>
            <span>Responder availability</span>
            <strong>
              {incident.responderStatus || "Not available"}
            </strong>
          </div>

          <div>
            <span>Assigned at</span>
            <strong>{formatDate(incident.assignedAt)}</strong>
          </div>

          <div>
            <span>Accepted at</span>
            <strong>{formatDate(incident.acceptedAt)}</strong>
          </div>

          <div>
            <span>Completed at</span>
            <strong>{formatDate(incident.completedAt)}</strong>
          </div>
        </div>

        {history.length > 0 && (
          <div className="ad-assignment-history">
            <h3>Assignment history</h3>

            {history.map((item) => (
              <div
                className="ad-history-row"
                key={item.assignment_id}
              >
                <span>
                  <strong>
                    {item.responder_name || "Unknown responder"}
                  </strong>

                  <small>
                    {" "}· Responder ID: {item.responder_id}
                  </small>
                </span>

                <span>
                  Assigned: {formatDate(item.assigned_at)}
                </span>

                <span>
                  Accepted: {formatDate(item.accepted_at)}
                </span>

                <span>
                  Completed: {formatDate(item.completed_at)}
                </span>

                <span
                  className={`ad-status-pill ${
                    item.assignment_status === "completed"
                      ? "resolved"
                      : item.assignment_status === "pending"
                        ? "pending"
                        : "assigned"
                  }`}
                >
                  {item.assignment_status || "Unknown"}
                </span>
              </div>
            ))}
          </div>
        )}

        {history.length === 0 && (
          <p className="ad-data-note">
            No assignment history has been recorded for this case.
          </p>
        )}

        {loadingAssignments && (
          <p className="ad-data-note">
            Refreshing assignment records...
          </p>
        )}

        {assignmentError && (
          <p className="ad-data-note" role="alert">
            Assignment history could not be refreshed: {assignmentError}
          </p>
        )}
      </section>
    );
  }

  // --------------------------------------------------
  // AI ANALYSIS PANEL
  // --------------------------------------------------

  function AIAnalysisPanel() {
    if (!aiAnalysis) return null;

    const listValue = (value) => {
      if (Array.isArray(value)) {
        return value.length ? value.join(", ") : "None identified";
      }

      return value || "None identified";
    };

    const analysisItems = [
      {
        label: "Disaster Type",
        value: aiAnalysis.disaster_type || "Unknown",
        icon: <AlertTriangle size={18} />,
        color: "blue",
      },
      {
        label: "Urgency",
        value: aiAnalysis.urgency || "Unknown",
        icon: <Clock size={18} />,
        color: "orange",
      },
      {
        label: "Vulnerability",
        value: listValue(aiAnalysis.vulnerability),
        icon: <ShieldCheck size={18} />,
        color: "purple",
      },
      {
        label: "Required Help",
        value: listValue(aiAnalysis.required_help),
        icon: <UserCheck size={18} />,
        color: "green",
      },
    ];

    return (
      <section className="ad-panel ad-ai-analysis-panel">
        <div className="ad-panel-heading">
          <div>
            <h3>
              <BrainCircuit size={19} />
              AI Incident Analysis
            </h3>

            <p>
              Automated classification and assessment of the
              reported incident.
            </p>
          </div>

          <span className="ad-ai-badge">
            <Activity size={13} />
            AI Analysis
          </span>
        </div>

        <div className="ad-ai-analysis-grid">
          {analysisItems.map((item) => (
            <div
              className="ad-ai-analysis-item"
              key={item.label}
            >
              <div className={`ad-ai-analysis-icon ${item.color}`}>
                {item.icon}
              </div>

              <div className="ad-ai-analysis-content">
                <span className="ad-ai-analysis-label">
                  {item.label}
                </span>

                <strong className="ad-ai-analysis-value">
                  {item.value}
                </strong>
              </div>
            </div>
          ))}
        </div>

        <div className="ad-ai-analysis-footer">
          <ShieldCheck size={15} />

          <span>
            Results are based on the incident description
            processed by the backend classifier.
          </span>
        </div>
      </section>
    );
  }

  // --------------------------------------------------
  // NEARBY RESPONDERS PANEL
  // --------------------------------------------------

  function NearbyRespondersPanel() {
    if (!isPendingSelected) return null;

    return (
      <section className="ad-panel ad-nearby-panel">
        <div className="ad-panel-heading">
          <div>
            <h3>
              <MapPin size={18} />
              Nearby Responders
            </h3>

            <p>
              Responders within {RESPONDER_RADIUS / 1000} km
              of the selected pending case.
            </p>
          </div>

          <button
            className="ad-text-button"
            onClick={() => fetchNearbyResponders()}
            disabled={
              loadingNearbyResponders || !selectedNearbyCase
            }
          >
            <RefreshCw size={14} />

            {loadingNearbyResponders ? "Searching..." : "Refresh"}
          </button>
        </div>

        {loadingNearbyResponders && (
          <p>Searching around the selected SOS location...</p>
        )}

        {nearbyResponderError && (
          <div role="alert">
            <p>{nearbyResponderError}</p>
          </div>
        )}

        {!loadingNearbyResponders &&
          !nearbyResponderError &&
          nearbyResponders.length === 0 && (
            <EmptyState message="No responders were returned for this location. Check the case coordinates and nearby responder endpoint." />
          )}

        <div className="ad-nearby-list">
          {nearbyResponders.map((responder) => {
            const status = getAvailability(responder);
            const isAvailable = status === "available";

            return (
              <article
                className="ad-nearby-card"
                key={responder.responder_id}
              >
                <div className="ad-nearby-icon">
                  <ShieldCheck size={20} />
                </div>

                <div className="ad-nearby-details">
                  <div className="ad-nearby-title">
                    <strong>{responder.name}</strong>

                    <span
                      className={`ad-status-pill ${
                        isAvailable ? "available" : status
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <p>Responder ID: {responder.responder_id}</p>

                  <p>
                    Distance: {getDistance(responder.distance_meters)}
                  </p>

                  <p>
                    Skills: {responder.skills || "Not specified"}
                  </p>

                  <p>
                    Equipment: {responder.equipment || "Not specified"}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  // --------------------------------------------------
  // AI RECOMMENDATION PANEL
  // --------------------------------------------------

  function RecommendationPanel() {
    if (!isPendingSelected) return null;

    return (
      <section className="ad-panel ad-recommendation-panel">
        <div className="ad-panel-heading">
          <div>
            <h3>
              <BrainCircuit size={18} />
              AI Responder Recommendations
            </h3>

            <p>
              Ranked using distance, availability, skills,
              equipment, and workload.
            </p>
          </div>

          <button
            className="ad-text-button"
            onClick={() => fetchRecommendations()}
            disabled={
              loadingRecommendations || !selectedNearbyCase
            }
          >
            <RefreshCw size={14} />

            {loadingRecommendations ? "Analysing..." : "Refresh"}
          </button>
        </div>

        {loadingRecommendations && (
          <p>Calculating responder recommendations...</p>
        )}

        {recommendationError && (
          <div role="alert">
            <p>{recommendationError}</p>
          </div>
        )}

        {!loadingRecommendations &&
          !recommendationError &&
          recommendations.length === 0 && (
            <EmptyState message="No available responders were recommended for this case." />
          )}

        <div className="ad-recommendation-list">
          {recommendations.map((responder, index) => {
            const breakdown = responder.score_breakdown || {};

            const available =
              getAvailability(responder) === "available";

            const currentCaseId = `CASE-${selectedIncident?.caseId}`;

            return (
              <article
                className="ad-recommendation-card"
                key={responder.responder_id}
              >
                <div className="ad-recommendation-top">
                  <div>
                    <span className="ad-recommendation-rank">
                      Recommendation #{index + 1}
                    </span>

                    <h3>{responder.name}</h3>

                    <small>
                      Responder ID: {responder.responder_id}
                    </small>
                  </div>

                  <div className="ad-recommendation-score">
                    <strong>{responder.score ?? 0}</strong>
                    <span>/ 100</span>
                    <small>Match score</small>
                  </div>
                </div>

                <div className="ad-recommendation-details">
                  <div>
                    <span>Distance</span>
                    <strong>
                      {getDistance(responder.distance_meters)}
                    </strong>
                  </div>

                  <div>
                    <span>Availability</span>
                    <strong>
                      {available ? "Available" : "Busy"}
                    </strong>
                  </div>

                  <div>
                    <span>Active assignments</span>
                    <strong>
                      {responder.active_assignments ?? "N/A"}
                    </strong>
                  </div>
                </div>

                <div className="ad-recommendation-matches">
                  <p>
                    <strong>Skills:</strong>{" "}
                    {responder.skills || "Not specified"}
                  </p>

                  <p>
                    <strong>Matched skills:</strong>{" "}
                    {responder.matched_skills?.length
                      ? responder.matched_skills.join(", ")
                      : "No skill matches reported"}
                  </p>

                  <p>
                    <strong>Equipment:</strong>{" "}
                    {responder.equipment || "Not specified"}
                  </p>

                  <p>
                    <strong>Matched equipment:</strong>{" "}
                    {responder.matched_equipment?.length
                      ? responder.matched_equipment.join(", ")
                      : "No equipment matches reported"}
                  </p>
                </div>

                <div className="ad-score-breakdown">
                  <h4>Score breakdown</h4>

                  {[
                    ["Distance", breakdown.distance],
                    ["Availability", breakdown.availability],
                    ["Skills", breakdown.skills],
                    ["Equipment", breakdown.equipment],
                    ["Workload", breakdown.workload],
                  ].map(([label, score]) => (
                    <div className="ad-score-row" key={label}>
                      <span>{label}</span>
                      <strong>{score ?? 0}</strong>
                    </div>
                  ))}
                </div>

                <button
                  className="ad-primary-button"
                  onClick={() =>
                    assignTeam(currentCaseId, responder.responder_id)
                  }
                  disabled={
                    !available ||
                    !selectedIncident ||
                    selectedIncident.status !== "Pending" ||
                    assigningCase === currentCaseId
                  }
                >
                  <UserCheck size={15} />

                  {assigningCase === currentCaseId
                    ? "Assigning..."
                    : available
                      ? "Assign this responder"
                      : "Responder unavailable"}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  // --------------------------------------------------
  // INCIDENT CARD
  // --------------------------------------------------

  function IncidentCard({ incident }) {
    const isPending = incident.status === "Pending";

    return (
      <article className="ad-incident-card">
        <div
          className="ad-severity-line"
          style={{
            background: severityColors[incident.severity],
          }}
        />

        <div className="ad-incident-content">
          <div className="ad-incident-topline">
            <span className="ad-incident-id">{incident.id}</span>

            <span
              className={`ad-severity-pill ${incident.severity.toLowerCase()}`}
            >
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

          <p className="ad-incident-description">
            {incident.message}
          </p>

          <div className="ad-incident-meta">
            <span>
              <Clock size={13} />
              {incident.time}
            </span>

            <span>
              <Users size={13} />
              {incident.people} people reported
            </span>
          </div>

          <p className="ad-assigned-name">
            <ShieldCheck size={14} />
            Contact: {incident.contactNumber}
          </p>

          <p className="ad-assigned-name">
            <BrainCircuit size={14} />
            Priority score: {incident.priorityScore}
          </p>

          <p className="ad-assigned-name">
            <ShieldCheck size={14} />
            Verification: {incident.verificationStatus}
          </p>

          <p className="ad-assigned-name">
            <UserCheck size={14} />
            Assigned responder: {getTeamName(incident)}
          </p>

          {incident.assignmentStatus && (
            <p className="ad-assigned-name">
              <ClipboardList size={14} />
              Assignment: {incident.assignmentStatus}
            </p>
          )}

          {isPending && (
            <div className="ad-assignment-controls">
              <select
                aria-label={`Select responder for ${incident.id}`}
                value={selectedTeams[incident.id] || ""}
                onChange={(event) =>
                  setSelectedTeams((current) => ({
                    ...current,
                    [incident.id]: event.target.value,
                  }))
                }
                disabled={
                  loadingResponders ||
                  availableTeams.length === 0 ||
                  assigningCase === incident.id
                }
              >
                <option value="">
                  {loadingResponders
                    ? "Loading responders..."
                    : availableTeams.length
                      ? "Select available responder"
                      : "No available responders"}
                </option>

                {availableTeams.map((responder) => (
                  <option
                    key={responder.responder_id}
                    value={responder.responder_id}
                  >
                    {responder.name} — {responder.skills || "General"}
                  </option>
                ))}
              </select>

              <button
                className="ad-primary-button"
                onClick={() => assignTeam(incident.id)}
                disabled={
                  assigningCase === incident.id ||
                  loadingResponders ||
                  availableTeams.length === 0
                }
              >
                <UserCheck size={15} />

                {assigningCase === incident.id
                  ? "Assigning..."
                  : "Assign responder"}
              </button>
            </div>
          )}

          {!isPending && (
            <div className="ad-data-note">
              {incident.status === "Resolved"
                ? "This case is completed. Its assignment details are retained for review."
                : "This case already has an assignment. New recommendations and assignments are disabled."}
            </div>
          )}

          <div className="ad-status-control">
            <label htmlFor={`status-${incident.id}`}>
              Current status
            </label>

            <select
              id={`status-${incident.id}`}
              value={incident.status}
              disabled
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

  // --------------------------------------------------
  // PRIORITY LIST
  // --------------------------------------------------

  function PriorityList({ incidents: list }) {
    if (!list.length) {
      return (
        <EmptyState message="No SOS cases have been submitted yet." />
      );
    }

    return (
      <div className="ad-priority-list">
        {list.map((incident) => (
          <div className="ad-priority-row" key={incident.id}>
            <span
              className="ad-priority-dot"
              style={{
                background: severityColors[incident.severity],
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

  // ==================================================
  // INCIDENT MAP
  // ==================================================

  function IncidentMap({ showNearbyResponders = true } = {}) {
    const mappedIncidents = incidents.filter(
      (incident) => incident.hasValidLocation
    );

    const validNearbyResponders = showNearbyResponders && isPendingSelected
      ? nearbyResponders.filter((responder) =>
          isValidCoordinate(
            getResponderLatitude(responder),
            getResponderLongitude(responder)
          )
        )
      : [];

    const coordinateGroups = new Map();

    mappedIncidents.forEach((incident) => {
      const coordinateKey =
        `${Number(incident.lat).toFixed(5)},${Number(incident.lng).toFixed(5)}`;

      if (!coordinateGroups.has(coordinateKey)) {
        coordinateGroups.set(coordinateKey, []);
      }

      coordinateGroups.get(coordinateKey).push(incident);
    });

    const displayPositions = new Map();

    coordinateGroups.forEach((group) => {
      group.forEach((incident, index) => {
        if (group.length === 1) {
          displayPositions.set(incident.id, [
            incident.lat,
            incident.lng,
          ]);
          return;
        }

        const angle = (2 * Math.PI * index) / group.length;
        const offset = 0.00012;

        displayPositions.set(incident.id, [
          incident.lat + Math.cos(angle) * offset,
          incident.lng + Math.sin(angle) * offset,
        ]);
      });
    });

    const center =
      mappedIncidents.length > 0
        ? [mappedIncidents[0].lat, mappedIncidents[0].lng]
        : DEFAULT_CENTER;

    return (
      <>
        <div className="ad-map-layout">
          <div className="ad-map">
            <MapContainer
              key="resq-incident-map"
              center={center}
              zoom={12}
              scrollWheelZoom
              zoomControl={false}
              className="ad-leaflet-map"
            >
              <MapAutoFit incidents={mappedIncidents} />

              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <ZoomControl position="topright" />

              {/* SOS INCIDENT MARKERS */}

              {mappedIncidents.map((incident) => {
                const isSelected =
                  String(incident.caseId) ===
                  String(selectedNearbyCase);

                const markerPosition =
                  displayPositions.get(incident.id) ||
                  [incident.lat, incident.lng];

                return (
                  <CircleMarker
                    key={String(incident.caseId)}
                    center={markerPosition}
                    radius={
                      isSelected
                        ? 12
                        : incident.severity === "Critical"
                          ? 10
                          : 8
                    }
                    pathOptions={{
                      color: isSelected
                        ? "#172554"
                        : severityColors[incident.severity],
                      fillColor: severityColors[incident.severity],
                      fillOpacity: 0.9,
                      weight: isSelected ? 4 : 2,
                    }}
                    eventHandlers={{
                      click: () => {
                        setSelectedNearbyCase(
                          String(incident.caseId)
                        );
                      },
                    }}
                  >
                    <Popup>
                      <div>
                        <strong>{incident.id}</strong>
                        <br />
                        <strong>{incident.title}</strong>
                        <br />
                        Case ID: {incident.caseId}
                        <br />
                        Disaster type: {incident.type}
                        <br />
                        Severity: {incident.severity}
                        <br />
                        Status: {incident.status}
                        <br />
                        Location: {incident.location}
                        <br />
                        Assigned responder: {getTeamName(incident)}
                        <br />
                        Priority: {incident.priorityScore}
                        <br />
                        Contact: {incident.contactNumber}
                        <br />
                        Reported: {incident.time}
                        <br />
                        Description: {incident.message || "No description"}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

              {/* NEARBY RESPONDER MARKERS */}

              {validNearbyResponders.map((responder) => {
                const available =
                  getAvailability(responder) === "available";

                return (
                  <CircleMarker
                    key={`responder-${responder.responder_id}`}
                    center={[
                      Number(getResponderLatitude(responder)),
                      Number(getResponderLongitude(responder)),
                    ]}
                    radius={9}
                    pathOptions={{
                      color: available ? "#0759c7" : "#d97706",
                      fillColor: available ? "#1685ff" : "#f59e0b",
                      fillOpacity: 0.95,
                      weight: 3,
                    }}
                  >
                    <Popup>
                      <strong>{responder.name}</strong>
                      <br />
                      Responder ID: {responder.responder_id}
                      <br />
                      Status: {getAvailability(responder)}
                      <br />
                      Distance: {getDistance(responder.distance_meters)}
                      <br />
                      Skills: {responder.skills || "Not specified"}
                      <br />
                      Equipment: {responder.equipment || "Not specified"}
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          {/* MAP LEGEND */}

          <div className="ad-map-legend">
            <h4>Map Legend</h4>

            <p className="ad-map-legend-label">SOS Incidents</p>

            {Object.entries(severityColors).map(([label, color]) => (
              <div className="ad-legend-row" key={label}>
                <span style={{ background: color }} />
                {label}
              </div>
            ))}

            {showNearbyResponders && (
              <>
                <p className="ad-map-legend-label">
                  Nearby Responders
                </p>

                <div className="ad-legend-row">
                  <span style={{ background: "#1685ff" }} />
                  Available
                </div>

                <div className="ad-legend-row">
                  <span style={{ background: "#f59e0b" }} />
                  Busy / unavailable
                </div>

                <div className="ad-map-help">
                  <ShieldCheck size={18} />
                  <p>
                    {isPendingSelected
                      ? loadingNearbyResponders
                        ? "Searching around selected SOS location..."
                        : `${validNearbyResponders.length} nearby responder(s) with map coordinates.`
                      : "Nearby responders are shown only when a pending case is selected."}
                  </p>
                </div>
              </>
            )}

            <p>
              SOS cases with valid coordinates: {mappedIncidents.length}
            </p>

            {showNearbyResponders && (
              <>
                <p>
                  Nearby responders in list: {nearbyResponders.length}
                </p>

                <p>
                  Nearby responders displayed on map: {validNearbyResponders.length}
                </p>
              </>
            )}
          </div>
        </div>

        {/* INCIDENT LOCATION LIST */}

        <div className="ad-map-case-list">
          <div className="ad-panel-heading">
            <div>
              <h3>
                <Navigation size={18} />
                Incident locations
              </h3>

              <p>
                Select any case to view its own information.
              </p>
            </div>
          </div>

          {mappedIncidents.length === 0 ? (
            <EmptyState message="No SOS cases have valid map coordinates." />
          ) : (
            <div className="ad-map-case-grid">
              {mappedIncidents.map((incident) => (
                <button
                  type="button"
                  key={String(incident.caseId)}
                  className={`ad-map-case-item ${
                    String(incident.caseId) ===
                    String(selectedNearbyCase)
                      ? "ad-map-case-selected"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedNearbyCase(
                      String(incident.caseId)
                    );
                  }}
                >
                  <span
                    className="ad-priority-dot"
                    style={{
                      background: severityColors[incident.severity],
                    }}
                  />

                  <span>
                    <strong>{incident.id}</strong>
                    <small>{incident.title}</small>
                    <small>
                      {incident.status} · {incident.location}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  // ==================================================
  // OVERVIEW PAGE
  // ==================================================

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
            label="Available responders"
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

        <CaseSelector />

        <div className="ad-overview-grid">
          <section className="ad-panel">
            <div className="ad-panel-heading">
              <div>
                <h3>
                  <MapPin size={18} />
                  Incident locations
                </h3>

                <p>
                  SOS case locations across the dashboard.
                </p>
              </div>

              <button
                className="ad-text-button"
                onClick={() => changeSection("map")}
              >
                Open map <ArrowUpRight size={14} />
              </button>
            </div>

            <IncidentMap showNearbyResponders={false} />
          </section>

          <section className="ad-panel">
            <div className="ad-panel-heading">
              <div>
                <h3>
                  <BrainCircuit size={18} />
                  Priority overview
                </h3>

                <p>Cases ordered by recorded severity.</p>
              </div>
            </div>

            <PriorityList incidents={sortedIncidents.slice(0, 4)} />
          </section>
        </div>

        {/* AI analysis and responder panels are shown only on AI Priority & Scheduling. */}
        {selectedIncident && !isPendingSelected && (
          <AssignmentDetailsPanel />
        )}

        <section className="ad-panel">
          <div className="ad-panel-heading">
            <div>
              <h3>
                <Activity size={18} />
                Incident queue
              </h3>

              <p>Actual SOS cases submitted by citizens.</p>
            </div>
          </div>

          <div className="ad-incident-list">
            {sortedIncidents.length ? (
              sortedIncidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))
            ) : (
              <EmptyState message="No SOS cases found in the database." />
            )}
          </div>
        </section>
      </>
    );
  }

  // ==================================================
  // ALERTS PAGE
  // ==================================================

  function Alerts() {
    const alerts = activeIncidents.filter(
      (incident) =>
        incident.severity === "Critical" ||
        incident.status === "Pending"
    );

    return (
      <>
        <SectionHeading
          eyebrow="ATTENTION REQUIRED"
          title="Incident Alerts"
          description="Review high-priority and pending incidents."
        />

        {alerts.length ? (
          <div className="ad-alert-list">
            {alerts.map((incident) => (
              <article
                key={incident.id}
                className={`ad-alert-card ${
                  incident.severity === "Critical"
                    ? "critical-alert"
                    : ""
                }`}
              >
                <AlertTriangle size={22} />

                <div>
                  <div className="ad-incident-topline">
                    <span className="ad-incident-id">
                      {incident.id}
                    </span>

                    <span
                      className={`ad-severity-pill ${incident.severity.toLowerCase()}`}
                    >
                      {incident.severity}
                    </span>
                  </div>

                  <h3>{incident.title}</h3>
                  <p>{incident.message}</p>

                  <button
                    onClick={() => {
                      setSelectedNearbyCase(String(incident.caseId));

                      changeSection(
                        incident.status === "Pending"
                          ? "allotment"
                          : "overview"
                      );
                    }}
                  >
                    Review case <ArrowUpRight size={14} />
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

  // ==================================================
  // RESCUE TEAMS PAGE
  // ==================================================

  function RescueTeams() {
    return (
      <>
        <SectionHeading
          eyebrow="RESPONSE RESOURCES"
          title="Rescue Team Management"
          description="Registered responders and their current backend availability."
        />

        {responderError && (
          <div className="ad-panel" role="alert">
            <p>{responderError}</p>

            <button
              className="ad-primary-button"
              onClick={fetchResponders}
            >
              Retry loading responders
            </button>
          </div>
        )}

        <div className="ad-responder-summary">
          <SummaryCard
            icon={Users}
            label="Total responders"
            value={responders.length}
            color="blue"
          />

          <SummaryCard
            icon={UserCheck}
            label="Available responders"
            value={availableTeams.length}
            color="green"
          />

          <SummaryCard
            icon={Activity}
            label="Busy responders"
            value={busyTeams.length}
            color="orange"
          />
        </div>

        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Responder</th>
                <th>Email</th>
                <th>Skills</th>
                <th>Equipment</th>
                <th>Availability</th>
              </tr>
            </thead>

            <tbody>
              {responders.map((responder) => (
                <tr key={responder.responder_id}>
                  <td>
                    <div className="ad-team-cell">
                      <div className="ad-team-icon">
                        <ShieldCheck size={18} />
                      </div>

                      <strong>{responder.name}</strong>
                    </div>
                  </td>

                  <td>{responder.email || "Not provided"}</td>
                  <td>{responder.skills || "Not specified"}</td>
                  <td>{responder.equipment || "Not specified"}</td>

                  <td>
                    <span
                      className={`ad-status-pill ${getAvailability(responder)}`}
                    >
                      {getAvailability(responder)}
                    </span>
                  </td>
                </tr>
              ))}

              {!loadingResponders && responders.length === 0 && (
                <tr>
                  <td colSpan="5">
                    No registered responders found.
                  </td>
                </tr>
              )}

              {loadingResponders && (
                <tr>
                  <td colSpan="5">
                    Loading registered responders...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  // ==================================================
  // AI RECOMMENDATIONS PAGE
  // ==================================================

  function AIRecommendations() {
    return (
      <>
        <SectionHeading
          eyebrow="DECISION SUPPORT"
          title="AI Priority & Scheduling"
          description="Review incident classification and multi-factor responder recommendations."
        />

        <CaseSelector />

        {isPendingSelected ? (
          <>
            {/* AI ANALYSIS VISIBLE ONLY ON THIS PAGE */}
            <AIAnalysisPanel />

            <RecommendationPanel />
            <NearbyRespondersPanel />
          </>
        ) : selectedIncident ? (
          <AssignmentDetailsPanel />
        ) : (
          <EmptyState message="Select an SOS case to view its details." />
        )}
      </>
    );
  }

  // ==================================================
  // TEAM ALLOTMENT PAGE
  // ==================================================

  function TeamAllotment() {
    return (
      <>
        <SectionHeading
          eyebrow="RESOURCE COORDINATION"
          title="Team Allotment"
          description="Choose a pending SOS case and assign an appropriate available responder."
        />

        <div className="ad-allotment-notice">
          <ShieldCheck size={22} />

          <p>
            AI recommendations consider distance, availability,
            skills, equipment, and workload. Existing assignments
            are retrieved from the backend and displayed for review.
          </p>
        </div>

        <CaseSelector />

        {/* AI analysis, recommendations, and nearby responder panels are shown only on AI Priority & Scheduling. */}
        {selectedIncident && !isPendingSelected ? (
          <AssignmentDetailsPanel />
        ) : !selectedIncident ? (
          <EmptyState message="Select an SOS case to view its assignment details." />
        ) : null}

        <section className="ad-panel">
          <h3>All SOS cases</h3>

          <div className="ad-incident-list">
            {sortedIncidents.length ? (
              sortedIncidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))
            ) : (
              <EmptyState message="No SOS cases are available." />
            )}
          </div>
        </section>

        <section className="ad-assignment-history">
          <div className="ad-panel-heading">
            <div>
              <h3>Assignment overview</h3>

              <p>
                Responder names and assignment statuses retrieved
                from the backend.
              </p>
            </div>

            <button
              className="ad-text-button"
              onClick={fetchAssignments}
              disabled={loadingAssignments}
            >
              <RefreshCw size={14} />

              {loadingAssignments ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {assignmentError && (
            <p role="alert">{assignmentError}</p>
          )}

          {assignments.length ? (
            assignments.map((item) => (
              <div
                className="ad-history-row"
                key={item.assignment_id}
              >
                <span>
                  <strong>CASE-{item.case_id}</strong>
                  {" · "}
                  {item.responder_name || "Unknown responder"}

                  <small>
                    {" "}· Responder ID: {item.responder_id}
                  </small>
                </span>

                <span>
                  Assigned: {formatDate(item.assigned_at)}
                </span>

                <span
                  className={`ad-status-pill ${
                    item.assignment_status === "completed"
                      ? "resolved"
                      : item.assignment_status === "pending"
                        ? "pending"
                        : "assigned"
                  }`}
                >
                  {item.assignment_status || "Unknown"}
                </span>
              </div>
            ))
          ) : (
            !loadingAssignments && (
              <EmptyState message="No assignment history is available." />
            )
          )}
        </section>
      </>
    );
  }

  // ==================================================
  // PAGE TITLES
  // ==================================================

  const pageTitles = {
    overview: "Overview",
    map: "Incident Map",
    alerts: "Alerts",
    teams: "Rescue Teams",
    ai: "AI Priority & Scheduling",
    allotment: "Team Allotment",
  };

  // ==================================================
  // MAIN JSX
  // ==================================================

  return (
    <div className="admin-dashboard">
      {/* MOBILE BACKDROP */}

      {mobileMenuOpen && (
        <button
          className="ad-mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`ad-sidebar ${
          mobileMenuOpen ? "ad-sidebar-open" : ""
        }`}
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
                  <span className="ad-nav-count">
                    {pendingCount}
                  </span>
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
              <small>Backend connected</small>
            </div>
          </div>

          <button
            className="ad-sidebar-logout"
            onClick={onLogout}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <main className="ad-main">
        {/* TOPBAR */}

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
              <span />
              Operations dashboard
            </span>

            <div className="ad-topbar-avatar">
              <ShieldCheck size={18} />
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}

        <div className="ad-page-content">
          {/* NOTICE */}

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

          {/* LOADING */}

          {loadingIncidents && (
            <div className="ad-panel">
              <p>Loading SOS cases from database...</p>
            </div>
          )}

          {/* ERROR */}

          {incidentError && (
            <div className="ad-panel" role="alert">
              <p style={{ color: "red" }}>{incidentError}</p>

              <button
                className="ad-primary-button"
                onClick={refreshDashboard}
              >
                Retry loading dashboard
              </button>
            </div>
          )}

          {/* PAGES */}

          {!loadingIncidents && !incidentError && (
            <>
              {activeSection === "overview" && <Overview />}

              {activeSection === "map" && (
                <>
                  <SectionHeading
                    eyebrow="LOCATION MONITORING"
                    title="Incident Map"
                    description="All SOS incidents and responders around the selected pending case."
                  />

                  <CaseSelector />

                  <section className="ad-panel">
                    <IncidentMap />
                  </section>

                  {isPendingSelected ? (
                    <NearbyRespondersPanel />
                  ) : selectedIncident ? (
                    <AssignmentDetailsPanel />
                  ) : null}
                </>
              )}

              {activeSection === "alerts" && <Alerts />}

              {activeSection === "teams" && <RescueTeams />}

              {activeSection === "ai" && <AIRecommendations />}

              {activeSection === "allotment" && <TeamAllotment />}
            </>
          )}
        </div>

        {/* FOOTER */}

        <footer className="ad-footer">
          <span>ResQConnect · Admin Operations</span>

          <span>
            Incident and responder data fetched from backend.
          </span>
        </footer>
      </main>
    </div>
  );
}