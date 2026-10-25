
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
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import "./AdminCreateAccount.css";

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

export default function AdminCreateAccount({ onBack, onSignIn }) {
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

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const updateFile = (event) => {
    const { name, files: selectedFiles } = event.target;
    setFiles({ ...files, [name]: selectedFiles[0] || null });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }

    if (!files.governmentId || !files.authorizationLetter) {
      setMessage("Please upload your Government ID and Authorization Letter.");
      return;
    }

    setMessage(
      "Form validated. Connect the backend to submit your registration for verification."
    );
  };

  return (
    <main className="admin-page">
      <button className="admin-back-button" type="button" onClick={onBack}>
        <ArrowLeft size={18} /> Back to Home
      </button>

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

        <form onSubmit={handleSubmit}>
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
                    minLength={name === "password" || name === "confirmPassword" ? 8 : undefined}
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

          <button className="admin-submit-button" type="submit">
            Submit for Verification
            <ShieldCheck size={19} />
          </button>
        </form>

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
