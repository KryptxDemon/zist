from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.fact import FactItem
from app.models.media import MediaItem
from app.models.quiz import QuizAttempt
from app.models.quote import QuoteItem
from app.models.theme import ThemeConcept
from app.models.user import UserFollow
from app.models.vocab import VocabItem


def get_recent_activity(db: Session, user_id: str) -> list[dict]:
    items: list[dict] = []

    media = (
        db.query(MediaItem)
        .filter(MediaItem.user_id == user_id)
        .order_by(MediaItem.created_at.desc())
        .limit(5)
        .all()
    )
    for m in media:
        items.append({"type": "media_created", "title": m.title, "timestamp": m.created_at.isoformat()})

    for t in (
        db.query(ThemeConcept)
        .join(MediaItem, MediaItem.id == ThemeConcept.media_id)
        .filter(MediaItem.user_id == user_id)
        .order_by(ThemeConcept.created_at.desc())
        .limit(5)
        .all()
    ):
        items.append({"type": "theme_added", "title": t.title, "timestamp": t.created_at.isoformat()})

    for v in (
        db.query(VocabItem)
        .join(MediaItem, MediaItem.id == VocabItem.media_id)
        .filter(MediaItem.user_id == user_id)
        .order_by(VocabItem.created_at.desc())
        .limit(5)
        .all()
    ):
        items.append({"type": "vocab_added", "title": v.word, "timestamp": v.created_at.isoformat()})

    for q in (
        db.query(QuoteItem)
        .join(MediaItem, MediaItem.id == QuoteItem.media_id)
        .filter(MediaItem.user_id == user_id)
        .order_by(QuoteItem.created_at.desc())
        .limit(5)
        .all()
    ):
        items.append({"type": "quote_added", "title": (q.text or "")[:80], "timestamp": q.created_at.isoformat()})

    for qa in (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user_id)
        .order_by(QuizAttempt.created_at.desc())
        .limit(5)
        .all()
    ):
        items.append({"type": "quiz_taken", "title": qa.quiz_type, "timestamp": qa.created_at.isoformat()})

    items.sort(key=lambda x: x["timestamp"], reverse=True)
    return items[:15]


def get_dashboard_stats(db: Session, user_id: str) -> dict:
    media_q = db.query(MediaItem).filter(MediaItem.user_id == user_id)

    media_ids_subquery = media_q.with_entities(MediaItem.id).subquery()

    total_media = media_q.count()
    total_themes = db.query(ThemeConcept).filter(ThemeConcept.media_id.in_(media_ids_subquery)).count()
    total_vocab = db.query(VocabItem).filter(VocabItem.media_id.in_(media_ids_subquery)).count()
    total_quotes = db.query(QuoteItem).filter(QuoteItem.media_id.in_(media_ids_subquery)).count()
    total_facts = db.query(FactItem).filter(FactItem.media_id.in_(media_ids_subquery)).count()
    total_quizzes = db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id).count()

    week_ago = datetime.utcnow() - timedelta(days=7)
    vocabulary_growth = db.query(VocabItem).join(MediaItem, MediaItem.id == VocabItem.media_id).filter(
        MediaItem.user_id == user_id,
        VocabItem.created_at >= week_ago,
    ).count()

    top_themes_rows = (
        db.query(ThemeConcept.title, func.count(ThemeConcept.id).label("count"))
        .join(MediaItem, MediaItem.id == ThemeConcept.media_id)
        .filter(MediaItem.user_id == user_id)
        .group_by(ThemeConcept.title)
        .order_by(func.count(ThemeConcept.id).desc())
        .limit(5)
        .all()
    )

    recent_media = media_q.order_by(MediaItem.created_at.desc()).limit(5).all()
    saved_for_later_themes = (
        db.query(ThemeConcept)
        .join(MediaItem, MediaItem.id == ThemeConcept.media_id)
        .filter(MediaItem.user_id == user_id, ThemeConcept.saved_for_later.is_(True))
        .order_by(ThemeConcept.updated_at.desc())
        .limit(10)
        .count()
    )

    return {
        "total_media": total_media,
        "total_themes": total_themes,
        "total_vocab": total_vocab,
        "total_quotes": total_quotes,
        "total_facts": total_facts,
        "total_quizzes": total_quizzes,
        "vocabulary_growth": vocabulary_growth,
        "top_themes": [{"title": row[0], "count": row[1]} for row in top_themes_rows],
        "recent_media": [
            {"id": m.id, "title": m.title, "type": m.type, "created_at": m.created_at.isoformat()} for m in recent_media
        ],
        "saved_for_later_themes": saved_for_later_themes,
        "recent_activity": get_recent_activity(db, user_id),
    }


def get_profile_summary(db: Session, user_id: str) -> dict:
    followers_count = db.query(UserFollow).filter(UserFollow.following_id == user_id).count()
    following_count = db.query(UserFollow).filter(UserFollow.follower_id == user_id).count()

    media_distribution_rows = (
        db.query(MediaItem.type, func.count(MediaItem.id))
        .filter(MediaItem.user_id == user_id)
        .group_by(MediaItem.type)
        .all()
    )
    status_distribution_rows = (
        db.query(MediaItem.status, func.count(MediaItem.id))
        .filter(MediaItem.user_id == user_id)
        .group_by(MediaItem.status)
        .all()
    )

    attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id).all()
    avg_accuracy = round(sum(a.accuracy for a in attempts) / len(attempts), 2) if attempts else 0.0

    return {
        "followers_count": followers_count,
        "following_count": following_count,
        "media_distribution_by_type": [{"type": t, "count": c} for t, c in media_distribution_rows],
        "most_common_statuses": [{"status": s, "count": c} for s, c in status_distribution_rows],
        "quiz_performance_summary": {
            "total_attempts": len(attempts),
            "average_accuracy": avg_accuracy,
        },
    }
