import unittest
import asyncio
import time
import os
from unittest.mock import patch, MagicMock
import dotenv, os
dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

# Set GitHub username for tests
os.environ["GITHUB_USERNAME"] = "DavelRad"

from app.services.agent_service import AgentService
from app.services.session_manager import session_manager
from app.services.redis_service import redis_service
from app.core.rate_limiter import RateLimiter

class TestStreamingIntegration(unittest.TestCase):
    
    def setUp(self):
        """Set up test environment."""
        self.agent = AgentService()
        self.session_id = "test_streaming_session"
        self.test_message = "Tell me about my GitHub profile"
    
    def tearDown(self):
        """Clean up after tests."""
        session_manager.close_session(self.session_id)
    
    @patch('app.tools.github_tools.requests.get')
    def test_streaming_tokens_published_to_redis(self, mock_get):
        """Test that streaming tokens are published to Redis."""
        mock_get.return_value = MagicMock(status_code=200, json=lambda: {"login": "DavelRad"})
        
        # Create session
        session_manager.create_session(self.session_id)
        
        # Track published messages
        published_messages = []
        original_publish = redis_service.publish_chat_tokens
        
        def capture_publish(*args, **kwargs):
            published_messages.append(kwargs)
            return original_publish(*args, **kwargs)
        
        with patch.object(redis_service, 'publish_chat_tokens', side_effect=capture_publish):
            # Stream message
            tokens = list(self.agent.send_message_streaming(
                message=self.test_message,
                session_id=self.session_id,
                use_tools=True
            ))
            
            # Verify tokens were streamed
            self.assertGreater(len(tokens), 0)
            
            # Verify Redis publish was called
            self.assertGreater(len(published_messages), 0)
            
            # Verify session_id is in published messages
            for msg in published_messages:
                self.assertEqual(msg['session_id'], self.session_id)
    
    def test_session_management_lifecycle(self):
        """Test complete session lifecycle."""
        # Create session
        success = session_manager.create_session(
            self.session_id, 
            user_metadata={"test": True}
        )
        self.assertTrue(success)
        
        # Verify session exists
        session_data = session_manager.get_session(self.session_id)
        self.assertIsNotNone(session_data)
        self.assertEqual(session_data["status"], "active")
        
        # Add message to session
        success = session_manager.add_message_to_session(
            self.session_id,
            "user", 
            "Hello"
        )
        self.assertTrue(success)
        
        # Verify message count updated
        session_data = session_manager.get_session(self.session_id)
        self.assertEqual(session_data["message_count"], 1)
        
        # Close session
        success = session_manager.close_session(self.session_id)
        self.assertTrue(success)
        
        # Verify session is closed
        session_data = session_manager.get_session(self.session_id)
        if session_data:  # May be deleted or marked closed
            self.assertEqual(session_data.get("status"), "closed")
    
    def test_rate_limiting(self):
        """Test rate limiting functionality."""
        # Test the rate limiter in isolation with direct Redis mock
        from app.core.rate_limiter import RateLimiter
        
        with patch('app.core.rate_limiter.redis_service') as mock_redis_service:
            # Mock Redis client
            mock_client = MagicMock()
            mock_redis_service.client = mock_client
            
            # Configure Redis operations for rate limiting
            mock_client.zremrangebyscore.return_value = None
            mock_client.zcard.side_effect = [0, 1, 2, 3]  # Simulate increasing count
            mock_client.zadd.return_value = 1
            mock_client.expire.return_value = True
            
            # Create rate limiter
            rate_limiter = RateLimiter(max_requests=3, window_seconds=60)
            test_key = "test_rate_limit_key"
            
            # First 3 requests should be allowed
            for i in range(3):
                result = rate_limiter.is_allowed(test_key)
                self.assertTrue(result, f"Request {i+1} should be allowed")
            
            # 4th request should be blocked (zcard returns 3 >= max_requests)
            result = rate_limiter.is_allowed(test_key)
            self.assertFalse(result, "4th request should be blocked")
    
    @patch('app.tools.github_tools.requests.get')
    def test_memory_persistence_across_requests(self, mock_get):
        """Test that conversation memory persists across requests."""
        mock_get.return_value = MagicMock(status_code=200, json=lambda: {"login": "DavelRad"})
        
        # Create session
        session_manager.create_session(self.session_id)
        
        # Send first message
        session_manager.add_message_to_session(
            self.session_id, "user", "My name is Alice"
        )
        
        # Get memory and verify message is there
        memory = session_manager.get_or_create_memory(self.session_id)
        messages = memory.chat_memory.messages
        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0].content, "My name is Alice")
        
        # Add assistant response
        session_manager.add_message_to_session(
            self.session_id, "assistant", "Hello Alice!"
        )
        
        # Verify both messages are in memory
        memory = session_manager.get_or_create_memory(self.session_id)
        messages = memory.chat_memory.messages
        self.assertEqual(len(messages), 2)
    
    def test_redis_connection_health(self):
        """Test Redis connection is working."""
        try:
            client = redis_service.client
            result = client.ping()
            self.assertTrue(result)
        except Exception as e:
            self.fail(f"Redis connection failed: {e}")
    
    @patch('app.tools.github_tools.requests.get')
    def test_end_to_end_streaming_flow(self, mock_get):
        """Test the complete end-to-end streaming flow."""
        mock_get.return_value = MagicMock(status_code=200, json=lambda: {"login": "DavelRad"})
        
        # Create session
        session_manager.create_session(self.session_id)
        
        # Track all interactions
        redis_publishes = []
        
        def capture_redis_publish(*args, **kwargs):
            redis_publishes.append(kwargs)
            return True
        
        with patch.object(redis_service, 'publish_chat_tokens', side_effect=capture_redis_publish):
            # Stream complete message
            full_response = ""
            token_count = 0
            
            for token in self.agent.send_message_streaming(
                message=self.test_message,
                session_id=self.session_id,
                use_tools=True
            ):
                full_response += token
                token_count += 1
            
            # Verify we got a response
            self.assertGreater(len(full_response), 0)
            self.assertIn("DavelRad", full_response)
            
            # Verify Redis publishes happened
            self.assertGreater(len(redis_publishes), 0)
            
            # Verify all publishes had correct session_id
            for publish in redis_publishes:
                self.assertEqual(publish['session_id'], self.session_id)
            
            # Add to session history
            session_manager.add_message_to_session(
                self.session_id, "user", self.test_message
            )
            session_manager.add_message_to_session(
                self.session_id, "assistant", full_response
            )
            
            # Verify session has the conversation
            session_data = session_manager.get_session(self.session_id)
            self.assertEqual(session_data["message_count"], 2)
            self.assertIn("history", session_data)
            self.assertEqual(len(session_data["history"]), 2)

if __name__ == "__main__":
    unittest.main() 