from __future__ import annotations

import os
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = SERVICE_DIR.parents[1]
DATA_DIR = Path(os.getenv("DATA_DIR", REPO_ROOT / "data")).resolve()
SCRAPED_DIR = DATA_DIR / "scraped"
SCRAPED_FILE = SCRAPED_DIR / "passages.jsonl"
SOURCES_FILE = DATA_DIR / "sources.json"
COUNTRIES_DIR = DATA_DIR / "countries"
KNOWLEDGE_DIR = DATA_DIR / "knowledge"
MAX_TEXT_LENGTH = int(os.getenv("MAX_TEXT_LENGTH", "8000"))
RESEARCH_PORT = int(os.getenv("RESEARCH_PORT", "8000"))
