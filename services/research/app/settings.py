from __future__ import annotations

BOT_NAME = "debamun_research"

SPIDER_MODULES = ["app.spiders"]
NEWSPIDER_MODULE = "app.spiders"

# Scraping ético: identificación clara, límites de velocidad y robots.txt.
ROBOTSTXT_OBEY = True
USER_AGENT = "DebaMunResearch/0.1 (+https://localhost; bot educativo de modelo ONU)"
DOWNLOAD_DELAY = 1.2
RANDOMIZE_DOWNLOAD_DELAY = True
CONCURRENT_REQUESTS = 4
CONCURRENT_REQUESTS_PER_DOMAIN = 1
DOWNLOAD_TIMEOUT = 20
RETRY_TIMES = 2
COOKIES_ENABLED = False
TELNETCONSOLE_ENABLED = False
LOG_LEVEL = "INFO"

DEFAULT_REQUEST_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es,en;q=0.8",
}

ITEM_PIPELINES = {
    "app.pipelines.SanitizePipeline": 200,
    "app.pipelines.JsonlPipeline": 300,
}

AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1.0
AUTOTHROTTLE_MAX_DELAY = 12.0
AUTOTHROTTLE_TARGET_CONCURRENCY = 1.0

REQUEST_FINGERPRINTER_IMPLEMENTATION = "2.7"
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
FEED_EXPORT_ENCODING = "utf-8"
