from __future__ import annotations

import asyncio
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import RESEARCH_PORT  # noqa: E402
from app.corpus import Corpus, tokenize  # noqa: E402
from app.sanitizer import quality_check, sanitize_text  # noqa: E402
from app.schemas import (  # noqa: E402
    IngestRequest,
    IngestResponse,
    Passage,
    ResearchResponse,
    SanitizeRequest,
    SanitizeResponse,
)
from app.scrapy_runner import run_ingest  # noqa: E402

corpus = Corpus()


@asynccontextmanager
async def lifespan(_: FastAPI):
    corpus.load()
    yield


app = FastAPI(
    title="DebaMun Research Service",
    description="Scraping ético, sanitización y recuperación de evidencia para delegados MUN.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "debamun-research",
        "version": "0.1.0",
        "corpus": corpus.stats(),
        "time": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/research", response_model=ResearchResponse)
def research(
    q: str = Query(min_length=2, max_length=600),
    country: str | None = Query(default=None, max_length=4),
    committee: str | None = Query(default=None, max_length=16),
    limit: int = Query(default=6, ge=1, le=12),
) -> ResearchResponse:
    results = corpus.search(q, country=country, committee=committee, limit=limit)
    tokens = set(tokenize(q))
    coverage = 0.0
    if results and tokens:
        coverage = results[0].matched / len(tokens)
    confidence = "alta" if coverage >= 0.5 else "media" if coverage >= 0.25 else "baja"

    return ResearchResponse(
        query=q,
        confidence=confidence,
        passages=[
            Passage(
                title=item.doc.title,
                text=item.snippet,
                source=item.doc.source,
                url=item.doc.url,
                score=item.score,
                country=item.doc.country,
                committee=item.doc.committee,
            )
            for item in results
        ],
        generated_at=datetime.now(timezone.utc),
        corpus=corpus.stats(),
    )


@app.get("/sources")
def sources(country: str | None = Query(default=None, max_length=4)) -> dict:
    from app.corpus import load_country_sources

    return {
        "country": load_country_sources(country.upper()) if country else [],
        "global": corpus.sources.get("global", []),
        "allowedDomains": corpus.sources.get("allowed_domains", []),
        "stats": corpus.stats(),
    }


@app.post("/sanitize", response_model=SanitizeResponse)
def sanitize(request: SanitizeRequest) -> SanitizeResponse:
    result = sanitize_text(request.text)
    quality, reason = quality_check(result.text)
    return SanitizeResponse(
        text=result.text,
        flags=result.flags,
        quality=quality,
        reason=reason,
        originalLength=result.original_length,
        sanitizedLength=len(result.text),
    )


@app.post("/ingest", response_model=IngestResponse)
async def ingest(request: IngestRequest) -> IngestResponse:
    if not request.countryCode and not request.urls:
        raise HTTPException(status_code=422, detail="Indica countryCode o al menos una URL.")

    try:
        result = await asyncio.to_thread(
            run_ingest,
            request.countryCode,
            request.urls,
            request.committee,
            request.maxPages,
        )
    except Exception as error:  # pragma: no cover - depende del entorno de scraping
        raise HTTPException(status_code=500, detail=f"Fallo al ejecutar Scrapy: {error}") from error

    corpus.load()
    return IngestResponse(**result)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=RESEARCH_PORT, reload=False)
