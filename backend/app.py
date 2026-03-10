"""
app.py
------
Flask application factory.  It does four things and nothing else:

  1. Creates the Flask app and loads Config.
  2. Initialises the SQLite database via SQLAlchemy.
  3. Registers the three route blueprints (auth, sensor, recommend).
  4. Enables CORS so the Vite dev server on port 5173 can call the API.

No route logic lives in this file.
"""

from flask import Flask
from flask_cors import CORS

from config import Config
from models import db


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Allow the React dev server (localhost:5173) to make cross-origin requests.
    CORS(app)

    # Bind SQLAlchemy to this app and create tables if they don't exist yet.
    db.init_app(app)
    with app.app_context():
        db.create_all()

    # ---- Register blueprints (one per concern) ----
    from routes.auth import auth_bp
    from routes.sensor import sensor_bp
    from routes.recommend import recommend_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(sensor_bp)
    app.register_blueprint(recommend_bp)

    return app


# Entry-point for `python app.py` during development.
if __name__ == "__main__":
    application = create_app()
    application.run(debug=True, port=5000)
