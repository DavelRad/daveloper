from pymongo import MongoClient
from app.config import Config

# Create MongoDB client
client = MongoClient(Config.MONGO_URI)
db = client.get_default_database()

# For compatibility with existing code
class MongoWrapper:
    def __init__(self):
        self.db = db
    
    def init_app(self, config):
        # No-op for compatibility
        pass

mongo = MongoWrapper()