from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.feed import FeedPost, FeedPostComment, FeedPostLike, FeedPostSave
from app.models.media import MediaItem
from app.models.quote import QuoteItem
from app.models.theme import ThemeConcept
from app.models.user import User, UserFollow
from app.models.vocab import VocabItem
from app.schemas.feed import (
    FeedCommentCreate,
    FeedCommentListResponse,
    FeedCommentResponse,
    FeedListResponse,
    FeedPostCreate,
    FeedPostResponse,
    FeedToggleResponse,
    ShareableContentItem,
    ShareableContentResponse,
)
from app.services.feed_serializer import serialize_feed_comment, serialize_feed_post
from app.services import notification_service
from app.utils.enums import FeedFilterVisibility, FeedPostType
from app.utils.pagination import paginate

router = APIRouter()


def _validate_content_ownership(db: Session, post_type: FeedPostType, content_id: str, user_id: str) -> bool:
    if post_type == FeedPostType.theme:
        item = db.query(ThemeConcept).join(ThemeConcept.media).filter(ThemeConcept.id == content_id).first()
        return bool(item and item.media.user_id == user_id)
    if post_type == FeedPostType.vocab:
        item = db.query(VocabItem).join(VocabItem.media).filter(VocabItem.id == content_id).first()
        return bool(item and item.media.user_id == user_id)
    item = db.query(QuoteItem).join(QuoteItem.media).filter(QuoteItem.id == content_id).first()
    return bool(item and item.media.user_id == user_id)


