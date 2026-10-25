
import React from "react";
import "./CreateAccount.css";

export default function CreateAccount() {
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

        <form
          onSubmit={(event) => {
            event.preventDefault();
            alert("Registration form submitted successfully for testing.");
          }}
        >
          <label htmlFor="fullName">Full Name</label>
          <input id="fullName" name="fullName" type="text"
            placeholder="Enter your full name" required />

          <label htmlFor="email">Email Address</label>
          <input id="email" name="email" type="email"
            placeholder="Enter your email" required />

          <label htmlFor="phone">Phone Number</label>
          <input id="phone" name="phone" type="tel"
            placeholder="Enter your phone number" required />

          <label htmlFor="responderType">Responder Type</label>
          <select id="responderType" name="responderType" required defaultValue="">
            <option value="" disabled>Select responder type</option>
            <option>NGO Member</option>
            <option>Independent Volunteer</option>
            <option>Government Responder</option>
            <option>Medical Responder</option>
            <option>Fire and Rescue</option>
            <option>Other</option>
          </select>

          <label htmlFor="organization">Organization / NGO Name</label>
          <input id="organization" name="organization" type="text"
            placeholder="Enter organization name (if applicable)" />

          <label htmlFor="responderId">Responder ID / Volunteer Reference</label>
          <input id="responderId" name="responderId" type="text"
            placeholder="Enter ID if available" />

          <label htmlFor="document">Verification Document</label>
          <input id="document" name="document" type="file"
            accept=".pdf,.jpg,.jpeg,.png" />

          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password"
            placeholder="Create a password" minLength={8} required />

          <label htmlFor="confirmPassword">Confirm Password</label>
          <input id="confirmPassword" name="confirmPassword" type="password"
            placeholder="Re-enter your password" minLength={8} required />

          <label className="consent-row">
            <input type="checkbox" required />
            <span>I confirm that the information provided is accurate.</span>
          </label>

          <button className="create-account-submit" type="submit">
            Create Account
          </button>
        </form>
      </section>
    </main>
  );
}
