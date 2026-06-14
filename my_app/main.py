from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import Session
from models import Users, Word
from auth import get_password_hash
from database import SessionLocal
from database import Base, engine
from schemas import SignUpSchema, SignInSchema, TokenSchema, WordCreate, WordResponse
from auth import get_password_hash, verify_password, create_access_token, verify_token
from fastapi.security import OAuth2PasswordBearer

Base.metadata.create_all(bind=engine)

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    email = verify_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Невалидный токен")
    user = db.query(Users).filter(Users.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    return user

@app.post("/register")
def register_user(payload: SignUpSchema, db: Session = Depends(get_db)):
    existing_user = db.query(Users).filter(Users.username == payload.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Пользователь уже существует")
    hashed_password = get_password_hash(payload.password)
    new_user = Users(username=payload.username, email=payload.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"msg": "Пользователь успешно зарегистрирован"}

#Эндпоинты для регистрации/авторизации
@app.post("/login", response_model=TokenSchema)
def login(payload: SignInSchema, db: Session = Depends(get_db)):
    user = db.query(Users).filter(Users.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    token = create_access_token({"sub": user.email})
    return TokenSchema(access_token=token)

@app.get("/me")
def get_me(current_user: Users = Depends(get_current_user)):
    return {"username": current_user.username, "email": current_user.email}

#Эндпоинты для слов
@app.get("/words", response_model=list[WordResponse])
def get_words(current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Word).filter(Word.user_id == current_user.id).all()

@app.post("/words", response_model=WordResponse)
def create_word(payload: WordCreate, current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    word = Word(russian=payload.russian, english=payload.english, user_id=current_user.id)
    db.add(word)
    db.commit()
    db.refresh(word)
    return word

@app.patch("/words/{word_id}", response_model=WordResponse)
def update_word(word_id: str, payload: WordCreate, current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    word = db.query(Word).filter(Word.id == word_id, Word.user_id == current_user.id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Слово не найдено")
    word.russian = payload.russian
    word.english = payload.english
    db.commit()
    db.refresh(word)
    return word

@app.delete("/words/{word_id}")
def delete_word(word_id: str, current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    word = db.query(Word).filter(Word.id == word_id, Word.user_id == current_user.id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Слово не найдено")
    db.delete(word)
    db.commit()
    return {"detail": "Слово удалено"}