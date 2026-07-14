import { useEffect, useState } from "react";
import { api } from "../api.js";

// Formats "YYYY-MM-DD" -> "DD/MM/YYYY". Returns "—" for missing/bad dates.
function formatDate(isoDate) {
  if (!isoDate) return "—";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

// Days from today until an ISO date, or null if the date is missing/invalid.
function daysUntil(isoDate) {
  if (!isoDate) return null;
  const target = new Date(`${isoDate}T00:00:00`);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

const NOTIFIED_KEY = "docket_notified_deadlines";

function getNotifiedSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveNotifiedSet(set) {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore storage errors */
  }
}

export default function TrackedConferences({ user }) {
  const [tracked, setTracked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [untrackingId, setUntrackingId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getTracked(user.user_id);
      setTracked(list);
    } catch (err) {
      setError("Couldn't load your tracked conferences.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ask for browser-notification permission once, the first time this panel is opened.
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Fire a (one-time-per-deadline) browser notification for any tracked
  // conference whose submission deadline or conference start is within 7 days.
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (tracked.length === 0) return;

    const notified = getNotifiedSet();
    let changed = false;

    tracked.forEach((conf) => {
      const daysToDeadline = conf.days_until_deadline;
      const deadlineKey = `${conf.id}-deadline`;
      if (daysToDeadline !== null && daysToDeadline >= 0 && daysToDeadline <= 7 && !notified.has(deadlineKey)) {
        new Notification(`Submission deadline approaching: ${conf.acronym}`, {
          body: `${conf.name} — ${daysToDeadline} day${daysToDeadline === 1 ? "" : "s"} left to submit (deadline ${formatDate(conf.abstract_deadline)}).`,
        });
        notified.add(deadlineKey);
        changed = true;
      }

      const daysToStart = daysUntil(conf.conference_start);
      const startKey = `${conf.id}-start`;
      if (daysToStart !== null && daysToStart >= 0 && daysToStart <= 7 && !notified.has(startKey)) {
        new Notification(`Conference starting soon: ${conf.acronym}`, {
          body: `${conf.name} begins ${formatDate(conf.conference_start)} in ${conf.location}.`,
        });
        notified.add(startKey);
        changed = true;
      }
    });

    if (changed) saveNotifiedSet(notified);
  }, [tracked]);

  const handleUntrack = async (conferenceId) => {
    setUntrackingId(conferenceId);
    try {
      await api.untrack(user.user_id, conferenceId);
      setTracked((prev) => prev.filter((c) => c.id !== conferenceId));
    } catch (err) {
      setError("Couldn't untrack that conference — try again.");
    } finally {
      setUntrackingId(null);
    }
  };

  return (
    <div>
      <style>{`
        .tc-list { display: flex; flex-direction: column; gap: 16px; }
        .tc-card {
          background: var(--paper);
          color: var(--text-on-paper);
          border-radius: 8px;
          padding: 20px 24px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.28);
        }
        .tc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
          border-bottom: 1px solid rgba(28,36,49,0.12);
          padding-bottom: 12px;
          margin-bottom: 12px;
        }
        .tc-name { font-family: var(--font-display); font-size: 20px; font-weight: 600; margin: 0; }
        .tc-acronym-sub { font-size: 12.5px; color: var(--text-on-paper-dim); margin-top: 2px; }
        .tc-deadline-badge {
          font-family: var(--font-mono);
          font-size: 13px;
          text-align: right;
          white-space: nowrap;
        }
        .tc-deadline-badge .tc-days {
          display: block;
          font-size: 22px;
          font-weight: 700;
          line-height: 1.1;
        }
        .tc-deadline-badge.urgent .tc-days { color: var(--rust); }
        .tc-deadline-badge.past .tc-days { color: var(--slate); font-size: 15px; }
        .tc-details {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 10px 24px;
          margin-bottom: 16px;
        }
        .tc-detail-row { font-size: 13.5px; }
        .tc-detail-label {
          font-family: var(--font-mono);
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-on-paper-dim);
          display: block;
        }
        .tc-detail-value { font-weight: 500; }
        .tc-untrack-btn {
          border: 1px solid rgba(28,36,49,0.2);
          background: transparent;
          color: var(--text-on-paper-dim);
          border-radius: 5px;
          padding: 7px 16px;
          font-size: 13px;
        }
        .tc-untrack-btn:hover { border-color: var(--rust); color: var(--rust); }
        .tc-untrack-btn:disabled { opacity: 0.5; }
      `}</style>

      <div className="filter-context" style={{ marginBottom: 20 }}>
        <strong>Tracked conferences</strong> — {loading ? "loading…" : `${tracked.length} conference${tracked.length === 1 ? "" : "s"}`}
      </div>

      {error && <p className="form-copy" style={{ color: "var(--rust)" }}>{error}</p>}

      {loading ? (
        <div className="empty-state">Loading your tracked conferences…</div>
      ) : tracked.length === 0 ? (
        <div className="empty-state">
          You're not tracking any conferences yet. Mark one "I'm interested" from the Conferences tab to see it here.
        </div>
      ) : (
        <div className="tc-list">
          {tracked.map((conf) => {
            const days = conf.days_until_deadline;
            const past = days !== null && days < 0;
            const urgent = !past && days !== null && days <= 14;

            return (
              <div className="tc-card" key={conf.id}>
                <div className="tc-header">
                  <div>
                    <h3 className="tc-name">{conf.name}</h3>
                    <div className="tc-acronym-sub">{conf.acronym} · {conf.domain} / {conf.subdomain}</div>
                  </div>
                  <div className={`tc-deadline-badge ${past ? "past" : urgent ? "urgent" : ""}`}>
                    <span className="tc-days">{past ? "Closed" : `${days} day${days === 1 ? "" : "s"} left`}</span>
                    Submission deadline: {formatDate(conf.abstract_deadline)}
                  </div>
                </div>

                <div className="tc-details">
                  <div className="tc-detail-row">
                    <span className="tc-detail-label">Date of Conference</span>
                    <span className="tc-detail-value">{formatDate(conf.conference_start)} – {formatDate(conf.conference_end)}</span>
                  </div>
                  <div className="tc-detail-row">
                    <span className="tc-detail-label">Location</span>
                    <span className="tc-detail-value">{conf.location}</span>
                  </div>
                  <div className="tc-detail-row">
                    <span className="tc-detail-label">Notification Date</span>
                    <span className="tc-detail-value">{formatDate(conf.notification_date)}</span>
                  </div>
                  <div className="tc-detail-row">
                    <span className="tc-detail-label">Ranking</span>
                    <span className="tc-detail-value">{conf.ranking_tier} {conf.ranking_source ? `(${conf.ranking_source})` : ""}</span>
                  </div>
                </div>

                <button
                  className="tc-untrack-btn"
                  onClick={() => handleUntrack(conf.id)}
                  disabled={untrackingId === conf.id}
                >
                  {untrackingId === conf.id ? "Untracking…" : "Untrack"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
