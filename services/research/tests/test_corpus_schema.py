from __future__ import annotations

import json
from pathlib import Path

from app.config import COUNTRIES_DIR


def test_dossieres_tienen_esquema_completo():
    required = {
        "code",
        "slug",
        "name",
        "flag",
        "region",
        "palette",
        "summary",
        "unProfile",
        "context",
        "unesco",
        "ecosoc",
        "tips",
        "facts",
        "sources",
    }
    codes: list[str] = []
    for path in COUNTRIES_DIR.glob("*.json"):
        payload = json.loads(path.read_text(encoding="utf-8"))
        assert isinstance(payload, list) and payload
        for country in payload:
            assert required <= set(country), f"{country.get('code')} incompleto"
            assert country["facts"] and country["sources"]
            assert country["unesco"]["priorities"] and country["ecosoc"]["priorities"]
            codes.append(country["code"])
    assert len(codes) == len(set(codes)), "Hay códigos de país duplicados"
    assert len(codes) >= 33


def test_escocia_esta_marcada_como_no_miembro():
    for path in COUNTRIES_DIR.glob("*.json"):
        for country in json.loads(path.read_text(encoding="utf-8")):
            if country["code"] == "XS":
                assert country["unMember"] is False
                assert country.get("modelNote")


def test_topicos_cubren_las_dos_comisiones():
    topics = json.loads((Path(COUNTRIES_DIR).parents[0] / "topics.json").read_text(encoding="utf-8"))
    ids = {committee["id"] for committee in topics["committees"]}
    assert ids == {"UNESCO", "ECOSOC"}
    for committee in topics["committees"]:
        assert len(committee["subtopics"]) >= 6
        assert committee["debateTensions"] and committee["policyLevers"] and committee["actors"]
