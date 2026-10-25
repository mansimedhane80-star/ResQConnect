
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
import "./ResponderLogin.css";

export default function ResponderLogin({
  onBack,
  onRegister,
  onLogin,
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      setMessage("Please enter your email/mobile number and password.");
      return;
    }

    setMessage("");

    if (typeof onLogin === "function") {
      onLogin();
    } else {
      setMessage("Unable to open the dashboard. Check App.jsx.");
    }
  }

  return (
    <main className="responder-login-page">
      <button
        type="button"
        className="responder-login-back"
        onClick={onBack}
      >
        <ArrowLeft size={18} />
        Back to Home
      </button>

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
              Email Address or Mobile Number
            </label>

            <div className="responder-login-input-wrap">
              <span className="responder-login-input-icon">
                <Mail size={20} strokeWidth={1.8} />
              </span>

              <input
                id="responder-identifier"
                type="text"
                autoComplete="username"
                placeholder="Enter email or mobile number"
                value={identifier}
                onChange={(event) =>
                  setIdentifier(event.target.value)
                }
                required
              />
            </div>
          </div>

          <div className="responder-login-field">
            <label htmlFor="responder-password">
              Password
            </label>

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
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />

              <button
                type="button"
                className="responder-password-toggle"
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                onClick={() =>
                  setShowPassword((value) => !value)
                }
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
            className="responder-login-submit"
            type="submit"
          >
            Sign In
            <LogIn size={19} />
          </button>

          {message && (
            <p className="responder-login-message" role="status">
              {message}
            </p>
          )}
        </form>

        <p className="responder-login-register">
          New responder?{" "}
          <button type="button" onClick={onRegister}>
            Create account
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
