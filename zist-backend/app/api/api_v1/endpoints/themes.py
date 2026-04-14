from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.media import MediaItem
from app.models.theme import ThemeConcept
from app.models.user import User
from app.schemas.theme import ThemeCreate, ThemeListResponse, ThemeResponse, ThemeUpdate
from app.services.theme_generator import generate_movie_themes
from app.services.tmdb import get_movie_themes_payload

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


@router.get("/top", response_model=ThemeListResponse)
def get_top_themes(
	limit: int = Query(default=5, ge=1, le=20),
	db: Session = Depends(get_db),
):
	"""Get top themes across all users, sorted by most common themes."""
	# Group themes by title and count occurrences
	theme_counts = (
		db.query(ThemeConcept.title, func.count(ThemeConcept.id).label("count"))
		.group_by(ThemeConcept.title)
		.order_by(func.count(ThemeConcept.id).desc())
		.limit(limit)
		.all()
	)
	
	# Get the most recent instance of each top theme
	top_themes = []
	for title, count in theme_counts:
		theme = (
			db.query(ThemeConcept)
			.filter(ThemeConcept.title == title)
			.order_by(ThemeConcept.created_at.desc())
			.first()
		)
		if theme:
			top_themes.append(theme)
	
	return ThemeListResponse(items=[ThemeResponse.model_validate(i) for i in top_themes], total=len(top_themes))


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


@router.post("/media/{media_id}/themes/generate")
async def generate_themes_for_media(
	media_id: str,
	count: int = Query(default=5, ge=1, le=10),
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	media = _get_owned_media_or_404(db, media_id, current_user.id)

	if media.type not in {"movie", "documentary", "tv"}:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Automatic theme generation is only supported for movies, documentaries, and TV shows.",
		)

	tmdb_payload = await get_movie_themes_payload(
		query=media.title,
		tmdb_id=media.external_id if media.external_source == "tmdb" else None,
	)
	tmdb_content_type = "tv" if media.type == "tv" else "movie"

	if not tmdb_payload:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Could not find this title on TMDb for theme generation.",
		)

	themes, used_ai = await generate_movie_themes(
		title=tmdb_payload.get("title") or media.title,
		overview=tmdb_payload.get("overview") or "",
		keywords=tmdb_payload.get("keywords") or [],
		count=count,
	)

	existing = db.query(ThemeConcept).filter(ThemeConcept.media_id == media_id).all()
	existing_by_title = {theme.title.strip().lower(): theme for theme in existing}

	created_items: list[ThemeConcept] = []
	updated_items: list[ThemeConcept] = []

	for generated in themes:
		title = generated["title"].strip()
		summary = generated["summary"].strip()
		if not title or not summary:
			continue

		key = title.lower()
		if key in existing_by_title:
			item = existing_by_title[key]
			item.summary = summary
			item.source_name = "gemini-tmdb" if used_ai else "tmdb-keywords"
			item.source_url = (
				f"https://www.themoviedb.org/{tmdb_content_type}/{tmdb_payload.get('tmdb_id')}"
				if tmdb_payload.get("tmdb_id")
				else item.source_url
			)
			updated_items.append(item)
		else:
			item = ThemeConcept(
				media_id=media_id,
				title=title,
				summary=summary,
				source_name="gemini-tmdb" if used_ai else "tmdb-keywords",
				source_url=(
					f"https://www.themoviedb.org/{tmdb_content_type}/{tmdb_payload.get('tmdb_id')}"
					if tmdb_payload.get("tmdb_id")
					else None
				),
			)
			db.add(item)
			created_items.append(item)

	db.commit()

	for item in created_items + updated_items:
		db.refresh(item)

	return {
		"media_id": media_id,
		"used_ai": used_ai,
		"created": [ThemeResponse.model_validate(item).model_dump() for item in created_items],
		"updated": [ThemeResponse.model_validate(item).model_dump() for item in updated_items],
		"total_generated": len(themes),
	}


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
