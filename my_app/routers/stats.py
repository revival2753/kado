from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import Word, Users
from database import SessionLocal
from routers.auth import get_current_user


router = APIRouter(
    tags=["stats"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/user-stats")
def get_stats(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total_words = db.query(Word).filter(Word.user_id == current_user.id).count()
    mastered_words = db.query(Word).filter(Word.user_id == current_user.id, Word.is_mastered == True).count()
    return {
        "total_words": total_words,
        "mastered_words": mastered_words,
        "streak_count": current_user.streak_count,
        "longest_streak": current_user.longest_streak
    }