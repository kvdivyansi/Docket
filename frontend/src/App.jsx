import { useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import Onboarding from "./pages/Onboarding.jsx";
import LandingDashboard from "./pages/LandingDashboard.jsx";
import ConferencePage from "./pages/ConferencePage.jsx";
import Suggest from "./pages/Suggest.jsx";
import TrackedConferences from "./pages/TrackedConferences.jsx";

function AppShell({ user, onLogout }) {
  const location = useLocation();
  const [googleToken, setGoogleToken] = useState(null);

  return (
    <div className="shell">
      <header className="masthead">
        <div>
          <Link to="/" className="masthead-link">
            <h1 className="masthead-title">
              The <span className="accent">Docket</span>
            </h1>
            <div className="masthead-sub">Call-for-papers desk</div>
          </Link>
        </div>
        <div className="user-bar">
          <div className="user-chip">{user.full_name} · {user.email}</div>
          <button className="btn-secondary switch-btn" onClick={onLogout}>
            Switch User
          </button>
        </div>
      </header>

      {googleToken && (
        <div className="gcal-bar">
          <span className="gcal-connected">✓ Google Calendar connected for this session</span>
        </div>
      )}

      <nav className="tab-row">
        <Link
          to="/"
          className={`tab-btn ${location.pathname === "/" ? "active" : ""}`}
        >
          Dashboard
        </Link>
        <Link
          to="/conferences"
          className={`tab-btn ${location.pathname === "/conferences" ? "active" : ""}`}
        >
          Conferences
        </Link>
        <Link
          to="/suggest"
          className={`tab-btn ${location.pathname === "/suggest" ? "active" : ""}`}
        >
          Suggest for my paper
        </Link>
        <Link
          to="/tracked"
          className={`tab-btn ${location.pathname === "/tracked" ? "active" : ""}`}
        >
          Tracked
        </Link>
      </nav>

      <Routes>
        <Route path="/" element={<LandingDashboard user={user} />} />
        <Route
          path="/conferences"
          element={
            <ConferencePage
              user={user}
              googleToken={googleToken}
              onGoogleToken={setGoogleToken}
            />
          }
        />
        <Route path="/suggest" element={<Suggest user={user} />} />
        <Route path="/tracked" element={<TrackedConferences user={user} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("docket_user");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const handleSetUser = (u) => {
    setUser(u);
    try {
      if (u) localStorage.setItem("docket_user", JSON.stringify(u));
      else localStorage.removeItem("docket_user");
    } catch (e) {}
  };

  if (!user) {
    return (
      <div className="shell">
        <Onboarding onDone={handleSetUser} />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppShell user={user} onLogout={() => handleSetUser(null)} />
    </BrowserRouter>
  );
}
