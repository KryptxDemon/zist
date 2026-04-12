from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.media import MediaItem
from app.models.quote import QuoteItem
from app.models.user import User
from app.schemas.quote import QuoteCreate, QuoteListResponse, QuoteResponse, QuoteUpdate

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