@router.get("/feed", response_model=FeedListResponse)
def get_feed(
    visibility: FeedFilterVisibility = FeedFilterVisibility.all,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    following_ids = [
        row.following_id
        for row in db.query(UserFollow).filter(UserFollow.follower_id == current_user.id).all()
    ]

    query = db.query(FeedPost)
    if visibility == FeedFilterVisibility.global_:
        query = query.filter(FeedPost.visibility == "global")
    elif visibility == FeedFilterVisibility.friends:
        if not following_ids:
            return FeedListResponse(items=[], total=0, page=page, limit=limit)
        query = query.filter(
            FeedPost.user_id.in_(following_ids),
            FeedPost.visibility.in_(["friends", "global"]),
        )
    else:
        friends_part = and_(FeedPost.user_id.in_(following_ids), FeedPost.visibility == "friends")
        query = query.filter(or_(FeedPost.visibility == "global", friends_part))

    query = query.order_by(FeedPost.created_at.desc())
    paged = paginate(query, page=page, limit=limit)

    return FeedListResponse(
        items=[serialize_feed_post(db, p, current_user.id) for p in paged["items"]],
        total=paged["total"],
        page=paged["page"],
        limit=paged["limit"],
    )


@router.get("/feed/shareable-content", response_model=ShareableContentResponse)
def get_shareable_content(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    media_items = (
        db.query(MediaItem)
        .filter(MediaItem.user_id == current_user.id)
        .order_by(MediaItem.updated_at.desc())
        .limit(50)
        .all()
    )
    media_by_id = {m.id: m.title for m in media_items}
    media_ids = list(media_by_id.keys())

    themes: list[ShareableContentItem] = []
    vocab: list[ShareableContentItem] = []
    quotes: list[ShareableContentItem] = []

    if media_ids:
        for theme in (
            db.query(ThemeConcept)
            .filter(ThemeConcept.media_id.in_(media_ids))
            .order_by(ThemeConcept.updated_at.desc())
            .limit(100)
            .all()
        ):
            themes.append(
                ShareableContentItem(
                    id=theme.id,
                    media_id=theme.media_id,
                    media_title=media_by_id.get(theme.media_id, "Media"),
                    label=theme.title,
                    post_type=FeedPostType.theme,
                )
            )

        for item in (
            db.query(VocabItem)
            .filter(VocabItem.media_id.in_(media_ids))
            .order_by(VocabItem.created_at.desc())
            .limit(100)
            .all()
        ):
            vocab.append(
                ShareableContentItem(
                    id=item.id,
                    media_id=item.media_id,
                    media_title=media_by_id.get(item.media_id, "Media"),
                    label=item.word,
                    post_type=FeedPostType.vocab,
                )
            )

        for quote in (
            db.query(QuoteItem)
            .filter(QuoteItem.media_id.in_(media_ids))
            .order_by(QuoteItem.created_at.desc())
            .limit(100)
            .all()
        ):
            preview = quote.text[:80] + ("..." if len(quote.text) > 80 else "")
            quotes.append(
                ShareableContentItem(
                    id=quote.id,
                    media_id=quote.media_id,
                    media_title=media_by_id.get(quote.media_id, "Media"),
                    label=preview,
                    post_type=FeedPostType.quote,
                )
            )

    return ShareableContentResponse(themes=themes, vocab=vocab, quotes=quotes)


@router.post("/feed", response_model=FeedPostResponse, status_code=status.HTTP_201_CREATED)
def create_feed_post(
    payload: FeedPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _validate_content_ownership(db, payload.post_type, payload.content_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="content_id does not belong to current user")

    post = FeedPost(
        user_id=current_user.id,
        post_type=payload.post_type.value,
        content_id=payload.content_id,
        caption=payload.caption,
        visibility=payload.visibility.value,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return serialize_feed_post(db, post, current_user.id)


@router.post("/feed/{post_id}/like", response_model=FeedToggleResponse)
def toggle_like(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(FeedPost).filter(FeedPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    row = db.query(FeedPostLike).filter(FeedPostLike.post_id == post_id, FeedPostLike.user_id == current_user.id).first()
    if row:
        db.delete(row)
        active = False
        message = "Like removed"
    else:
        db.add(FeedPostLike(post_id=post_id, user_id=current_user.id))
        active = True
        message = "Post liked"
        # Best-effort notification: never break the like action if it fails.
        notification_service.create_notification(
            db,
            recipient_id=post.user_id,
            actor_id=current_user.id,
            type="post_like",
            message=f"{current_user.display_name} liked your post",
            data={"post_id": post.id},
        )

    db.commit()
    count = db.query(FeedPostLike).filter(FeedPostLike.post_id == post_id).count()
    return FeedToggleResponse(message=message, active=active, count=count)


@router.post("/feed/{post_id}/save", response_model=FeedToggleResponse)
def toggle_save(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(FeedPost).filter(FeedPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    row = db.query(FeedPostSave).filter(FeedPostSave.post_id == post_id, FeedPostSave.user_id == current_user.id).first()
    if row:
        db.delete(row)
        active = False
        message = "Save removed"
    else:
        db.add(FeedPostSave(post_id=post_id, user_id=current_user.id))
        active = True
        message = "Post saved"

    db.commit()
    count = db.query(FeedPostSave).filter(FeedPostSave.post_id == post_id).count()
    return FeedToggleResponse(message=message, active=active, count=count)


@router.get("/feed/{post_id}/comments", response_model=FeedCommentListResponse)
def list_comments(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    post = db.query(FeedPost).filter(FeedPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    rows = (
        db.query(FeedPostComment)
        .filter(FeedPostComment.post_id == post_id)
        .order_by(FeedPostComment.created_at.asc())
        .all()
    )
    return FeedCommentListResponse(
        items=[serialize_feed_comment(db, row) for row in rows],
        total=len(rows),
    )


@router.post("/feed/{post_id}/comments", response_model=FeedCommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    post_id: str,
    payload: FeedCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(FeedPost).filter(FeedPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    comment = FeedPostComment(
        post_id=post_id,
        user_id=current_user.id,
        body=payload.body.strip(),
    )
    db.add(comment)
    db.flush()
    # Best-effort notification: never break the comment action if it fails.
    notification_service.create_notification(
        db,
        recipient_id=post.user_id,
        actor_id=current_user.id,
        type="post_comment",
        message=f"{current_user.display_name} commented on your post",
        data={"post_id": post.id, "comment_id": comment.id},
    )
    db.commit()
    db.refresh(comment)
    return serialize_feed_comment(db, comment)


@router.delete("/feed/comments/{comment_id}")
def delete_comment(
    comment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.query(FeedPostComment).filter(FeedPostComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author can delete this comment")

    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}


@router.delete("/feed/{post_id}")
def delete_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(FeedPost).filter(FeedPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can delete this post")

    db.delete(post)
    db.commit()
    return {"message": "Post deleted"}
