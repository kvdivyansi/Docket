import { useState } from "react";
import { api } from "../api.js";
import ConferenceCard from "../components/ConferenceCard.jsx";

export default function Suggest({ user }) {
  const [text, setText] = useState("");
  const [results, setResults] = useState(null);
  const [tracked, setTracked] = useState([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const matches = await api.suggest(text.trim(), user.user_id);
    setResults(matches);
    setLoading(false);
  };

  const handleInterested = async (conferenceId) => {
    await api.markInterested(user.user_id, conferenceId);
    setTracked((prev) => [...prev, conferenceId]);
  };

  return (
    <div>
      <div className="panel suggest-panel">
        <h1 className="form-title">Describe your paper or conference</h1>
        <p className="form-copy">
          Paste a title, abstract, or a few keywords about your own work — or
          describe a conference you're already targeting — and we'll match it
          against the clean, ranked listing.
        </p>
        <div className="field-group">
          <label className="field-label" htmlFor="suggestText">Your paper / interests</label>
          <textarea
            id="suggestText"
            className="textarea-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. A transformer-based approach for low-resource machine translation and text summarization"
          />
        </div>
        <button className="btn-primary" onClick={run} disabled={loading || !text.trim()}>
          {loading ? "Matching…" : "Find matching conferences"}
        </button>
      </div>

      {results !== null && (
        results.length === 0 ? (
          <div className="empty-state">
            No strong matches yet — try adding a few more specific keywords (methods, subfield, application area).
          </div>
        ) : (
          <div className="conference-grid">
            {results.map((conf) => (
              <ConferenceCard
                key={conf.id}
                conf={conf}
                onInterested={handleInterested}
                isTracked={tracked.includes(conf.id)}
                matchTerms={conf._matched_terms}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
