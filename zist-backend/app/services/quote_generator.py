import json
import re

import httpx

from app.core.config import settings


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
            speaker_match = re.search(r"[-—]\s*([^\-—]+)$", cleaned)
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
) -> list[dict[str, str | None]]:
    if not settings.GEMINI_API_KEY:
        return []

    prompt = (
        f"Give me {count} quotes of the movie {title}. "
        "Return ONLY valid JSON as an array with format: "
        '[{"text": string, "speaker": string|null}]. '
        "Use widely known lines from the title. Do not add commentary or markdown."
    )

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    )

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(url, json=body)
            response.raise_for_status()
        payload = response.json()

        text = (
            payload.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )

        return _parse_gemini_quotes_response(text, count)
    except Exception:
        return []
