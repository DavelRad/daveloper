"""gRPC interceptors for logging, metrics, and rate limiting."""

import time
import logging
import grpc
from typing import Callable, Any
from app.core.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)

class LoggingInterceptor(grpc.ServerInterceptor):
    """gRPC interceptor for request/response logging."""
    
    def intercept_service(self, continuation: Callable, handler_call_details):
        start_time = time.time()
        method_name = handler_call_details.method
        
        logger.info(f"gRPC request started: {method_name}")
        
        try:
            response = continuation(handler_call_details)
            duration = time.time() - start_time
            logger.info(f"gRPC request completed: {method_name} in {duration:.3f}s")
            return response
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"gRPC request failed: {method_name} in {duration:.3f}s - {str(e)}")
            raise

class RateLimitInterceptor(grpc.ServerInterceptor):
    """gRPC interceptor for rate limiting."""
    
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.rate_limiter = RateLimiter(max_requests, window_seconds)
    
    def intercept_service(self, continuation: Callable, handler_call_details):
        # Extract client info for rate limiting key
        method_name = handler_call_details.method
        # Use method + remote address as rate limit key
        # Fix: invocation_metadata is a tuple, not a dict
        remote_addr = 'unknown'
        if hasattr(handler_call_details, 'invocation_metadata'):
            metadata = handler_call_details.invocation_metadata
            if metadata:
                # Look for remote address in metadata tuples
                for key, value in metadata:
                    if key == 'remote_addr':
                        remote_addr = value
                        break
        
        rate_key = f"grpc_rate_limit:{method_name}:{remote_addr}"
        
        if not self.rate_limiter.is_allowed(rate_key):
            logger.warning(f"Rate limit exceeded for {method_name} from {remote_addr}")
            context = grpc.ServicerContext()
            context.abort(grpc.StatusCode.RESOURCE_EXHAUSTED, "Rate limit exceeded")
        
        return continuation(handler_call_details)

class MetricsInterceptor(grpc.ServerInterceptor):
    """gRPC interceptor for collecting metrics."""
    
    def __init__(self):
        self.request_count = {}
        self.request_duration = {}
    
    def intercept_service(self, continuation: Callable, handler_call_details):
        method_name = handler_call_details.method
        start_time = time.time()
        
        # Increment request count
        self.request_count[method_name] = self.request_count.get(method_name, 0) + 1
        
        try:
            response = continuation(handler_call_details)
            duration = time.time() - start_time
            
            # Track duration
            if method_name not in self.request_duration:
                self.request_duration[method_name] = []
            self.request_duration[method_name].append(duration)
            
            # Log metrics periodically (every 10 requests)
            if self.request_count[method_name] % 10 == 0:
                avg_duration = sum(self.request_duration[method_name]) / len(self.request_duration[method_name])
                logger.info(f"Metrics - {method_name}: {self.request_count[method_name]} requests, avg {avg_duration:.3f}s")
            
            return response
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"Metrics - {method_name} failed after {duration:.3f}s: {str(e)}")
            raise

def get_interceptors(enable_rate_limiting: bool = True, enable_metrics: bool = True):
    """Get list of gRPC interceptors to use."""
    interceptors = [LoggingInterceptor()]
    
    if enable_rate_limiting:
        interceptors.append(RateLimitInterceptor(max_requests=30, window_seconds=60))
    
    if enable_metrics:
        interceptors.append(MetricsInterceptor())
    
    return interceptors 