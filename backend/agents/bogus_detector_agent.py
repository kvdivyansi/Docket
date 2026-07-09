"""
Bogus-Detector Agent
--------------------
Flags predatory / fake conferences using a heuristic scoring model, then the
orchestrator drops anything over the threshold before it ever reaches users.

Heuristics used (each adds points to a "suspicion score"):
  - Title contains generic/predatory marketing phrases ("World Congress on...")
  - Description contains predatory claims ("guaranteed publication", etc.)
  - Website uses a suspicious/disposable-looking TLD
  - Review-to-notification window is implausibly short (rubber-stamp review)
  - Subdomain is vague ("General Science") AND conference has no ranking
  - No ranking at all AND makes unrealistic claims

A conference is marked bogus if its score crosses BOGUS_THRESHOLD.
This is a heuristic layer, not a legal determination -- in production you'd
also cross-check against maintained predatory-publisher/conference watchlists
(e.g. community-maintained blacklists) and possibly a human review queue.
"""

import json
import os
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
INDICATORS_FILE = os.path.join(DATA_DIR, "bogus_indicators.json")

BOGUS_THRESHOLD = 3


def _load_indicators() -> dict:
    with open(INDICATORS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _days_between(d1: str, d2: str) -> int:
    try:
        return (datetime.fromisoformat(d2) - datetime.fromisoformat(d1)).days
    except ValueError:
        return 999  # if dates are malformed, don't penalize on this signal


def score_conference(conf: dict, indicators: dict) -> tuple[int, list[str]]:
    score = 0
    reasons = []

    text = f"{conf['name']} {conf.get('description', '')}".lower()

    for phrase in indicators["suspicious_title_phrases"]:
        if phrase in text:
            score += 1
            reasons.append(f"generic/marketing title phrase: '{phrase}'")
            break  # only count this category once

    for phrase in indicators["suspicious_claim_phrases"]:
        if phrase in text:
            score += 1
            reasons.append(f"predatory claim in description: '{phrase}'")

    website = conf.get("website", "")
    if any(website.endswith(tld) or f"{tld}/" in website for tld in indicators["suspicious_domains"]):
        score += 1
        reasons.append("suspicious top-level domain")

    review_window = _days_between(conf["abstract_deadline"], conf["notification_date"])
    if review_window < indicators["min_days_review_to_notification"]:
        score += 2
        reasons.append(f"unrealistically short review window ({review_window} days)")

    if conf.get("subdomain", "").lower() in indicators["vague_scope_subdomains"]:
        score += 1
        reasons.append("vague / all-encompassing subject scope")

    if conf.get("ranking_tier") == "Unranked" and score > 0:
        score += 1
        reasons.append("no recognized ranking on top of other red flags")

    return score, reasons


def filter_bogus(conferences: list[dict]) -> tuple[list[dict], list[dict]]:
    """Returns (clean_conferences, rejected_conferences_with_reasons)."""
    indicators = _load_indicators()
    clean, rejected = [], []

    for conf in conferences:
        score, reasons = score_conference(conf, indicators)
        conf["_suspicion_score"] = score
        if score >= BOGUS_THRESHOLD:
            conf["_rejection_reasons"] = reasons
            rejected.append(conf)
        else:
            clean.append(conf)

    return clean, rejected
