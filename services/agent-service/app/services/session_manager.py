"""Enhanced session management for real-time chat streaming."""

import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from langchain.memory import ConversationBufferMemory
from langchain_core.messages import HumanMessage, AIMessage
from app.services.redis_service import redis_service

logger = logging.getLogger(__name__)

class SessionManager:
    """Enhanced session manager for real-time chat with Redis integration."""
    
    def __init__(self, default_ttl: int = 3600):
        self.default_ttl = default_ttl
        self.memories: Dict[str, ConversationBufferMemory] = {}
    
    def create_session(self, session_id: str, user_metadata: Dict[str, Any] = None) -> bool:
        """Create a new chat session."""
        try:
            session_data = {
                "created_at": datetime.utcnow().isoformat(),
                "last_activity": datetime.utcnow().isoformat(),
                "message_count": 0,
                "user_metadata": user_metadata or {},
                "status": "active"
            }
            
            success = redis_service.store_session_data(
                session_id, 
                session_data, 
                expire_seconds=self.default_ttl
            )
            
            if success:
                # Initialize memory for this session
                self.memories[session_id] = ConversationBufferMemory(
                    memory_key="chat_history", 
                    return_messages=True
                )
                logger.info(f"Created session: {session_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to create session {session_id}: {e}")
            return False
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data."""
        try:
            return redis_service.get_session_data(session_id)
        except Exception as e:
            logger.error(f"Failed to get session {session_id}: {e}")
            return None
    
    def update_session_activity(self, session_id: str) -> bool:
        """Update last activity timestamp for session."""
        try:
            session_data = self.get_session(session_id)
            if session_data:
                session_data["last_activity"] = datetime.utcnow().isoformat()
                return redis_service.store_session_data(
                    session_id, 
                    session_data, 
                    expire_seconds=self.default_ttl
                )
            return False
        except Exception as e:
            logger.error(f"Failed to update session activity {session_id}: {e}")
            return False
    
    def add_message_to_session(
        self, 
        session_id: str, 
        role: str, 
        content: str,
        sources: List[str] = None,
        tool_calls: List[str] = None
    ) -> bool:
        """Add a message to session history."""
        try:
            # Update in-memory conversation
            memory = self.get_or_create_memory(session_id)
            
            if role == "user":
                memory.chat_memory.add_message(HumanMessage(content=content))
            elif role == "assistant":
                memory.chat_memory.add_message(AIMessage(content=content))
            
            # Update session data in Redis
            session_data = self.get_session(session_id) or {}
            session_data["message_count"] = session_data.get("message_count", 0) + 1
            session_data["last_activity"] = datetime.utcnow().isoformat()
            
            # Store conversation history
            history = []
            for msg in memory.chat_memory.messages:
                if isinstance(msg, HumanMessage):
                    history.append({
                        "role": "user", 
                        "content": msg.content,
                        "timestamp": datetime.utcnow().isoformat()
                    })
                elif isinstance(msg, AIMessage):
                    history.append({
                        "role": "assistant", 
                        "content": msg.content,
                        "timestamp": datetime.utcnow().isoformat(),
                        "sources": sources or [],
                        "tool_calls": tool_calls or []
                    })
            
            session_data["history"] = history
            
            return redis_service.store_session_data(
                session_id, 
                session_data, 
                expire_seconds=self.default_ttl
            )
            
        except Exception as e:
            logger.error(f"Failed to add message to session {session_id}: {e}")
            return False
    
    def get_or_create_memory(self, session_id: str) -> ConversationBufferMemory:
        """Get or create conversation memory for session."""
        if session_id not in self.memories:
            self.memories[session_id] = ConversationBufferMemory(
                memory_key="chat_history", 
                return_messages=True
            )
            
            # Load existing history from Redis
            self.load_session_history(session_id)
        
        return self.memories[session_id]
    
    def load_session_history(self, session_id: str) -> bool:
        """Load session history from Redis into memory."""
        try:
            session_data = self.get_session(session_id)
            if session_data and "history" in session_data:
                memory = self.memories.get(session_id)
                if memory:
                    # Clear existing memory
                    memory.clear()
                    
                    # Reload from Redis
                    for msg in session_data["history"]:
                        if msg["role"] == "user":
                            memory.chat_memory.add_message(HumanMessage(content=msg["content"]))
                        elif msg["role"] == "assistant":
                            memory.chat_memory.add_message(AIMessage(content=msg["content"]))
                    
                    logger.debug(f"Loaded {len(session_data['history'])} messages for session {session_id}")
                    return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to load session history {session_id}: {e}")
            return False
    
    def close_session(self, session_id: str) -> bool:
        """Close a session and clean up resources."""
        try:
            # Update session status
            session_data = self.get_session(session_id)
            if session_data:
                session_data["status"] = "closed"
                session_data["closed_at"] = datetime.utcnow().isoformat()
                redis_service.store_session_data(session_id, session_data, expire_seconds=86400)  # Keep for 24h
            
            # Clean up memory
            if session_id in self.memories:
                del self.memories[session_id]
            
            logger.info(f"Closed session: {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to close session {session_id}: {e}")
            return False
    
    def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions from memory (Redis handles its own TTL)."""
        try:
            cleaned_count = 0
            current_time = datetime.utcnow()
            
            # Check each in-memory session
            sessions_to_remove = []
            for session_id in list(self.memories.keys()):
                session_data = self.get_session(session_id)
                if not session_data:
                    # Session expired in Redis, remove from memory
                    sessions_to_remove.append(session_id)
                    cleaned_count += 1
            
            # Remove expired sessions
            for session_id in sessions_to_remove:
                del self.memories[session_id]
                logger.debug(f"Cleaned up expired session: {session_id}")
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} expired sessions")
            
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup expired sessions: {e}")
            return 0

# Global session manager instance
session_manager = SessionManager() 