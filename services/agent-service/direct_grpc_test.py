#!/usr/bin/env python3
"""
Direct test of gRPC servicer methods to isolate async issues.
"""

import sys
import os
sys.path.append('./app')
sys.path.append('./generated')

from generated import chat_pb2, common_pb2
from app.services.grpc_service import AgentServiceServicer

def test_grpc_methods():
    """Test gRPC servicer methods directly."""
    print("🔧 Testing gRPC servicer methods directly")
    print("=" * 50)
    
    # Create servicer instance
    servicer = AgentServiceServicer()
    
    try:
        # Test HealthCheck first
        print("1. Testing HealthCheck...")
        health_request = common_pb2.Empty()
        health_response = servicer.HealthCheck(health_request, None)
        print(f"✅ Health: {health_response.healthy}")
        
        # Test GetChatHistory (should work with sync Redis)
        print("2. Testing GetChatHistory...")
        history_request = chat_pb2.GetChatHistoryRequest(session_id="test-session")
        history_response = servicer.GetChatHistory(history_request, None)
        print(f"✅ History messages: {len(history_response.messages)}")
        
        # Test ClearChatHistory
        print("3. Testing ClearChatHistory...")
        clear_request = chat_pb2.ClearChatHistoryRequest(session_id="test-session")
        clear_response = servicer.ClearChatHistory(clear_request, None)
        print(f"✅ Clear success: {clear_response.status.success}")
        
        # Test SendMessage (this might fail if RAG service has async issues)
        print("4. Testing SendMessage...")
        message_request = chat_pb2.ChatRequest(
            message="Hello, this is a test",
            session_id="test-session"
        )
        message_response = servicer.SendMessage(message_request, None)
        print(f"✅ Message success: {message_response.status.success}")
        if not message_response.status.success:
            print(f"   Error: {message_response.status.message}")
        
        print("\n🎉 Direct gRPC test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Direct gRPC test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_grpc_methods() 