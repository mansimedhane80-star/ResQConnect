function Home() {
  return (
    <div>

      {/* ================= HEADER ================= */}
      <header className="navbar">

        <div className="logo-section">
          <div className="logo">
            🛡️
          </div>

          <h2>RES-Q CONNECT</h2>
        </div>

        <nav className="nav-links">
          <a href="#">Home</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>

      </header>


      {/* ================= HERO ================= */}
      <section className="hero">

        <h1>
          Welcome to <span>Res-Q Connect</span>
        </h1>

        <p className="hero-subtitle">
          AI-Powered Disaster Response & Rescue Platform
        </p>

        <p className="hero-description">
          Choose your role to continue
        </p>

      </section>


      {/* ================= ROLE SELECTION ================= */}
      <section className="role-section">

        <h2 className="role-section-title">
          How would you like to continue?
        </h2>

        <div className="role-container">

          {/* CITIZEN */}
          <div className="role-card">

            <div className="role-icon">
              👤
            </div>

            <h3>Citizen</h3>

            <p>
              Report emergencies, send SOS requests and track your rescue case.
            </p>

            <button className="role-button">
              Continue →
            </button>

          </div>


          {/* RESPONDER */}
          <div className="role-card">

            <div className="role-icon">
              🚑
            </div>

            <h3>Responder</h3>

            <p>
              View emergency cases, accept rescue requests and update case status.
            </p>

            <button className="role-button">
              Continue →
            </button>

          </div>


          {/* ADMIN */}
          <div className="role-card">

            <div className="role-icon">
              🛡️
            </div>

            <h3>Admin</h3>

            <p>
              Monitor incidents, alerts, responders and overall disaster response.
            </p>

            <button className="role-button">
              Continue →
            </button>

          </div>

        </div>

      </section>


      {/* ================= HOW IT WORKS ================= */}
      <section id="how-it-works" className="how-section">

        <h2>How Res-Q Connect Works</h2>

        <p className="how-subtitle">
          From emergency reporting to rescue and resolution
        </p>

        <div className="how-container">

          <div className="how-card">
            <div className="how-icon">📢</div>
            <h4>Report</h4>
            <p>
              Citizen reports an emergency through SOS.
            </p>
          </div>

          <div className="how-card">
            <div className="how-icon">🤖</div>
            <h4>Analyze</h4>
            <p>
              AI analyzes the emergency information and priority.
            </p>
          </div>

          <div className="how-card">
            <div className="how-icon">🚑</div>
            <h4>Respond</h4>
            <p>
              A responder accepts and handles the emergency case.
            </p>
          </div>

          <div className="how-card">
            <div className="how-icon">✅</div>
            <h4>Resolve</h4>
            <p>
              The emergency is resolved and the case is closed.
            </p>
          </div>

        </div>

      </section>


      {/* ================= ABOUT ================= */}
      <section id="about" className="about-section">

        <h2>About Res-Q Connect</h2>

        <p>
          Res-Q Connect is an AI-powered disaster response and rescue
          platform designed to connect citizens, responders and authorities
          during emergencies.
        </p>

      </section>


      {/* ================= FOOTER ================= */}
      <footer id="contact" className="footer">

        <div className="footer-container">

          {/* PROJECT */}
          <div>
            <h3>RES-Q CONNECT</h3>

            <p>
              AI-Powered Disaster Response & Rescue Platform
            </p>
          </div>


          {/* QUICK LINKS */}
          <div>
            <h4>Quick Links</h4>

            <a href="#">Home</a>

            <a href="#how-it-works">
              How It Works
            </a>

            <a href="#about">
              About
            </a>
          </div>


          {/* CONTACT */}
          <div>
            <h4>Contact & Help</h4>

            <p>
              📧 support@resqconnect.com
            </p>

            <p>
              🛡️ Emergency Response Platform
            </p>
          </div>

        </div>


        <div className="footer-bottom">
          © 2026 Res-Q Connect. All rights reserved.
        </div>

      </footer>

    </div>
  );
}

export default Home;