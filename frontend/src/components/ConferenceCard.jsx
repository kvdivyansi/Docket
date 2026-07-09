import { useState } from "react";
import Stamp from "./Stamp.jsx";
import CountdownTicket from "./CountdownTicket.jsx";
import { requestGoogleCalendarAccess, addConferenceToGoogleCalendar } from "../utils/googleCalendarAuth.js";

export default function ConferenceCard({ conf, onInterested, isTracked, matchTerms, googleToken, onGoogleToken }) {
  const [loading, setLoading] = useState(false);
  const [justTracked, setJustTracked] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState(null); // 'adding' | 'added' | 'error'
  const [calendarError, setCalendarError] = useState(null);

  const handleClick = async () => {
    if (isTracked || justTracked) return;
    setLoading(true);
    try {
      await onInterested(conf.id);
      setJustTracked(true);

      setCalendarStatus("adding");
      try {
        // Reuse the token from a previous card's click if we have one;
        // otherwise this is the first "I'm interested" ever, so pop the
        // Google sign-in/consent screen right now.
        let token = googleToken;
        if (!token) {
          token = await requestGoogleCalendarAccess();
          onGoogleToken?.(token);
        }

        const { succeeded, failed } = await addConferenceToGoogleCalendar(token, conf);
        if (failed.length > 0) {
          setCalendarStatus("error");
          setCalendarError(failed.map((f) => f.error).join("; "));
        } else if (succeeded.length > 0) {
          setCalendarStatus("added");
        }
      } catch (err) {
        setCalendarStatus("error");
        setCalendarError(err.message);
      }
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

        {tracked && (
          <div className="gcal-status">
            {calendarStatus === "adding" && <span>Adding to Google Calendar…</span>}
            {calendarStatus === "added" && <span className="gcal-ok">✓ Added to Google Calendar</span>}
            {calendarStatus === "error" && <span className="gcal-err">Couldn't add to Google Calendar: {calendarError}</span>}
          </div>
        )}
      </div>

      <CountdownTicket daysUntilDeadline={conf.days_until_deadline} deadline={conf.abstract_deadline} />
    </div>
  );
}
