import json
import logging
import re

from app.core.config import settings
from app.services.gemini_client import generate_gemini_text


logger = logging.getLogger(__name__)


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
    contextual_hint = overview_sentences[0] if overview_sentences else ""

    if explanation:
        if contextual_hint:
            return f"{explanation} In this film, {contextual_hint[0].lower() + contextual_hint[1:]}"
        return explanation

    if contextual_hint:
        return (
            f'The theme "{keyword}" is reflected in how the narrative develops conflict and character decisions. '
            f"In this film, {contextual_hint[0].lower() + contextual_hint[1:]}"
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
    year: int | None = None,
    creator: str | None = None,
    media_type: str = "movie",
    genres: list[str] | None = None,
) -> tuple[list[dict[str, str]], bool, str | None, str | None]:
    if not settings.GEMINI_API_KEY:
        return _fallback_themes(keywords, overview, count), False, None, "Gemini API key is not configured"

    meta_parts = []
    if year:
        meta_parts.append(f"Release Year: {year}")
    if creator:
        role = "Director" if media_type == "movie" else "Creator/Showrunner"
        meta_parts.append(f"{role}: {creator}")
    if media_type:
        meta_parts.append(f"Medium/Format: {media_type.capitalize()}")
    if genres:
        meta_parts.append(f"Genres: {', '.join(genres)}")
    if keywords:
        meta_parts.append(f"Key Themes/Tags: {', '.join(keywords[:12])}")

    meta_block = "\n".join(meta_parts) if meta_parts else "N/A"

    prompt = (
        f"You are an expert narrative analyst. Your task is to identify and summarize exactly {count} distinct, profound "
        f"thematic concepts central to the story of the exact {media_type} specified below.\n\n"
        f"WORK DETAILS:\n"
        f"Title: {title}\n"
        f"{meta_block}\n"
        f"Official Synopsis:\n{overview or 'N/A'}\n\n"
        "STRICT ACCURACY AND ANTI-HALLUCINATION RULES:\n"
        f"1. You must analyze ONLY this specific {media_type} ('{title}'"
        + (f", {year}" if year else "")
        + (f", directed by {creator}" if creator else "")
        + ").\n"
        "2. DO NOT confuse this work with any other film, adaptation, remake, prequel, or sequel with a similar or identical title.\n"
        "3. DO NOT hallucinate or import characters, subplots, twists, or incidents from other movies. Every statement must be strictly accurate to THIS specific story.\n"
        "4. Base your themes directly on the verified plot synopsis and the genuine narrative conflict of this work. If a specific plot detail is not certain, articulate the philosophical, moral, and emotional conflict accurately rather than fabricating unverified plot events.\n"
        "5. Avoid generic filler (e.g., 'the film explores', 'this theme is important'). Write with clarity, precision, and depth.\n\n"
        f"Return ONLY a valid JSON array containing exactly {count} objects in this format:\n"
        '[\n  {"title": "Concise Theme Name (2-4 words)", "summary": "2-3 precise sentences explaining how this theme develops in this story, the character or moral stakes, and how it drives the core conflict."}\n]\n'
        "Do not include markdown outside the JSON block."
    )

    text, used_model, ai_error = await generate_gemini_text(prompt)
    if not text:
        logger.exception("Gemini theme generation failed for %s", title)
        return _fallback_themes(keywords, overview, count), False, None, ai_error or "Gemini request failed"

    try:

        json_text = _extract_json_block(text)
        parsed = json.loads(json_text)
        if not isinstance(parsed, list):
            raise ValueError("Gemini did not return a JSON list")

        ai_themes = _normalize_ai_themes(parsed, count)
        if ai_themes:
            return ai_themes, True, used_model, None
    except Exception as exc:
        logger.exception("Gemini theme parsing failed for %s", title)
        return _fallback_themes(keywords, overview, count), False, None, str(exc)

    return _fallback_themes(keywords, overview, count), False, None, "Gemini response could not be parsed"
