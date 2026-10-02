from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
import uuid
import fitz

import models
import schemas
from database import get_db

router = APIRouter(prefix="/books", tags=["Books"])


@router.get("/", response_model=List[schemas.Book])
def get_books(db: Session = Depends(get_db)):
    return db.query(models.Book).all()


@router.post("/", response_model=schemas.Book)
async def create_book(
        title: str = Form(...),
        author: str = Form(...),
        tags: str = Form(None),
        file: UploadFile = File(...),
        cover: UploadFile = File(None),
        db: Session = Depends(get_db)
):
    allowed_extensions = [".pdf", ".doc", ".docx"]
    file_ext = os.path.splitext(file.filename)[1].lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Формат файлу не підтримується.")

    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = f"storage/books/{unique_filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    cover_path = None

    # АВТОМАТИЧНА ГЕНЕРАЦІЯ МІНІАТЮРИ ДЛЯ PDF
    if file_ext == ".pdf":
        try:
            # Відкриваємо PDF
            pdf_document = fitz.open(file_path)
            # Беремо першу сторінку (індекс 0)
            page = pdf_document.load_page(0)
            # Рендеримо сторінку в картинку (масштаб 0.5 для легкості)
            pix = page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5))

            cover_name = f"{uuid.uuid4()}.png"
            cover_path = f"storage/covers/{cover_name}"
            pix.save(cover_path)
            pdf_document.close()
        except Exception as e:
            print(f"Помилка створення обкладинки: {e}")
            pass  # Якщо не вийшло, cover_path залишиться None

    db_book = models.Book(
        title=title, author=author, tags=tags, file_path=file_path, cover_path=cover_path
    )
    db.add(db_book)
    db.commit()
    db.refresh(db_book)

    return db_book


@router.put("/{book_id}", response_model=schemas.Book)
def update_book(book_id: int, book_data: schemas.BookUpdate, db: Session = Depends(get_db)):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Документ не знайдено")

    book.title = book_data.title
    book.author = book_data.author
    book.tags = book_data.tags  # ОНОВЛЮЄМО ТЕГИ

    db.commit()
    db.refresh(book)
    return book


@router.delete("/{book_id}")
def delete_book(book_id: int, db: Session = Depends(get_db)):
    # Шукаємо книгу в базі
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Документ не знайдено")

    # Видаляємо фізичний файл з жорсткого диска
    if book.file_path and os.path.exists(book.file_path):
        os.remove(book.file_path)

    # Якщо була обкладинка, видаляємо і її
    if book.cover_path and os.path.exists(book.cover_path):
        os.remove(book.cover_path)

    # Видаляємо запис з бази даних
    db.delete(book)
    db.commit()

    return {"message": "Файл успішно видалено"}