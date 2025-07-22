#!/usr/bin/env python3
"""Test script for the Agent Service gRPC implementation."""

import asyncio
import os
import sys
import grpc
import logging
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from generated import agent_service_pb2_grpc, agent_service_pb2, common_pb2, documents_pb2


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AgentServiceTester:
    """Test client for the Agent Service."""
    
    def __init__(self, host='localhost', port=50051):
        self.host = host
        self.port = port
        self.channel = None
        self.stub = None
    
    async def connect(self):
        """Connect to the gRPC service."""
        try:
            self.channel = grpc.aio.insecure_channel(f'{self.host}:{self.port}')
            self.stub = agent_service_pb2_grpc.AgentServiceStub(self.channel)
            logger.info(f"Connected to Agent Service at {self.host}:{self.port}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            return False
    
    async def close(self):
        """Close the connection."""
        if self.channel:
            await self.channel.close()
            logger.info("Connection closed")
    
    async def test_health_check(self):
        """Test the health check endpoint."""
        try:
            logger.info("🔍 Testing Health Check...")
            response = await self.stub.HealthCheck(common_pb2.Empty())
            
            logger.info(f"✅ Health Check Response:")
            logger.info(f"   Healthy: {response.healthy}")
            logger.info(f"   Version: {response.version}")
            logger.info(f"   Dependencies:")
            for key, value in response.dependencies.items():
                logger.info(f"     {key}: {value}")
            
            return response.healthy
            
        except Exception as e:
            logger.error(f"❌ Health check failed: {e}")
            return False
    
    async def test_list_tools(self):
        """Test listing available tools."""
        try:
            logger.info("🔍 Testing List Tools...")
            response = await self.stub.ListTools(common_pb2.Empty())
            
            logger.info(f"✅ Found {len(response.tools)} tools:")
            for tool in response.tools:
                status = "✓" if tool.available else "✗"
                logger.info(f"   {status} {tool.name}: {tool.description}")
            
            return len(response.tools) > 0
            
        except Exception as e:
            logger.error(f"❌ List tools failed: {e}")
            return False
    
    async def test_tool_testing(self):
        """Test the tool testing functionality."""
        try:
            logger.info("🔍 Testing Tool Testing...")
            
            # Test health_check tool
            test_request = agent_service_pb2.ToolTestRequest(
                tool_name="health_check",
                parameters={}
            )
            response = await self.stub.TestTool(test_request)
            
            logger.info(f"✅ Tool Test Response:")
            logger.info(f"   Success: {response.success}")
            logger.info(f"   Result: {response.result}")
            if response.error_message:
                logger.info(f"   Error: {response.error_message}")
            
            return response.success
            
        except Exception as e:
            logger.error(f"❌ Tool testing failed: {e}")
            return False
    
    async def test_document_ingestion(self):
        """Test document ingestion functionality."""
        try:
            logger.info("🔍 Testing Document Ingestion...")
            
            # Get the sample document path
            script_dir = Path(__file__).parent
            sample_doc = script_dir / "app" / "data" / "documents" / "sample_resume.txt"
            
            if not sample_doc.exists():
                logger.warning(f"Sample document not found: {sample_doc}")
                return False
            
            # Create ingestion request
            ingest_request = documents_pb2.IngestRequest(
                file_paths=[str(sample_doc)],
                force_reingest=True
            )
            
            response = await self.stub.IngestDocuments(ingest_request)
            
            logger.info(f"✅ Ingestion Response:")
            logger.info(f"   Job ID: {response.job_id}")
            logger.info(f"   Status: {response.status.success}")
            logger.info(f"   Message: {response.status.message}")
            
            # Wait a bit for processing
            if response.status.success:
                job_id = response.job_id
                await asyncio.sleep(2)
                
                # Check status
                status_request = documents_pb2.StatusRequest(job_id=job_id)
                status_response = await self.stub.GetDocumentStatus(status_request)
                
                logger.info(f"📊 Job Status:")
                logger.info(f"   Status: {status_response.status}")
                logger.info(f"   Progress: {status_response.processed_documents}/{status_response.total_documents}")
                if status_response.error_message:
                    logger.info(f"   Error: {status_response.error_message}")
            
            return response.status.success
            
        except Exception as e:
            logger.error(f"❌ Document ingestion failed: {e}")
            return False
    
    async def test_list_documents(self):
        """Test listing documents."""
        try:
            logger.info("🔍 Testing List Documents...")
            
            response = await self.stub.ListDocuments(documents_pb2.ListRequest())
            
            logger.info(f"✅ Found {len(response.documents)} documents:")
            for doc in response.documents:
                logger.info(f"   📄 {doc.filename} ({doc.document_type})")
                logger.info(f"      ID: {doc.id}")
                logger.info(f"      Status: {doc.status}")
                logger.info(f"      Chunks: {doc.chunk_count}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ List documents failed: {e}")
            return False
    
    async def run_all_tests(self):
        """Run all tests."""
        logger.info("🚀 Starting Agent Service Tests")
        logger.info("=" * 50)
        
        # Connect to service
        if not await self.connect():
            logger.error("Failed to connect to service")
            return False
        
        try:
            results = []
            
            # Run tests
            results.append(await self.test_health_check())
            results.append(await self.test_list_tools())
            results.append(await self.test_tool_testing())
            results.append(await self.test_document_ingestion())
            results.append(await self.test_list_documents())
            
            # Summary
            passed = sum(results)
            total = len(results)
            
            logger.info("=" * 50)
            logger.info(f"🎯 Test Results: {passed}/{total} passed")
            
            if passed == total:
                logger.info("🎉 All tests passed!")
                return True
            else:
                logger.warning(f"⚠️  {total - passed} tests failed")
                return False
                
        finally:
            await self.close()


async def main():
    """Main test function."""
    # Check if we should test against a real service
    if len(sys.argv) > 1 and sys.argv[1] == "--skip-server":
        logger.info("Skipping server tests (--skip-server flag provided)")
        return True
    
    tester = AgentServiceTester()
    success = await tester.run_all_tests()
    
    if success:
        logger.info("✅ All tests completed successfully!")
        return 0
    else:
        logger.error("❌ Some tests failed!")
        return 1


if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        sys.exit(result)
    except KeyboardInterrupt:
        logger.info("Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Test runner failed: {e}")
        sys.exit(1) 