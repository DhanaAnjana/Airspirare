"""
routes/sensor.py
----------------
Blueprint for sensor data ingestion and retrieval.

POST /api/sensor/ingest — accepts an IoT sensor payload, runs it through
                          the mock model, persists the result, and returns
                          the AQI + all 15 source scores.
GET  /api/sensor/wards  — returns the latest reading for every ward.

Both endpoints require a valid JWT.
"""

import json
from flask import Blueprint, request, jsonify
from sqlalchemy import func

from models import db, WardReading
from mock_model import run_inference
from auth_utils import token_required

sensor_bp = Blueprint("sensor", __name__, url_prefix="/api/sensor")


@sensor_bp.route("/ingest", methods=["POST"])
@token_required
def ingest(current_user):
    data = request.get_json()
    ward_name = data.get("ward_name", "Unknown")

    # Run the mock model on the sensor payload.
    aqi, sources = run_inference(data)

    reading = WardReading(
        ward_name=ward_name,
        aqi=aqi,
        source_scores=json.dumps(sources),
    )
    db.session.add(reading)
    db.session.commit()

    return jsonify({"ward": ward_name, "aqi": aqi, "sources": sources}), 201


@sensor_bp.route("/wards", methods=["GET"])
@token_required
def wards(current_user):
    """Return the latest reading for every ward."""

    # Subquery: max timestamp per ward.
    latest = (
        db.session.query(
            WardReading.ward_name,
            func.max(WardReading.timestamp).label("max_ts"),
        )
        .group_by(WardReading.ward_name)
        .subquery()
    )

    # Join back to get the full row for each ward's latest reading.
    readings = (
        db.session.query(WardReading)
        .join(
            latest,
            (WardReading.ward_name == latest.c.ward_name)
            & (WardReading.timestamp == latest.c.max_ts),
        )
        .all()
    )

    result = [
        {
            "id": r.id,
            "ward_name": r.ward_name,
            "aqi": r.aqi,
            "sources": json.loads(r.source_scores),
            "timestamp": r.timestamp.isoformat(),
        }
        for r in readings
    ]

    return jsonify(result), 200
