import os
import logging
import time
import json
from typing import Any, Dict, List
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_openai import ChatOpenAI
from langchain import hub
from app.tools.github_tools import get_github_profile, list_github_repos, get_recent_commits
from app.tools.portfolio_tool import get_portfolio_projects
from app.services.redis_service import redis_service
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)

class AgentService:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-3.5-turbo",
            temperature=0.7,
            max_tokens=4096,
            api_key=os.getenv("OPENAI_API_KEY"),
            request_timeout=30  # MVP: Add timeout for LLM requests
        )
        # Context management settings
        self.max_context_tokens = 15000  # Leave buffer for response
        self.max_tool_response_tokens = 8000  # Limit tool responses
        self.tools = [
            get_github_profile,
            list_github_repos,
            get_recent_commits,
            get_portfolio_projects
        ]
        prompt = hub.pull("hwchase17/openai-tools-agent")
        self.agent = create_tool_calling_agent(
            self.llm,
            self.tools,
            prompt
        )
        self.executor = AgentExecutor.from_agent_and_tools(
            agent=self.agent,
            tools=self.tools,
            verbose=True,
            max_execution_time=25  # MVP: Prevent infinite loops
        )

    def estimate_tokens(self, text: str) -> int:
        """Rough estimation of token count (1 token ≈ 4 characters for English)."""
        return len(text) // 4
    
    def truncate_response(self, response: Any, max_tokens: int) -> str:
        """Truncate a response to fit within token limits."""
        if isinstance(response, dict):
            response_str = json.dumps(response, indent=2)
        elif isinstance(response, list):
            response_str = json.dumps(response, indent=2)
        else:
            response_str = str(response)
        
        estimated_tokens = self.estimate_tokens(response_str)
        
        if estimated_tokens <= max_tokens:
            return response_str
        
        # Truncate and add indicator
        char_limit = max_tokens * 4
        truncated = response_str[:char_limit-100]  # Leave space for message
        return f"{truncated}...\n[Response truncated due to length - {estimated_tokens} tokens estimated]"
    
    def validate_context_size(self, messages: List[str]) -> List[str]:
        """Validate and truncate context to prevent token overflow."""
        total_tokens = sum(self.estimate_tokens(msg) for msg in messages)
        
        if total_tokens <= self.max_context_tokens:
            return messages
        
        logger.warning(f"Context size {total_tokens} exceeds limit {self.max_context_tokens}, truncating...")
        
        # Keep most recent messages and truncate older ones
        truncated_messages = []
        current_tokens = 0
        
        # Process messages in reverse order (most recent first)
        for msg in reversed(messages):
            msg_tokens = self.estimate_tokens(msg)
            if current_tokens + msg_tokens <= self.max_context_tokens:
                truncated_messages.insert(0, msg)
                current_tokens += msg_tokens
            else:
                # Truncate this message if it's the only one that doesn't fit
                if not truncated_messages:
                    char_limit = (self.max_context_tokens - 100) * 4  # Leave buffer
                    truncated_msg = msg[:char_limit] + "...[truncated]"
                    truncated_messages.insert(0, truncated_msg)
                break
        
        logger.info(f"Context truncated from {len(messages)} to {len(truncated_messages)} messages")
        return truncated_messages

    def send_message(self, message: str, session_id: str, use_tools: bool = True, max_tokens: int = None):
        try:
            # MVP: Add input validation
            if not message or not message.strip():
                raise ValueError("Message cannot be empty")
                
            if len(message) > 10000:
                raise ValueError("Message too long")
            
            logger.info(f"Processing message for session {session_id}, tools: {use_tools}")
            
            if use_tools:
                # Execute with context validation
                try:
                    result = self.executor.invoke({"input": message})
                    output = result.get("output", str(result))
                    
                    # Validate response size and truncate if needed
                    estimated_tokens = self.estimate_tokens(output)
                    if estimated_tokens > self.max_tool_response_tokens:
                        logger.warning(f"Tool response too large ({estimated_tokens} tokens), truncating...")
                        output = self.truncate_response(output, self.max_tool_response_tokens)
                    
                    return output
                    
                except Exception as tool_error:
                    # Handle context overflow specifically
                    if "context length" in str(tool_error).lower() or "token" in str(tool_error).lower():
                        logger.error(f"Context overflow in tools: {tool_error}")
                        return "I found relevant information, but the response was too large. Could you ask a more specific question?"
                    else:
                        raise tool_error
            else:
                # Use RAG service
                result = rag_service.answer_question(message, chat_history="")
                return result.get("answer", "I couldn't find relevant information.")
                
        except Exception as e:
            logger.error(f"Error in send_message: {str(e)}")
            return f"I'm sorry, I encountered an error: {str(e)}"

    def send_message_streaming(self, message: str, session_id: str, use_tools: bool = True, max_tokens: int = None):
        """Process a chat message with streaming tokens published to Redis."""
        try:
            # MVP: Add input validation and timeout handling
            if not message or not message.strip():
                error_msg = "Message cannot be empty"
                redis_service.publish_chat_tokens(
                    session_id=session_id,
                    tokens=error_msg,
                    sources=[],
                    tool_calls=[],
                    reasoning="Input validation error",
                    done=True
                )
                yield error_msg
                return
                
            start_time = time.time()
            logger.info(f"Starting streaming for session {session_id}")
            
            if use_tools:
                # Use the agent executor to handle tool calls (non-streaming for now)
                try:
                    result = self.executor.invoke({"input": message})
                    output = result.get("output", str(result))
                except Exception as e:
                    error_msg = f"I encountered an error processing your request: {str(e)}"
                    redis_service.publish_chat_tokens(
                        session_id=session_id,
                        tokens=error_msg,
                        sources=[],
                        tool_calls=[],
                        reasoning="Agent execution error",
                        done=True
                    )
                    yield error_msg
                    return

                # MVP: Optimized streaming - smaller chunks for better UX
                chunk_size = 25  # Reduced from 50 for smoother streaming
                chunk_delay = 0.05  # Small delay between chunks for better UX
                
                for i in range(0, len(output), chunk_size):
                    chunk = output[i:i + chunk_size]
                    
                    # Publish token to Redis
                    redis_service.publish_chat_tokens(
                        session_id=session_id,
                        tokens=chunk,
                        sources=[],
                        tool_calls=[],
                        reasoning="Agent response chunk"
                    )
                    yield chunk
                    
                    # MVP: Small delay for smoother streaming experience
                    time.sleep(chunk_delay)

                # Send completion signal with timing info
                processing_time = time.time() - start_time
                redis_service.publish_chat_tokens(
                    session_id=session_id,
                    tokens="",
                    sources=[],
                    tool_calls=[],
                    reasoning=f"Response completed in {processing_time:.2f}s",
                    done=True
                )
                
                logger.info(f"Streaming completed for session {session_id} in {processing_time:.2f}s")
                
            else:
                # For RAG-only streaming, use RAG service
                try:
                    # Get RAG response
                    rag_result = rag_service.answer_question(message, chat_history="")
                    content = rag_result.get("answer", "I couldn't find relevant information.")
                    sources = rag_result.get("sources", [])
                    
                    # Stream the response
                    chunk_size = 25
                    chunk_delay = 0.05
                    
                    for i in range(0, len(content), chunk_size):
                        chunk = content[i:i + chunk_size]
                        
                        # Publish token to Redis with sources
                        redis_service.publish_chat_tokens(
                            session_id=session_id,
                            tokens=chunk,
                            sources=sources,
                            tool_calls=[],
                            reasoning="RAG response chunk"
                        )
                        yield chunk
                        time.sleep(chunk_delay)
                    
                    # Send completion signal
                    processing_time = time.time() - start_time
                    redis_service.publish_chat_tokens(
                        session_id=session_id,
                        tokens="",
                        sources=sources,
                        tool_calls=[],
                        reasoning=f"RAG response completed in {processing_time:.2f}s",
                        done=True
                    )
                    
                except Exception as e:
                    error_msg = f"I encountered an error accessing my documents: {str(e)}"
                    redis_service.publish_chat_tokens(
                        session_id=session_id,
                        tokens=error_msg,
                        sources=[],
                        tool_calls=[],
                        reasoning="RAG service error",
                        done=True
                    )
                    yield error_msg
                
        except Exception as e:
            error_msg = f"I'm sorry, I encountered an unexpected error while processing your request."
            logger.error(f"Streaming error for session {session_id}: {str(e)}", exc_info=True)
            
            redis_service.publish_chat_tokens(
                session_id=session_id,
                tokens=error_msg,
                sources=[],
                tool_calls=[],
                reasoning="Unexpected streaming error",
                done=True
            )
            yield error_msg 