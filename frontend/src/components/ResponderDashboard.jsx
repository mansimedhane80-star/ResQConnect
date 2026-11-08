
import React, { useCallback, useEffect, useRef, useState } from "react";

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
  ShieldAlert,
  CheckCircle2,
  Radio,
  RefreshCw,
  Phone,
  MapPinned,
  LocateFixed,
  UserRound,
  Settings,
} from "lucide-react";

import "leaflet/dist/leaflet.css";
import "./ResponderDashboard.css";
import { API_BASE } from "../api";

const severityColors = {
  Critical: "#dc2626",
  High: "#ea580c",
  Medium: "#d97706",
  Low: "#16a34a",
};

const severityOrder = {
  Critical: 1,
  High: 2,
  Medium: 3,
  Low: 4,
};

function getSeverity(incident) {
  const urgency = String(incident.urgency || "").toLowerCase();

  if (urgency.includes("critical")) return "Critical";
  if (urgency.includes("high")) return "High";
  if (urgency.includes("medium")) return "Medium";
  if (urgency.includes("low")) return "Low";

  const score = Number(incident.priority_score || 0);

  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 30) return "Medium";

  return "Low";
}

function getStatusLabel(status) {
  const labels = {
    pending: "Pending",
    accepted: "Accepted",
    completed: "Completed",
  };

  return labels[String(status || "").toLowerCase()] || status;
}

function formatDate(date) {
  if (!date) return "Time unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Time unavailable";
  }

  return parsedDate.toLocaleString();
}

function hasValidCoordinates(latitude, longitude) {
  return (
    latitude !== null &&
    latitude !== undefined &&
    longitude !== null &&
    longitude !== undefined &&
    latitude !== "" &&
    longitude !== "" &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude)) &&
    Number(latitude) >= -90 &&
    Number(latitude) <= 90 &&
    Number(longitude) >= -180 &&
    Number(longitude) <= 180
  );
}

// Supports both string and object address responses.
function getAddressLabel(address, readableAddress = null) {
  if (readableAddress) return readableAddress;

  if (!address) return "";

  if (typeof address === "string") {
    return address;
  }

  return (
    address.display_name ||
    [
      address.house_number,
      address.building,
      address.road,
      address.locality,
      address.city,
      address.district,
      address.state,
      address.postal_code,
      address.country,
    ]
      .filter(Boolean)
      .join(", ")
  );
}

