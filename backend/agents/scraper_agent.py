"""
Scraper Agent
-------------
Responsible for extracting raw conference listings from external sources.

In production this agent would visit conference index sites (WikiCFP, DBLP,
society pages, etc.) using `requests` + `BeautifulSoup`, or call APIs where
available, and normalize each listing into the schema below.

For this prototype it reads a local JSON fixture so the rest of the pipeline
(ranking -> bogus-detection -> recommendation -> notification) can run
end-to-end without needing live network access or site-specific parsers.

Schema produced for each conference:
{
  "acronym": str,
  "name": str,
  "domain": str,
  "subdomain": str,
  "website": str,
  "location": str,
  "abstract_deadline": "YYYY-MM-DD",
  "notification_date": "YYYY-MM-DD",
  "conference_start": "YYYY-MM-DD",
  "conference_end": "YYYY-MM-DD",
  "description": str
}
"""

import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
RAW_FILE = os.path.join(DATA_DIR, "conferences_raw.json")


def scrape_conferences() -> list[dict]:
    """Return the raw list of scraped conference dicts.

    Swap this function's body for real scraping logic (requests/BeautifulSoup
    or an API client) when moving beyond the prototype. Downstream agents only
    depend on the schema documented above, not on how the data was obtained.
    """
    with open(RAW_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


# --- Example of how a real scraper would plug in (left as reference/stub) ---
#
# import requests
# from bs4 import BeautifulSoup
#
# def scrape_wikicfp(category: str) -> list[dict]:
#     resp = requests.get(f"http://www.wikicfp.com/cfp/call?conference={category}")
#     soup = BeautifulSoup(resp.text, "html.parser")
#     results = []
#     for row in soup.select("table.gtable tr")[1:]:
#         cells = row.find_all("td")
#         if len(cells) >= 4:
#             results.append({
#                 "name": cells[0].get_text(strip=True),
#                 "acronym": cells[0].get_text(strip=True),
#                 "abstract_deadline": cells[2].get_text(strip=True),
#                 ...
#             })
#     return results
