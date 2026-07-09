"""
Ranking Agent
-------------
Looks up each conference's ranking (e.g. CORE, Scimago, ABDC tier) and
attaches it to the conference record. Conferences with no known ranking
are marked "Unranked" rather than dropped here -- the bogus-detector agent
decides what to do with unranked/suspicious entries.

In production this would query ranking APIs/scrapes (CORE, Scimago,
Qualis, ABDC, etc.) and cache results. Here it reads a local lookup table.
"""

import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
RANKINGS_FILE = os.path.join(DATA_DIR, "rankings.json")

TIER_ORDER = {"A*": 0, "A": 1, "B": 2, "C": 3, "Unranked": 4}


def _load_rankings() -> dict:
    with open(RANKINGS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def attach_rankings(conferences: list[dict]) -> list[dict]:
    rankings = _load_rankings()
    for conf in conferences:
        info = rankings.get(conf["acronym"])
        if info:
            conf["ranking_source"] = info["source"]
            conf["ranking_tier"] = info["tier"]
        else:
            conf["ranking_source"] = None
            conf["ranking_tier"] = "Unranked"
        conf["ranking_sort_key"] = TIER_ORDER.get(conf["ranking_tier"], 4)
    return conferences
