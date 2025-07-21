#!/usr/bin/env python3
"""
gRPC News Scraper Service
Main entry point for the gRPC server
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.grpc_server import serve
from app.database import mongo
from app.config import Config

def main():
    """Main function to start the gRPC server"""
    try:
        # Initialize database connection
        mongo.init_app(Config)
        print("Database connection initialized")
        
        # Start gRPC server
        serve()
        
    except Exception as e:
        print(f"Error starting server: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 