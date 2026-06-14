from sqlalchemy.orm  import Mapped, mapped_column
from sqlalchemy import String, DateTime, Boolean, Column
from database import Base
from uuid import uuid4
 

class Users(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)  

class Word(Base):
    __tablename__ = "words"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    russian: Mapped[str] = mapped_column(String, nullable=False)
    english: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[str] = mapped_column(String, nullable=False)