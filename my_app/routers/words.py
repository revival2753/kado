from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import Word
from database import SessionLocal
from schemas import WordCreate, WordResponse
from routers.auth import router as auth_router, get_current_user



router = APIRouter(
    prefix="/words",
    tags=["words"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



@router.get("/search-words")
def search_words(
    q: str,
    db: Session = Depends(get_db)
):

    words = db.query(Word).filter(
        (Word.russian.ilike(f"%{q}%")) |
        (Word.english.ilike(f"%{q}%"))
    ).all()

    return words

@router.get("/get-words", response_model=list[WordResponse])
def get_words(current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Word).filter(Word.user_id == current_user.id).all()

@router.post("/create-words", response_model=WordResponse)
def create_word(payload: WordCreate, current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    word = Word(russian=payload.russian, english=payload.english, user_id=current_user.id)
    db.add(word)
    db.commit()
    db.refresh(word)
    return word

@router.patch("/edit-words/{word_id}", response_model=WordResponse)
def update_word(word_id: str, payload: WordCreate, current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    word = db.query(Word).filter(Word.id == word_id, Word.user_id == current_user.id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Слово не найдено")
    word.russian = payload.russian
    word.english = payload.english
    db.commit()
    db.refresh(word)
    return word

@router.delete("/delete-words/{word_id}")
def delete_word(word_id: str, current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    word = db.query(Word).filter(Word.id == word_id, Word.user_id == current_user.id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Слово не найдено")
    db.delete(word)
    db.commit()
    return {"detail": "Слово удалено"}