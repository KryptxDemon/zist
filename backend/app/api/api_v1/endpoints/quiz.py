import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.fact import FactItem
from app.models.media import MediaItem
from app.models.quiz import QuizAttempt
from app.models.quote import QuoteItem
from app.models.theme import ThemeConcept
from app.models.user import User
from app.models.vocab import VocabItem
from app.schemas.quiz import (
    QuizAttemptResponse,
    QuizGenerateResponse,
    QuizHistoryResponse,
    QuizStatsResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.services.quiz_generator import generate_questions
from app.utils.enums import QuizType
from app.utils.pagination import paginate

router = APIRouter()


def _get_owned_media_or_404(db: Session, media_id: str, user_id: str) -> MediaItem:
    media = db.query(MediaItem).filter(MediaItem.id == media_id, MediaItem.user_id == user_id).first()
    if not media:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media item not found")
    return media


@router.get("/media/{media_id}/quiz", response_model=QuizGenerateResponse)
def generate_quiz(
    media_id: str,
    type: QuizType = QuizType.mixed,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_media_or_404(db, media_id, current_user.id)

    themes = db.query(ThemeConcept).filter(ThemeConcept.media_id == media_id).all()
    facts = db.query(FactItem).filter(FactItem.media_id == media_id).all()
    vocab_items = db.query(VocabItem).filter(VocabItem.media_id == media_id).all()
    quotes = db.query(QuoteItem).filter(QuoteItem.media_id == media_id).all()

    questions = generate_questions(type, themes, facts, vocab_items, quotes, limit=10)
    return QuizGenerateResponse(media_id=media_id, quiz_type=type, questions=questions)


@router.post("/quiz/submit", response_model=QuizSubmitResponse)
def submit_quiz(
    payload: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_media_or_404(db, payload.media_id, current_user.id)

    total = len(payload.questions)
    if total == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No questions provided")

    score = 0
    weak_areas: dict[str, int] = {}
    suggested_topics: set[str] = set()

    for q in payload.questions:
        answer = payload.answers.get(q.id, "")
        if answer == q.correct_answer:
            score += 1
        else:
            weak_areas[q.category] = weak_areas.get(q.category, 0) + 1
            suggested_topics.add(q.category)

    accuracy = round((score / total) * 100, 2)

    result_payload = {
        "weak_areas": weak_areas,
        "suggested_review_topics": sorted(suggested_topics),
    }

    attempt = QuizAttempt(
        user_id=current_user.id,
        media_id=payload.media_id,
        quiz_type=payload.quiz_type.value,
        score=score,
        total_questions=total,
        accuracy=accuracy,
        question_payload=json.dumps([q.model_dump() for q in payload.questions]),
        answers_payload=json.dumps(payload.answers),
        result_payload=json.dumps(result_payload),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return QuizSubmitResponse(
        score=score,
        total_questions=total,
        accuracy=accuracy,
        weak_areas=sorted(weak_areas.keys()),
        suggested_review_topics=sorted(suggested_topics),
        attempt_id=attempt.id,
    )


@router.get("/quiz/history", response_model=QuizHistoryResponse)
def quiz_history(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id).order_by(QuizAttempt.created_at.desc())
    paged = paginate(query, page=page, limit=limit)
    return QuizHistoryResponse(
        items=[QuizAttemptResponse.model_validate(i) for i in paged["items"]],
        total=paged["total"],
        page=paged["page"],
        limit=paged["limit"],
    )


@router.get("/quiz/stats", response_model=QuizStatsResponse)
def quiz_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id).all()
    total = len(attempts)
    avg_accuracy = round(sum(a.accuracy for a in attempts) / total, 2) if total else 0.0

    best_media = None
    if total:
        row = (
            db.query(QuizAttempt.media_id, func.avg(QuizAttempt.accuracy).label("avg_acc"), func.count(QuizAttempt.id).label("cnt"))
            .filter(QuizAttempt.user_id == current_user.id)
            .group_by(QuizAttempt.media_id)
            .order_by(func.avg(QuizAttempt.accuracy).desc())
            .first()
        )
        if row:
            best_media = {"media_id": row.media_id, "average_accuracy": round(float(row.avg_acc), 2), "attempts": row.cnt}

    weakest = None
    if total:
        row = (
            db.query(QuizAttempt.quiz_type, func.avg(QuizAttempt.accuracy).label("avg_acc"))
            .filter(QuizAttempt.user_id == current_user.id)
            .group_by(QuizAttempt.quiz_type)
            .order_by(func.avg(QuizAttempt.accuracy).asc())
            .first()
        )
        if row:
            weakest = row.quiz_type

    return QuizStatsResponse(
        total_quizzes=total,
        average_accuracy=avg_accuracy,
        best_media=best_media,
        weakest_quiz_type=weakest,
    )
