
import React, { useState } from "react";
import { API_BASE } from "../api";
import "./CreateAccount.css";


export default function CreateAccount({ onSignIn }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    const formData = new FormData(event.target);

    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (new TextEncoder().encode(password).length > 72) {
      setMessage("Password must not exceed 72 bytes.");
      return;
    }

    // These are the fields currently supported by the backend.
    const registrationData = {
      name: formData.get("fullName").trim(),
      email: formData.get("email").trim(),
      password: password,
      responder_type: formData.get("responderType"),
      equipment: null
    };

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE}/auth/register-responder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(registrationData)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Registration failed. Please try again."
        );
      }

      setSuccess(true);
      setMessage(
        `Account created successfully! Welcome, ${data.name}. You can now sign in.`
      );

      event.target.reset();

    } catch (error) {
      setMessage(
        error.message || "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="create-account-page">
      <header className="create-account-header">
        <div className="brand-icon">R</div>
        <div>
          <h2>ResQ Connect</h2>
          <p>Disaster Response &amp; Community Rescue</p>
        </div>
      </header>

      <section className="create-account-card">
        <p className="eyebrow">RESPONDER REGISTRATION</p>
        <h1>Create Account</h1>

        <p className="form-description">
          Join the rescue network and help coordinate emergency response.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="Enter your full name"
            required
            minLength={2}
          />

          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            required
          />

          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="Enter your phone number"
            required
          />

          <label htmlFor="responderType">Responder Type</label>
          <select
            id="responderType"
            name="responderType"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Select responder type
            </option>
            <option>NGO Member</option>
            <option>Independent Volunteer</option>
            <option>Government Responder</option>
            <option>Medical Responder</option>
            <option>Fire and Rescue</option>
            <option>Other</option>
          </select>

          <label htmlFor="organization">
            Organization / NGO Name
          </label>
          <input
            id="organization"
            name="organization"
            type="text"
            placeholder="Enter organization name (if applicable)"
          />

          <label htmlFor="responderId">
            Responder ID / Volunteer Reference
          </label>
          <input
            id="responderId"
            name="responderId"
            type="text"
            placeholder="Enter ID if available"
          />

          <label htmlFor="document">Verification Document</label>
          <input
            id="document"
            name="document"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Create a password"
            minLength={8}
            required
          />

          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            minLength={8}
            required
          />

          <label className="consent-row">
            <input type="checkbox" required />
            <span>
              I confirm that the information provided is accurate.
            </span>
          </label>

          {message && (
            <p
              role="status"
              style={{
                color: success ? "green" : "red",
                marginTop: "12px"
              }}
            >
              {message}
            </p>
          )}

          <button
            className="create-account-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="signin-link">
          Already have an account?{" "}
          <button type="button" onClick={onSignIn}>
            Sign In
          </button>
        </p>
      </section>
    </main>
  );
}
