import json
import re

import httpx

from app.core.config import settings


FALLBACK_THEME_MAP: dict[str, str] = {
    "time travel": "The story uses shifting timelines to show how small choices can produce profound long-term consequences. It asks whether people can change fate, or only understand it better after the damage is done.",
    "friendship": "Friendship is presented as a stabilizing force when circumstances become chaotic or dangerous. Through loyalty and conflict, relationships reveal how trust is built, tested, and repaired.",
    "survival": "Survival is framed as more than staying alive; it becomes a test of values, leadership, and sacrifice. The pressure to endure exposes what each character is willing to protect at any cost.",
    "revenge": "Revenge drives the narrative with emotional intensity, but the story also questions its moral price. Characters often discover that retaliation can deepen loss instead of resolving it.",
    "sacrifice": "Sacrifice appears as a repeated choice between personal desire and collective responsibility. The film highlights how meaningful progress often requires giving up comfort, safety, or recognition.",
    "family": "Family dynamics shape motivation, identity, and emotional conflict throughout the plot. Love, duty, and unresolved tension inside the family become central drivers of character decisions.",
    "love": "Love functions as both a source of vulnerability and strength, influencing risk-taking and resilience. The story treats emotional bonds as forces that can outlast distance, fear, and uncertainty.",
    "identity": "Identity is explored through characters confronting who they are versus who they are expected to be. Their arc emphasizes self-definition, belonging, and the cost of reinvention.",
    "power": "Power is portrayed as a force that can protect or corrupt depending on who controls it and why. The narrative examines accountability, abuse, and the consequences of unequal control.",
    "hope": "Hope sustains momentum when practical options are limited and setbacks accumulate. The film suggests that belief in a future outcome can become a strategic, not just emotional, resource.",
}


def _clean_sentences(text: str) -> list[str]:
    if not text:
        return []
    chunks = [chunk.strip() for chunk in re.split(r"(?<=[.!?])\s+", text) if chunk.strip()]
    return chunks


def _sentence_start_lower(text: str) -> str:
    if not text:
        return text
    return text[0].lower() + text[1:]


def _pick_context_sentence(keyword: str, sentences: list[str]) -> str:
    if not sentences:
        return ""
    seed = sum(ord(ch) for ch in keyword)
    return sentences[seed % len(sentences)]


def _fallback_summary_for_keyword(keyword: str, overview: str) -> str:
    lower = keyword.lower()
    explanation = None

    if lower in FALLBACK_THEME_MAP:
        explanation = FALLBACK_THEME_MAP[lower]
    else:
        for known_key, known_explanation in FALLBACK_THEME_MAP.items():
            if known_key in lower or lower in known_key:
                explanation = known_explanation
                break

    overview_sentences = _clean_sentences(overview)
    contextual_hint = _pick_context_sentence(keyword, overview_sentences)

    if explanation:
        if contextual_hint:
            return f"{explanation} In this film, {_sentence_start_lower(contextual_hint)}"
        return explanation

    if contextual_hint:
        return (
            f'The theme "{keyword}" is reflected in how the narrative develops conflict and character decisions. '
            f"In this film, {_sentence_start_lower(contextual_hint)}"
        )

    return (
        f'The theme "{keyword}" shapes both character motivations and the emotional direction of the plot. '
        "It highlights recurring tensions between personal needs, moral choices, and larger consequences."
    )


def _fallback_themes(keywords: list[str], overview: str, count: int) -> list[dict[str, str]]:
    picked: list[dict[str, str]] = []
    seen: set[str] = set()

    for raw in keywords:
        keyword = raw.strip()
        if not keyword:
            continue
        lower = keyword.lower()
        explanation = _fallback_summary_for_keyword(keyword, overview)

        if lower not in seen:
            seen.add(lower)
            picked.append({"title": keyword.title(), "summary": explanation})

        if len(picked) >= count:
            return picked

    if not picked:
        picked = [
            {
                "title": "Human Struggle",
                "summary": (
                    "The narrative centers on how people respond to uncertainty, pressure, and moral conflict. "
                    "Through setbacks and adaptation, characters reveal what they value and what they are willing to change."
                ),
            }
        ]

    return picked[:count]


def _extract_json_block(text: str) -> str:
    block_match = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, flags=re.S | re.I)
    if block_match:
        return block_match.group(1)

    array_match = re.search(r"(\[\s*\{.*\}\s*\])", text, flags=re.S)
    if array_match:
        return array_match.group(1)

    return text


def _normalize_ai_themes(raw_items: list[dict], count: int) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    seen: set[str] = set()

    for item in raw_items:
        if not isinstance(item, dict):
            continue

        title = str(item.get("title") or item.get("theme") or "").strip()
        summary = str(item.get("summary") or item.get("explanation") or "").strip()

        if not title or not summary:
            continue

        key = title.lower()
        if key in seen:
            continue

        seen.add(key)
        normalized.append({"title": title[:255], "summary": summary[:1000]})

        if len(normalized) >= count:
            break

    return normalized


async def generate_movie_themes(
    title: str,
    overview: str,
    keywords: list[str],
    count: int = 5,
) -> tuple[list[dict[str, str]], bool]:
    if not settings.GEMINI_API_KEY:
        return _fallback_themes(keywords, overview, count), False

    prompt = (
        "Identify 5 core themes from this movie. For each, provide a specific, insightful explanation that:\n"
        "1. Explains how the theme is demonstrated through character actions and plot events\n"
        "2. Identifies the emotional or philosophical stakes\n"
        "3. Connects the theme to the movie's central conflict\n"
        "Avoid generic phrases like 'the film explores' or 'this theme is important'. Be specific about what happens.\n"
        "\n"
        "Return ONLY a JSON array with exactly 5 objects: [{\"title\": string, \"summary\": string}]\n"
        f"Each summary should be 2-3 sentences grounded in specific plot points or character moments.\n\n"
        f"Movie: {title}\n"
        f"Plot: {overview or 'N/A'}\n"
        f"Keywords: {', '.join(keywords) if keywords else 'N/A'}"
    )

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    )

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
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

        json_text = _extract_json_block(text)
        parsed = json.loads(json_text)
        if not isinstance(parsed, list):
            raise ValueError("Gemini did not return a JSON list")

        ai_themes = _normalize_ai_themes(parsed, count)
        if ai_themes:
            return ai_themes, True
    except Exception:
        pass

    return _fallback_themes(keywords, overview, count), False
