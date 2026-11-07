import React, { useCallback, useEffect, useState } from "react";
import { Check, Download, RefreshCw, X } from "lucide-react";
import { API_BASE } from "../api";
import "./AdminApplications.css";

const documentLabels = {
  government_id: "Government ID",
  authorization_letter: "Authorization letter",
  organization_id: "Organization ID",
};

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState(null);
  const [reasons, setReasons] = useState({});

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("resqToken");
      const response = await fetch(`${API_BASE}/admin/registrations?status_filter=pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Unable to load applications.");
      setApplications(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  async function reviewApplication(application, action) {
    const reason = reasons[application.registration_id]?.trim() || "";
    if (action === "reject" && reason.length < 5) {
      setError("Enter a rejection reason of at least five characters.");
      return;
    }
    setWorkingId(application.registration_id);
    setError("");
    try {
      const token = localStorage.getItem("resqToken");
      const response = await fetch(
        `${API_BASE}/admin/registrations/${application.registration_id}/${action}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            ...(action === "reject" ? { "Content-Type": "application/json" } : {}),
          },
          ...(action === "reject" ? { body: JSON.stringify({ reason }) } : {}),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || `Unable to ${action} application.`);
      setApplications((current) => current.filter((item) => item.registration_id !== application.registration_id));
    } catch (requestError) {
      setError(requestError.message || `Unable to ${action} application.`);
    } finally {
      setWorkingId(null);
    }
  }

  async function downloadDocument(applicationId, documentType) {
    setError("");
    try {
      const token = localStorage.getItem("resqToken");
      const response = await fetch(
        `${API_BASE}/admin/registrations/${applicationId}/documents/${documentType}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Unable to download document.");
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${documentType}-${applicationId}`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (requestError) {
      setError(requestError.message || "Unable to download document.");
    }
  }

  return (
    <section className="aa-section">
      <div className="aa-heading">
        <div>
          <p>ACCOUNT VERIFICATION</p>
          <h2>Administrator applications</h2>
          <span>Review pending requests before granting authority access.</span>
        </div>
        <button type="button" onClick={loadApplications} disabled={loading}>
          <RefreshCw size={16} /> {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {error && <p className="aa-error" role="alert">{error}</p>}
      {loading ? <p className="aa-empty">Loading applications…</p> : applications.length === 0 ?
        <p className="aa-empty">No pending administrator applications.</p> :
        <div className="aa-list">{applications.map((application) => (
          <article className="aa-card" key={application.registration_id}>
            <div className="aa-card-heading">
              <div><span>Application {application.registration_id}</span><h3>{application.full_name}</h3></div>
              <time>{application.submitted_at ? new Date(application.submitted_at).toLocaleString() : "Submission time unavailable"}</time>
            </div>
            <dl className="aa-details">
              <div><dt>Email</dt><dd>{application.email}</dd></div>
              <div><dt>Admin ID</dt><dd>{application.admin_id}</dd></div>
              <div><dt>Organization</dt><dd>{application.organization}</dd></div>
              <div><dt>Designation</dt><dd>{application.designation}</dd></div>
              <div><dt>Phone</dt><dd>{application.phone}</dd></div>
              <div><dt>Status</dt><dd>{application.application_status}</dd></div>
            </dl>
            <div className="aa-documents" aria-label="Verification documents">
              {Object.entries(documentLabels).map(([type, label]) => application.documents?.[type] &&
                <button type="button" key={type} onClick={() => downloadDocument(application.registration_id, type)}>
                  <Download size={15} /> {label}
                </button>)}
            </div>
            <label className="aa-rejection-label" htmlFor={`reason-${application.registration_id}`}>Rejection reason (required to reject)</label>
            <textarea
              id={`reason-${application.registration_id}`}
              rows={2}
              maxLength={2000}
              value={reasons[application.registration_id] || ""}
              onChange={(event) => setReasons((current) => ({ ...current, [application.registration_id]: event.target.value }))}
            />
            <div className="aa-actions">
              <button type="button" className="aa-approve" onClick={() => reviewApplication(application, "approve")} disabled={workingId === application.registration_id}>
                <Check size={16} /> {workingId === application.registration_id ? "Saving…" : "Approve and create account"}
              </button>
              <button type="button" className="aa-reject" onClick={() => reviewApplication(application, "reject")} disabled={workingId === application.registration_id || (reasons[application.registration_id] || "").trim().length < 5}>
                <X size={16} /> Reject
              </button>
            </div>
          </article>
        ))}</div>}
    </section>
  );
}
