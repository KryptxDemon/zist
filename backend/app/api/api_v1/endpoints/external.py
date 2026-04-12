from fastapi import APIRouter, Query

from app.services.dictionary import lookup_word
from app.services.openlibrary import search_books
from app.services.tmdb import search_movies, search_multi, search_tv
from app.services.wikipedia import get_suggestions, get_summary
from app.utils.enums import MediaType

router = APIRouter()


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
