from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.media import MediaItem
from app.models.user import User
from app.models.vocab import VocabItem
from app.schemas.vocab import VocabCreate, VocabListResponse, VocabResponse, VocabUpdate
from app.utils.pagination import paginate

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
