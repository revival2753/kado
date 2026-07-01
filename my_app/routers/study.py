from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from models import Review, Word, Users
from schemas import ReviewSchema
from database import SessionLocal
from routers.auth import get_current_user


router = APIRouter(
    prefix="/study",
    tags=["study"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/interval-review")
def review_word(
    data: ReviewSchema,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):

    # Проверяем, что слово существует и принадлежит текущему пользователю
    word = db.query(Word).filter(
        Word.id == data.word_id,
        Word.user_id == current_user.id
    ).first()

    if not word:
        raise HTTPException(status_code=404, detail="Слово не найдено")

    review = db.query(Review).filter(
        Review.word_id == data.word_id,
        Review.user_id == current_user.id
    ).first()

    if not review:
        review = Review(
            user_id=current_user.id,
            word_id=data.word_id,
            interval=1,
            ease_factor=250
        )
        db.add(review)

    # --- SRS логика (упрощённый SM-2) ---

    if data.quality < 3:
        # Плохой ответ — сбрасываем интервал, немного понижаем ease_factor
        review.interval = 1
        review.ease_factor = max(130, review.ease_factor - 20)
    else:
        # Хороший ответ — увеличиваем интервал с учётом ease_factor
        if review.interval == 1:
            review.interval = 6
        else:
            review.interval = round(review.interval * (review.ease_factor / 100))

        # Корректировка ease_factor по формуле, близкой к SM-2
        review.ease_factor = max(
            130,
            review.ease_factor + (5 - (5 - data.quality) * 8)
        )

    review.last_review = datetime.utcnow()
    review.next_review = review.last_review + timedelta(days=review.interval)

    db.commit()
    db.refresh(review)

    return {
        "word_id": review.word_id,
        "interval": review.interval,
        "ease_factor": review.ease_factor,
        "next_review": review.next_review
    }