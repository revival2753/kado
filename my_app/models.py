import uuid
from sqlalchemy.orm  import Mapped, mapped_column
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from database import Base
from uuid import uuid4
from datetime import date, datetime

 

class Users(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    streak_count: Mapped[int] = mapped_column(default=0)
    last_study_date: Mapped[date | None] = mapped_column(nullable=True)
    longest_streak: Mapped[int] = mapped_column(default=0)  

class Word(Base):
    __tablename__ = "words"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    russian: Mapped[str] = mapped_column(String, nullable=False)
    english: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    is_mastered: Mapped[bool] = mapped_column(default=False)

class Review(Base):
    __tablename__ = "reviews"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    user_id = Column(
        String,
        ForeignKey("users.id"),
        nullable=False
    )

    word_id = Column(
        String,
        ForeignKey("words.id"),
        nullable=False
    )

    interval = Column(
        Integer,
        default=1,
        nullable=False
    )

    ease_factor = Column(
        Integer,
        default=250,
        nullable=False
    )

    next_review = Column(
        DateTime,
        default=datetime.utcnow
    )

    last_review = Column(
        DateTime,
        default=datetime.utcnow
    )