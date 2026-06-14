from pydantic import BaseModel, EmailStr, Field

#Схема: Регистрация/Авторизация
class SignUpSchema(BaseModel):
    username: str = Field(min_length=3, max_length=20)
    email: EmailStr
    password: str = Field(min_length=8)

class SignInSchema(BaseModel):
    email: EmailStr
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