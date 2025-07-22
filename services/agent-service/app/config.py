from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # OpenAI Configuration
    openai_api_key: str = Field(..., env="OPENAI_API_KEY")
    
    # Qdrant Configuration
    qdrant_url: str = Field(..., env="QDRANT_URL")
    qdrant_api_key: str = Field(..., env="QDRANT_API_KEY")
    qdrant_collection_name: str = Field(default="davel_documents", env="QDRANT_COLLECTION_NAME")
    
    # GitHub Configuration
    github_username: str = Field(default="daveloper", env="GITHUB_USERNAME")
    github_token: Optional[str] = Field(default=None, env="GITHUB_TOKEN")
    
    # LangChain Configuration
    langchain_tracing_v2: bool = Field(default=True, env="LANGCHAIN_TRACING_V2")
    langchain_endpoint: str = Field(default="https://api.smith.langchain.com", env="LANGCHAIN_ENDPOINT")
    langchain_api_key: Optional[str] = Field(default=None, env="LANGCHAIN_API_KEY")
    langchain_project: str = Field(default="davel-agent", env="LANGCHAIN_PROJECT")
    
    # gRPC Configuration
    grpc_port: int = Field(default=50051, env="GRPC_PORT")
    grpc_max_workers: int = Field(default=10, env="GRPC_MAX_WORKERS")
    grpc_enable_reflection: bool = Field(default=True, env="GRPC_ENABLE_REFLECTION")
    
    # App Configuration
    environment: str = Field(default="development", env="ENVIRONMENT")
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    max_tokens: int = Field(default=4096, env="MAX_TOKENS")
    chunk_size: int = Field(default=1000, env="CHUNK_SIZE")
    chunk_overlap: int = Field(default=200, env="CHUNK_OVERLAP")
    retrieval_k: int = Field(default=5, env="RETRIEVAL_K")
    
    # Optional REST API
    rest_api_enabled: bool = Field(default=False, env="REST_API_ENABLED")
    rest_api_port: int = Field(default=8000, env="REST_API_PORT")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get the application settings."""
    return settings 