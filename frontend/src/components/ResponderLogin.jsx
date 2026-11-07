
import React, { useState } from "react";
import {
  ShieldCheck,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  LogIn,
} from "lucide-react";
import "./ResponderLogin.css";
import { API_BASE } from "../api";

export default function ResponderLogin({ onRegister, onLogin }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      setMessage("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: identifier.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed.");
      }

      const token = data.access_token || data.token;
      const role = data.user?.role;

      if (!token) {
        throw new Error("Login succeeded but no access token was returned.");
      }

      if (role !== "responder") {
        throw new Error("This account is not registered as a responder.");
      }

      localStorage.setItem("resqToken", token);

      if (typeof onLogin === "function") {
        onLogin();
      }
    } catch (error) {
      setMessage(error.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="responder-login-page">
      <section className="responder-login-card">
        <div className="responder-login-brand">
          <span className="responder-login-brand-icon">
            <ShieldCheck size={30} />
          </span>

          <div>
            <h1>ResQConnect</h1>
            <p>RESPONDER PORTAL</p>
          </div>
        </div>

        <div className="responder-login-heading">
          <h2>Welcome Back</h2>
          <p>Sign in to access your rescue operations.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="responder-login-field">
            <label htmlFor="responder-identifier">
              Email Address
            </label>

            <div className="responder-login-input-wrap">
              <span className="responder-login-input-icon">
                <Mail size={20} strokeWidth={1.8} />
              </span>

              <input
                id="responder-identifier"
                type="email"
                autoComplete="username"
                placeholder="Enter your email"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="responder-login-field">
            <label htmlFor="responder-password">Password</label>

            <div className="responder-login-input-wrap">
              <span className="responder-login-input-icon">
                <LockKeyhole size={20} strokeWidth={1.8} />
              </span>

              <input
                id="responder-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button
                type="button"
                className="responder-password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          <button
            className="responder-login-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
            <LogIn size={19} />
          </button>

          {message && (
            <p className="responder-login-message" role="alert">
              {message}
            </p>
          )}
        </form>

        <p className="responder-login-register">
          New responder?{" "}
          <button type="button" onClick={onRegister}>
            Create Account
          </button>
        </p>

        <p className="responder-login-security">
          <ShieldCheck size={15} />
          Authorized responder access only
        </p>
      </section>
    </main>
  );
}
