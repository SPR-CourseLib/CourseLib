from pydantic import BaseModel
from typing import Optional
from datetime import datetime # Додали імпорт

class BookBase(BaseModel):
    title: str
    author: str
    tags: Optional[str] = None
    file_path: str
    cover_path: Optional[str] = None

class BookCreate(BookBase):
    pass

class Book(BookBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class BookUpdate(BaseModel):
    title: str
    author: str
    tags: Optional[str] = None