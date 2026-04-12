from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.fact import FactItem
from app.models.media import MediaItem
from app.models.user import User
from app.schemas.fact import FactCreate, FactListResponse, FactResponse, FactUpdate
from app.utils.enums import FactCategory

router = APIRouter()


def _get_owned_media_or_404(db: Session, media_id: str, user_id: str) -> MediaItem:
    media = db.query(MediaItem).filter(MediaItem.id == media_id, MediaItem.user_id == user_id).first()
    if not media:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media item not found")
    return media


@router.get("/media/{media_id}/facts", response_model=FactListResponse)
def list_facts(
    media_id: str,
    category: FactCategory | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_media_or_404(db, media_id, current_user.id)
    query = db.query(FactItem).filter(FactItem.media_id == media_id)
    if category:
        query = query.filter(FactItem.category == category.value)
    items = query.order_by(FactItem.display_order.asc(), FactItem.created_at.desc()).all()
    return FactListResponse(items=[FactResponse.model_validate(i) for i in items], total=len(items))


@router.post("/media/{media_id}/facts", response_model=FactResponse, status_code=status.HTTP_201_CREATED)
def create_fact(
    media_id: str,
    payload: FactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_media_or_404(db, media_id, current_user.id)
    item = FactItem(media_id=media_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return FactResponse.model_validate(item)


@router.patch("/facts/{fact_id}", response_model=FactResponse)
def update_fact(
    fact_id: str,
    payload: FactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(FactItem).filter(FactItem.id == fact_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fact not found")
    _get_owned_media_or_404(db, item.media_id, current_user.id)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value.value if hasattr(value, "value") else value)

    db.commit()
    db.refresh(item)
    return FactResponse.model_validate(item)


@router.delete("/facts/{fact_id}")
def delete_fact(
    fact_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(FactItem).filter(FactItem.id == fact_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fact not found")
    _get_owned_media_or_404(db, item.media_id, current_user.id)

    db.delete(item)
    db.commit()
    return {"message": "Fact deleted"}
