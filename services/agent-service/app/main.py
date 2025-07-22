"""Main entry point for the Davel Agent Service."""

import asyncio
import logging
import signal
import sys
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI

from grpc_server import GrpcServer
from config import get_settings
from core.utils import setup_logging


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager."""
    logger.info("Starting Agent Service...")
    yield
    logger.info("Shutting down Agent Service...")


# Optional FastAPI app for health checks and debugging
app = FastAPI(
    title="Davel Agent Service",
    description="LangChain + gRPC Agent Service",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Davel Agent Service", 
        "version": "1.0.0",
        "status": "running",
        "grpc_port": get_settings().grpc_port
    }


@app.get("/health")
async def health_check():
    """HTTP health check endpoint."""
    settings = get_settings()
    return {
        "healthy": True,
        "version": "1.0.0",
        "grpc_port": settings.grpc_port,
        "environment": settings.environment
    }


class ServiceManager:
    """Manages both gRPC and optional FastAPI servers."""
    
    def __init__(self):
        self.settings = get_settings()
        self.grpc_server = GrpcServer()
        self.fastapi_server = None
        self.shutdown_event = asyncio.Event()
    
    async def start_grpc_server(self):
        """Start the gRPC server."""
        try:
            await self.grpc_server.start()
            logger.info("gRPC server started successfully")
        except Exception as e:
            logger.error(f"Failed to start gRPC server: {e}")
            raise
    
    async def start_fastapi_server(self):
        """Start the optional FastAPI server."""
        if not self.settings.rest_api_enabled:
            logger.info("REST API disabled, skipping FastAPI server")
            return
        
        try:
            config = uvicorn.Config(
                app,
                host="0.0.0.0",
                port=self.settings.rest_api_port,
                log_level=self.settings.log_level.lower()
            )
            self.fastapi_server = uvicorn.Server(config)
            await self.fastapi_server.serve()
        except Exception as e:
            logger.error(f"Failed to start FastAPI server: {e}")
            raise
    
    async def stop_servers(self):
        """Stop all servers."""
        logger.info("Stopping servers...")
        
        # Stop gRPC server
        if self.grpc_server:
            await self.grpc_server.stop()
        
        # Stop FastAPI server
        if self.fastapi_server:
            self.fastapi_server.should_exit = True
        
        self.shutdown_event.set()
        logger.info("All servers stopped")
    
    def setup_signal_handlers(self):
        """Set up signal handlers for graceful shutdown."""
        def signal_handler(signum, frame):
            logger.info(f"Received signal {signum}, initiating shutdown...")
            asyncio.create_task(self.stop_servers())
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    async def run(self):
        """Run the service manager."""
        try:
            # Setup signal handlers
            self.setup_signal_handlers()
            
            # Start servers
            tasks = []
            
            # Always start gRPC server
            tasks.append(asyncio.create_task(self.start_grpc_server()))
            
            # Optionally start FastAPI server
            if self.settings.rest_api_enabled:
                tasks.append(asyncio.create_task(self.start_fastapi_server()))
            
            # Wait for gRPC server to be ready
            await asyncio.sleep(1)
            
            # Wait for shutdown signal
            if not self.settings.rest_api_enabled:
                await self.grpc_server.wait_for_termination()
            else:
                await self.shutdown_event.wait()
            
        except KeyboardInterrupt:
            logger.info("Received keyboard interrupt")
        except Exception as e:
            logger.error(f"Service manager error: {e}")
        finally:
            await self.stop_servers()


async def main():
    """Main entry point."""
    # Setup logging
    settings = get_settings()
    setup_logging(settings.log_level)
    
    logger.info("=" * 50)
    logger.info("🤖 Davel Agent Service Starting")
    logger.info("=" * 50)
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"gRPC Port: {settings.grpc_port}")
    logger.info(f"REST API: {'Enabled' if settings.rest_api_enabled else 'Disabled'}")
    if settings.rest_api_enabled:
        logger.info(f"REST API Port: {settings.rest_api_port}")
    logger.info(f"Log Level: {settings.log_level}")
    logger.info("=" * 50)
    
    # Create and run service manager
    service_manager = ServiceManager()
    await service_manager.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Service interrupted by user")
    except Exception as e:
        logger.error(f"Service failed: {e}")
        sys.exit(1) 