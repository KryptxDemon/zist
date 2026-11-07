import json
import logging
import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user, get_db
from app.models.ai_cache import AICache
from app.models.media import MediaItem
from app.models.theme import ThemeConcept
from app.models.user import User
from app.schemas.theme import (
	ThemeCreate,
	ThemeListResponse,
	ThemeResponse,
	ThemeUpdate,
	TopThemeListResponse,
	TopThemeResponse,
	TopThemeMediaResponse,
)
from app.services.theme_generator import generate_movie_themes
from app.services.tmdb import get_movie_themes_payload

router = APIRouter()
logger = logging.getLogger("zist.themes")


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


@router.get("/top", response_model=TopThemeListResponse)
def get_top_themes(
	limit: int = Query(default=5, ge=1, le=20),
	db: Session = Depends(get_db),
):
	"""Get the most recent top themes across all users, grouped by title."""
	theme_counts = (
		db.query(
			ThemeConcept.title.label("title"),
			func.count(ThemeConcept.id).label("count"),
			func.max(ThemeConcept.created_at).label("latest_created_at"),
		)
		.group_by(ThemeConcept.title)
		.order_by(func.count(ThemeConcept.id).desc(), func.max(ThemeConcept.created_at).desc())
		.limit(limit)
		.all()
	)

	top_themes: list[TopThemeResponse] = []
	for row in theme_counts:
		theme = (
			db.query(ThemeConcept)
			.options(joinedload(ThemeConcept.media))
			.filter(ThemeConcept.title == row.title)
			.order_by(ThemeConcept.created_at.desc())
			.first()
		)
		if not theme or not theme.media:
			continue

		top_themes.append(
			TopThemeResponse(
				title=row.title,
				count=row.count,
				latest_created_at=row.latest_created_at or theme.created_at,
				summary=theme.summary,
				media=TopThemeMediaResponse.model_validate(theme.media),
			)
		)

	return TopThemeListResponse(items=top_themes, total=len(top_themes))


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
		media_type=media.type,
		year=media.year,
	)
	tmdb_content_type = "tv" if media.type == "tv" else "movie"

	if not tmdb_payload:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Could not find this title on TMDb for theme generation.",
		)

	# Build deterministic cache keys to avoid spending duplicate Gemini tokens
	resolved_tmdb_id = tmdb_payload.get("tmdb_id") or media.external_id
	normalized_title = re.sub(r"[^a-z0-9]", "", (media.title or "").lower())
	resolved_year = media.year or tmdb_payload.get("year")
	year_str = str(resolved_year) if resolved_year else "any"

	cache_keys: list[str] = []
	if resolved_tmdb_id:
		cache_keys.append(f"themes:tmdb:{resolved_tmdb_id}")
	if normalized_title:
		cache_keys.append(f"themes:title:{normalized_title}:{year_str}")

	# Check database cache first
	cached_record: AICache | None = None
	if cache_keys:
		cached_record = (
			db.query(AICache)
			.filter(AICache.cache_key.in_(cache_keys))
			.first()
		)

	themes: list[dict[str, str]] = []
	used_ai = False
	used_model: str | None = None
	ai_error: str | None = None

	if cached_record:
		try:
			parsed_cache = json.loads(cached_record.data)
			if isinstance(parsed_cache, list) and parsed_cache:
				themes = parsed_cache[:count]
				used_ai = True
				used_model = f"{cached_record.model_used or 'gemini'} (db-cached)"
				ai_error = None
				logger.info(
					"Cache HIT for '%s' (key: %s) — zero tokens consumed",
					media.title,
					cached_record.cache_key,
				)
		except Exception as exc:
			logger.warning("Failed to deserialize cached themes for '%s': %s", media.title, exc)
			cached_record = None

	# If not in database cache, generate via Gemini with enhanced disambiguation prompt
	if not themes:
		logger.info("Cache MISS for '%s' — calling Gemini theme generator", media.title)
		themes, used_ai, used_model, ai_error = await generate_movie_themes(
			title=tmdb_payload.get("title") or media.title,
			overview=tmdb_payload.get("overview") or media.description or "",
			keywords=tmdb_payload.get("keywords") or media.tags or [],
			count=count,
			year=resolved_year,
			creator=media.creator or tmdb_payload.get("creator"),
			media_type=media.type,
			genres=tmdb_payload.get("genres"),
		)

		# Save newly generated AI themes to database cache for all future users
		if used_ai and themes:
			primary_key = cache_keys[0] if cache_keys else f"themes:title:{normalized_title}:{year_str}"
			try:
				cache_entry = AICache(
					cache_key=primary_key,
					media_title=media.title,
					external_id=str(resolved_tmdb_id) if resolved_tmdb_id else None,
					content_type=media.type,
					data=json.dumps(themes),
					model_used=used_model,
				)
				db.add(cache_entry)
				db.commit()
				logger.info(
					"Cached newly generated themes for '%s' (key: %s)",
					media.title,
					primary_key,
				)
			except Exception as exc:
				db.rollback()
				logger.warning("Failed to persist themes to AICache: %s", exc)

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
		"used_ai": used_ai, "used_model": used_model, "ai_error": ai_error,
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
