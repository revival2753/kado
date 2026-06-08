from sqlalchemy.orm  import Mapped, mapped_column
from sqlalchemy import String
from database import Base

class Users(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    username: Mapped[str] = mapped_column(String, primary_key=True)
    password: Mapped[str] = mapped_column(String, primary_key=True)