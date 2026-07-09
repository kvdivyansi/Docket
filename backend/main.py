"""
Orchestrator
------------
Wires the agents together into one pipeline and exposes it over HTTP:

    Scraper Agent -> Ranking Agent -> Bogus-Detector Agent -> (cached, clean list)
                                                                     |
    Recommender Agent  <---------------------------------------------
    Notification Agent <--- triggered on "I'm interested"

Simple JSON file is used as the datastore for users / tracked conferences /
notification log, since this is a prototype. Swap for a real DB later.
"""

import json
import os
import uuid
from datetime import date

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agents import scraper_agent, ranking_agent, bogus_detector_agent, recommender_agent, notification_agent, ai_search_agent

BASE_DIR = os.path.dirname(__file__)
DB_FILE = os.path.join(BASE_DIR, "data", "db.json")

app = FastAPI(title="Conference Portal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pipeline: run once at startup and cache. In production you'd re-run this
# on a schedule (e.g. nightly) rather than only at process start.
# ---------------------------------------------------------------------------
CLEAN_CONFERENCES: list[dict] = []
REJECTED_CONFERENCES: list[dict] = []
DISCARDED_BY_DATE_RULE: list[dict] = []


def run_pipeline():
    global CLEAN_CONFERENCES, REJECTED_CONFERENCES, DISCARDED_BY_DATE_RULE
    raw, discarded_by_date = ai_search_agent.search_and_filter_conferences()
    ranked = ranking_agent.attach_rankings(raw)
    clean, rejected = bogus_detector_agent.filter_bogus(ranked)
    for i, conf in enumerate(clean):
        conf["id"] = conf["acronym"].replace(" ", "_")
    CLEAN_CONFERENCES = clean
    REJECTED_CONFERENCES = rejected
    DISCARDED_BY_DATE_RULE = discarded_by_date
    print(f"Pipeline run: {len(clean)} clean conferences, {len(rejected)} rejected as bogus, {len(discarded_by_date)} discarded by date/domain rules.")


run_pipeline()


# ---------------------------------------------------------------------------
# Tiny JSON-file datastore
# ---------------------------------------------------------------------------
def _load_db() -> dict:
    if not os.path.exists(DB_FILE):
        return {"users": {}, "notifications": []}
    with open(DB_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_db(db: dict):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2)


# ---------------------------------------------------------------------------
# Request/response models
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    full_name: str
    email: str


class InterestRequest(BaseModel):
    user_id: str
    conference_id: str


class SuggestRequest(BaseModel):
    user_id: str | None = None
    text: str  # free text: paper title/abstract/keywords, or "my own conference" description


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.post("/api/register")
def register(req: RegisterRequest):
    db = _load_db()
    user_id = str(uuid.uuid4())
    db["users"][user_id] = {
        "full_name": req.full_name,
        "email": req.email,
        "domain": None,
        "subdomain": None,
        "tracked": [],  # list of conference ids
    }
    _save_db(db)
    return {"user_id": user_id, "full_name": req.full_name, "email": req.email}


@app.post("/api/users/{user_id}/preferences")
def set_preferences(user_id: str, domain: str, subdomain: str | None = None):
    db = _load_db()
    if user_id not in db["users"]:
        raise HTTPException(404, "User not found")
    db["users"][user_id]["domain"] = domain
    db["users"][user_id]["subdomain"] = subdomain
    _save_db(db)
    return db["users"][user_id]


@app.get("/api/domains")
def get_domains():
    tree: dict[str, set[str]] = {}
    for conf in CLEAN_CONFERENCES:
        tree.setdefault(conf["domain"], set()).add(conf["subdomain"])
    return {domain: sorted(subs) for domain, subs in tree.items()}


@app.get("/api/conferences")
def get_conferences(domain: str | None = None, subdomain: str | None = None, sort_by: str = "ranking"):
    results = recommender_agent.filter_and_sort(CLEAN_CONFERENCES, domain, subdomain, sort_by)
    today = date.today()
    enriched = []
    for c in results:
        c = dict(c)
        c["days_until_deadline"] = notification_agent.days_until(c["abstract_deadline"])
        enriched.append(c)
    return enriched


@app.get("/api/agent/conferences")
def get_agent_conferences(domain: str | None = None, subdomain: str | None = None, sort_by: str = "ranking"):
    """New AI Agent Endpoint: Returns live web searched and strictly date-filtered conferences."""
    results = recommender_agent.filter_and_sort(CLEAN_CONFERENCES, domain, subdomain, sort_by)
    enriched = []
    for c in results:
        c = dict(c)
        c["days_until_deadline"] = notification_agent.days_until(c["abstract_deadline"])
        enriched.append(c)
    return enriched


@app.get("/api/agent/raw")
def get_agent_raw_conferences():
    """Returns the pure 11-key JSON array strictly conforming to the agent schema without UI enrichment."""
    return ai_search_agent.get_valid_conferences()


@app.get("/api/agent/discarded")
def get_agent_discarded():
    """Returns conferences discarded by the AI Agent due to the strict >30 day deadline-to-start rule or domain checks."""
    return DISCARDED_BY_DATE_RULE


@app.get("/api/conferences/rejected")
def get_rejected():
    """Transparency endpoint: shows what the bogus-detector filtered out, and why."""
    return [
        {"acronym": c["acronym"], "name": c["name"], "reasons": c["_rejection_reasons"], "score": c["_suspicion_score"]}
        for c in REJECTED_CONFERENCES
    ]


@app.post("/api/interested")
def mark_interested(req: InterestRequest):
    db = _load_db()
    user = db["users"].get(req.user_id)
    if not user:
        raise HTTPException(404, "User not found")

    conf = next((c for c in CLEAN_CONFERENCES if c["id"] == req.conference_id), None)
    if not conf:
        raise HTTPException(404, "Conference not found")

    if req.conference_id not in user["tracked"]:
        user["tracked"].append(req.conference_id)

    subject, body = notification_agent.build_interest_confirmation(user["full_name"], conf)
    email_record = notification_agent.send_email(user["email"], user["full_name"], subject, body)
    db["notifications"].append({"user_id": req.user_id, "conference_id": req.conference_id, **email_record})

    _save_db(db)
    return {"status": "tracked", "email_preview": {"subject": subject, "body": body}}


@app.get("/api/users/{user_id}/tracked")
def get_tracked(user_id: str):
    db = _load_db()
    user = db["users"].get(user_id)
    if not user:
        raise HTTPException(404, "User not found")

    tracked_confs = [c for c in CLEAN_CONFERENCES if c["id"] in user["tracked"]]
    result = []
    for c in tracked_confs:
        c = dict(c)
        c["days_until_deadline"] = notification_agent.days_until(c["abstract_deadline"])
        result.append(c)
    return result


@app.post("/api/suggest")
def suggest(req: SuggestRequest):
    matches = recommender_agent.suggest_for_input(CLEAN_CONFERENCES, req.text)
    for m in matches:
        m["days_until_deadline"] = notification_agent.days_until(m["abstract_deadline"])
    return matches


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "clean_conferences": len(CLEAN_CONFERENCES),
        "rejected_bogus": len(REJECTED_CONFERENCES),
        "discarded_by_date_rule": len(DISCARDED_BY_DATE_RULE)
    }
