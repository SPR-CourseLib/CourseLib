from sqlalchemy import Column, Integer, String, DateTime # Додали DateTime
from database import Base
import datetime # Імпортуємо datetime

class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    author = Column(String, index=True)
    tags = Column(String, nullable=True)
    file_path = Column(String)
    cover_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow) # НОВЕ ПОЛЕ: час додавання