
import React, { useState } from "react";
import {
  ShieldCheck,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowLeft,
  LogIn,
} from "lucide-react";
import "./AdminLogin.css";

export default function AdminLogin({ onBack, onRegister, onLogin }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!identifier.trim() || !password) {
      setMessage("Please enter your Admin ID or email and password.");
      return;
    }

    // Open the Admin Dashboard
    if (onLogin) {
      onLogin();
    } else {
      setMessage("Unable to open the dashboard. Please try again.");
    }
  }

  return (
    <main className="admin-login-page">
      <button
        type="button"
        className="admin-login-back"
        onClick={onBack}
      >
        <ArrowLeft size={18} />
        Back to Home
      </button>

      <section className="admin-login-card">
        <div className="admin-login-brand">
          <span className="admin-login-brand-icon">
            <ShieldCheck size={30} />
          </span>

          <div>
            <h1>ResQConnect</h1>
            <p>ADMINISTRATOR PORTAL</p>
          </div>
        </div>

        <div className="admin-login-heading">
          <h2>Welcome Back</h2>
          <p>Sign in to manage emergency operations.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-login-field">
            <label htmlFor="admin-login-identifier">
              Admin ID or Official Email
            </label>

            <div className="admin-login-input-wrap">
              <span className="admin-login-input-icon">
                <Mail size={20} strokeWidth={1.8} />
              </span>

              <input
                id="admin-login-identifier"
                type="text"
                autoComplete="username"
                placeholder="Enter Admin ID or email"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="admin-login-field">
            <label htmlFor="admin-login-password">Password</label>

            <div className="admin-login-input-wrap">
              <span className="admin-login-input-icon">
                <LockKeyhole size={20} strokeWidth={1.8} />
              </span>

              <input
                id="admin-login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button
                type="button"
                className="admin-login-password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          <button className="admin-login-submit" type="submit">
            Admin Sign In
            <LogIn size={19} />
          </button>

          {message && (
            <p className="admin-login-message" role="status">
              {message}
            </p>
          )}
        </form>

        <p className="admin-login-register">
          Not registered yet?{" "}
          <button type="button" onClick={onRegister}>
            Create admin account
          </button>
        </p>

        <p className="admin-login-security">
          <ShieldCheck size={15} />
          Authorized administrator access only
        </p>
      </section>
    </main>
  );
}
