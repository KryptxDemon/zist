from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.media import MediaItem
from app.models.theme import ThemeConcept
from app.models.user import User
from app.schemas.theme import ThemeCreate, ThemeListResponse, ThemeResponse, ThemeUpdate

router = APIRouter()


def _get_owned_media_or_404(db: Session, media_id: str, user_id: str) -> MediaItem:
	media = db.query(MediaItem).filter(MediaItem.id == media_id, MediaItem.user_id == user_id).first()
	if not media:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media item not found")
	return media


def _get_owned_theme_or_404(db: Session, theme_id: str, user_id: str) -> ThemeConcept:
	theme = db.query(ThemeConcept).filter(ThemeConcept.id == theme_id).first()
	if not theme:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Theme not found")
	_get_owned_media_or_404(db, theme.media_id, user_id)
	return theme


@router.get("/media/{media_id}/themes", response_model=ThemeListResponse)
def list_themes(
	media_id: str,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	_get_owned_media_or_404(db, media_id, current_user.id)
	items = db.query(ThemeConcept).filter(ThemeConcept.media_id == media_id).order_by(ThemeConcept.updated_at.desc()).all()
	return ThemeListResponse(items=[ThemeResponse.model_validate(i) for i in items], total=len(items))


@router.post("/media/{media_id}/themes", response_model=ThemeResponse, status_code=status.HTTP_201_CREATED)
def create_theme(
	media_id: str,
	payload: ThemeCreate,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	_get_owned_media_or_404(db, media_id, current_user.id)

	item = ThemeConcept(media_id=media_id, **payload.model_dump())
	db.add(item)
	db.commit()
	db.refresh(item)
	return ThemeResponse.model_validate(item)


@router.patch("/themes/{theme_id}", response_model=ThemeResponse)
def update_theme(
	theme_id: str,
	payload: ThemeUpdate,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	item = _get_owned_theme_or_404(db, theme_id, current_user.id)

	for key, value in payload.model_dump(exclude_unset=True).items():
		setattr(item, key, value)

	db.commit()
	db.refresh(item)
	return ThemeResponse.model_validate(item)


@router.delete("/themes/{theme_id}")
def delete_theme(
	theme_id: str,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	item = _get_owned_theme_or_404(db, theme_id, current_user.id)
	db.delete(item)
	db.commit()
	return {"message": "Theme deleted"}


@router.post("/themes/{theme_id}/toggle-save", response_model=ThemeResponse)
def toggle_saved_for_later(
	theme_id: str,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	item = _get_owned_theme_or_404(db, theme_id, current_user.id)
	item.saved_for_later = not item.saved_for_later
	db.commit()
	db.refresh(item)
	return ThemeResponse.model_validate(item)
