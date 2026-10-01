from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
import models
from database import engine
from routers import books

# Створюємо папки для збереження файлів, якщо їх ще немає
os.makedirs("storage/books", exist_ok=True)
os.makedirs("storage/covers", exist_ok=True)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Library API")

# Робимо папку storage публічною
# Тепер файл storage/books/1.pdf буде доступний за адресою http://IP:8000/storage/books/1.pdf
app.mount("/storage", StaticFiles(directory="storage"), name="storage")

app.include_router(books.router)

@app.get("/")
def read_root():
    return {"message": "Вітаємо в API вашої бібліотеки!"}