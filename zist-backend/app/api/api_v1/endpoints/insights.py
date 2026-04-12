from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.services.analytics import get_dashboard_stats, get_profile_summary

router = APIRouter()


@router.get("/insights/dashboard")
def dashboard_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_dashboard_stats(db, current_user.id)


@router.get("/insights/profile-summary")
def profile_summary_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_profile_summary(db, current_user.id)
