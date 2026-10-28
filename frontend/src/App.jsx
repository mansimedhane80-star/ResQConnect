
import React, { useState } from "react";
import "./App.css";

import CreateAccount from "./CreateAccount";
import AdminCreateAccount from "./AdminCreateAccount";
import ResponderLogin from "./ResponderLogin";
import AdminLogin from "./AdminLogin";
import CitizenSOS from "./CitizenSOS";
import ResponderDashboard from "./ResponderDashboard";
import AdminDashboard from "./AdminDashboard";

const translations = {
  en: {
    tagline: "CONNECTING PEOPLE. SAVING LIVES.",
    hero: "When every second matters,",
    heroAccent: "every connection counts.",
    heroDescription: "One platform for emergency help, rescue teams, and coordinated disaster response.",
    getStarted: "GET STARTED",
    selectRole: "Select your role to get started",
    choose: "Choose the option that best describes you.",
    step: "01 / ROLE SELECTION",
    citizen: "Citizen",
    responder: "Rescue Responder",
    admin: "Administrator",
    citizenDescription: "Report an emergency or request help.",
    citizenDetail: "Get assistance when you need it.",
    responderDescription: "View active incidents and respond.",
    responderDetail: "Help coordinate rescue operations.",
    adminDescription: "Manage operations and response teams.",
    adminDetail: "Oversee incidents and coordination.",
    quick: "QUICK ACCESS",
    continue: "Continue as Citizen",
    login: "Log In",
    register: "Create account",
    footer: "Built for safer, stronger communities.",
    privacy: "Privacy",
    terms: "Terms",
    support: "Support",
  },
  hi: {
    tagline: "लोगों को जोड़ना। जीवन बचाना।",
    hero: "जब हर सेकंड महत्वपूर्ण हो,",
    heroAccent: "हर जुड़ाव मायने रखता है।",
    heroDescription: "आपातकालीन सहायता, बचाव दल और आपदा प्रबंधन के लिए एक मंच।",
    getStarted: "शुरू करें",
    selectRole: "शुरू करने के लिए अपनी भूमिका चुनें",
    choose: "अपने लिए उपयुक्त विकल्प चुनें।",
    step: "01 / भूमिका चुनें",
    citizen: "नागरिक",
    responder: "बचाव कर्मी",
    admin: "प्रशासक",
    citizenDescription: "आपातकाल की सूचना दें या सहायता माँगें।",
    citizenDetail: "ज़रूरत पड़ने पर सहायता प्राप्त करें।",
    responderDescription: "सक्रिय घटनाएँ देखें और प्रतिक्रिया दें।",
    responderDetail: "बचाव कार्यों में समन्वय करें।",
    adminDescription: "कार्यों और बचाव दलों का प्रबंधन करें।",
    adminDetail: "घटनाओं और समन्वय की निगरानी करें।",
    quick: "त्वरित पहुँच",
    continue: "नागरिक के रूप में आगे बढ़ें",
    login: "लॉग इन",
    register: "खाता बनाएँ",
    footer: "सुरक्षित और सशक्त समुदायों के लिए।",
    privacy: "गोपनीयता",
    terms: "नियम",
    support: "सहायता",
  },
  mr: {
    tagline: "लोकांना जोडणे. जीव वाचवणे.",
    hero: "जेव्हा प्रत्येक सेकंद महत्त्वाचा असतो,",
    heroAccent: "तेव्हा प्रत्येक जोड महत्त्वाची असते.",
    heroDescription: "आपत्कालीन मदत, बचाव पथके आणि आपत्ती व्यवस्थापनासाठी एक व्यासपीठ.",
    getStarted: "सुरुवात करा",
    selectRole: "सुरुवात करण्यासाठी तुमची भूमिका निवडा",
    choose: "तुमच्यासाठी योग्य पर्याय निवडा.",
    step: "01 / भूमिका निवड",
    citizen: "नागरिक",
    responder: "बचाव कर्मचारी",
    admin: "प्रशासक",
    citizenDescription: "आपत्कालीन परिस्थिती कळवा किंवा मदत मागा.",
    citizenDetail: "गरज असेल तेव्हा मदत मिळवा.",
    responderDescription: "सक्रिय घटनांची माहिती घ्या आणि प्रतिसाद द्या.",
    responderDetail: "बचाव कार्यात समन्वय साधा.",
    adminDescription: "कामकाज आणि बचाव पथकांचे व्यवस्थापन करा.",
    adminDetail: "घटना आणि समन्वयावर देखरेख ठेवा.",
    quick: "त्वरित प्रवेश",
    continue: "नागरिक म्हणून पुढे जा",
    login: "लॉग इन",
    register: "खाते तयार करा",
    footer: "अधिक सुरक्षित आणि सक्षम समुदायांसाठी.",
    privacy: "गोपनीयता",
    terms: "अटी",
    support: "मदत",
  },
  ml: {
    tagline: "ആളുകളെ ബന്ധിപ്പിക്കുക. ജീവൻ രക്ഷിക്കുക.",
    hero: "ഓരോ സെക്കൻഡും നിർണായകമാകുമ്പോൾ,",
    heroAccent: "ഓരോ ബന്ധവും പ്രധാനമാണ്.",
    heroDescription: "അടിയന്തര സഹായത്തിനും രക്ഷാപ്രവർത്തകർക്കും ദുരന്തനിവാരണത്തിനുമുള്ള ഏക വേദി.",
    getStarted: "തുടങ്ങുക",
    selectRole: "തുടരാൻ നിങ്ങളുടെ പങ്ക് തിരഞ്ഞെടുക്കുക",
    choose: "നിങ്ങൾക്ക് അനുയോജ്യമായ ഓപ്ഷൻ തിരഞ്ഞെടുക്കുക.",
    step: "01 / പങ്ക് തിരഞ്ഞെടുക്കൽ",
    citizen: "പൗരൻ",
    responder: "രക്ഷാപ്രവർത്തകൻ",
    admin: "അഡ്മിനിസ്ട്രേറ്റർ",
    citizenDescription: "അടിയന്തരാവസ്ഥ റിപ്പോർട്ട് ചെയ്യുക അല്ലെങ്കിൽ സഹായം അഭ്യർത്ഥിക്കുക.",
    citizenDetail: "ആവശ്യമുള്ളപ്പോൾ സഹായം നേടുക.",
    responderDescription: "സജീവ സംഭവങ്ങൾ കണ്ട് പ്രതികരിക്കുക.",
    responderDetail: "രക്ഷാപ്രവർത്തനങ്ങൾ ഏകോപിപ്പിക്കുക.",
    adminDescription: "പ്രവർത്തനങ്ങളും രക്ഷാസംഘങ്ങളും നിയന്ത്രിക്കുക.",
    adminDetail: "സംഭവങ്ങളും ഏകോപനവും നിരീക്ഷിക്കുക.",
    quick: "വേഗത്തിലുള്ള പ്രവേശനം",
    continue: "പൗരനായി തുടരുക",
    login: "ലോഗിൻ",
    register: "അക്കൗണ്ട് സൃഷ്ടിക്കുക",
    footer: "സുരക്ഷിതവും ശക്തവുമായ സമൂഹങ്ങൾക്കായി.",
    privacy: "സ്വകാര്യത",
    terms: "നിബന്ധനകൾ",
    support: "സഹായം",
  },
  ta: {
    tagline: "மக்களை இணைப்போம். உயிர்களைக் காப்போம்.",
    hero: "ஒவ்வொரு நொடியும் முக்கியமானபோது,",
    heroAccent: "ஒவ்வொரு இணைப்பும் முக்கியம்.",
    heroDescription: "அவசர உதவி, மீட்புக் குழுக்கள் மற்றும் பேரிடர் மேலாண்மைக்கான ஒரே தளம்.",
    getStarted: "தொடங்குங்கள்",
    selectRole: "தொடங்க உங்கள் பங்கைத் தேர்ந்தெடுக்கவும்",
    choose: "உங்களுக்கு ஏற்ற விருப்பத்தைத் தேர்ந்தெடுக்கவும்.",
    step: "01 / பங்கு தேர்வு",
    citizen: "குடிமகன்",
    responder: "மீட்புப் பணியாளர்",
    admin: "நிர்வாகி",
    citizenDescription: "அவசரநிலையைப் புகாரளிக்கவும் அல்லது உதவி கோரவும்.",
    citizenDetail: "தேவைப்படும்போது உதவி பெறுங்கள்.",
    responderDescription: "செயலில் உள்ள சம்பவங்களைக் கண்டு பதிலளிக்கவும்.",
    responderDetail: "மீட்புப் பணிகளை ஒருங்கிணைக்கவும்.",
    adminDescription: "செயல்பாடுகள் மற்றும் மீட்புக் குழுக்களை நிர்வகிக்கவும்.",
    adminDetail: "சம்பவங்கள் மற்றும் ஒருங்கிணைப்பைக் கண்காணிக்கவும்.",
    quick: "விரைவு அணுகல்",
    continue: "குடிமகனாகத் தொடரவும்",
    login: "உள்நுழைக",
    register: "கணக்கை உருவாக்கவும்",
    footer: "பாதுகாப்பான, வலிமையான சமூகங்களுக்காக.",
    privacy: "தனியுரிமை",
    terms: "விதிமுறைகள்",
    support: "உதவி",
  },
  gu: {
    tagline: "લોકોને જોડીએ. જીવન બચાવીએ.",
    hero: "જ્યારે દરેક સેકન્ડ મહત્વનો હોય,",
    heroAccent: "ત્યારે દરેક જોડાણ મહત્વનું છે.",
    heroDescription: "કટોકટીની મદદ, બચાવ ટીમો અને આપત્તિ વ્યવસ્થાપન માટે એક મંચ.",
    getStarted: "શરૂ કરો",
    selectRole: "શરૂ કરવા માટે તમારી ભૂમિકા પસંદ કરો",
    choose: "તમારા માટે યોગ્ય વિકલ્પ પસંદ કરો.",
    step: "01 / ભૂમિકા પસંદગી",
    citizen: "નાગરિક",
    responder: "બચાવ કર્મચારી",
    admin: "વહીવટકર્તા",
    citizenDescription: "કટોકટીની જાણ કરો અથવા મદદ માગો.",
    citizenDetail: "જરૂર પડે ત્યારે સહાય મેળવો.",
    responderDescription: "ચાલુ ઘટનાઓ જુઓ અને પ્રતિસાદ આપો.",
    responderDetail: "બચાવ કામગીરીનું સંકલન કરો.",
    adminDescription: "કામગીરી અને બચાવ ટીમોનું સંચાલન કરો.",
    adminDetail: "ઘટનાઓ અને સંકલન પર દેખરેખ રાખો.",
    quick: "ઝડપી પ્રવેશ",
    continue: "નાગરિક તરીકે આગળ વધો",
    login: "લૉગ ઇન",
    register: "ખાતું બનાવો",
    footer: "વધુ સુરક્ષિત અને મજબૂત સમુદાયો માટે.",
    privacy: "ગોપનીયતા",
    terms: "નિયમો",
    support: "સહાય",
  },
};

