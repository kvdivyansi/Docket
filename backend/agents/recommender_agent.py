"""
Recommender Agent
------------------
Two jobs:

1. filter_and_sort(): given a user's chosen domain/subdomain and a sort mode
   ("deadline" or "ranking"), return the matching conference list in order.

2. suggest_for_input(): given free text describing the user's own paper or
   conference interests, score every clean conference by keyword overlap
   against its domain/subdomain/description and return the best matches.
   This is a lightweight keyword-similarity model -- in production you'd
   likely swap this for an embedding-based semantic search.
"""

import re
from datetime import date, datetime

STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "on", "for", "in", "to", "with",
    "using", "based", "study", "paper", "research", "conference", "my",
    "is", "are", "we", "our", "this", "that", "into", "via", "towards",
    "approach", "method", "methods", "analysis",
}


def _tokenize(text: str) -> set[str]:
    words = re.findall(r"[a-zA-Z]+", text.lower())
    return {w for w in words if w not in STOPWORDS and len(w) > 2}


def filter_and_sort(
    conferences: list[dict],
    domain: str | None = None,
    subdomain: str | None = None,
    sort_by: str = "ranking",
) -> list[dict]:
    results = conferences
    if domain:
        results = [c for c in results if c["domain"].lower() == domain.lower()]
    if subdomain:
        results = [c for c in results if c["subdomain"].lower() == subdomain.lower()]

    if sort_by == "deadline":
        results = sorted(results, key=lambda c: c["abstract_deadline"])
    else:  # "ranking" / suitability
        results = sorted(results, key=lambda c: (c["ranking_sort_key"], c["abstract_deadline"]))

    return results


def suggest_for_input(conferences: list[dict], free_text: str, top_n: int = 5) -> list[dict]:
    query_tokens = _tokenize(free_text)
    if not query_tokens:
        return []

    scored = []
    today = date.today()
    for conf in conferences:
        # skip conferences whose deadline has already passed
        try:
            deadline = datetime.fromisoformat(conf["abstract_deadline"]).date()
            if deadline < today:
                continue
        except ValueError:
            pass

        conf_tokens = _tokenize(
            f"{conf['domain']} {conf['subdomain']} {conf['name']} {conf.get('description', '')}"
        )
        overlap = query_tokens & conf_tokens
        if not overlap:
            continue

        # weight: overlap size, boosted by a strong domain/subdomain match, and ranking as tiebreak
        domain_bonus = 2 if _tokenize(conf["subdomain"]) & query_tokens else 0
        score = len(overlap) * 2 + domain_bonus - conf["ranking_sort_key"] * 0.1

        scored.append((score, list(overlap), conf))

    scored.sort(key=lambda x: x[0], reverse=True)
    results = []
    for score, matched_terms, conf in scored[:top_n]:
        c = dict(conf)
        c["_match_score"] = round(score, 2)
        c["_matched_terms"] = matched_terms
        results.append(c)
    return results
