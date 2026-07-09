// Real Google Calendar integration.
//
// Flow:
//   1. User clicks "Connect Google Calendar" once (App-level). This opens
//      Google's OAuth consent popup via Google Identity Services (GIS) and
//      asks for the `calendar.events` scope only (not full calendar access,
//      not email/profile — just permission to create events).
//   2. GIS hands back a short-lived access token. We keep it in memory
//      (React state) for the rest of the session — it is NOT persisted to
//      localStorage, so it disappears on refresh and the user reconnects.
//   3. Every time the user clicks "I'm interested" on a conference, we use
//      that token to call the Calendar API directly and insert the events
//      — no further clicks, no redirect.
//
// Setup required (one-time, in Google Cloud Console):
//   1. Create/select a project → "APIs & Services" → Library → enable the
//      "Google Calendar API".
//   2. "APIs & Services" → Credentials → Create Credentials → OAuth client
//      ID → Application type "Web application".
//   3. Under "Authorized JavaScript origins" add http://localhost:5173
//      (and your real domain when you deploy).
//   4. Copy the Client ID into frontend/.env as VITE_GOOGLE_CLIENT_ID
//      (see .env.example). Restart `npm run dev` after adding it.
//   5. While the OAuth consent screen is in "Testing" mode, add the Google
//      accounts you want to test with under "Test users", or publish the
//      app (Google review is only required for the sensitive/restricted
//      scopes tier, calendar.events is not in it, but unverified apps
//      still show a warning screen you have to click through).

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

let tokenClient = null;

function getTokenClient(onToken) {
  if (!window.google?.accounts?.oauth2) {
    throw new Error(
      "Google Identity Services script hasn't loaded yet. Check your internet connection / that the <script> tag in index.html loaded, then try again."
    );
  }
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: onToken, // overwritten per-call below via a wrapper
    });
  }
  return tokenClient;
}

// Opens the Google consent popup (only if needed) and resolves with an
// access token string. Call this once, e.g. from a "Connect Google
// Calendar" button, and hold onto the token in state.
export function requestGoogleCalendarAccess() {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID || CLIENT_ID.includes("paste-your-client-id")) {
      reject(
        new Error(
          "Missing VITE_GOOGLE_CLIENT_ID. Set it in frontend/.env (see .env.example) and restart the dev server."
        )
      );
      return;
    }
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.access_token);
          }
        },
        error_callback: (err) => reject(new Error(err.type || "OAuth popup failed")),
      });
      client.requestAccessToken();
    } catch (err) {
      reject(err);
    }
  });
}

function toCompactExclusiveEnd(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Inserts a single all-day event into the signed-in user's primary
// calendar. Returns the created event's Google Calendar id/link.
async function insertEvent(accessToken, { summary, description, location, startDate, endDate }) {
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary,
      description,
      location,
      start: { date: startDate },
      end: { date: toCompactExclusiveEnd(endDate || startDate) },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Calendar API error (${res.status})`);
  }
  return res.json();
}

// Adds both relevant dates for a conference (submission deadline +
// conference dates) to the user's Google Calendar. Skips a date if the
// conference doesn't have it. Returns { succeeded: [...], failed: [...] }.
export async function addConferenceToGoogleCalendar(accessToken, conf) {
  const jobs = [];

  if (conf.abstract_deadline) {
    jobs.push({
      key: "deadline",
      run: () =>
        insertEvent(accessToken, {
          summary: `${conf.acronym} — paper submission deadline`,
          description: `Abstract/paper submission deadline for ${conf.name}.${
            conf.website ? ` ${conf.website}` : ""
          }`,
          location: conf.location,
          startDate: conf.abstract_deadline,
        }),
    });
  }

  if (conf.conference_start) {
    jobs.push({
      key: "event",
      run: () =>
        insertEvent(accessToken, {
          summary: `${conf.acronym} ${conf.name}`,
          description: conf.description || "",
          location: conf.location,
          startDate: conf.conference_start,
          endDate: conf.conference_end || conf.conference_start,
        }),
    });
  }

  const succeeded = [];
  const failed = [];
  for (const job of jobs) {
    try {
      const event = await job.run();
      succeeded.push({ key: job.key, event });
    } catch (err) {
      failed.push({ key: job.key, error: err.message });
    }
  }
  return { succeeded, failed };
}
