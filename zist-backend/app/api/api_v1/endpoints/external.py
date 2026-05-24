import json
import re

from fastapi import APIRouter, Body, Query
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.dictionary import lookup_word
from app.services.groq_client import generate_groq_text
from app.services.openlibrary import search_books
from app.services.tmdb import search_movies, search_multi, search_tv
from app.services.wikipedia import get_suggestions, get_summary
from app.utils.enums import MediaType

router = APIRouter()


class QuoteMeaningRequest(BaseModel):
    quote: str = Field(..., min_length=1)
    context: str | None = None


class MediaVocabularyRequest(BaseModel):
    title: str = Field(..., min_length=1)
    overview: str | None = None
    count: int = Field(default=5, ge=1, le=10)


class QuizDistractorsRequest(BaseModel):
    kind: str = Field(..., min_length=1)
    question: str = Field(..., min_length=1)
    correct_answer: str = Field(..., min_length=1)
    context: str | None = None
    candidate_answers: list[str] = Field(default_factory=list)


def _extract_json(text: str) -> str:
    match = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, flags=re.S | re.I)
    if match:
        return match.group(1)
    if text.strip().startswith("["):
        return text
    return text


def _parse_json_list(text: str) -> list[dict]:
    try:
      payload = json.loads(_extract_json(text))
      return payload if isinstance(payload, list) else []
    except Exception:
      return []


@router.get("/external/search/media")
async def search_media_external(query: str = Query(..., min_length=1), type: MediaType | None = None):
    if type in {MediaType.movie, MediaType.documentary}:
        return {"items": await search_movies(query)}
    if type == MediaType.tv:
        return {"items": await search_tv(query)}
    if type == MediaType.book:
        return {"items": await search_books(query)}
    return {
        "grouped": {
            "movies_tv": await search_multi(query),
            "books": await search_books(query),
        }
    }


@router.get("/external/wiki/summary")
async def wiki_summary(topic: str = Query(..., min_length=1)):
    summary = await get_summary(topic)
    return {"topic": topic, **summary}


@router.get("/external/dictionary/lookup")
async def dictionary_lookup(word: str = Query(..., min_length=1)):
    return await lookup_word(word)


@router.get("/external/wiki/suggestions")
async def wiki_suggestions(
    query: str | None = Query(default=None, min_length=1),
    media_title: str | None = Query(default=None, min_length=1),
):
    search_term = query or media_title or ""
    suggestions = await get_suggestions(search_term)
    return {"items": suggestions, "suggestions": suggestions}


@router.post("/external/ai/quote-meaning")
async def quote_meaning(payload: QuoteMeaningRequest):
    context_part = f"Context: {payload.context}\n" if payload.context else ""
    prompt = (
        "Explain the meaning of the following quote in 2-3 clear sentences. "
        "Focus on the emotion, subtext, and what it suggests about the story or character. "
        "Do not mention that you are an AI. Return only the explanation text.\n\n"
        f"Quote: {payload.quote}\n"
        f"{context_part}"
    )

    text, error = await generate_groq_text(prompt, [settings.GROQ_MODEL])
    if not text:
        return {"meaning": "This quote suggests a deeper emotional or thematic idea in the story.", "ai_error": error}

    return {"meaning": text.strip(), "ai_error": None}


@router.post("/external/ai/media-vocabulary")
async def media_vocabulary(payload: MediaVocabularyRequest):
    prompt = (
        f"Generate {payload.count} moderately uncommon but relevant vocabulary words for this media title. "
        "Choose words that could realistically appear in the plot, setting, themes, or dialogue. "
        "Avoid overly common words. For each word, provide a concise definition and a short example sentence. "
        "Return only valid JSON as an array with objects using this format: "
        '[{"word": string, "part_of_speech": string|null, "definition": string, "example_sentence": string, "why_relevant": string|null}]. '
        "Do not add markdown or commentary.\n\n"
        f"Title: {payload.title}\n"
        f"Overview: {payload.overview or 'N/A'}\n"
    )

    text, error = await generate_groq_text(prompt, [settings.GROQ_MODEL])
    if not text:
        return {"items": [], "ai_error": error}

    items = _parse_json_list(text)
    normalized: list[dict] = []
    seen: set[str] = set()
    for item in items:
        if not isinstance(item, dict):
            continue
        word = str(item.get("word") or "").strip()
        definition = str(item.get("definition") or "").strip()
        example_sentence = str(item.get("example_sentence") or "").strip()
        if not word or not definition or not example_sentence:
            continue
        key = word.lower()
        if key in seen:
            continue
        seen.add(key)
        normalized.append({
            "word": word,
            "part_of_speech": item.get("part_of_speech"),
            "definition": definition,
            "example_sentence": example_sentence,
            "why_relevant": item.get("why_relevant"),
        })
        if len(normalized) >= payload.count:
            break

    return {"items": normalized, "ai_error": None if normalized else error}


@router.post("/external/ai/quiz-distractors")
async def quiz_distractors(payload: QuizDistractorsRequest):
    candidate_block = ""
    if payload.candidate_answers:
        candidate_block = (
            "Candidate answers to consider if they fit the question: "
            + ", ".join(payload.candidate_answers[:12])
            + "\n"
        )

    prompt = (
        "Create exactly 3 plausible but incorrect multiple-choice distractors. "
        "They should be concise, realistic, and confusing enough to challenge a learner. "
        "Do not repeat the correct answer or use obvious nonsense. "
        "Return only a valid JSON array of strings.\n\n"
        f"Question type: {payload.kind}\n"
        f"Question: {payload.question}\n"
        f"Correct answer: {payload.correct_answer}\n"
        f"{candidate_block}"
        f"Context: {payload.context or 'N/A'}\n"
    )

    text, error = await generate_groq_text(prompt, [settings.GROQ_MODEL])
    if not text:
        return {"distractors": [], "ai_error": error}

    distractors: list[str] = []
    try:
        raw = json.loads(_extract_json(text))
        if isinstance(raw, list):
            for item in raw:
                value = str(item).strip()
                if value and value.lower() != payload.correct_answer.strip().lower() and value not in distractors:
                    distractors.append(value)
    except Exception:
        pass

    return {"distractors": distractors[:3], "ai_error": None if distractors else error}
