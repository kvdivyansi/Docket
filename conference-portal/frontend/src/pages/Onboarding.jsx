import { useState } from "react";
import { api } from "../api.js";

export default function Onboarding({ onDone }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const valid = fullName.trim().length > 1 && /\S+@\S+\.\S+/.test(email);

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      const user = await api.register(fullName.trim(), email.trim());
      onDone(user);
    } catch (err) {
      setError("Couldn't register right now — check that the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboard-wrap">
      <div className="panel onboard-card">
        <h1 className="form-title">Welcome to The Docket</h1>
        <p className="form-copy">
          Tell us who you are and we'll track deadlines, send you a confirmation
          the moment you flag interest in a conference, and remind you as
          submission windows close.
        </p>
        <form onSubmit={submit}>
          <div className="field-group">
            <label className="field-label" htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              className="text-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Asha Rao"
              autoFocus
            />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="text-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="asha@university.edu"
            />
          </div>
          {error && <p className="form-copy" style={{ color: "var(--rust)" }}>{error}</p>}
          <button className="btn-primary" type="submit" disabled={!valid || loading}>
            {loading ? "Setting up…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
