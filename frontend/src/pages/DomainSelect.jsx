import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function DomainSelect({ user, onDone }) {
  const [domains, setDomains] = useState({});
  const [domain, setDomain] = useState(null);
  const [subdomain, setSubdomain] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDomains().then((d) => {
      setDomains(d);
      setLoading(false);
    });
  }, []);

  const confirm = async () => {
    await api.setPreferences(user.user_id, domain, subdomain);
    onDone({ domain, subdomain });
  };

  if (loading) return <div className="empty-state">Loading fields of research…</div>;

  return (
    <div className="panel">
      <h1 className="form-title">What are you working on, {user.full_name.split(" ")[0]}?</h1>
      <p className="form-copy">
        Pick a domain to start with — you can always widen or narrow this later
        from the filter bar.
      </p>

      <label className="field-label">Domain</label>
      <div className="chip-grid">
        {Object.keys(domains).map((d) => (
          <button
            key={d}
            className={`chip ${domain === d ? "selected" : ""}`}
            onClick={() => {
              setDomain(d);
              setSubdomain(null);
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {domain && (
        <>
          <label className="field-label">Subdomain (optional)</label>
          <div className="chip-grid">
            {domains[domain].map((s) => (
              <button
                key={s}
                className={`chip ${subdomain === s ? "selected" : ""}`}
                onClick={() => setSubdomain(subdomain === s ? null : s)}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}

      <button className="btn-primary" disabled={!domain} onClick={confirm}>
        Show me conferences
      </button>
    </div>
  );
}
