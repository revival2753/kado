from sqlalchemy.orm  import Mapped
from sqlalchemy import String, DateTime, Boolean, Column
from database import Base
 

class Users(Base):
    __tablename__ = "users"

    id = Mapped(String, primary_key=True, index=True)
    username = Mapped(String, unique=True, index=True)
    email = Mapped(String, unique=True, index=True)
    hashed_password = Mapped(String)  