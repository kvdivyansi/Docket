import { useState } from "react";
import Onboarding from "./pages/Onboarding.jsx";
import DomainSelect from "./pages/DomainSelect.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Suggest from "./pages/Suggest.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [tab, setTab] = useState("dashboard");

  if (!user) {
    return (
      <div className="shell">
        <Onboarding onDone={setUser} />
      </div>
    );
  }

  if (!prefs) {
    return (
      <div className="shell">
        <header className="masthead">
          <div>
            <h1 className="masthead-title">
              The <span className="accent">Docket</span>
            </h1>
            <div className="masthead-sub">Call-for-papers desk</div>
          </div>
        </header>
        <DomainSelect user={user} onDone={setPrefs} />
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="masthead">
        <div>
          <h1 className="masthead-title">
            The <span className="accent">Docket</span>
          </h1>
          <div className="masthead-sub">Call-for-papers desk</div>
        </div>
        <div className="user-chip">{user.full_name} · {user.email}</div>
      </header>

      <nav className="tab-row">
        <button className={`tab-btn ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}>
          Listings
        </button>
        <button className={`tab-btn ${tab === "suggest" ? "active" : ""}`} onClick={() => setTab("suggest")}>
          Suggest for my paper
        </button>
      </nav>

      {tab === "dashboard" ? (
        <Dashboard
          user={user}
          domain={prefs.domain}
          subdomain={prefs.subdomain}
          onChangePreferences={() => setPrefs(null)}
        />
      ) : (
        <Suggest user={user} />
      )}
    </div>
  );
}
