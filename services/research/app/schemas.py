from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class Passage(BaseModel):
    title: str
    text: str
    source: str
    url: str
    score: float
    country: str = ""
    committee: str = ""


class ResearchResponse(BaseModel):
    query: str
    passages: list[Passage]
    confidence: str
    generated_at: datetime
    corpus: dict


class IngestRequest(BaseModel):
    countryCode: str | None = Field(default=None, max_length=4)
    urls: list[str] | None = None
    committee: str | None = Field(default=None, max_length=16)
    maxPages: int = Field(default=5, ge=1, le=12)


class IngestResponse(BaseModel):
    status: str
    exitCode: int
    stdout: str = ""
    stderr: str = ""
    message: str = ""


class SanitizeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=100_000)


class SanitizeResponse(BaseModel):
    text: str
    flags: list[str]
    quality: bool
    reason: str
    originalLength: int
    sanitizedLength: int
