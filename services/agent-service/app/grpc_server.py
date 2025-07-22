import grpc
import asyncio
import logging
from concurrent import futures
from typing import Optional

from generated import agent_service_pb2_grpc
from services.grpc_service import AgentServiceServicer
from config import get_settings


logger = logging.getLogger(__name__)


class GrpcServer:
    """gRPC server for the Agent Service."""
    
    def __init__(self):
        self.settings = get_settings()
        self.server: Optional[grpc.Server] = None
        self.servicer = AgentServiceServicer()
    
    async def start(self) -> None:
        """Start the gRPC server."""
        try:
            # Create server with thread pool executor
            self.server = grpc.server(
                futures.ThreadPoolExecutor(max_workers=self.settings.grpc_max_workers)
            )
            
            # Add servicer to server
            agent_service_pb2_grpc.add_AgentServiceServicer_to_server(
                self.servicer, self.server
            )
            
            # Configure server address
            listen_addr = f'[::]:{self.settings.grpc_port}'
            self.server.add_insecure_port(listen_addr)
            
            # Enable reflection if configured
            if self.settings.grpc_enable_reflection:
                from grpc_reflection.v1alpha import reflection
                from generated import agent_service_pb2
                
                reflection.enable_server_reflection(
                    agent_service_pb2.DESCRIPTOR.services_by_name.keys(),
                    self.server
                )
                logger.info("gRPC reflection enabled")
            
            # Start server
            await self.server.start()
            logger.info(f"gRPC server started on {listen_addr}")
            
        except Exception as e:
            logger.error(f"Failed to start gRPC server: {e}")
            raise
    
    async def stop(self, grace_period: int = 5) -> None:
        """Stop the gRPC server."""
        if self.server:
            logger.info("Stopping gRPC server...")
            await self.server.stop(grace_period)
            logger.info("gRPC server stopped")
    
    async def wait_for_termination(self) -> None:
        """Wait for server termination."""
        if self.server:
            await self.server.wait_for_termination()


async def serve():
    """Start the gRPC server and wait for termination."""
    # Configure logging
    logging.basicConfig(
        level=get_settings().log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Create and start server
    server = GrpcServer()
    try:
        await server.start()
        logger.info("gRPC server is ready to handle requests")
        await server.wait_for_termination()
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    except Exception as e:
        logger.error(f"Server error: {e}")
    finally:
        await server.stop()


if __name__ == '__main__':
    asyncio.run(serve()) 