function getMapUrl(latitude, longitude) {
  if (!hasValidCoordinates(latitude, longitude)) return null;

  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`;
}

function ResponderDashboard({ onLogout }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [assignmentFilter, setAssignmentFilter] = useState(
    () =>
      new URLSearchParams(window.location.search).get("filter") || "all"
  );
  const [accountView, setAccountView] = useState("");
  const [profile, setProfile] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [settingsMessage, setSettingsMessage] = useState("");
  const didMountFilterScroll = useRef(false);

  // Responder location states
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationError, setLocationError] = useState("");
  const [savedLocation, setSavedLocation] = useState(null);

  const token = localStorage.getItem("resqToken");

  // ------------------------------------------
  // FETCH RESPONDER PROFILE
  // ------------------------------------------

  const fetchResponderLocation = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/responders/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to fetch responder profile.");
      }

      setProfile(data);

      if (hasValidCoordinates(data.latitude, data.longitude)) {
        setSavedLocation({
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
        });
      } else {
        setSavedLocation(null);
      }
    } catch (err) {
      console.error("Profile location error:", err);
    }
  }, [token]);

  const savePassword = async (event) => {
    event.preventDefault();
    setSettingsMessage("");

    try {
      const response = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(passwordForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to change password.");
      }

      setSettingsMessage(
        `${data.message} Please sign out and sign in again.`
      );

      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err) {
      setSettingsMessage(err.message);
    }
  };

  // ------------------------------------------
  // FETCH ASSIGNMENTS
  // ------------------------------------------

  const fetchAssignments = useCallback(async () => {
    if (!token) {
      setError("Authentication token not found. Please sign in again.");
      setLoading(false);
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${API_BASE}/responders/my-assignments`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to fetch your assignments."
        );
      }

      if (!Array.isArray(data)) {
        throw new Error("Invalid assignment data received from server.");
      }

      setIncidents(data);
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAssignments();
    fetchResponderLocation();
  }, [fetchAssignments, fetchResponderLocation]);

  useEffect(() => {
    function restoreFilterFromHistory() {
      const params = new URLSearchParams(window.location.search);

      setAssignmentFilter(
        params.get("section") === "assignments"
          ? params.get("filter") || "all"
          : "all"
      );
    }

    window.addEventListener("popstate", restoreFilterFromHistory);

    return () => window.removeEventListener("popstate", restoreFilterFromHistory);
  }, []);

  useEffect(() => {
    if (!didMountFilterScroll.current) {
      didMountFilterScroll.current = true;
      return;
    }

    document
      .getElementById("rd-incidents-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [assignmentFilter]);

  function selectAssignmentFilter(filter) {
    const url = new URL(window.location.href);

    url.searchParams.set("page", "responder-dashboard");
    url.searchParams.set("section", "assignments");
    url.searchParams.set("filter", filter);

    if (
      url.search === window.location.search &&
      assignmentFilter === filter
    ) {
      document
        .getElementById("rd-incidents-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });

      return;
    }

    window.history.pushState(
      { page: "responder-dashboard", section: "assignments", filter },
      "",
      url.pathname + url.search
    );

    setAssignmentFilter(filter);
  }

  // ------------------------------------------
  // SHARE RESPONDER LOCATION
  // ------------------------------------------

  const shareMyLocation = () => {
    setLocationMessage("");
    setLocationError("");

    if (!token) {
      setLocationError("Please sign in again.");
      return;
    }

    if (!navigator.geolocation) {
      setLocationError(
        "Location services are not supported by this browser."
      );
      return;
    }

    setLocationLoading(true);
    setLocationMessage("Requesting your location permission...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        try {
          setLocationMessage("Saving your location...");

          const response = await fetch(
            `${API_BASE}/responders/location`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                latitude,
                longitude,
              }),
            }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.detail || "Unable to save your location."
            );
          }

          setSavedLocation({
            latitude: data.latitude,
            longitude: data.longitude,
          });

          setLocationMessage(
            "Your location has been saved successfully."
          );
        } catch (err) {
          setLocationError(
            err.message || "Unable to save your location."
          );
          setLocationMessage("");
        } finally {
          setLocationLoading(false);
        }
      },

      (err) => {
        let message = "Unable to access your location.";

        if (err.code === 1) {
          message =
            "Location permission was denied. Allow location access in your browser settings if you want to share it.";
        } else if (err.code === 2) {
          message =
            "Your device could not determine its location. Please try again.";
        } else if (err.code === 3) {
          message =
            "Location request timed out. Please try again.";
        }

        setLocationError(message);
        setLocationMessage("");
        setLocationLoading(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // ------------------------------------------
  // ACCEPT ASSIGNMENT
  // ------------------------------------------

  const acceptAssignment = async (assignmentId) => {
    if (!token) {
      setError("Please sign in again.");
      return;
    }

    try {
      setActionLoading(assignmentId);
      setError("");

      const response = await fetch(
        `${API_BASE}/responders/assignments/${assignmentId}/accept`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to accept assignment.");
      }

      await fetchAssignments();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ------------------------------------------
  // COMPLETE ASSIGNMENT
  // ------------------------------------------

  const completeAssignment = async (assignmentId) => {
    if (!token) {
      setError("Please sign in again.");
      return;
    }

    try {
      setActionLoading(assignmentId);
      setError("");

      const response = await fetch(
        `${API_BASE}/responders/assignments/${assignmentId}/complete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to complete assignment.");
      }

      await fetchAssignments();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ------------------------------------------
  // SORT ASSIGNMENTS
  // ------------------------------------------

  const sortedIncidents = [...incidents].sort((a, b) => {
    return (
      severityOrder[getSeverity(a)] -
      severityOrder[getSeverity(b)]
    );
  });

  const criticalAssignments = sortedIncidents.filter(
    (item) =>
      item.assignment_status !== "completed" &&
      getSeverity(item) === "Critical"
  );

  const shownAssignments = sortedIncidents.filter(
    (item) =>
      assignmentFilter === "all" ||
      (assignmentFilter === "critical"
        ? item.assignment_status !== "completed" &&
          getSeverity(item) === "Critical"
        : item.assignment_status === assignmentFilter)
  );

  // ------------------------------------------
  // VALID INCIDENT LOCATIONS
  // ------------------------------------------

  const mappedIncidents = shownAssignments.filter((incident) =>
    hasValidCoordinates(incident.latitude, incident.longitude)
  );

  const mapCenter =
    mappedIncidents.length > 0
      ? [
          Number(mappedIncidents[0].latitude),
          Number(mappedIncidents[0].longitude),
        ]
      : savedLocation
        ? [savedLocation.latitude, savedLocation.longitude]
        : [19.9975, 73.7898];

  // ------------------------------------------
  // DASHBOARD UI
  // ------------------------------------------

  return (
    <main className="responder-dashboard">
      {/* HEADER */}

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
            type="button"
            className="rd-account-button"
            onClick={() =>
              setAccountView(accountView === "profile" ? "" : "profile")
            }
          >
            <UserRound size={16} />
            Profile
          </button>

          <button
            type="button"
            className="rd-account-button"
            onClick={() =>
              setAccountView(accountView === "settings" ? "" : "settings")
            }
          >
            <Settings size={16} />
            Settings
          </button>

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

      {/* WELCOME */}

      <section className="rd-welcome">
        <div>
          <p className="rd-eyebrow">RESPONDER WORKSPACE</p>

          <h2>Emergency Operations</h2>

          <p className="rd-subtitle">
            View your assigned emergencies and manage rescue operations.
          </p>
        </div>

        <button
          type="button"
          className="rd-priority-summary"
          onClick={() => selectAssignmentFilter("critical")}
          aria-label={`Show ${criticalAssignments.length} critical emergencies`}
        >
          <div className="rd-summary-icon">
            <AlertTriangle size={21} />
          </div>

          <div>
            <span>Critical emergencies</span>
            <strong>{criticalAssignments.length}</strong>
          </div>
        </button>
      </section>

      {accountView === "profile" && (
        <section className="rd-profile-panel">
          <h3>My Profile</h3>

          {profile ? (
            <dl>
              <dt>Name</dt>
              <dd>{profile.name}</dd>

              <dt>Email</dt>
              <dd>{profile.email}</dd>

              <dt>Role</dt>
              <dd>Responder</dd>

              <dt>Phone</dt>
              <dd>{profile.phone || "Not on file"}</dd>

              <dt>Skills</dt>
              <dd>{profile.skills || "Not on file"}</dd>

              <dt>Equipment</dt>
              <dd>{profile.equipment || "Not on file"}</dd>
            </dl>
          ) : (
            <p>Profile details are unavailable.</p>
          )}
        </section>
      )}

      {accountView === "settings" && (
        <form
          className="rd-profile-panel rd-password-form"
          onSubmit={savePassword}
        >
          <h3>Settings · Change password</h3>

          <label>
            Current password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={passwordForm.current_password}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  current_password: e.target.value,
                })
              }
            />
          </label>

          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={passwordForm.new_password}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  new_password: e.target.value,
                })
              }
            />
          </label>

          <label>
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={passwordForm.confirm_password}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  confirm_password: e.target.value,
                })
              }
            />
          </label>

          <button type="submit" className="rd-start-button">
            Update password
          </button>

          {settingsMessage && (
            <p role="status">{settingsMessage}</p>
          )}
        </form>
      )}

      <section
        className="rd-status-cards"
        aria-label="Assignment status filters"
      >
        {[
          [
            "pending",
            "Assigned",
            incidents.filter((item) => item.assignment_status === "pending")
              .length,
          ],
          [
            "accepted",
            "In progress",
            incidents.filter((item) => item.assignment_status === "accepted")
              .length,
          ],
          [
            "completed",
            "Completed",
            incidents.filter((item) => item.assignment_status === "completed")
              .length,
          ],
          ["critical", "Critical", criticalAssignments.length],
          ["all", "All cases", incidents.length],
        ].map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            className={`rd-status-card ${
              assignmentFilter === key ? "active" : ""
            }`}
            onClick={() => selectAssignmentFilter(key)}
          >
            <span>{label}</span>
            <strong>{count}</strong>
          </button>
        ))}
      </section>

      {/* LOCATION SHARING */}

      <section className="rd-location-section">
        <div className="rd-location-info">
          <div className="rd-location-icon">
            <MapPinned size={23} />
          </div>

          <div>
            <h3>Responder Location</h3>

            <p>
              Share your current location with the admin map.
              Your browser will ask for permission first.
            </p>

            {savedLocation ? (
              <div className="rd-location-coordinates">
                <CheckCircle2 size={15} />
                Location saved:{" "}
                {savedLocation.latitude.toFixed(5)},{" "}
                {savedLocation.longitude.toFixed(5)}
              </div>
            ) : (
              <div className="rd-location-not-shared">
                <MapPin size={15} />
                Location not shared
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          className="rd-share-location-button"
          onClick={shareMyLocation}
          disabled={locationLoading}
        >
          {locationLoading ? (
            <>
              <RefreshCw size={17} className="rd-spin" />
              Sharing...
            </>
          ) : (
            <>
              <LocateFixed size={17} />
              {savedLocation ? "Update My Location" : "Share My Location"}
            </>
          )}
        </button>

        {locationMessage && (
          <div className="rd-location-success" role="status">
            <CheckCircle2 size={17} />
            {locationMessage}
          </div>
        )}

        {locationError && (
          <div className="rd-location-error" role="alert">
            <AlertTriangle size={17} />
            {locationError}
          </div>
        )}
      </section>

      {/* REFRESH AND ERROR */}

      <section className="rd-data-controls">
        <button
          type="button"
          className="rd-start-button"
          onClick={fetchAssignments}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? "Refreshing..." : "Refresh Assignments"}
        </button>
      </section>

      {error && (
        <div className="rd-error-message" role="alert">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* INCIDENT MAP */}

      <section className="rd-map-section">
        <div className="rd-section-heading">
          <div>
            <h3>
              <MapPin size={20} />
              Incident Map
            </h3>

            <p>Locations of cases assigned to you</p>
          </div>

          <span className="rd-count-badge">
            {mappedIncidents.length} mapped cases
          </span>
        </div>

        <div className="rd-map-layout">
          <div className="rd-map">
            <MapContainer
              center={mapCenter}
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

              {mappedIncidents.map((incident) => {
                const severity = getSeverity(incident);
                const color = severityColors[severity];

                const incidentAddress = getAddressLabel(
                  incident.location_address,
                  incident.readable_address
                );

                return (
                  <CircleMarker
                    key={incident.assignment_id}
                    center={[
                      Number(incident.latitude),
                      Number(incident.longitude),
                    ]}
                    radius={severity === "Critical" ? 12 : 9}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: 0.85,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="rd-map-popup">
                        <strong>
                          {incident.disaster_type || "Emergency"}
                        </strong>

                        <p>Case ID: {incident.case_id}</p>

                        <p>
                          {incidentAddress ||
                            "Readable address unavailable"}
                        </p>

                        <span>Severity: {severity}</span>

                        {getMapUrl(
                          incident.latitude,
                          incident.longitude
                        ) && (
                          <p>
                            <a
                              href={getMapUrl(
                                incident.latitude,
                                incident.longitude
                              )}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open map ↗
                            </a>
                          </p>
                        )}

                        <br />

                        <span>
                          Status:{" "}
                          {getStatusLabel(incident.assignment_status)}
                        </span>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

              {savedLocation && (
                <CircleMarker
                  center={[
                    savedLocation.latitude,
                    savedLocation.longitude,
                  ]}
                  radius={10}
                  pathOptions={{
                    color: "#2563eb",
                    fillColor: "#2563eb",
                    fillOpacity: 0.95,
                    weight: 3,
                  }}
                >
                  <Popup>
                    <strong>Your responder location</strong>
                    <p>Location shared by your account.</p>
                  </Popup>
                </CircleMarker>
              )}
            </MapContainer>
          </div>

          <aside className="rd-map-legend">
            <h4>Map Legend</h4>

            {Object.entries(severityColors).map(
              ([severity, color]) => (
                <div className="rd-legend-item" key={severity}>
                  <span
                    className="rd-legend-dot"
                    style={{ backgroundColor: color }}
                  />
                  <span>{severity} emergency</span>
                </div>
              )
            )}

            <div className="rd-legend-item">
              <span
                className="rd-legend-dot"
                style={{ backgroundColor: "#2563eb" }}
              />
              <span>Your location</span>
            </div>

            <div className="rd-map-note">
              <Navigation size={17} />
              <p>Select a marker to view its details.</p>
            </div>
          </aside>
        </div>
      </section>

      {/* ASSIGNED EMERGENCIES */}

      <section
        className="rd-incidents-section"
        id="rd-incidents-section"
      >
        <div className="rd-section-heading">
          <div>
            <h3>
              <Radio size={20} />
              My Assigned Emergencies
            </h3>

            <p>Cases assigned to your responder account</p>
          </div>

          <span className="rd-count-badge">
            {incidents.length} assignments
          </span>
        </div>

        <div className="rd-incident-list">
          {loading && (
            <div className="rd-empty-state">
              <RefreshCw size={28} />
              <h4>Loading assignments...</h4>
              <p>Fetching your cases from the server.</p>
            </div>
          )}

          {!loading &&
            !error &&
            shownAssignments.map((incident) => {
              const severity = getSeverity(incident);

              const status = String(
                incident.assignment_status || ""
              ).toLowerCase();

              const isActionLoading =
                actionLoading === incident.assignment_id;

              const incidentAddress = getAddressLabel(
                incident.location_address,
                incident.readable_address
              );

              return (
                <article
                  className={`rd-incident-card rd-${severity.toLowerCase()}`}
                  key={incident.assignment_id}
                >
                  <div
                    className="rd-incident-severity"
                    style={{
                      backgroundColor: severityColors[severity],
                    }}
                  />

                  <div className="rd-incident-main">
                    <div className="rd-incident-title-row">
                      <span className="rd-incident-id">
                        CASE #{incident.case_id}
                      </span>

                      <span
                        className="rd-severity-badge"
                        style={{
                          color: severityColors[severity],
                          backgroundColor: `${severityColors[severity]}15`,
                        }}
                      >
                        {severity}
                      </span>
                    </div>

                    <h4>
                      {incident.disaster_type || "Emergency"}
                    </h4>

                    <p className="rd-incident-description">
                      {incident.message}
                    </p>

                    <div className="rd-incident-location-details">
                      <p>
                        <MapPin size={15} />
                        <span>
                          {incidentAddress ||
                            "Readable address unavailable; use coordinates."}
                        </span>
                      </p>

                      <p>
                        <span>
                          Coordinates:{" "}
                          {hasValidCoordinates(
                            incident.latitude,
                            incident.longitude
                          )
                            ? `${Number(incident.latitude).toFixed(6)}, ${Number(incident.longitude).toFixed(6)}`
                            : "Unavailable"}
                        </span>
                      </p>

                      {getMapUrl(
                        incident.latitude,
                        incident.longitude
                      ) && (
                        <a
                          href={getMapUrl(
                            incident.latitude,
                            incident.longitude
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open location map ↗
                        </a>
                      )}
                    </div>

                    <div className="rd-incident-meta">
                      <span>
                        <Clock size={15} />
                        {formatDate(incident.assigned_at)}
                      </span>
                    </div>

                    {incident.contact_number && (
                      <div className="rd-incident-meta">
                        <span>
                          <Phone size={15} />
                          Contact: {incident.contact_number}
                        </span>
                      </div>
                    )}

                    {incident.vulnerability?.length > 0 && (
                      <p className="rd-incident-description">
                        Vulnerability:{" "}
                        {incident.vulnerability.join(", ")}
                      </p>
                    )}
                  </div>

                  <div className="rd-incident-right">
                    <span
                      className={`rd-assigned-status rd-status-${status.replace(
                        /\s+/g,
                        "-"
                      )}`}
                    >
                      <CheckCircle2 size={15} />
                      {getStatusLabel(status)}
                    </span>

                    {status === "pending" && (
                      <button
                        className="rd-start-button"
                        type="button"
                        disabled={isActionLoading}
                        onClick={() =>
                          acceptAssignment(incident.assignment_id)
                        }
                      >
                        <CheckCircle2 size={15} />
                        {isActionLoading
                          ? "Accepting..."
                          : "Accept Assignment"}
                      </button>
                    )}

                    {status === "accepted" && (
                      <button
                        className="rd-start-button"
                        type="button"
                        disabled={isActionLoading}
                        onClick={() =>
                          completeAssignment(incident.assignment_id)
                        }
                      >
                        <CheckCircle2 size={15} />
                        {isActionLoading
                          ? "Completing..."
                          : "Complete Assignment"}
                      </button>
                    )}

                    {status === "completed" && (
                      <span className="rd-operation-started">
                        <CheckCircle2 size={15} />
                        Completed
                      </span>
                    )}
                  </div>
                </article>
              );
            })}

          {!loading && !error && incidents.length === 0 && (
            <div className="rd-empty-state">
              <CheckCircle2 size={30} />
              <h4>No assigned emergencies</h4>
              <p>
                You currently have no assignments. New cases assigned
                by the authority will appear here.
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            shownAssignments.length === 0 && (
              <div className="rd-empty-state">
                <h4>No cases in this view</h4>
                <p>
                  Assignments will appear here when they are sent to
                  your account.
                </p>
              </div>
            )}
        </div>
      </section>

      {/* FOOTER */}

      <footer className="rd-footer">
        <span>ResQ Connect · Responder Operations</span>
        <span>Stay alert. Respond safely.</span>
      </footer>
    </main>
  );
}

export default ResponderDashboard;
