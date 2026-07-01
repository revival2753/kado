from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from models import Users
from schemas import SignUpSchema, SignInSchema, TokenSchema
from auth import get_password_hash, verify_password, create_access_token, verify_token
from database import SessionLocal
from fastapi.security import OAuth2PasswordRequestForm

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Невалидный токен")
    user = db.query(Users).filter(Users.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    return user

@router.post("/register")
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

@router.post("/login", response_model=TokenSchema)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(Users).filter(
        Users.username == form_data.username
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Неверный логин или пароль"
        )

    if not verify_password(
        form_data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Неверный логин или пароль"
        )

    token = create_access_token({
        "sub": user.username
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }

@router.get("/me")
def get_me(current_user: Users = Depends(get_current_user)):
    return {"username": current_user.username, "email": current_user.email}