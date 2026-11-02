
import React, { useState } from "react";
import {
  ShieldCheck,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  LogIn,
} from "lucide-react";
import "./AdminLogin.css";

const API_URL = "http://127.0.0.1:8000/api/auth/login";

export default function AdminLogin({ onRegister, onLogin }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!identifier.trim() || !password) {
      setMessage("Please enter your official email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: identifier.trim().toLowerCase(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Invalid email or password."
        );
      }

      if (!data.access_token) {
        throw new Error("Login response did not contain an access token.");
      }

      if (data.user && data.user.role !== "authority") {
        throw new Error("This account does not have administrator access.");
      }

      localStorage.setItem("resqToken", data.access_token);

      if (data.user) {
        localStorage.setItem("resqUser", JSON.stringify(data.user));
      }

      if (typeof onLogin === "function") {
        onLogin(data);
      } else {
        setMessage("Unable to open the dashboard. Please try again.");
      }

    } catch (error) {
      setMessage(
        error.message || "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
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
              Official Email
            </label>

            <div className="admin-login-input-wrap">
              <span className="admin-login-input-icon">
                <Mail size={20} strokeWidth={1.8} />
              </span>

              <input
                id="admin-login-identifier"
                type="email"
                autoComplete="username"
                placeholder="Enter your official email"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="admin-login-field">
            <label htmlFor="admin-login-password">
              Password
            </label>

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
                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </div>

          <button
            className="admin-login-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing In..." : "Admin Sign In"}
            {!loading && <LogIn size={19} />}
          </button>

          {message && (
            <p className="admin-login-message" role="alert">
              {message}
            </p>
          )}
        </form>

        <p className="admin-login-register">
          New administrator?{" "}
          <button type="button" onClick={onRegister}>
            Create Account
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
