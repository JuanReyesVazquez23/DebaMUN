from __future__ import annotations

import json
import math
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from .config import COUNTRIES_DIR, DATA_DIR, KNOWLEDGE_DIR, SCRAPED_FILE, SOURCES_FILE

STOPWORDS = {
    "a","al","algo","algunas","algunos","ante","antes","como","con","contra","cual","cuando","de","del",
    "desde","donde","dos","el","ella","ellas","ellos","en","entre","era","es","esa","ese","eso","esta",
    "este","esto","fue","ha","hacia","hasta","hay","la","las","le","les","lo","los","mas","me","mi",
    "mis","mucho","muy","no","nos","o","otra","otro","para","pero","poco","por","porque","que","quien",
    "se","ser","si","sin","sobre","son","su","sus","tambien","tanto","te","tiene","todo","tu","un","una",
    "uno","y","ya","debe","deben","puede","pueden","como","cual","cuales","este","estos","estas","the",
    "and","or","of","to","in","for","is","are","with","on","as","by","an","be","this","that",
}


@dataclass(slots=True)
class Doc:
    id: str
    title: str
    text: str
    source: str
    url: str
    country: str
    committee: str
    weight: float = 1.0


@dataclass(slots=True)
class ScoredDoc:
    doc: Doc
    score: float
    matched: int
    snippet: str


def normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value)
    return "".join(char for char in decomposed if unicodedata.category(char) != "Mn").lower()


def tokenize(value: str) -> list[str]:
    return [
        token
        for token in re.findall(r"[a-z0-9]+", normalize(value))
        if len(token) > 2 and token not in STOPWORDS
    ]


