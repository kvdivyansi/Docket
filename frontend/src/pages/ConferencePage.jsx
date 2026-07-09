import { useEffect, useState } from "react";
import { api } from "../api.js";
import ConferenceCard from "../components/ConferenceCard.jsx";

export default function ConferencePage({ user, googleToken, onGoogleToken }) {
  const [domains, setDomains] = useState({});
  const [domain, setDomain] = useState("All");
  const [subdomain, setSubdomain] = useState("All");
  const [sortBy, setSortBy] = useState("ranking");
  const [conferences, setConferences] = useState([]);
  const [tracked, setTracked] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch available domains on mount
  useEffect(() => {
    api.getDomains().then((d) => {
      setDomains(d || {});
    }).catch((err) => {
      console.error("Failed to load domains:", err);
    });
  }, []);

  // 2. Fetch conferences and tracked list whenever filter or sort changes
  const load = async () => {
    setLoading(true);
    const targetDomain = domain === "All" ? null : domain;
    const targetSubdomain = subdomain === "All" ? null : subdomain;

    try {
      const [confs, trackedList] = await Promise.all([
        api.getConferences(targetDomain, targetSubdomain, sortBy),
        api.getTracked(user.user_id),
      ]);
      setConferences(confs || []);
      setTracked((trackedList || []).map((c) => c.id));
    } catch (err) {
      console.error("Error fetching conferences:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, subdomain, sortBy]);

  const handleInterested = async (conferenceId) => {
    await api.markInterested(user.user_id, conferenceId);
    setTracked((prev) => [...prev, conferenceId]);
  };

  return (
    <div className="conference-page">
      {/* =========================================================================
          TOP SECTION: Domain and Subdomain selection directly under page header
      ========================================================================= */}
      <div className="top-section-filters">
        <div className="filter-header-title">
          <h2 className="section-title">Research Fields & Filters</h2>
          <span className="filter-hint">Filter upcoming conferences by target domain and specialization</span>
        </div>

        {/* Domain Selector Row */}
        <div className="filter-group-row">
          <label className="filter-label">Domain:</label>
          <div className="chip-row">
            <button
              className={`chip ${domain === "All" ? "selected" : ""}`}
              onClick={() => {
                setDomain("All");
                setSubdomain("All");
              }}
            >
              All Domains
            </button>
            {Object.keys(domains).map((d) => (
              <button
                key={d}
                className={`chip ${domain === d ? "selected" : ""}`}
                onClick={() => {
                  setDomain(d);
                  setSubdomain("All");
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Subdomain Selector Row (only shown if a specific domain is selected and has subdomains) */}
        {domain !== "All" && domains[domain] && (
          <div className="filter-group-row subdomain-row">
            <label className="filter-label">Subdomain:</label>
            <div className="chip-row">
              <button
                className={`chip ${subdomain === "All" ? "selected" : ""}`}
                onClick={() => setSubdomain("All")}
              >
                All Subdomains ({domain})
              </button>
              {domains[domain].map((s) => (
                <button
                  key={s}
                  className={`chip ${subdomain === s ? "selected" : ""}`}
                  onClick={() => setSubdomain(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sorting & Summary Bar */}
        <div className="filter-bar bottom-sort-bar">
          <div className="filter-context">
            Showing <strong>{domain}</strong>
            {subdomain !== "All" ? <> / <strong>{subdomain}</strong></> : null}
            {" — "}
            {loading ? "loading…" : `${conferences.length} conference${conferences.length === 1 ? "" : "s"}`}
          </div>
          <div className="filter-bar-group">
            <button
              className={`btn-secondary ${sortBy === "ranking" ? "active" : ""}`}
              onClick={() => setSortBy("ranking")}
            >
              Sort: best ranked
            </button>
            <button
              className={`btn-secondary ${sortBy === "deadline" ? "active" : ""}`}
              onClick={() => setSortBy("deadline")}
            >
              Sort: closest deadline
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM SECTION: Conference results rendered strictly below selection tools
          with clean visual spacing between filters and grid
      ========================================================================= */}
      <div className="bottom-section-results">
        {loading ? (
          <div className="empty-state">Fetching conference listings…</div>
        ) : conferences.length === 0 ? (
          <div className="empty-state">
            No conferences match this domain or subdomain yet. Try switching to "All Domains".
          </div>
        ) : (
          <div className="conference-grid">
            {conferences.map((conf) => (
              <ConferenceCard
                key={conf.id}
                conf={conf}
                onInterested={handleInterested}
                isTracked={tracked.includes(conf.id)}
                googleToken={googleToken}
                onGoogleToken={onGoogleToken}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
