from __future__ import annotations

import scrapy
from urllib.parse import urlparse

from app.corpus import load_country_sources, load_country_urls


class CountryProfileSpider(scrapy.Spider):
    name = "country_profile"
    custom_settings = {"DEPTH_LIMIT": 0}

    def __init__(
        self,
        country: str | None = None,
        urls: str | None = None,
        committee: str | None = None,
        max_pages: str = "5",
        *args,
        **kwargs,
    ):
        super().__init__(*args, **kwargs)
        self.country = (country or "").upper()
        self.committee = (committee or "").upper()
        provided = [item.strip() for item in (urls or "").split("|") if item.strip()]
        self.start_urls = (provided or load_country_urls(self.country))[: int(max_pages)]
        self.allowed_domains = list(
            dict.fromkeys(
                urlparse(url).netloc.removeprefix("www.")
                for url in self.start_urls
                if urlparse(url).netloc
            )
        )
        if not self.start_urls:
            raise ValueError("No hay URLs configuradas para este país.")

    def parse(self, response):
        xpath = (
            "//body//text()[not(ancestor::script) and not(ancestor::style) and "
            "not(ancestor::nav) and not(ancestor::header) and not(ancestor::footer) and "
            "not(ancestor::aside) and not(ancestor::noscript) and not(ancestor::form) and "
            "not(ancestor::svg)]"
        )
        chunks = [chunk.strip() for chunk in response.xpath(xpath).getall() if chunk.strip()]
        text = " ".join(" ".join(chunk.split()) for chunk in chunks)
        title = (
            response.css("meta[property='og:title']::attr(content)").get()
            or response.css("title::text").get()
            or response.url
        )
        source = next(
            (item for item in load_country_sources(self.country) if item.get("url") == response.url),
            {"label": urlparse(response.url).netloc, "kind": "scraped"},
        )
        yield {
            "url": response.url,
            "title": " ".join(title.split())[:240],
            "text": text,
            "country": self.country,
            "committee": self.committee,
            "source": source.get("label", urlparse(response.url).netloc),
        }
