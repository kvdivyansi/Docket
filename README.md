# The Docket — Conference Tracker

A website that scrapes conference listings, checks them against rankings,
filters out predatory/bogus conferences, and shows the user a personalized,
filterable feed with deadline countdowns and email notifications.

## Multi-agent architecture

Each responsibility from your brief is its own agent module, wired together
by one orchestrator (`backend/main.py`):

```
                     ┌────────────────┐
                     │ Scraper Agent  │  extracts raw conference listings
                     └───────┬────────┘
                             ▼
                     ┌────────────────┐
                     │ Ranking Agent  │  attaches CORE/Scimago/ABDC-style tiers
                     └───────┬────────┘
                             ▼
                  ┌───────────────────┐
                  │ Bogus-Detector    │  scores + drops predatory conferences
                  │ Agent             │
                  └─────────┬─────────┘
                             ▼
                  clean, ranked conference list (cached)
                             │
              ┌──────────────┴───────────────┐
              ▼                              ▼
   ┌────────────────────┐          ┌────────────────────┐
   │ Recommender Agent   │          │ Notification Agent │
   │ - filter/sort by     │          │ - "I'm interested"  │
   │   domain/subdomain/   │          │   confirmation email│
   │   deadline/ranking    │          │ - deadline countdown│
   │ - "suggest for my     │          └────────────────────┘
   │   paper" matching     │
   └────────────────────┘
```

| Agent | File | Job |
|---|---|---|
| Scraper | `backend/agents/scraper_agent.py` | Pulls raw conference data. Currently reads a mock dataset; the file includes a commented example of a real WikiCFP-style scraper to drop in later. |
| Ranking | `backend/agents/ranking_agent.py` | Looks up each conference's ranking tier (A\*/A/B/C/Unranked) from a lookup table. |
| Bogus-Detector | `backend/agents/bogus_detector_agent.py` | Heuristically scores each conference (predatory phrasing, unrealistic review timelines, suspicious domains, vague scope, no ranking) and removes anything over the threshold. |
| Recommender | `backend/agents/recommender_agent.py` | Filters/sorts the clean list by domain, subdomain, deadline, or ranking; also matches free-text (a paper abstract or "my own conference" description) against the listing by keyword overlap. |
| Notification | `backend/agents/notification_agent.py` | Mocks sending the "you're now tracking X" email and computes days-until-deadline. Swap in a real email provider later — nothing else needs to change. |
| Orchestrator | `backend/main.py` | Runs the pipeline once at startup, caches the clean list, and exposes it all over a FastAPI HTTP API. |

## What's mocked vs. real right now

- **Conference data**: mock JSON fixture (`backend/data/conferences_raw.json`), 13 real-sounding conferences + 3 deliberately fake ones so you can see the bogus-detector work. Swap `scraper_agent.scrape_conferences()` for real scraping/APIs.
- **Rankings**: mock lookup table (`backend/data/rankings.json`). Swap for real CORE/Scimago/ABDC data sources.
- **Email**: mocked — `notification_agent.send_email()` logs to the console and to `backend/data/db.json` instead of sending. Swap in SendGrid/SES/SMTP when you have credentials.
- **Database**: a single JSON file (`backend/data/db.json`, created on first run) standing in for a real database (Postgres, etc.).

## Running it

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

This starts the API at `http://localhost:8000`. On startup it runs the full
scrape → rank → bogus-filter pipeline and logs how many conferences passed
and how many were rejected. Check `/api/conferences/rejected` to see exactly
why each fake conference was flagged.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend expects the backend at
`http://localhost:8000` (see `frontend/src/api.js` if you need to change that).

## User flow

1. **Sign up** — enter full name + email (stored so we can notify you later).
2. **Pick a domain/subdomain** — e.g. Artificial Intelligence → Natural Language Processing.
3. **Browse listings** — sorted by ranking or by nearest deadline (toggle in the filter bar). Each card shows a ranking "stamp" and a deadline countdown "ticket stub."
4. **Mark interest** — click "I'm interested" to start tracking a conference; this triggers a (mocked) confirmation email with the deadline countdown.
5. **Suggest for my paper** — paste an abstract, title, or a description of a conference you're targeting, and get back the best-matching clean, ranked conferences.

## Extending this prototype

- Real scraping: fill in `scraper_agent.py` with `requests` + `BeautifulSoup` calls against WikiCFP, DBLP, or society pages (a stub is included), or use conference-listing APIs where they exist.
- Real rankings: pull from CORE's public rankings CSV, Scimago, or discipline-specific tier lists (ABDC for business, etc.) on a schedule.
- Real bogus-detection: layer in a maintained predatory-conference/publisher watchlist alongside the heuristics here, and consider a human-review queue for borderline scores.
- Real email: swap `notification_agent.send_email()` for SendGrid/SES/SMTP, and add a scheduled job (cron/Celery) that emails users N days before their tracked deadlines.
- Real database: replace `db.json` with Postgres/SQLite and an ORM once you have concurrent users.
