"""
models.py
---------
Defines the two database tables the system needs:

  • User          — stores credentials and role ("admin" or "citizen").
  • WardReading   — stores one AQI snapshot per ward, including the 15
                    pollutant-source confidence scores serialised as JSON.

The db instance is created here so that both the app factory and the seed
script can import it from one place.
"""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    # Role must be either "admin" or "citizen".
    role = db.Column(db.String(10), nullable=False, default="citizen")


class WardReading(db.Model):
    __tablename__ = "ward_readings"

    id = db.Column(db.Integer, primary_key=True)
    ward_name = db.Column(db.String(100), nullable=False, index=True)
    aqi = db.Column(db.Integer, nullable=False)
    # JSON string mapping each of the 15 pollutant sources to its
    # confidence percentage.  Stored as TEXT because SQLite has no
    # native JSON column; we serialise/deserialise with json.loads/dumps.
    source_scores = db.Column(db.Text, nullable=False)
    timestamp = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
