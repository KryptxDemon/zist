from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.media import MediaItem
from app.models.user import User, UserFollow
from app.schemas.common import PaginatedResponse
from app.schemas.user import UserPublic, UserUpdate
from app.utils.pagination import paginate

router = APIRouter()


def _to_public_user(db: Session, user: User, current_user_id: str | None = None) -> UserPublic:
    followers_count = db.query(UserFollow).filter(UserFollow.following_id == user.id).count()
    following_count = db.query(UserFollow).filter(UserFollow.follower_id == user.id).count()
    media_count = db.query(MediaItem).filter(MediaItem.user_id == user.id).count()

    return UserPublic(
        id=user.id,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        is_active=user.is_active,
        created_at=user.created_at,
        followers_count=followers_count,
        following_count=following_count,
        media_count=media_count,
    )


# @router.get("/users", response_model=UserListResponse)
# def list_users(
#     search: str | None = None,
#     page: int = 1,
#     limit: int = 20,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     query = db.query(User).filter(User.is_active.is_(True))
#     if search:
#         pattern = f"%{search.lower()}%"
#         query = query.filter(or_(User.display_name.ilike(pattern), User.email.ilike(pattern)))

#     query = query.order_by(User.display_name.asc())
#     paged = paginate(query, page=page, limit=limit)
#     return UserListResponse(
#         items=[_to_public_user(db, u, current_user.id) for u in paged["items"]],
#         total=paged["total"],
#         page=paged["page"],
#         limit=paged["limit"],
#     )


@router.get("/users/{user_id}")
def get_user_profile(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    followers_count = db.query(UserFollow).filter(UserFollow.following_id == user.id).count()
    following_count = db.query(UserFollow).filter(UserFollow.follower_id == user.id).count()
    media_count = db.query(MediaItem).filter(MediaItem.user_id == user.id).count()
    is_following = (
        db.query(UserFollow)
        .filter(UserFollow.follower_id == current_user.id, UserFollow.following_id == user.id)
        .first()
        is not None
    )

    return {
        "id": user.id,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "followers_count": followers_count,
        "following_count": following_count,
        "media_count": media_count,
        "is_following": is_following,
    }


@router.patch("/users/{user_id}")
def update_user_profile(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update your own profile")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, key, value)

    db.commit()
    db.refresh(current_user)
    return {"message": "Profile updated", "user": _to_public_user(db, current_user, current_user.id).model_dump()}


# @router.post("/users/{user_id}/follow", response_model=FollowResponse)
# def follow_user(
#     user_id: str,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     if user_id == current_user.id:
#         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot follow yourself")

#     target = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
#     if not target:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

#     existing = (
#         db.query(UserFollow)
#         .filter(UserFollow.follower_id == current_user.id, UserFollow.following_id == user_id)
#         .first()
#     )
#     if existing:
#         raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already following this user")

#     row = UserFollow(follower_id=current_user.id, following_id=user_id)
#     db.add(row)
#     db.commit()
#     return FollowResponse(message="Now following user", follower_id=current_user.id, following_id=user_id)


# @router.delete("/users/{user_id}/unfollow")
# def unfollow_user(
#     user_id: str,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     row = (
#         db.query(UserFollow)
#         .filter(UserFollow.follower_id == current_user.id, UserFollow.following_id == user_id)
#         .first()
#     )
#     if not row:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow relationship not found")

#     db.delete(row)
#     db.commit()
#     return {"message": "Unfollowed user"}


# @router.get("/users/{user_id}/posts")
# def get_user_posts(
#     user_id: str,
#     page: int = 1,
#     limit: int = 20,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     target = db.query(User).filter(User.id == user_id).first()
#     if not target:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

#     is_following = (
#         db.query(UserFollow)
#         .filter(UserFollow.follower_id == current_user.id, UserFollow.following_id == user_id)
#         .first()
#         is not None
#     )

#     query = db.query(FeedPost).filter(FeedPost.user_id == user_id)
#     if is_following or user_id == current_user.id:
#         query = query.filter(FeedPost.visibility.in_(["friends", "global"]))
#     else:
#         query = query.filter(FeedPost.visibility == "global")

#     query = query.order_by(FeedPost.created_at.desc())
#     paged = paginate(query, page=page, limit=limit)
#     return {
#         "items": [
#             {
#                 "id": p.id,
#                 "user_id": p.user_id,
#                 "post_type": p.post_type,
#                 "content_id": p.content_id,
#                 "caption": p.caption,
#                 "visibility": p.visibility,
#                 "created_at": p.created_at,
#                 "updated_at": p.updated_at,
#             }
#             for p in paged["items"]
#         ],
#         "total": paged["total"],
#         "page": paged["page"],
#         "limit": paged["limit"],
#     }


# @router.get("/users/{user_id}/followers")
# def get_followers(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
#     _ = current_user
#     rows = db.query(UserFollow).filter(UserFollow.following_id == user_id).all()
#     users = db.query(User).filter(User.id.in_([r.follower_id for r in rows])).all() if rows else []
#     return {"items": [{"id": u.id, "display_name": u.display_name, "avatar_url": u.avatar_url} for u in users], "total": len(users)}


# @router.get("/users/{user_id}/following")
# def get_following(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
#     _ = current_user
#     rows = db.query(UserFollow).filter(UserFollow.follower_id == user_id).all()
#     users = db.query(User).filter(User.id.in_([r.following_id for r in rows])).all() if rows else []
#     return {"items": [{"id": u.id, "display_name": u.display_name, "avatar_url": u.avatar_url} for u in users], "total": len(users)}
