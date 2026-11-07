
import React, { useState } from "react";
import {
  UserRound,
  Mail,
  Phone,
  BadgeCheck,
  Building2,
  BriefcaseBusiness,
  LockKeyhole,
  KeyRound,
  IdCard,
  FileCheck,
  CloudUpload,
  ShieldCheck,
} from "lucide-react";
import "./AdminCreateAccount.css";
import { API_BASE } from "../api";

const fields = [
  { name: "fullName", label: "Full Name", placeholder: "Enter your full name", Icon: UserRound, type: "text" },
  { name: "email", label: "Official Email Address", placeholder: "Enter official email", Icon: Mail, type: "email" },
  { name: "phone", label: "Mobile Number", placeholder: "Enter mobile number", Icon: Phone, type: "tel" },
  { name: "adminId", label: "Admin ID", placeholder: "Enter assigned Admin ID", Icon: BadgeCheck, type: "text" },
  { name: "organization", label: "Department / Organization", placeholder: "Enter organization", Icon: Building2, type: "text" },
  { name: "designation", label: "Designation", placeholder: "Enter your designation", Icon: BriefcaseBusiness, type: "text" },
  { name: "password", label: "Password", placeholder: "Create a strong password", Icon: LockKeyhole, type: "password" },
  { name: "confirmPassword", label: "Confirm Password", placeholder: "Re-enter your password", Icon: KeyRound, type: "password" },
];

const documents = [
  { name: "governmentId", label: "Government ID Proof", description: "Aadhaar or another accepted ID", Icon: IdCard },
  { name: "authorizationLetter", label: "Authorization Letter", description: "Official appointment or authorization letter", Icon: FileCheck },
  { name: "organizationId", label: "Organization ID Card", description: "Your official organization ID", Icon: BadgeCheck },
];

export default function AdminCreateAccount({ onSignIn }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    adminId: "",
    organization: "",
    designation: "",
    password: "",
    confirmPassword: "",
  });

  const [files, setFiles] = useState({
    governmentId: null,
    authorizationLetter: null,
    organizationId: null,
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState("");

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const updateFile = (event) => {
    const { name, files: selectedFiles } = event.target;
    setFiles({ ...files, [name]: selectedFiles[0] || null });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (form.password.length < 12 ||
        !/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password) ||
        !/\d/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) {
      setMessage("Use at least 12 characters with uppercase, lowercase, a number, and a symbol.");
      return;
    }
    if (new TextEncoder().encode(form.password).length > 72) {
      setMessage("Password must not exceed 72 UTF-8 bytes.");
      return;
    }

    if (!files.governmentId || !files.authorizationLetter) {
      setMessage("Please upload your Government ID and Authorization Letter.");
      return;
    }

    const payload = new FormData();
    payload.append("full_name", form.fullName.trim());
    payload.append("email", form.email.trim());
    payload.append("phone", form.phone.trim());
    payload.append("admin_id", form.adminId.trim());
    payload.append("organization", form.organization.trim());
    payload.append("designation", form.designation.trim());
    payload.append("password", form.password);
    payload.append("confirm_password", form.confirmPassword);
    payload.append("government_id", files.governmentId);
    payload.append("authorization_letter", files.authorizationLetter);
    if (files.organizationId) payload.append("organization_id", files.organizationId);

    try {
      setLoading(true);
      setMessage("");
      const response = await fetch(`${API_BASE}/auth/register-admin`, {
        method: "POST",
        body: payload,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((item) => item.msg).join("; ")
          : data.detail;
        throw new Error(detail || "Unable to submit administrator application.");
      }
      if (!data.registration_id || !data.application_status) {
        throw new Error("The server did not confirm the application reference and status.");
      }
      setSubmittedId(data.registration_id);
      setApplicationStatus(data.application_status);
      setMessage(data.message || "Application submitted for review.");
    } catch (error) {
      setMessage(error.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-page">
      <section className="admin-card">
        <div className="admin-brand">
          <span className="admin-brand-icon">
            <ShieldCheck size={30} />
          </span>
          <div>
            <h1>ResQConnect</h1>
            <p>ADMINISTRATOR PORTAL</p>
          </div>
        </div>

        <div className="admin-heading">
          <h2>Create Admin Account</h2>
          <p>Register to manage emergency operations.</p>
        </div>

        {submittedId ? (
          <section className="admin-application-confirmation" aria-live="polite">
            <h3>Application received</h3>
            <p>{message}</p>
            <dl>
              <div><dt>Application reference</dt><dd>{submittedId}</dd></div>
              <div><dt>Status</dt><dd>{applicationStatus}</dd></div>
            </dl>
            <p>Sign-in is available after an authorized reviewer approves the application.</p>
          </section>
        ) : <form onSubmit={handleSubmit}>
          <div className="admin-fields">
            {fields.map(({ name, label, placeholder, Icon, type }) => (
              <div className="admin-form-group" key={name}>
                <label htmlFor={name}>{label}</label>
                <div className="admin-input-wrap">
                  <span className="admin-input-icon">
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                  <input
                    id={name}
                    name={name}
                    type={type}
                    placeholder={placeholder}
                    value={form[name]}
                    onChange={updateField}
                    autoComplete={
                      name === "password" || name === "confirmPassword"
                        ? "new-password"
                        : name === "email"
                        ? "email"
                        : name === "fullName"
                        ? "name"
                        : "off"
                    }
                    required
                    maxLength={name === "password" || name === "confirmPassword" ? 128 : undefined}
                    minLength={
                      name === "password" || name === "confirmPassword" ? 12 :
                      name === "fullName" || name === "adminId" || name === "organization" || name === "designation" ? 2 : undefined
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="admin-document-section">
            <h3>Document Verification</h3>
            <p className="admin-document-intro">
              Upload documents to verify your identity and authorization.
            </p>

            {documents.map(({ name, label, description, Icon }) => (
              <div className="admin-upload-group" key={name}>
                <label className="admin-upload-box" htmlFor={name}>
                  <span className="admin-input-icon">
                    <Icon size={21} strokeWidth={1.8} />
                  </span>

                  <span className="admin-upload-text">
                    <strong>{label}</strong>
                    <small>{files[name]?.name || description}</small>
                    <small>PDF, JPG or PNG · Max 5 MB</small>
                  </span>

                  <CloudUpload className="admin-upload-icon" size={22} />
                </label>

                <input
                  className="admin-file-input"
                  id={name}
                  name={name}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => {
                    const file = event.target.files[0];

                    if (file && file.size > 5 * 1024 * 1024) {
                      setMessage("Each document must be smaller than 5 MB.");
                      event.target.value = "";
                      return;
                    }

                    if (file && !/\.(pdf|jpe?g|png)$/i.test(file.name)) {
                      setMessage("Choose a PDF, JPG, JPEG, or PNG document.");
                      event.target.value = "";
                      return;
                    }

                    setMessage("");
                    updateFile(event);
                  }}
                  required={name !== "organizationId"}
                />
              </div>
            ))}
          </div>

          {message && (
            <p className="admin-message" role="status">
              {message}
            </p>
          )}

          <button className="admin-submit-button" type="submit" disabled={loading}>
            {loading ? "Submitting application..." : "Submit for Verification"}
            <ShieldCheck size={19} />
          </button>
        </form>}

        <p className="admin-signin">
          Already have an account?{" "}
          <button type="button" onClick={onSignIn}>
            Sign in
          </button>
        </p>

        <p className="admin-security-note">
          Your documents should only be accessible to authorized reviewers.
        </p>
      </section>
    </main>
  );
}
