import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    # Database configuration
    MONGO_URI = os.getenv("MONGO_URI")
    
    # gRPC Server configuration
    GRPC_HOST = os.getenv("GRPC_HOST", "0.0.0.0")
    GRPC_PORT = int(os.getenv("GRPC_PORT", "50051"))
    
    # API Keys
    NEWS_API_KEY = os.getenv("NEWS_API_KEY")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    
    # Debug mode
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"