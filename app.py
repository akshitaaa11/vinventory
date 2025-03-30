import os
import logging

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from sqlalchemy.orm import DeclarativeBase


# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)
login_manager = LoginManager()

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev_key_for_development")

# Configure the database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost:5432/labinventory")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize the extensions
db.init_app(app)
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message_category = 'info'

# Create database tables
with app.app_context():
    # Import models here to prevent circular imports
    from models import User, Laboratory, Equipment
    db.create_all()
    
    # Check if we need to create default labs
    labs = Laboratory.query.all()
    if not labs:
        logger.info("Creating default laboratories")
        default_labs = [
            "Computer Science Lab",
            "Electronics Lab",
            "Physics Lab",
            "Chemistry Lab",
            "Mechanical Engineering Lab",
            "Biotechnology Lab"
        ]
        for lab_name in default_labs:
            lab = Laboratory(name=lab_name)
            db.session.add(lab)
        db.session.commit()

# Import routes after creating the app to avoid circular imports
from routes import *
