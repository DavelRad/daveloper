"""Redis service for real-time streaming and session management."""

import json
import logging
from typing import Optional, Dict, Any, List
import asyncio
from datetime import datetime

import redis.asyncio as redis
from app.config import get_settings

logger = logging.getLogger(__name__)


class RedisService:
    """Redis service for real-time communication and session management."""
    
    def __init__(self):
        self.settings = get_settings()
        self._redis_client: Optional[redis.Redis] = None
        self._pubsub: Optional[redis.client.PubSub] = None
        
    @property
    async def client(self) -> redis.Redis:
        """Get or create Redis client."""
        if self._redis_client is None:
            try:
                self._redis_client = redis.from_url(
                    self.settings.redis_url,
                    decode_responses=True,
                    socket_keepalive=True,
                    socket_keepalive_options={},
                    retry_on_timeout=True,
                    health_check_interval=30
                )
                
                # Test connection
                await self._redis_client.ping()
                logger.info("Redis client initialized successfully")
                
            except Exception as e:
                logger.error(f"Failed to initialize Redis client: {e}")
                raise
        
        return self._redis_client
    
    async def publish_chat_tokens(
        self, 
        session_id: str, 
        tokens: str, 
        sources: List[str] = None,
        tool_calls: List[str] = None,
        reasoning: str = None
    ) -> bool:
        """Publish chat tokens to Redis channel for real-time streaming."""
        try:
            client = await self.client
            
            message = {
                "session_id": session_id,
                "tokens": tokens,
                "sources": sources or [],
                "tool_calls": tool_calls or [],
                "reasoning": reasoning,
                "timestamp": datetime.utcnow().isoformat(),
                "type": "chat_token"
            }
            
            channel = self.settings.redis_chat_channel
            await client.publish(channel, json.dumps(message))
            
            logger.debug(f"Published chat tokens for session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish chat tokens: {e}")
            return False
    
    async def publish_chat_message(
        self, 
        session_id: str, 
        role: str, 
        content: str,
        sources: List[str] = None,
        tool_calls: List[str] = None
    ) -> bool:
        """Publish complete chat message to Redis channel."""
        try:
            client = await self.client
            
            message = {
                "session_id": session_id,
                "role": role,
                "content": content,
                "sources": sources or [],
                "tool_calls": tool_calls or [],
                "timestamp": datetime.utcnow().isoformat(),
                "type": "chat_message"
            }
            
            channel = self.settings.redis_chat_channel
            await client.publish(channel, json.dumps(message))
            
            logger.debug(f"Published chat message for session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish chat message: {e}")
            return False
    
    async def store_session_data(
        self, 
        session_id: str, 
        data: Dict[str, Any],
        expire_seconds: int = 3600
    ) -> bool:
        """Store session data in Redis with expiration."""
        try:
            client = await self.client
            key = f"session:{session_id}"
            
            await client.setex(
                key,
                expire_seconds,
                json.dumps(data)
            )
            
            logger.debug(f"Stored session data for {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store session data: {e}")
            return False
    
    async def get_session_data(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve session data from Redis."""
        try:
            client = await self.client
            key = f"session:{session_id}"
            
            data = await client.get(key)
            if data:
                return json.loads(data)
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get session data: {e}")
            return None
    
    async def delete_session_data(self, session_id: str) -> bool:
        """Delete session data from Redis."""
        try:
            client = await self.client
            key = f"session:{session_id}"
            
            await client.delete(key)
            logger.debug(f"Deleted session data for {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete session data: {e}")
            return False
    
    async def subscribe_to_chat_channel(self, callback):
        """Subscribe to chat channel for real-time updates."""
        try:
            client = await self.client
            self._pubsub = client.pubsub()
            
            channel = self.settings.redis_chat_channel
            await self._pubsub.subscribe(channel)
            
            logger.info(f"Subscribed to chat channel: {channel}")
            
            async for message in self._pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        await callback(data)
                    except Exception as e:
                        logger.error(f"Error processing chat message: {e}")
                        
        except Exception as e:
            logger.error(f"Failed to subscribe to chat channel: {e}")
            raise
    
    async def unsubscribe_from_chat_channel(self):
        """Unsubscribe from chat channel."""
        if self._pubsub:
            await self._pubsub.unsubscribe()
            await self._pubsub.close()
            logger.info("Unsubscribed from chat channel")
    
    async def health_check(self) -> bool:
        """Check if Redis is healthy."""
        try:
            client = await self.client
            await client.ping()
            return True
            
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False
    
    async def close(self):
        """Close Redis connections."""
        if self._pubsub:
            await self.unsubscribe_from_chat_channel()
        
        if self._redis_client:
            await self._redis_client.close()
            logger.info("Redis connections closed")


# Global Redis service instance
redis_service = RedisService() 