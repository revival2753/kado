from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date, timedelta

from models import Users
from database import SessionLocal
from routers.auth import get_current_user


router = APIRouter(
    tags=["streak"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def update_streak(user: Users, db: Session):
    today = date.today()
    if user.last_study_date == today:
        return
    if user.last_study_date == today - timedelta(days=1):
        user.streak_count += 1
    else:
        user.streak_count = 1
    user.last_study_date = today
    if user.streak_count > user.longest_streak:
        user.longest_streak = user.streak_count
    db.commit()


@router.post("/study-session")
def study_session(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_streak(current_user, db)
    return {"streak_count": current_user.streak_count, "longest_streak": current_user.longest_streak}