import json
import logging
import re
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.ai_cache import AICache
from app.models.media import MediaItem
from app.models.user import User
from app.models.vocab import VocabItem
from app.schemas.vocab import VocabCreate, VocabListResponse, VocabResponse, VocabUpdate
from app.services.tmdb import get_movie_themes_payload
from app.services.vocab_generator import generate_movie_vocab
from app.utils.pagination import paginate

logger = logging.getLogger(__name__)

router = APIRouter()


def _tags_to_string(tags: list[str] | None) -> str | None:
    if tags is None:
        return None
    cleaned = [t.strip() for t in tags if t.strip()]
    return ",".join(cleaned) if cleaned else None


def _serialize_vocab(item: VocabItem) -> VocabResponse:
    data = {
        "id": item.id,
        "media_id": item.media_id,
        "word": item.word,
        "part_of_speech": item.part_of_speech,
        "definition": item.definition,
        "example_sentence": item.example_sentence,
        "where_found": item.where_found,
        "tags": item.tags if item.tags is not None else [],
        "user_sentence": item.user_sentence,
        "memory_tip": item.memory_tip,
        "is_learned": item.is_learned,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }
    return VocabResponse.model_validate(data)


def _get_owned_media_or_404(db: Session, media_id: str, user_id: str) -> MediaItem:
    media = db.query(MediaItem).filter(MediaItem.id == media_id, MediaItem.user_id == user_id).first()
    if not media:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media item not found")
    return media


