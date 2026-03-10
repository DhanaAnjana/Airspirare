"""
routes/auth.py
--------------
Blueprint for authentication.

POST /api/auth/login    — validates credentials, returns a signed JWT.
POST /api/auth/register — creates a new user (handy during development).

Neither endpoint requires a JWT because the user isn't logged in yet.
"""

from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt

from config import Config
from models import db, User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "")
    role = data.get("role", "citizen")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    if role not in ("admin", "citizen"):
        return jsonify({"error": "Role must be 'admin' or 'citizen'"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409

    user = User(
        username=username,
        password_hash=generate_password_hash(password),
        role=role,
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User created", "id": user.id}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "")

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401

    # Build a JWT with 24-hour expiry containing the user's identity.
    payload = {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    token = jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")

    return jsonify({"token": token, "role": user.role}), 200
