from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def run_ingest(
    country_code: str | None = None,
    urls: list[str] | None = None,
    committee: str | None = None,
    max_pages: int = 5,
) -> dict:
    """Ejecuta Scrapy en un subproceso (un reactor por proceso, sin fugas)."""
    service_dir = Path(__file__).resolve().parents[1]
    args = [sys.executable, "-m", "scrapy", "crawl", "country_profile"]

    if country_code:
        args += ["-a", f"country={country_code.upper()}"]
    if urls:
        args += ["-a", f"urls={'|'.join(urls)}"]
    if committee:
        args += ["-a", f"committee={committee.upper()}"]
    args += ["-a", f"max_pages={max(1, min(max_pages, 12))}"]
    args += ["-s", "LOG_LEVEL=ERROR"]

    try:
        completed = subprocess.run(
            args,
            cwd=service_dir,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return {
            "status": "error",
            "exitCode": 124,
            "stdout": "",
            "stderr": "",
            "message": "Scrapy excedió 120 s. Reduce maxPages o revisa la conectividad.",
        }

    return {
        "status": "ok" if completed.returncode == 0 else "error",
        "exitCode": completed.returncode,
        "stdout": completed.stdout[-2000:],
        "stderr": completed.stderr[-2000:],
        "message": "Ingesta completada. El corpus se recargó." if completed.returncode == 0 else "Scrapy terminó con errores.",
    }
