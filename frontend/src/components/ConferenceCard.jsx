import { useState } from "react";
import Stamp from "./Stamp.jsx";
import CountdownTicket from "./CountdownTicket.jsx";

export default function ConferenceCard({ conf, onInterested, isTracked, matchTerms }) {
  const [loading, setLoading] = useState(false);
  const [justTracked, setJustTracked] = useState(false);

  const handleClick = async () => {
    if (isTracked || justTracked) return;
    setLoading(true);
    try {
      await onInterested(conf.id);
      setJustTracked(true);
    } finally {
      setLoading(false);
    }
  };

  const tracked = isTracked || justTracked;

  return (
    <div className="conf-card">
      <div className="conf-card-body">
        <Stamp tier={conf.ranking_tier} />
        <div className="conf-card-top">
          <div>
            <h3 className="conf-acronym">{conf.acronym}</h3>
            <p className="conf-name">{conf.name}</p>
          </div>
        </div>

        <div className="conf-meta">
          <span>{conf.domain} / {conf.subdomain}</span>
          <span>{conf.location}</span>
          <span>{conf.conference_start} → {conf.conference_end}</span>
        </div>

        <p className="conf-desc">{conf.description}</p>

        {matchTerms && matchTerms.length > 0 && (
          <div className="match-terms">matched on: {matchTerms.join(", ")}</div>
        )}

        <div className="conf-tags">
          <span className="conf-tag">{conf.ranking_source || "no ranking body"}</span>
          <span className="conf-tag">notify {conf.notification_date}</span>
        </div>

        <div className="conf-actions">
          <button
            className={`btn-interest ${tracked ? "tracked" : ""}`}
            onClick={handleClick}
            disabled={loading || tracked}
          >
            {tracked ? "✓ Tracking" : loading ? "Sending…" : "I'm interested"}
          </button>
          {tracked && <span className="confirm-note">Confirmation email sent</span>}
        </div>
      </div>

      <CountdownTicket daysUntilDeadline={conf.days_until_deadline} deadline={conf.abstract_deadline} />
    </div>
  );
}
