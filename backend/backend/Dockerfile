# Використовуємо офіційний легкий образ Python
FROM python:3.12-slim

# Встановлюємо системні залежності для PostgreSQL
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Створюємо робочу директорію
WORKDIR /app

# Копіюємо requirements та встановлюємо залежності
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копіюємо весь код проекту
COPY . .

# Збираємо статику Django (адмінка)
RUN python manage.py collectstatic --noinput

# Відкриваємо порт
EXPOSE 8000

# Запускаємо Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "backend.wsgi:application"]