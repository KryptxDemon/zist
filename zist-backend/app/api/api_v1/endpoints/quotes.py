from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.media import MediaItem
from app.models.quote import QuoteItem
from app.models.user import User
from app.schemas.quote import QuoteCreate, QuoteListResponse, QuoteResponse, QuoteUpdate
from app.services.quote_generator import generate_movie_quotes
from app.services.tmdb import get_movie_themes_payload

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

    generated_quotes = await generate_movie_quotes(
        title=tmdb_payload.get("title") or media.title,
        overview=tmdb_payload.get("overview") or "",
        keywords=tmdb_payload.get("keywords") or [],
        count=count,
    )

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
