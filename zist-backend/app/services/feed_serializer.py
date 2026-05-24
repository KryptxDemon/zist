from typing import Any

from sqlalchemy.orm import Session

from app.models.feed import FeedPost, FeedPostComment, FeedPostLike, FeedPostSave
from app.models.media import MediaItem
from app.models.quote import QuoteItem
from app.models.theme import ThemeConcept
from app.models.user import User
from app.models.vocab import VocabItem
from app.schemas.feed import FeedCommentResponse, FeedPostResponse
from app.utils.enums import FeedPostType


def _load_content(db: Session, post_type: str, content_id: str) -> tuple[dict[str, Any] | None, str | None]:
    if post_type == FeedPostType.theme.value:
        item = db.query(ThemeConcept).filter(ThemeConcept.id == content_id).first()
        if not item:
            return None, None
        media = db.query(MediaItem).filter(MediaItem.id == item.media_id).first()
        return {
            "id": item.id,
            "media_id": item.media_id,
            "title": item.title,
            "summary": item.summary,
            "user_understanding": item.user_understanding,
        }, media.title if media else None

    if post_type == FeedPostType.vocab.value:
        item = db.query(VocabItem).filter(VocabItem.id == content_id).first()
        if not item:
            return None, None
        media = db.query(MediaItem).filter(MediaItem.id == item.media_id).first()
        return {
            "id": item.id,
            "media_id": item.media_id,
            "word": item.word,
            "definition": item.definition,
            "example_sentence": item.example_sentence,
        }, media.title if media else None

    item = db.query(QuoteItem).filter(QuoteItem.id == content_id).first()
    if not item:
        return None, None
    media = db.query(MediaItem).filter(MediaItem.id == item.media_id).first()
    return {
        "id": item.id,
        "media_id": item.media_id,
        "text": item.text,
        "speaker": item.speaker,
        "user_meaning": item.user_meaning,
    }, media.title if media else None


def serialize_feed_post(db: Session, post: FeedPost, current_user_id: str) -> FeedPostResponse:
    likes_count = db.query(FeedPostLike).filter(FeedPostLike.post_id == post.id).count()
    is_liked = (
        db.query(FeedPostLike)
        .filter(FeedPostLike.post_id == post.id, FeedPostLike.user_id == current_user_id)
        .first()
        is not None
    )
    is_saved = (
        db.query(FeedPostSave)
        .filter(FeedPostSave.post_id == post.id, FeedPostSave.user_id == current_user_id)
        .first()
        is not None
    )
    comments_count = db.query(FeedPostComment).filter(FeedPostComment.post_id == post.id).count()

    author = db.query(User).filter(User.id == post.user_id).first()
    content, media_title = _load_content(db, post.post_type, post.content_id)

    return FeedPostResponse(
        id=post.id,
        user_id=post.user_id,
        post_type=post.post_type,
        content_id=post.content_id,
        caption=post.caption,
        visibility=post.visibility,
        created_at=post.created_at,
        updated_at=post.updated_at,
        author_name=author.display_name if author else "Unknown",
        author_avatar=author.avatar_url if author else None,
        likes_count=likes_count,
        is_liked=is_liked,
        is_saved=is_saved,
        comments_count=comments_count,
        content=content,
        media_title=media_title,
    )


def serialize_feed_comment(db: Session, comment: FeedPostComment) -> FeedCommentResponse:
    author = db.query(User).filter(User.id == comment.user_id).first()
    return FeedCommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        body=comment.body,
        created_at=comment.created_at,
        author_name=author.display_name if author else "Unknown",
        author_avatar=author.avatar_url if author else None,
    )


def count_upvotes_received(db: Session, user_id: str) -> int:
    post_ids = [row.id for row in db.query(FeedPost.id).filter(FeedPost.user_id == user_id).all()]
    if not post_ids:
        return 0
    return db.query(FeedPostLike).filter(FeedPostLike.post_id.in_(post_ids)).count()
