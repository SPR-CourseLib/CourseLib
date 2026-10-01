import os

os.environ.setdefault("SECRET_KEY", "courselib-local-development-key")

from .settings import *

DEBUG = True

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "dev.sqlite3",
    }
}