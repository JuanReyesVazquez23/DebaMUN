from __future__ import annotations

import hashlib
import html
import re
import unicodedata
from dataclasses import dataclass, field

INJECTION_PATTERNS = [
    re.compile(r"ignore (all )?(previous|prior|above) instructions", re.I),
    re.compile(r"disregard (all )?(previous|prior|above) instructions", re.I),
    re.compile(r"you are now (an?|the) ", re.I),
    re.compile(r"system prompt", re.I),
    re.compile(r"reveal (your|the) (prompt|instructions)", re.I),
    re.compile(r"ignora (todas )?las instrucciones (anteriores|previas)", re.I),
    re.compile(r"olvida (tus|las) instrucciones", re.I),
    re.compile(r"revela (tu|el) (prompt|instrucciones)", re.I),
    re.compile(r"act[uú]a como si fueras", re.I),
    re.compile(r"jailbreak", re.I),
]

EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
PHONE_PATTERN = re.compile(r"(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)")
ZERO_WIDTH = re.compile(r"[\u200b-\u200f\u202a-\u202e\u2060\ufeff]")
CONTROL = re.compile(r"[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]")
SCRIPT_BLOCK = re.compile(
    r"<(script|style|noscript|svg|iframe|canvas|template)[^>]*>.*?</\1>",
    re.I | re.S,
)
HTML_COMMENT = re.compile(r"<!--.*?-->", re.S)
TAG = re.compile(r"<[^>]+>")
WHITESPACE = re.compile(r"\s+")
NAV_NOISE = re.compile(
    r"\b(?:inicio|men[uú]|cookies?|aceptar|suscr[ií]bete|compartir|facebook|twitter|instagram|linkedin|"
    r"pol[ií]tica de privacidad|aviso legal|saltar al contenido)\b",
    re.I,
)


@dataclass(slots=True)
class SanitizedText:
    text: str
    original_length: int
    flags: list[str] = field(default_factory=list)

    @property
    def fingerprint(self) -> str:
        normalized = re.sub(r"\s+", " ", self.text).strip().lower()
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _truncate_at_sentence(text: str, max_length: int) -> str:
    if len(text) <= max_length:
        return text
    window = text[:max_length]
    cut = max(window.rfind(". "), window.rfind("? "), window.rfind("! "))
    if cut < max_length * 0.55:
        cut = window.rfind(" ")
    return window[: max(0, cut)].rstrip(" ,;:-") + "…"


def sanitize_text(raw: str, max_length: int = 8000) -> SanitizedText:
    """Limpia HTML, Unicode, inyecciones de prompt y PII de un fragmento."""
    original_length = len(raw)
    flags: list[str] = []

    text = unicodedata.normalize("NFKC", raw)
    if ZERO_WIDTH.search(text):
        flags.append("zero_width")
        text = ZERO_WIDTH.sub("", text)
    if CONTROL.search(text):
        flags.append("control_chars")
        text = CONTROL.sub(" ", text)

    if re.search(r"<(script|style|iframe|svg)", text, re.I):
        flags.append("html_scripts")
    text = SCRIPT_BLOCK.sub(" ", text)
    text = HTML_COMMENT.sub(" ", text)
    if TAG.search(text):
        flags.append("html_tags")
        text = TAG.sub(" ", text)
    text = html.unescape(text)

    for pattern in INJECTION_PATTERNS:
        if pattern.search(text):
            flags.append("prompt_injection")
            text = pattern.sub(" ", text)

    if EMAIL_PATTERN.search(text):
        flags.append("email_removed")
        text = EMAIL_PATTERN.sub("[correo]", text)
    if PHONE_PATTERN.search(text):
        flags.append("phone_removed")
        text = PHONE_PATTERN.sub("[teléfono]", text)

    text = text.replace("\u00a0", " ")
    text = WHITESPACE.sub(" ", text).strip(" \t\r\n|")
    text = _truncate_at_sentence(text, max_length)

    if NAV_NOISE.search(text) and len(text) < 600:
        flags.append("navigation_noise")

    return SanitizedText(text=text, original_length=original_length, flags=sorted(set(flags)))


def quality_check(text: str, min_chars: int = 220, min_words: int = 35) -> tuple[bool, str]:
    words = re.findall(r"[\wáéíóúñü]+", text, re.I)
    if len(text) < min_chars:
        return False, "too_short"
    if len(words) < min_words:
        return False, "few_words"
    if len(words) > 0 and len(set(word.lower() for word in words)) / len(words) < 0.28:
        return False, "repetitive"
    if text.count("|") > 12:
        return False, "table_noise"
    if NAV_NOISE.search(text) and len(text) < 900:
        return False, "navigation_noise"
    return True, "ok"
