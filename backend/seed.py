"""
seed.py
-------
Run once to bootstrap the database:

  1. Creates all tables.
  2. Inserts two test users — one admin, one citizen.
  3. Generates one mock sensor reading per Delhi ward (10 wards) using
     random payloads fed through run_inference so AQI and source scores
     are consistent with the mock model logic.
"""

import json
import random
from werkzeug.security import generate_password_hash

from app import create_app
from models import db, User, WardReading
from mock_model import run_inference

# The 10 Delhi wards used in the system.
DELHI_WARDS = [
    "Connaught Place",
    "Karol Bagh",
    "Lajpat Nagar",
    "Dwarka",
    "Rohini",
    "Janakpuri",
    "Saket",
    "Pitampura",
    "Shahdara",
    "Vasant Kunj",
]


def _random_sensor_payload() -> dict:
    """
    MOCK — generates a random sensor dict matching the IoT payload schema.
    In production this comes from real hardware over MQTT / HTTP.
    """
    return {
        "pm1_0": round(random.uniform(5, 80), 1),
        "pm2_5": round(random.uniform(10, 250), 1),
        "pm10": round(random.uniform(20, 350), 1),
        "temperature_c": round(random.uniform(15, 45), 1),
        "humidity": round(random.uniform(20, 90), 1),
        "pressure": round(random.uniform(990, 1020), 1),
        "gas_resistance": round(random.uniform(10000, 60000), 0),
        "co_ppm": round(random.uniform(0.5, 15), 1),
        "mq135_air_quality": round(random.uniform(50, 400), 0),
        "latitude": round(random.uniform(28.5, 28.8), 4),
        "longitude": round(random.uniform(76.9, 77.4), 4),
    }


def seed():
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        # ---- Users ----
        admin = User(
            username="admin",
            password_hash=generate_password_hash("admin123"),
            role="admin",
        )
        citizen = User(
            username="citizen",
            password_hash=generate_password_hash("citizen123"),
            role="citizen",
        )
        db.session.add_all([admin, citizen])

        # ---- Ward readings ----
        for ward in DELHI_WARDS:
            payload = _random_sensor_payload()
            aqi, sources = run_inference(payload)
            reading = WardReading(
                ward_name=ward,
                aqi=aqi,
                source_scores=json.dumps(sources),
            )
            db.session.add(reading)

        db.session.commit()
        print(f"Seeded {len(DELHI_WARDS)} ward readings and 2 users.")


if __name__ == "__main__":
    seed()
