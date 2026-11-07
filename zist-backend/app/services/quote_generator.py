import json
import logging
import re

from app.core.config import settings
from app.services.gemini_client import generate_gemini_text


logger = logging.getLogger(__name__)


def _extract_json_block(text: str) -> str:
    block_match = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, flags=re.S | re.I)
    if block_match:
        return block_match.group(1)

    array_match = re.search(r"(\[\s*\{.*\}\s*\])", text, flags=re.S)
    if array_match:
        return array_match.group(1)

    return text


def _normalize_quotes(raw_items: list[dict], count: int) -> list[dict[str, str | None]]:
    normalized: list[dict[str, str | None]] = []
    seen: set[str] = set()

    for item in raw_items:
        if not isinstance(item, dict):
            continue

        text = str(item.get("text") or item.get("quote") or "").strip()
        speaker_raw = item.get("speaker")
        speaker = str(speaker_raw).strip() if speaker_raw is not None else None

        if not text:
            continue

        key = text.lower()
        if key in seen:
            continue

        seen.add(key)
        normalized.append({"text": text[:1000], "speaker": speaker[:255] if speaker else None})

        if len(normalized) >= count:
            break

    return normalized


def _parse_text_quotes(raw_text: str, count: int) -> list[dict[str, str | None]]:
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    parsed: list[dict[str, str | None]] = []

    for line in lines:
        cleaned = re.sub(r"^[-*\d\.)\s]+", "", line).strip()
        if not cleaned:
            continue

        quote_match = re.search(r'"([^"]{8,})"', cleaned)
        if quote_match:
            text = quote_match.group(1).strip()
            speaker_match = re.search(r"[-â€”]\s*([^\-â€”]+)$", cleaned)
            speaker = speaker_match.group(1).strip() if speaker_match else None
            parsed.append({"text": text, "speaker": speaker})
        elif len(cleaned) >= 12:
            parsed.append({"text": cleaned, "speaker": None})

        if len(parsed) >= count:
            break

    return _normalize_quotes(parsed, count)


def _parse_gemini_quotes_response(text: str, count: int) -> list[dict[str, str | None]]:
    if not text.strip():
        return []

    try:
        json_text = _extract_json_block(text)
        parsed = json.loads(json_text)

        if isinstance(parsed, list):
            return _normalize_quotes(parsed, count)

        if isinstance(parsed, dict):
            if isinstance(parsed.get("quotes"), list):
                return _normalize_quotes(parsed["quotes"], count)
            if isinstance(parsed.get("items"), list):
                return _normalize_quotes(parsed["items"], count)
    except Exception:
        pass

    return _parse_text_quotes(text, count)


async def generate_movie_quotes(
    title: str,
    overview: str,
    keywords: list[str],
    count: int = 5,
    release_year: str | None = None,
    director: str | None = None,
    media_type: str = "movie",
) -> tuple[list[dict[str, str | None]], bool, str | None, str | None]:
    if not settings.GEMINI_API_KEY:
        return [], False, None, "Gemini API key is not configured"

    meta_parts = [f"Title: '{title}'"]
    if release_year:
        meta_parts.append(f"Release Year: {release_year}")
    if director:
        meta_parts.append(f"Director / Creator: {director}")
    if media_type:
        meta_parts.append(f"Format: {media_type.capitalize()}")
    if overview:
        meta_parts.append(f"Plot Overview: {overview[:600]}")

    metadata_block = "\n".join(f"- {p}" for p in meta_parts)

    prompt = (
        f"You are an expert film and television archivist. Provide {count} accurate, iconic, and memorable quotes specifically from the following {media_type}:\n\n"
        f"{metadata_block}\n\n"
        "STRICT ACCURACY RULES:\n"
        f"1. Quotes MUST be authentically spoken in '{title}' ({release_year or 'canonical release'}).\n"
        "2. Do NOT mix quotes from other films, adaptations, sequels, prequels, or unrelated media.\n"
        "3. Provide the accurate character name as 'speaker'. If unknown, use null.\n"
        "4. Return ONLY valid JSON as an array of objects with the exact schema:\n"
        '[{"text": "quote text", "speaker": "character name or null"}]\n'
        "No commentary, no markdown fences, just the JSON array."
    )

    text, used_model, ai_error = await generate_gemini_text(prompt)
    if not text:
        return [], False, None, ai_error or "Gemini request failed"

    try:
        quotes = _parse_gemini_quotes_response(text, count)
        if quotes:
            return quotes, True, used_model, None
        return [], False, None, "Gemini returned no parseable quotes"
    except Exception as exc:
        logger.exception("Gemini quote parsing failed for %s", title)
        return [], False, None, str(exc)
