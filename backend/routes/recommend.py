"""
routes/recommend.py
-------------------
Blueprint for fetching Gemini-generated recommendations.

GET /api/recommend?ward=<name> — looks up the latest reading for the
    specified ward, extracts the top 5 pollutant sources, and calls
    Gemini with the user's role (read from the JWT) to produce either
    an admin policy brief or a citizen health advisory.

Requires a valid JWT.
"""

import json
from flask import Blueprint, request, jsonify

from models import WardReading
from gemini_service import get_recommendation
from auth_utils import token_required

recommend_bp = Blueprint("recommend", __name__, url_prefix="/api")


@recommend_bp.route("/recommend", methods=["GET"])
@token_required
def recommend(current_user):
    ward = request.args.get("ward", "").strip()
    if not ward:
        return jsonify({"error": "ward query parameter is required"}), 400

    # Fetch the most recent reading for this ward.
    reading = (
        WardReading.query
        .filter_by(ward_name=ward)
        .order_by(WardReading.timestamp.desc())
        .first()
    )

    if not reading:
        return jsonify({"error": f"No readings found for ward '{ward}'"}), 404

    sources = json.loads(reading.source_scores)

    # Sort sources by confidence descending and take the top 5.
    top5 = sorted(sources.items(), key=lambda x: x[1], reverse=True)[:5]

    role = current_user["role"]
    recommendation = get_recommendation(ward, reading.aqi, top5, role)

    return jsonify({
        "ward": ward,
        "aqi": reading.aqi,
        "top_sources": [{"source": s, "confidence": c} for s, c in top5],
        "recommendation": recommendation,
    }), 200
