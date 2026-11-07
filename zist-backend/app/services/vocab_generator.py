"""Vocab generation service.

Selects salient vocabulary from a media title + overview using Gemini and returns
structured entries. Falls back to a deterministic curated wordlist drawn from
the overview when no API key, no parseable response, or when every candidate
model fails.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from app.core.config import settings
from app.services.gemini_client import generate_gemini_text


logger = logging.getLogger(__name__)


# Common English stopwords that should never be lifted from the overview.
_STOPWORDS: set[str] = {
    "the", "a", "an", "and", "or", "but", "if", "then", "of", "in", "on", "at",
    "to", "for", "with", "by", "from", "as", "is", "are", "was", "were", "be",
    "been", "being", "this", "that", "these", "those", "it", "its", "into",
    "over", "under", "out", "up", "down", "off", "so", "not", "no", "do",
    "does", "did", "have", "has", "had", "he", "she", "they", "them", "his",
    "her", "their", "we", "us", "our", "you", "your", "i", "me", "my", "what",
    "when", "where", "who", "whom", "which", "why", "how", "than", "also",
    "just", "still", "very", "more", "most", "much", "many", "some", "any",
    "all", "can", "could", "should", "would", "will", "shall", "may", "might",
    "must", "about", "because", "while", "after", "before", "during", "between",
    "each", "every", "both", "either", "neither", "one", "two", "three",
}


def _clean_overview_words(overview: str) -> list[str]:
    if not overview:
        return []
    cleaned = re.findall(r"[A-Za-z][A-Za-z\-']{2,}", overview)
    seen: set[str] = set()
    out: list[str] = []
    for token in cleaned:
        word = token.strip("'-")
        lowered = word.lower()
        if not word or lowered in _STOPWORDS or len(word) < 4:
            continue
        if lowered in seen:
            continue
        seen.add(lowered)
        out.append(word)
    return out


def _extract_json_block(text: str) -> str:
    block_match = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, flags=re.S | re.I)
    if block_match:
        return block_match.group(1)

    array_match = re.search(r"(\[\s*\{.*\}\s*\])", text, flags=re.S)
    if array_match:
        return array_match.group(1)

    return text


def _normalize_items(
    raw_items: list[dict[str, Any]],
    count: int,
) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    seen: set[str] = set()

    for item in raw_items:
        if not isinstance(item, dict):
            continue

        word = str(item.get("word") or "").strip()
        definition = str(item.get("definition") or item.get("meaning") or "").strip()
        part_of_speech = item.get("part_of_speech") or item.get("pos")
        example = item.get("example_sentence") or item.get("example")

        if not word or not definition or len(word) < 3:
            continue

        key = word.lower()
        if key in seen:
            continue
        seen.add(key)

        normalized.append(
            {
                "word": word[:120],
                "part_of_speech": str(part_of_speech).strip()[:60] if part_of_speech else None,
                "definition": definition[:1000],
                "example_sentence": str(example).strip()[:1000] if example else None,
            }
        )

        if len(normalized) >= count:
            break

    return normalized


def _fallback_vocab(overview: str, count: int) -> list[dict[str, Any]]:
    candidates = _clean_overview_words(overview)
    picks = candidates[:count]
    return [
        {
            "word": word,
            "part_of_speech": None,
            "definition": "A distinctive word from this title's overview; add a definition in your notes.",
            "example_sentence": None,
        }
        for word in picks
    ]


async def generate_movie_vocab(
    title: str,
    overview: str,
    keywords: list[str] | None = None,
    count: int = 8,
    release_year: str | None = None,
    director: str | None = None,
    media_type: str = "movie",
) -> tuple[list[dict[str, Any]], bool, str | None, str | None]:
    """Generate vocabulary items for a media title.

    Returns ``(items, used_ai, used_model, ai_error)``. When ``used_ai`` is
    ``False`` the result contains deterministic fallback content.
    """
    keywords = keywords or []
    safe_count = max(1, min(count, 12))

    if not settings.GEMINI_API_KEY:
        return _fallback_vocab(overview, safe_count), False, None, "Gemini API key is not configured"

    meta_parts = [f"Title: '{title}'"]
    if release_year:
        meta_parts.append(f"Release Year: {release_year}")
    if director:
        meta_parts.append(f"Director / Creator: {director}")
    if media_type:
        meta_parts.append(f"Format: {media_type.capitalize()}")
    if overview:
        meta_parts.append(f"Plot Overview: {overview[:600]}")
    if keywords:
        meta_parts.append(f"Keywords: {', '.join(keywords[:10])}")

    metadata_block = "\n".join(f"- {p}" for p in meta_parts)

    prompt = (
        f"Identify up to {safe_count} salient, uncommon, or thematic vocabulary words "
        f"from the following {media_type}:\n\n"
        f"{metadata_block}\n\n"
        "STRICT ACCURACY RULES:\n"
        f"1. Choose words specifically relevant to '{title}' ({release_year or 'canonical release'}).\n"
        "2. Do NOT import terms or context from unrelated movies or franchises.\n"
        "3. For each word, provide:\n"
        "- word (the vocabulary term)\n"
        "- part_of_speech (e.g., noun, verb, adjective)\n"
        "- definition (short, learner-friendly)\n"
        "- example_sentence (one sentence showing usage in context of the story or theme)\n\n"
        "Return ONLY a JSON array of objects with these exact keys. "
        "Do not include any commentary or markdown fences."
    )

    text, used_model, ai_error = await generate_gemini_text(prompt)
    if not text:
        logger.warning("Gemini vocab generation failed for %s: %s", title, ai_error)
        return _fallback_vocab(overview, safe_count), False, None, ai_error or "Gemini request failed"

    try:
        json_text = _extract_json_block(text)
        parsed = json.loads(json_text)
        if not isinstance(parsed, list):
            raise ValueError("Gemini did not return a JSON list")

        items = _normalize_items(parsed, safe_count)
        if items:
            return items, True, used_model, None
    except Exception as exc:
        logger.exception("Gemini vocab parsing failed for %s", title)
        return _fallback_vocab(overview, safe_count), False, None, str(exc)

    return _fallback_vocab(overview, safe_count), False, None, "Gemini response could not be parsed"
