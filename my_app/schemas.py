from pydantic import BaseModel, EmailStr, Field

#Схема: Регистрация/Авторизация
class SignUpSchema(BaseModel):
    username: str = Field(min_length=3, max_length=20)
    email: EmailStr
    password: str = Field(min_length=8)

class SignInSchema(BaseModel):
    username: str
    password: str

class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"

#Схема: Добавление и взаимодействие с словами
class WordCreate(BaseModel):
    russian: str = Field(min_length=1)
    english: str = Field(min_length=1)

class WordResponse(BaseModel):
    id: str
    russian: str
    english: str

    class Config:
        from_attributes = True

class ReviewSchema(BaseModel):
    word_id: str
    quality: int = Field(ge=0, le=5, description="0 — совсем не помню, 5 — помню отлично")