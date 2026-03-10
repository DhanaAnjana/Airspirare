"""
config.py
---------
Loads environment variables from the .env file and exposes them as class
attributes.  No logic lives here — this is purely a config container that
the app factory reads at startup.
"""

import os
from dotenv import load_dotenv

load_dotenv()  # reads .env in the same directory (backend/.env)


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "fallback-dev-secret")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///airspirare.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
