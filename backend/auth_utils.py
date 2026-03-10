"""
auth_utils.py
-------------
Shared JWT helper used by all route files.  Provides a token_required
decorator that extracts and validates the JWT from the Authorization header,
then injects the decoded payload as `current_user` into the wrapped function.
"""

from functools import wraps
from flask import request, jsonify
import jwt
from config import Config


def token_required(f):
    """Decorator — rejects requests that lack a valid JWT."""

    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get("Authorization", "")

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

        if not token:
            return jsonify({"error": "Token is missing"}), 401

        try:
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        # Pass the decoded user info to the route handler.
        return f(current_user=payload, *args, **kwargs)

    return decorated