const languageNames = {
  en: "English",
  hi: "हिन्दी",
  mr: "मराठी",
  ml: "മലയാളം",
  ta: "தமிழ்",
  gu: "ગુજરાતી",
};

const roles = [
  {
    id: "citizen",
    icon: "👤",
    title: "citizen",
    description: "citizenDescription",
    detail: "citizenDetail",
  },
  {
    id: "responder",
    icon: "🦺",
    title: "responder",
    description: "responderDescription",
    detail: "responderDetail",
  },
  {
    id: "admin",
    icon: "🛡️",
    title: "admin",
    description: "adminDescription",
    detail: "adminDetail",
  },
];

export default function App() {
  const [page, setPage] = useState("home");
  const [darkMode, setDarkMode] = useState(false);
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState(
    () => localStorage.getItem("resqLanguage") || "en"
  );

  const t = translations[language] || translations.en;

  function changeLanguage(value) {
    setLanguage(value);
    localStorage.setItem("resqLanguage", value);
  }

  function goToPage(nextPage) {
    setMessage("");
    setPage(nextPage);
  }

  if (page === "admin-dashboard") {
    return (
      <AdminDashboard
        onLogout={() => goToPage("admin-login")}
      />
    );
  }

  if (page === "responder-dashboard") {
    return (
      <ResponderDashboard
        onLogout={() => goToPage("responder-login")}
      />
    );
  }

  if (page === "admin-register") {
    return (
      <AdminCreateAccount
        onBack={() => goToPage("home")}
        onSignIn={() => goToPage("admin-login")}
      />
    );
  }

  if (page === "responder-register") {
    return (
      <div>
        <button
          type="button"
          onClick={() => goToPage("home")}
          style={{ margin: "12px", padding: "10px 16px", cursor: "pointer" }}
        >
          ← Back to Home
        </button>
        <CreateAccount />
      </div>
    );
  }

  if (page === "responder-login") {
    return (
      <ResponderLogin
        onBack={() => goToPage("home")}
        onRegister={() => goToPage("responder-register")}
        onLogin={() => goToPage("responder-dashboard")}
      />
    );
  }

  if (page === "admin-login") {
    return (
      <AdminLogin
        onBack={() => goToPage("home")}
        onRegister={() => goToPage("admin-register")}
        onLogin={() => goToPage("admin-dashboard")}
      />
    );
  }

  if (page === "citizen-sos") {
    return (
      <CitizenSOS
        onBack={() => goToPage("home")}
        language={language}
        setLanguage={changeLanguage}
      />
    );
  }

  return (
    <main className={`welcome-page ${darkMode ? "dark-mode" : ""}`}>
      <header className="topbar">
        <a
          className="brand"
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            goToPage("home");
          }}
        >
          <div className="brand-icon">R</div>
          <div>
            <h2>ResQ Connect</h2>
            <p>Disaster Response &amp; Community Rescue</p>
          </div>
        </a>

        <div className="header-actions">
          <label className="language-selector">
            <span aria-hidden="true">🌐</span>
            <select
              aria-label="Select language"
              value={language}
              onChange={(event) => changeLanguage(event.target.value)}
            >
              {Object.entries(languageNames).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="theme-toggle"
            onClick={() => setDarkMode((value) => !value)}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="live-dot" />
            {t.tagline}
          </div>

          <h1>
            {t.hero}
            <br />
            <span className="accent-text">{t.heroAccent}</span>
          </h1>

          <p className="hero-description">{t.heroDescription}</p>
        </div>

        <div className="network-art" aria-hidden="true">
          <div className="network-ring ring-one" />
          <div className="network-ring ring-two" />
          <div className="network-ring ring-three" />
          <span className="network-node node-one">+</span>
          <span className="network-node node-two">⌖</span>
          <span className="network-node node-three">✓</span>
          <span className="network-node node-four">+</span>
          <div className="network-center">R</div>
        </div>
      </section>

      <section className="role-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t.getStarted}</p>
            <h2>{t.selectRole}</h2>
            <p className="section-description">{t.choose}</p>
          </div>
          <span className="step-label">{t.step}</span>
        </div>

        <div className="role-grid">
          {roles.map((role) => (
            <article
              key={role.id}
              className={`role-card ${role.id === "citizen" ? "featured-card" : ""}`}
            >
              {role.id === "citizen" && (
                <span className="recommended-label">{t.quick}</span>
              )}

              <div className={`role-icon ${role.id}-icon`}>{role.icon}</div>
              <h3>{t[role.title]}</h3>
              <p className="role-description">{t[role.description]}</p>
              <p className="role-detail">{t[role.detail]}</p>

              {role.id === "citizen" ? (
                <button
                  type="button"
                  className="role-button primary-button"
                  onClick={() => goToPage("citizen-sos")}
                >
                  {t.continue} →
                </button>
              ) : (
                <div className="role-actions">
                  <button
                    type="button"
                    className="role-button secondary-button"
                    onClick={() => goToPage(`${role.id}-login`)}
                  >
                    {t.login} →
                  </button>
                  <button
                    type="button"
                    className="register-button"
                    onClick={() => goToPage(`${role.id}-register`)}
                  >
                    {t.register}
                  </button>
                </div>
              )}

              <span className="card-arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>

        {message && (
          <div className="selection-message" role="status">
            <p>{message}</p>
            <button
              type="button"
              className="close-message"
              onClick={() => setMessage("")}
            >
              ×
            </button>
          </div>
        )}
      </section>

      <footer className="page-footer">
        <span>© ResQ Connect</span>
        <span>{t.footer}</span>
        <nav aria-label="Footer links">
          <a href="#privacy">{t.privacy}</a>
          <a href="#terms">{t.terms}</a>
          <a href="mailto:support@example.com">{t.support}</a>
        </nav>
      </footer>
    </main>
  );
}
