from __future__ import annotations

import json
from urllib.parse import urlparse

import scrapy

from app.config import SOURCES_FILE


class OfficialSourceSpider(scrapy.Spider):
    name = "official_source"

    def __init__(self, urls: str | None = None, committee: str | None = None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.committee = (committee or "").upper()
        provided = [item.strip() for item in (urls or "").split("|") if item.strip()]
        if provided:
            self.start_urls = provided
        else:
            payload = json.loads(SOURCES_FILE.read_text(encoding="utf-8")) if SOURCES_FILE.exists() else {}
            self.start_urls = [
                item["url"]
                for item in payload.get("global", [])
                if not self.committee or item.get("committee", "").upper() == self.committee
            ][:4]
        self.allowed_domains = list(
            dict.fromkeys(
                urlparse(url).netloc.removeprefix("www.")
                for url in self.start_urls
                if urlparse(url).netloc
            )
        )

    def parse(self, response):
        xpath = (
            "//body//text()[not(ancestor::script) and not(ancestor::style) and "
            "not(ancestor::nav) and not(ancestor::header) and not(ancestor::footer) and "
            "not(ancestor::aside) and not(ancestor::noscript) and not(ancestor::form)]"
        )
        chunks = [chunk.strip() for chunk in response.xpath(xpath).getall() if chunk.strip()]
        yield {
            "url": response.url,
            "title": (
                response.css("meta[property='og:title']::attr(content)").get()
                or response.css("title::text").get()
                or response.url
            )[:240],
            "text": " ".join(" ".join(chunk.split()) for chunk in chunks),
            "country": "",
            "committee": self.committee,
            "source": urlparse(response.url).netloc,
        }