@router.get("/media/{media_id}/vocab", response_model=VocabListResponse)
def list_media_vocab(
    media_id: str,
    search: str | None = None,
    learned: bool | None = None,
    sort: str = "recent",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_media_or_404(db, media_id, current_user.id)
    query = db.query(VocabItem).filter(VocabItem.media_id == media_id)

    if search:
        pattern = f"%{search.lower()}%"
        query = query.filter(or_(VocabItem.word.ilike(pattern), VocabItem.definition.ilike(pattern)))

    if learned is not None:
        query = query.filter(VocabItem.is_learned == learned)

    if sort == "word":
        query = query.order_by(VocabItem.word.asc())
    elif sort == "oldest":
        query = query.order_by(VocabItem.created_at.asc())
    else:
        query = query.order_by(VocabItem.created_at.desc())

    items = query.all()
    return VocabListResponse(items=[_serialize_vocab(i) for i in items], total=len(items))


@router.post("/media/{media_id}/vocab", response_model=VocabResponse, status_code=status.HTTP_201_CREATED)
def create_vocab(
    media_id: str,
    payload: VocabCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_media_or_404(db, media_id, current_user.id)

    data = payload.model_dump()
    data["tags"] = _tags_to_string(data.get("tags"))
    item = VocabItem(media_id=media_id, **data)
    db.add(item)
    db.commit()
    db.refresh(item)
    return _serialize_vocab(item)


@router.patch("/vocab/{vocab_id}", response_model=VocabResponse)
def update_vocab(
    vocab_id: str,
    payload: VocabUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(VocabItem).filter(VocabItem.id == vocab_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vocab item not found")
    _get_owned_media_or_404(db, item.media_id, current_user.id)

    updates = payload.model_dump(exclude_unset=True)
    if "tags" in updates:
        updates["tags"] = _tags_to_string(updates["tags"])

    for key, value in updates.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return _serialize_vocab(item)


@router.delete("/vocab/{vocab_id}")
def delete_vocab(
    vocab_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(VocabItem).filter(VocabItem.id == vocab_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vocab item not found")
    _get_owned_media_or_404(db, item.media_id, current_user.id)

    db.delete(item)
    db.commit()
    return {"message": "Vocab deleted"}


@router.post("/vocab/{vocab_id}/toggle-learned", response_model=VocabResponse)
def toggle_learned(
    vocab_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(VocabItem).filter(VocabItem.id == vocab_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vocab item not found")
    _get_owned_media_or_404(db, item.media_id, current_user.id)

    item.is_learned = not item.is_learned
    db.commit()
    db.refresh(item)
    return _serialize_vocab(item)


@router.get("/vocabulary", response_model=VocabListResponse)
def list_cross_media_vocab(
    search: str | None = None,
    learned: bool | None = None,
    media_id: str | None = None,
    sort: str = "recent",
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(VocabItem).join(MediaItem, MediaItem.id == VocabItem.media_id).filter(MediaItem.user_id == current_user.id)

    if media_id:
        query = query.filter(VocabItem.media_id == media_id)
    if search:
        pattern = f"%{search.lower()}%"
        query = query.filter(or_(VocabItem.word.ilike(pattern), VocabItem.definition.ilike(pattern)))
    if learned is not None:
        query = query.filter(VocabItem.is_learned == learned)

    if sort == "word":
        query = query.order_by(VocabItem.word.asc())
    elif sort == "oldest":
        query = query.order_by(VocabItem.created_at.asc())
    else:
        query = query.order_by(VocabItem.created_at.desc())

    result = paginate(query, page=page, limit=limit)
    return VocabListResponse(
        items=[_serialize_vocab(i) for i in result["items"]],
        total=result["total"],
        page=result["page"],
        limit=result["limit"],
    )

@router.post('/media/{media_id}/vocab/generate')
async def generate_vocab_for_media(
    media_id: str,
    count: int = Query(default=8, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    media = _get_owned_media_or_404(db, media_id, current_user.id)

    if media.type not in {'movie', 'documentary', 'tv', 'book'}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Automatic vocabulary generation is only supported for movies, documentaries, TV shows, and books.',
        )

    tmdb_payload = await get_movie_themes_payload(
        query=media.title,
        tmdb_id=media.external_id if media.external_source == 'tmdb' else None,
    )
    canonical_title = str((tmdb_payload or {}).get("title") or media.title).strip()
    overview = (tmdb_payload or {}).get("overview") or ""
    keywords = (tmdb_payload or {}).get("keywords") or []
    release_year = (tmdb_payload or {}).get("release_year")
    director = (tmdb_payload or {}).get("director")
    tmdb_id = (tmdb_payload or {}).get("id")
    norm_title = re.sub(r"[^\w\s]", "", canonical_title.lower()).strip()
    norm_title = re.sub(r"\s+", "_", norm_title)

    # Check database cache first
    cached_record: AICache | None = None
    if tmdb_id:
        cached_record = db.query(AICache).filter(
            AICache.content_type == "vocab",
            AICache.cache_key == f"vocab:tmdb:{tmdb_id}",
        ).first()

    if not cached_record and norm_title:
        year_suffix = f":{release_year}" if release_year else ""
        cached_record = db.query(AICache).filter(
            AICache.content_type == "vocab",
            AICache.cache_key == f"vocab:title:{norm_title}{year_suffix}",
        ).first()

    items: list[dict] = []
    used_ai = False
    used_model: str | None = None
    ai_error: str | None = None

    if cached_record and cached_record.data:
        try:
            cached_data = json.loads(cached_record.data)
            if isinstance(cached_data, list) and cached_data:
                items = cached_data
                used_ai = True
                used_model = f"{cached_record.model_used or 'gemini'} (cached)"
                logger.info(
                    "Retrieved cached vocab for '%s' from AICache (key: %s)",
                    canonical_title,
                    cached_record.cache_key,
                )
        except Exception:
            logger.warning("Failed to decode cached vocab for '%s'", canonical_title)

    if not items:
        items, used_ai, used_model, ai_error = await generate_movie_vocab(
            title=canonical_title,
            overview=overview,
            keywords=keywords,
            count=count,
            release_year=release_year,
            director=director,
            media_type=media.type or "movie",
        )

        if used_ai and items:
            try:
                cache_key = f"vocab:tmdb:{tmdb_id}" if tmdb_id else f"vocab:title:{norm_title}:{release_year or 'na'}"
                new_cache = AICache(
                    cache_key=cache_key,
                    content_type="vocab",
                    external_id=str(tmdb_id) if tmdb_id else None,
                    media_title=canonical_title,
                    data=json.dumps(items),
                    model_used=used_model,
                )
                db.add(new_cache)
                db.commit()
                logger.info("Cached newly generated vocab for '%s' (key: %s)", canonical_title, cache_key)
            except Exception as e:
                db.rollback()
                logger.warning("Could not persist vocab to AICache: %s", e)

    existing_words = {
        v.word.strip().lower(): v for v in db.query(VocabItem).filter(VocabItem.media_id == media_id).all()
    }
    created_items: list[VocabItem] = []
    updated_items: list[VocabItem] = []

    for generated in items:
        word = (generated.get('word') or '').strip()
        if not word:
            continue

        definition = (generated.get('definition') or '').strip()
        part_of_speech = generated.get('part_of_speech')
        example = generated.get('example_sentence')

        key = word.lower()
        if key in existing_words:
            item = existing_words[key]
            if not item.definition and definition:
                item.definition = definition
            if not item.part_of_speech and part_of_speech:
                item.part_of_speech = part_of_speech
            if not item.example_sentence and example:
                item.example_sentence = example
            item.where_found = (item.where_found or 'AI generated')
            updated_items.append(item)
            continue

        item = VocabItem(
            media_id=media_id,
            word=word,
            part_of_speech=part_of_speech,
            definition=definition,
            example_sentence=example,
            where_found='AI generated' if used_ai else 'fallback',
            tags=None,
        )
        db.add(item)
        created_items.append(item)

    db.commit()
    for item in created_items + updated_items:
        db.refresh(item)

    return {
        'media_id': media_id,
        'used_ai': used_ai,
        'used_model': used_model,
        'ai_error': ai_error,
        'created': [_serialize_vocab(i).model_dump() for i in created_items],
        'updated': [_serialize_vocab(i).model_dump() for i in updated_items],
        'total_generated': len(items),
    }
