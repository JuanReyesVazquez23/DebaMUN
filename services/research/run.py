from __future__ import annotations

"""Arranque del servicio de investigación.

Uso:
    python run.py               # API FastAPI en :8000
    python run.py --ingest CH   # ingesta Scrapy para un país
"""

import argparse
import sys

from app.config import RESEARCH_PORT


def main() -> int:
    parser = argparse.ArgumentParser(description="DebaMun research service")
    parser.add_argument("--ingest", metavar="COUNTRY", help="Ejecuta la ingesta Scrapy de un país")
    parser.add_argument("--urls", default=None, help="URLs separadas por | para la ingesta")
    parser.add_argument("--committee", default=None, choices=["UNESCO", "ECOSOC"])
    parser.add_argument("--port", type=int, default=RESEARCH_PORT)
    args = parser.parse_args()

    if args.ingest:
        from app.scrapy_runner import run_ingest

        result = run_ingest(
            country_code=args.ingest,
            urls=[url for url in (args.urls or "").split("|") if url],
            committee=args.committee,
        )
        print(result["message"])
        print(result["stdout"][-1200:])
        if result["stderr"]:
            print(result["stderr"][-1200:], file=sys.stderr)
        return result["exitCode"]

    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=args.port, reload=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
