import json
import logging
import re
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.ai_cache import AICache
from app.models.media import MediaItem
from app.models.quote import QuoteItem
from app.models.user import User
from app.schemas.quote import QuoteCreate, QuoteListResponse, QuoteResponse, QuoteUpdate
from app.services.quote_generator import generate_movie_quotes
from app.services.tmdb import get_movie_themes_payload

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_owned_media_or_404(db: Session, media_id: str, user_id: str) -> MediaItem:
    media = db.query(MediaItem).filter(MediaItem.id == media_id, MediaItem.user_id == user_id).first()
    if not media:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media item not found")
    return media


@router.get("/media/{media_id}/quotes", response_model=QuoteListResponse)
def list_quotes(
    media_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_media_or_404(db, media_id, current_user.id)
    items = db.query(QuoteItem).filter(QuoteItem.media_id == media_id).order_by(QuoteItem.created_at.desc()).all()
    return QuoteListResponse(items=[QuoteResponse.model_validate(i) for i in items], total=len(items))


@router.post("/media/{media_id}/quotes", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
def create_quote(
    media_id: str,
    payload: QuoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_media_or_404(db, media_id, current_user.id)
    item = QuoteItem(media_id=media_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return QuoteResponse.model_validate(item)


@router.post("/media/{media_id}/quotes/generate")
async def generate_quotes_for_media(
    media_id: str,
    count: int = Query(default=5, ge=1, le=10),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    media = _get_owned_media_or_404(db, media_id, current_user.id)

    if media.type not in {"movie", "documentary", "tv"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Automatic quote generation is only supported for movies, documentaries, and TV shows.",
        )

    tmdb_payload = await get_movie_themes_payload(
        query=media.title,
        tmdb_id=media.external_id if media.external_source == "tmdb" else None,
    )

    if not tmdb_payload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not find this title on TMDb for quote generation.",
        )

    canonical_title = str(tmdb_payload.get("title") or media.title).strip()
    release_year = tmdb_payload.get("release_year")
    director = tmdb_payload.get("director")
    tmdb_id = tmdb_payload.get("id")
    norm_title = re.sub(r"[^\w\s]", "", canonical_title.lower()).strip()
    norm_title = re.sub(r"\s+", "_", norm_title)

    # Check database cache first
    cached_record: AICache | None = None
    if tmdb_id:
        cached_record = db.query(AICache).filter(
            AICache.content_type == "quotes",
            AICache.cache_key == f"quotes:tmdb:{tmdb_id}",
        ).first()

    if not cached_record and norm_title:
        year_suffix = f":{release_year}" if release_year else ""
        cached_record = db.query(AICache).filter(
            AICache.content_type == "quotes",
            AICache.cache_key == f"quotes:title:{norm_title}{year_suffix}",
        ).first()

    generated_quotes: list[dict] = []
    used_ai = False
    used_model: str | None = None
    ai_error: str | None = None

    if cached_record and cached_record.data:
        try:
            cached_data = json.loads(cached_record.data)
            if isinstance(cached_data, list) and cached_data:
                generated_quotes = cached_data
                used_ai = True
                used_model = f"{cached_record.model_used or 'gemini'} (cached)"
                logger.info(
                    "Retrieved cached quotes for '%s' from AICache (key: %s)",
                    canonical_title,
                    cached_record.cache_key,
                )
        except Exception:
            logger.warning("Failed to decode cached quotes for '%s'", canonical_title)

    if not generated_quotes:
        generated_quotes, used_ai, used_model, ai_error = await generate_movie_quotes(
            title=canonical_title,
            overview=tmdb_payload.get("overview") or "",
            keywords=tmdb_payload.get("keywords") or [],
            count=count,
            release_year=release_year,
            director=director,
            media_type=media.type or "movie",
        )

        if used_ai and generated_quotes:
            try:
                cache_key = f"quotes:tmdb:{tmdb_id}" if tmdb_id else f"quotes:title:{norm_title}:{release_year or 'na'}"
                new_cache = AICache(
                    cache_key=cache_key,
                    content_type="quotes",
                    external_id=str(tmdb_id) if tmdb_id else None,
                    media_title=canonical_title,
                    data=json.dumps(generated_quotes),
                    model_used=used_model,
                )
                db.add(new_cache)
                db.commit()
                logger.info("Cached newly generated quotes for '%s' (key: %s)", canonical_title, cache_key)
            except Exception as e:
                db.rollback()
                logger.warning("Could not persist quotes to AICache: %s", e)

    existing_quotes = db.query(QuoteItem).filter(QuoteItem.media_id == media_id).all()
    existing_by_text = {quote.text.strip().lower(): quote for quote in existing_quotes}

    created_items: list[QuoteItem] = []
    updated_items: list[QuoteItem] = []

    for generated in generated_quotes:
        text = str(generated.get("text") or "").strip()
        speaker = generated.get("speaker")
        speaker_text = str(speaker).strip() if isinstance(speaker, str) and speaker.strip() else None

        if not text:
            continue

        key = text.lower()
        if key in existing_by_text:
            item = existing_by_text[key]
            if speaker_text and not item.speaker:
                item.speaker = speaker_text
                updated_items.append(item)
            continue

        item = QuoteItem(
            media_id=media_id,
            text=text,
            speaker=speaker_text,
            reference="TMDb + Gemini",
            is_bookmarked=False,
        )
        db.add(item)
        created_items.append(item)

    db.commit()

    for item in created_items + updated_items:
        db.refresh(item)

    return {
        "media_id": media_id,
        "used_ai": used_ai, "used_model": used_model, "ai_error": ai_error,
        "created": [QuoteResponse.model_validate(item).model_dump() for item in created_items],
        "updated": [QuoteResponse.model_validate(item).model_dump() for item in updated_items],
        "total_generated": len(generated_quotes),
    }


@router.patch("/quotes/{quote_id}", response_model=QuoteResponse)
def update_quote(
    quote_id: str,
    payload: QuoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(QuoteItem).filter(QuoteItem.id == quote_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
    _get_owned_media_or_404(db, item.media_id, current_user.id)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return QuoteResponse.model_validate(item)


@router.delete("/quotes/{quote_id}")
def delete_quote(
    quote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(QuoteItem).filter(QuoteItem.id == quote_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
    _get_owned_media_or_404(db, item.media_id, current_user.id)

    db.delete(item)
    db.commit()
    return {"message": "Quote deleted"}


@router.post("/quotes/{quote_id}/toggle-bookmark", response_model=QuoteResponse)
def toggle_bookmark(
    quote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(QuoteItem).filter(QuoteItem.id == quote_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
    _get_owned_media_or_404(db, item.media_id, current_user.id)

    item.is_bookmarked = not item.is_bookmarked
    db.commit()
    db.refresh(item)
    return QuoteResponse.model_validate(item)
