from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.fact import FactItem
from app.models.media import MediaItem
from app.models.quiz import QuizAttempt
from app.models.quote import QuoteItem
from app.models.theme import ThemeConcept
from app.models.user import User
from app.models.vocab import VocabItem
from app.schemas.media import MediaCreate, MediaListResponse, MediaResponse, MediaUpdate
from app.utils.enums import MediaStatus, MediaType
from app.utils.pagination import paginate

router = APIRouter()


def _get_owned_media_or_404(db: Session, media_id: str, user_id: str) -> MediaItem:
	media = db.query(MediaItem).filter(MediaItem.id == media_id, MediaItem.user_id == user_id).first()
	if not media:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media item not found")
	return media


@router.get("/media", response_model=MediaListResponse)
def list_media(
	search: str | None = None,
	type: MediaType | None = None,
	status_filter: MediaStatus | None = Query(default=None, alias="status"),
	sort: str = "recent",
	page: int = 1,
	limit: int = 20,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	query = db.query(MediaItem).filter(MediaItem.user_id == current_user.id)

	if search:
		pattern = f"%{search.lower()}%"
		query = query.filter(or_(MediaItem.title.ilike(pattern), MediaItem.creator.ilike(pattern), MediaItem.description.ilike(pattern)))
	if type:
		query = query.filter(MediaItem.type == type.value)
	if status_filter:
		query = query.filter(MediaItem.status == status_filter.value)

	if sort == "title":
		query = query.order_by(MediaItem.title.asc())
	elif sort == "most_themes":
		query = (
			query.outerjoin(ThemeConcept, ThemeConcept.media_id == MediaItem.id)
			.group_by(MediaItem.id)
			.order_by(func.count(ThemeConcept.id).desc(), MediaItem.updated_at.desc())
		)
	elif sort == "most_vocab":
		query = (
			query.outerjoin(VocabItem, VocabItem.media_id == MediaItem.id)
			.group_by(MediaItem.id)
			.order_by(func.count(VocabItem.id).desc(), MediaItem.updated_at.desc())
		)
	else:
		query = query.order_by(MediaItem.created_at.desc())

	paged = paginate(query, page=page, limit=limit)
	return MediaListResponse(
		items=[MediaResponse.model_validate(item) for item in paged["items"]],
		total=paged["total"],
		page=paged["page"],
		limit=paged["limit"],
	)


@router.post("/media", response_model=MediaResponse, status_code=status.HTTP_201_CREATED)
def create_media(
	payload: MediaCreate,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	data = payload.model_dump()
	data["type"] = payload.type.value
	data["status"] = payload.status.value

	item = MediaItem(user_id=current_user.id, **data)
	db.add(item)
	db.commit()
	db.refresh(item)
	return MediaResponse.model_validate(item)


@router.get("/media/{media_id}", response_model=MediaResponse)
def get_media(
	media_id: str,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	item = _get_owned_media_or_404(db, media_id, current_user.id)
	return MediaResponse.model_validate(item)


@router.patch("/media/{media_id}", response_model=MediaResponse)
def update_media(
	media_id: str,
	payload: MediaUpdate,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	item = _get_owned_media_or_404(db, media_id, current_user.id)

	updates = payload.model_dump(exclude_unset=True)
	if "type" in updates and updates["type"] is not None:
		updates["type"] = updates["type"].value
	if "status" in updates and updates["status"] is not None:
		updates["status"] = updates["status"].value

	for key, value in updates.items():
		setattr(item, key, value)

	db.commit()
	db.refresh(item)
	return MediaResponse.model_validate(item)


@router.delete("/media/{media_id}")
def delete_media(
	media_id: str,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	item = _get_owned_media_or_404(db, media_id, current_user.id)
	db.delete(item)
	db.commit()
	return {"message": "Media item deleted"}


@router.get("/media/{media_id}/stats")
def media_stats(
	media_id: str,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	_get_owned_media_or_404(db, media_id, current_user.id)
	return {
		"themes": db.query(ThemeConcept).filter(ThemeConcept.media_id == media_id).count(),
		"facts": db.query(FactItem).filter(FactItem.media_id == media_id).count(),
		"vocab": db.query(VocabItem).filter(VocabItem.media_id == media_id).count(),
		"quotes": db.query(QuoteItem).filter(QuoteItem.media_id == media_id).count(),
		"quizzes": db.query(QuizAttempt).filter(QuizAttempt.media_id == media_id, QuizAttempt.user_id == current_user.id).count(),
	}


@router.get("/media/{media_id}/overview")
def media_overview(
	media_id: str,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	media = _get_owned_media_or_404(db, media_id, current_user.id)
	stats = media_stats(media_id, db, current_user)
	top_recent_themes = (
		db.query(ThemeConcept)
		.filter(ThemeConcept.media_id == media_id)
		.order_by(ThemeConcept.updated_at.desc())
		.limit(5)
		.all()
	)
	latest_vocab = (
		db.query(VocabItem)
		.filter(VocabItem.media_id == media_id)
		.order_by(VocabItem.updated_at.desc())
		.limit(5)
		.all()
	)
	latest_quotes = (
		db.query(QuoteItem)
		.filter(QuoteItem.media_id == media_id)
		.order_by(QuoteItem.updated_at.desc())
		.limit(5)
		.all()
	)

	return {
		"media": MediaResponse.model_validate(media),
		"stats": stats,
		"top_recent_themes": [
			{
				"id": t.id,
				"title": t.title,
				"summary": t.summary,
				"saved_for_later": t.saved_for_later,
			}
			for t in top_recent_themes
		],
		"latest_vocab": [
			{
				"id": v.id,
				"word": v.word,
				"definition": v.definition,
				"is_learned": v.is_learned,
			}
			for v in latest_vocab
		],
		"latest_quotes": [
			{
				"id": q.id,
				"text": q.text,
				"speaker": q.speaker,
				"is_bookmarked": q.is_bookmarked,
			}
			for q in latest_quotes
		],
	}


@router.get("/media/{media_id}/full")
def media_full(
	media_id: str,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	media = _get_owned_media_or_404(db, media_id, current_user.id)
	themes = db.query(ThemeConcept).filter(ThemeConcept.media_id == media_id).all()
	facts = db.query(FactItem).filter(FactItem.media_id == media_id).all()
	vocab_items = db.query(VocabItem).filter(VocabItem.media_id == media_id).all()
	quotes = db.query(QuoteItem).filter(QuoteItem.media_id == media_id).all()
	return {
		"media": MediaResponse.model_validate(media),
		"themes": [
			{
				"id": t.id,
				"title": t.title,
				"summary": t.summary,
				"source_name": t.source_name,
				"source_url": t.source_url,
				"user_understanding": t.user_understanding,
				"saved_for_later": t.saved_for_later,
				"created_at": t.created_at,
				"updated_at": t.updated_at,
			}
			for t in themes
		],
		"facts": [
			{
				"id": f.id,
				"category": f.category,
				"content": f.content,
				"source_name": f.source_name,
				"source_url": f.source_url,
				"display_order": f.display_order,
				"created_at": f.created_at,
				"updated_at": f.updated_at,
			}
			for f in facts
		],
		"vocab": [
			{
				"id": v.id,
				"word": v.word,
				"part_of_speech": v.part_of_speech,
				"definition": v.definition,
				"example_sentence": v.example_sentence,
				"where_found": v.where_found,
				"tags": [tag.strip() for tag in (v.tags or "").split(",") if tag.strip()],
				"user_sentence": v.user_sentence,
				"memory_tip": v.memory_tip,
				"is_learned": v.is_learned,
				"created_at": v.created_at,
				"updated_at": v.updated_at,
			}
			for v in vocab_items
		],
		"quotes": [
			{
				"id": q.id,
				"text": q.text,
				"speaker": q.speaker,
				"reference": q.reference,
				"related_theme_id": q.related_theme_id,
				"user_meaning": q.user_meaning,
				"ai_meaning": q.ai_meaning,
				"is_bookmarked": q.is_bookmarked,
				"created_at": q.created_at,
				"updated_at": q.updated_at,
			}
			for q in quotes
		],
		"stats": media_stats(media_id, db, current_user),
	}
