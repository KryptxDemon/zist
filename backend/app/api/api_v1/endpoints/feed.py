from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.feed import FeedPost, FeedPostLike, FeedPostSave
from app.models.quote import QuoteItem
from app.models.theme import ThemeConcept
from app.models.user import User, UserFollow
from app.models.vocab import VocabItem
from app.schemas.feed import FeedListResponse, FeedPostCreate, FeedPostResponse, FeedToggleResponse
from app.utils.enums import FeedFilterVisibility, FeedPostType
from app.utils.pagination import paginate

router = APIRouter()


def _serialize_post(db: Session, post: FeedPost, current_user_id: str) -> FeedPostResponse:
    likes_count = db.query(FeedPostLike).filter(FeedPostLike.post_id == post.id).count()
    is_liked = db.query(FeedPostLike).filter(FeedPostLike.post_id == post.id, FeedPostLike.user_id == current_user_id).first() is not None
    is_saved = db.query(FeedPostSave).filter(FeedPostSave.post_id == post.id, FeedPostSave.user_id == current_user_id).first() is not None

    author = db.query(User).filter(User.id == post.user_id).first()

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
    )


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
        query = query.filter(FeedPost.user_id.in_(following_ids), FeedPost.visibility.in_(["friends", "global"]))
    else:
        friends_part = and_(FeedPost.user_id.in_(following_ids), FeedPost.visibility == "friends")
        query = query.filter(or_(FeedPost.visibility == "global", friends_part))

    query = query.order_by(FeedPost.created_at.desc())
    paged = paginate(query, page=page, limit=limit)

    return FeedListResponse(
        items=[_serialize_post(db, p, current_user.id) for p in paged["items"]],
        total=paged["total"],
        page=paged["page"],
        limit=paged["limit"],
    )


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
    return _serialize_post(db, post, current_user.id)


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
