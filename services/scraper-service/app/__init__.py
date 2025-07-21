# Simplified app initialization for gRPC service
from app.database import mongo
from app.config import Config

def init_database():
    """Initialize database connection"""
    mongo.init_app(Config)
    return mongo