class Corpus:
    def __init__(self) -> None:
        self.docs: list[Doc] = []
        self.sources: dict = {}
        self.country_names: dict[str, str] = {}
        self._scraped_mtime: float = 0.0
        self.load()

    def load(self) -> None:
        docs: list[Doc] = []
        self.country_names = {}
        docs.extend(self._load_countries())
        docs.extend(self._load_topics())
        docs.extend(self._load_knowledge())
        docs.extend(self._load_scraped())
        self.docs = docs
        self.sources = self._load_sources()

    def reload_if_changed(self) -> None:
        if not SCRAPED_FILE.exists():
            return
        mtime = SCRAPED_FILE.stat().st_mtime
        if mtime != self._scraped_mtime:
            self.load()

    def _load_countries(self) -> list[Doc]:
        docs: list[Doc] = []
        if not COUNTRIES_DIR.exists():
            return docs
        for path in sorted(COUNTRIES_DIR.glob("*.json")):
            payload = json.loads(path.read_text(encoding="utf-8"))
            for country in payload:
                code = country["code"]
                self.country_names[code] = country["name"]
                source = next(
                    (item for item in country.get("sources", []) if item.get("kind") == "official"),
                    country.get("sources", [{}])[0] if country.get("sources") else {},
                )
                source_label = source.get("label", "Dossier DebaMun")
                source_url = source.get("url", "")
                base = f"country:{code}"

                def add(suffix: str, title: str, text: str, committee: str = "", weight: float = 1.1) -> None:
                    if text and len(text) > 40:
                        docs.append(
                            Doc(
                                id=f"{base}:{suffix}",
                                title=f"{country['name']} · {title}",
                                text=text,
                                source=source_label,
                                url=source_url,
                                country=code,
                                committee=committee,
                                weight=weight,
                            )
                        )

                add("summary", "identidad", country.get("summary", ""), weight=1.15)
                profile = country.get("unProfile", {})
                add(
                    "un",
                    "perfil en la ONU",
                    f"{profile.get('bloc', '')}. Estilo: {profile.get('style', '')}. "
                    f"Aliados: {', '.join(profile.get('allies', []))}. "
                    f"Tensiones: {'; '.join(profile.get('tensions', []))}.",
                    weight=1.1,
                )
                add("redlines", "líneas rojas", " ".join(profile.get("redLines", [])), weight=1.1)
                context = country.get("context", {})
                add("ai", "IA y educación", context.get("aiAndEducation", ""), weight=1.2)
                add("youth", "empleo juvenil", context.get("youthLabour", ""), weight=1.2)
                add("governance", "gobernanza digital", context.get("digitalGovernance", ""), weight=1.05)
                for committee_key, committee_id in (("unesco", "UNESCO"), ("ecosoc", "ECOSOC")):
                    stance = country.get(committee_key, {})
                    add(
                        f"{committee_key}:position",
                        f"postura en {committee_id}",
                        stance.get("position", ""),
                        committee=committee_id,
                        weight=1.25,
                    )
                    add(
                        f"{committee_key}:priorities",
                        f"prioridades en {committee_id}",
                        " ".join(stance.get("priorities", [])),
                        committee=committee_id,
                        weight=1.15,
                    )
                    add(
                        f"{committee_key}:leverage",
                        f"palanca en {committee_id}",
                        f"{stance.get('vulnerability', '')} {stance.get('leverage', '')}",
                        committee=committee_id,
                        weight=1.05,
                    )
                add("tips", "tips de negociación", " ".join(country.get("tips", [])), weight=1.0)
                add("facts", "datos del país", " ".join(country.get("facts", [])), weight=0.85)
        return docs

    def _load_topics(self) -> list[Doc]:
        docs: list[Doc] = []
        path = DATA_DIR / "topics.json"
        if not path.exists():
            return docs
        payload = json.loads(path.read_text(encoding="utf-8"))
        for committee in payload.get("committees", []):
            committee_id = committee["id"]
            base = f"topic:{committee_id}"
            source = committee.get("sources", [{}])[0]
            label = source.get("label", f"Briefing {committee_id}")
            url = source.get("url", "")

            def add(suffix: str, title: str, text: str, weight: float = 1.0) -> None:
                if text and len(text) > 30:
                    docs.append(
                        Doc(
                            id=f"{base}:{suffix}",
                            title=f"{committee_id} · {title}",
                            text=text,
                            source=label,
                            url=url,
                            country="",
                            committee=committee_id,
                            weight=weight,
                        )
                    )

            add("topic", "tópico", committee.get("topic", ""), 1.2)
            add("mandate", "mandato", committee.get("mandate", ""), 1.0)
            add("question", "pregunta esencial", committee.get("essentialQuestion", ""), 1.0)
            for subtopic in committee.get("subtopics", []):
                add(
                    f"subtopic:{subtopic['id']}",
                    subtopic["label"],
                    f"{subtopic['label']}: {subtopic['description']}",
                    1.0,
                )
            add("keys", "preguntas clave", " ".join(committee.get("keyQuestions", [])), 0.95)
            add(
                "glossary",
                "glosario",
                " ".join(
                    f"{entry['term']}: {entry['definition']}" for entry in committee.get("glossary", [])
                ),
                0.9,
            )
            add("levers", "palancas de política", " ".join(committee.get("policyLevers", [])), 0.95)
            add("tensions", "tensiones", " ".join(committee.get("debateTensions", [])), 0.9)
            add("actors", "actores", ", ".join(committee.get("actors", [])), 0.85)
        return docs

    def _load_knowledge(self) -> list[Doc]:
        docs: list[Doc] = []
        if not KNOWLEDGE_DIR.exists():
            return docs
        for path in sorted(KNOWLEDGE_DIR.glob("*.md")):
            raw = path.read_text(encoding="utf-8")
            source_line = next(
                (line for line in raw.splitlines() if line.lower().startswith("> fuente:")), ""
            )
            url_line = next((line for line in raw.splitlines() if line.lower().startswith("> url:")), "")
            source = re.sub(r"^>\s*fuente:\s*", "", source_line, flags=re.I).strip() or path.stem
            url = re.sub(r"^>\s*url:\s*", "", url_line, flags=re.I).strip()
            for index, section in enumerate(re.split(r"^##\s+", raw, flags=re.M)[1:]):
                lines = section.splitlines()
                if not lines:
                    continue
                heading = lines[0].strip()
                body = "\n".join(lines[1:])
                docs.append(
                    Doc(
                        id=f"knowledge:{path.stem}:{index}",
                        title=f"Guía · {heading}",
                        text=body.strip(),
                        source=source,
                        url=url,
                        country="",
                        committee="",
                        weight=0.9,
                    )
                )
        return docs

    def _load_scraped(self) -> list[Doc]:
        docs: list[Doc] = []
        if not SCRAPED_FILE.exists():
            return docs
        self._scraped_mtime = SCRAPED_FILE.stat().st_mtime
        for index, line in enumerate(SCRAPED_FILE.read_text(encoding="utf-8").splitlines()):
            if not line.strip():
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            text = item.get("text", "")
            if len(text) < 180:
                continue
            docs.append(
                Doc(
                    id=f"scraped:{index}",
                    title=item.get("title") or "Fuente scrapeada",
                    text=text,
                    source=item.get("source") or "Scraper",
                    url=item.get("url", ""),
                    country=item.get("country", ""),
                    committee=item.get("committee", ""),
                    weight=1.25,
                )
            )
        return docs

    def _load_sources(self) -> dict:
        if not SOURCES_FILE.exists():
            return {"global": [], "allowed_domains": []}
        return json.loads(SOURCES_FILE.read_text(encoding="utf-8"))

    def search(
        self,
        query: str,
        country: str | None = None,
        committee: str | None = None,
        limit: int = 6,
    ) -> list[ScoredDoc]:
        self.reload_if_changed()
        tokens = list(dict.fromkeys(tokenize(query)))[:24]
        country = (country or "").upper() or None
        committee = (committee or "").upper() or None

        candidates = [
            doc
            for doc in self.docs
            if (not country or doc.country in ("", country))
            and (not committee or doc.committee in ("", committee))
        ]

        if not tokens:
            return [ScoredDoc(doc, doc.weight, 0, doc.text[:400]) for doc in candidates[:limit]]

        document_frequency: dict[str, int] = {}
        normalized = [(doc, normalize(f"{doc.title} {doc.text}")) for doc in candidates]
        for token in tokens:
            document_frequency[token] = sum(1 for _, text in normalized if token in text)

        scored: list[ScoredDoc] = []
        for doc, text in normalized:
            matched = 0
            score = 0.0
            title = normalize(doc.title)
            for token in tokens:
                if token not in text:
                    continue
                matched += 1
                frequency = document_frequency.get(token, 1)
                score += math.log(1 + len(candidates) / (1 + frequency))
                if token in title:
                    score += 0.8
            if matched == 0:
                continue
            length_penalty = math.sqrt(1 + len(doc.text.split()) / 240)
            scored.append(
                ScoredDoc(
                    doc=doc,
                    score=round((score * doc.weight) / length_penalty, 3),
                    matched=matched,
                    snippet=self._snippet(doc.text, tokens),
                )
            )

        scored.sort(key=lambda item: item.score, reverse=True)
        deduped: list[ScoredDoc] = []
        seen: set[str] = set()
        for item in scored:
            fingerprint = normalize(item.doc.text)[:140]
            if fingerprint in seen:
                continue
            seen.add(fingerprint)
            deduped.append(item)
            if len(deduped) >= limit:
                break
        return deduped

    @staticmethod
    def _snippet(text: str, tokens: list[str], max_length: int = 650) -> str:
        normalized = normalize(text)
        position = -1
        for token in tokens:
            found = normalized.find(token)
            if found >= 0 and (position < 0 or found < position):
                position = found
        if position < 0:
            return text[:max_length]
        start = max(0, position - 140)
        end = min(len(text), position + max_length - 140)
        return ("…" if start > 0 else "") + text[start:end].strip() + ("…" if end < len(text) else "")

    def stats(self) -> dict:
        return {
            "documents": len(self.docs),
            "countries": len(self.country_names),
            "sources": len(self.sources.get("global", [])),
            "scraped": sum(1 for doc in self.docs if doc.id.startswith("scraped:")),
        }


def load_country_urls(country_code: str) -> list[str]:
    for path in COUNTRIES_DIR.glob("*.json"):
        payload = json.loads(path.read_text(encoding="utf-8"))
        for country in payload:
            if country["code"].upper() == country_code.upper():
                return [source["url"] for source in country.get("sources", []) if source.get("url")]
    return []


def load_country_sources(country_code: str) -> list[dict]:
    for path in COUNTRIES_DIR.glob("*.json"):
        payload = json.loads(path.read_text(encoding="utf-8"))
        for country in payload:
            if country["code"].upper() == country_code.upper():
                return country.get("sources", [])
    return []
