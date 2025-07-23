"""Rate limiting functionality using Redis."""

import time
import logging
from typing import Optional
from functools import wraps
from app.services.redis_service import redis_service

logger = logging.getLogger(__name__)

class RateLimiter:
    """Redis-based rate limiter."""
    
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    def is_allowed(self, key: str) -> bool:
        """Check if request is allowed for the given key."""
        try:
            client = redis_service.client
            current_time = int(time.time())
            window_start = current_time - self.window_seconds
            
            # Remove old entries
            client.zremrangebyscore(key, 0, window_start)
            
            # Count current requests
            current_count = client.zcard(key)
            
            if current_count >= self.max_requests:
                return False
            
            # Add current request
            client.zadd(key, {str(current_time): current_time})
            client.expire(key, self.window_seconds)
            
            return True
            
        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            # Fail open - allow request if rate limiter fails
            return True

def rate_limit(max_requests: int = 10, window_seconds: int = 60, key_func=None):
    """Rate limiting decorator."""
    limiter = RateLimiter(max_requests, window_seconds)
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extract key from function arguments
            if key_func:
                key = key_func(*args, **kwargs)
            else:
                # Default: use first argument as key (usually request)
                key = f"rate_limit:{args[0] if args else 'default'}"
            
            if not limiter.is_allowed(key):
                raise Exception(f"Rate limit exceeded: {max_requests} requests per {window_seconds} seconds")
            
            return func(*args, **kwargs)
        return wrapper
    return decorator 