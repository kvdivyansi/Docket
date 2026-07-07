const BASE_URL = "http://localhost:8000/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  register: (full_name, email) =>
    request("/register", { method: "POST", body: JSON.stringify({ full_name, email }) }),

  setPreferences: (userId, domain, subdomain) =>
    request(`/users/${userId}/preferences?domain=${encodeURIComponent(domain)}${subdomain ? `&subdomain=${encodeURIComponent(subdomain)}` : ""}`, {
      method: "POST",
    }),

  getDomains: () => request("/domains"),

  getConferences: (domain, subdomain, sortBy) => {
    const params = new URLSearchParams();
    if (domain) params.set("domain", domain);
    if (subdomain) params.set("subdomain", subdomain);
    params.set("sort_by", sortBy || "ranking");
    return request(`/conferences?${params.toString()}`);
  },

  getRejected: () => request("/conferences/rejected"),

  markInterested: (userId, conferenceId) =>
    request("/interested", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, conference_id: conferenceId }),
    }),

  getTracked: (userId) => request(`/users/${userId}/tracked`),

  suggest: (text, userId) =>
    request("/suggest", { method: "POST", body: JSON.stringify({ text, user_id: userId }) }),
};
