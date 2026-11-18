from __future__ import annotations

import json
from datetime import datetime, timezone
from urllib.parse import urlparse

import scrapy
from itemadapter import ItemAdapter

from app.config import MAX_TEXT_LENGTH, SCRAPED_DIR, SCRAPED_FILE
from app.sanitizer import quality_check, sanitize_text

# Dominios de confianza: el scraper no sigue enlaces fuera de esta lista.
TRUSTED_SUFFIXES = (
    "un.org",
    "unesco.org",
    "ilo.org",
    "oecd.org",
    "worldbank.org",
    "unicef.org",
    "undp.org",
    "who.int",
    "europa.eu",
    "gob.mx",
    "canada.ca",
    "gov.uk",
    "gob.cl",
    "gob.pe",
    "gov.co",
    "gob.ar",
    "gov.br",
    "gov.sg",
    "gov.za",
    "gov.au",
    "japan.go.jp",
    "korea.net",
    "india.gov.in",
    "gov.cn",
)


def is_trusted(url: str) -> bool:
    try:
        host = urlparse(url).hostname or ""
    except ValueError:
        return False
    return any(host == suffix or host.endswith(f".{suffix}") for suffix in TRUSTED_SUFFIXES)


class SanitizePipeline:
    """Limpia el texto extraído y descarta fragmentos de baja calidad o no confiables."""

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)

        if not is_trusted(adapter.get("url", "")):
            raise scrapy.exceptions.DropItem(f"Dominio no confiable: {adapter.get('url')}")

        raw = adapter.get("text") or ""
        cleaned = sanitize_text(raw, max_length=MAX_TEXT_LENGTH)
        adapter["text"] = cleaned.text
        adapter["flags"] = cleaned.flags
        adapter["originalLength"] = cleaned.original_length
        adapter["fingerprint"] = cleaned.fingerprint

        ok, reason = quality_check(cleaned.text)
        if not ok:
            raise scrapy.exceptions.DropItem(f"Calidad insuficiente ({reason})")

        return item


class JsonlPipeline:
    """Escribe un JSONL con URL, fuente, huella y fecha para poder auditar cada cita."""

    def open_spider(self, spider):
        SCRAPED_DIR.mkdir(parents=True, exist_ok=True)
        self.seen: set[str] = set()
        if SCRAPED_FILE.exists():
            for line in SCRAPED_FILE.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                try:
                    fingerprint = json.loads(line).get("fingerprint")
                except json.JSONDecodeError:
                    continue
                if fingerprint:
                    self.seen.add(fingerprint)
        self.handle = SCRAPED_FILE.open("a", encoding="utf-8")
        self.written = 0
        self.dropped = 0

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        fingerprint = adapter.get("fingerprint")
        if fingerprint in self.seen:
            self.dropped += 1
            raise scrapy.exceptions.DropItem("Duplicado")
        self.seen.add(fingerprint)

        record = {
            "url": adapter.get("url"),
            "title": adapter.get("title"),
            "text": adapter.get("text"),
            "source": adapter.get("source"),
            "country": adapter.get("country", ""),
            "committee": adapter.get("committee", ""),
            "flags": adapter.get("flags", []),
            "fingerprint": fingerprint,
            "scrapedAt": datetime.now(timezone.utc).isoformat(),
        }
        self.handle.write(json.dumps(record, ensure_ascii=False) + "\n")
        self.handle.flush()
        self.written += 1
        return item

    def close_spider(self, spider):
        self.handle.close()
        spider.logger.info(
            "Ingesta finalizada: %s fragmentos nuevos, %s duplicados descartados.",
            self.written,
            self.dropped,
        )
