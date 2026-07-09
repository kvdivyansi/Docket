import { useEffect, useState } from "react";
import { api } from "../api.js";
import ConferenceCard from "../components/ConferenceCard.jsx";

export default function Dashboard({ user, domain, subdomain, onChangePreferences }) {
  const [sortBy, setSortBy] = useState("ranking");
  const [conferences, setConferences] = useState([]);
  const [tracked, setTracked] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [confs, trackedList] = await Promise.all([
      api.getConferences(domain, subdomain, sortBy),
      api.getTracked(user.user_id),
    ]);
    setConferences(confs);
    setTracked(trackedList.map((c) => c.id));
    setLoading(false);
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
    <div>
      <div className="filter-bar">
        <div className="filter-context">
          Showing <strong>{domain}</strong>
          {subdomain ? <> / <strong>{subdomain}</strong></> : null}
          {" — "}
          {loading ? "loading…" : `${conferences.length} conference${conferences.length === 1 ? "" : "s"}`}
          {"  "}
          <button className="btn-secondary" style={{ marginLeft: 10 }} onClick={onChangePreferences}>
            Change field
          </button>
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

      {loading ? (
        <div className="empty-state">Fetching listings…</div>
      ) : conferences.length === 0 ? (
        <div className="empty-state">
          No conferences match this field yet. Try a different domain or subdomain.
        </div>
      ) : (
        <div className="conference-grid">
          {conferences.map((conf) => (
            <ConferenceCard
              key={conf.id}
              conf={conf}
              onInterested={handleInterested}
              isTracked={tracked.includes(conf.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
