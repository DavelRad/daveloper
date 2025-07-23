import os
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_openai import ChatOpenAI
from langchain import hub
from app.tools.github_tools import get_github_profile, list_github_repos, get_recent_commits
from app.tools.portfolio_tool import get_portfolio_projects
from app.services.redis_service import redis_service

class AgentService:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-3.5-turbo",
            temperature=0.7,
            max_tokens=4096,
            api_key=os.getenv("OPENAI_API_KEY")
        )
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
            verbose=True
        )

    def send_message(self, message: str, session_id: str, use_tools: bool = True, max_tokens: int = None):
        """Process a chat message, optionally using tools."""
        if use_tools:
            # Use the agent executor to handle tool calls
            result = self.executor.invoke({"input": message})
            # Extract output and tool_calls if available
            output = result.get("output", str(result))
            tool_calls = result.get("tool_calls", [])
            response = {
                "response": output,
                "session_id": session_id,
                "sources": [],
                "tool_calls": tool_calls,
                "reasoning": "Used tool(s) if needed"
            }
        else:
            # Fallback to RAG/context-only (implement as needed)
            response = {
                "response": "[RAG-only response placeholder]",
                "session_id": session_id,
                "sources": [],
                "tool_calls": [],
                "reasoning": "No tool used"
            }
        return response

    def send_message_streaming(self, message: str, session_id: str, use_tools: bool = True, max_tokens: int = None):
        """Process a chat message with streaming tokens published to Redis."""
        try:
            if use_tools:
                # Stream tokens from agent executor
                for chunk in self.executor.stream({"input": message}):
                    # Extract content from the chunk
                    if "output" in chunk:
                        content = chunk["output"]
                        # Publish token to Redis
                        redis_service.publish_chat_tokens(
                            session_id=session_id,
                            tokens=content,
                            sources=[],
                            tool_calls=[],
                            reasoning="Streaming agent response"
                        )
                        yield content
            else:
                # For RAG-only streaming, use RAG service streaming method
                content = "[RAG streaming not implemented yet]"
                redis_service.publish_chat_tokens(
                    session_id=session_id,
                    tokens=content,
                    sources=[],
                    tool_calls=[],
                    reasoning="RAG streaming response"
                )
                yield content
        except Exception as e:
            error_msg = f"Streaming error: {str(e)}"
            redis_service.publish_chat_tokens(
                session_id=session_id,
                tokens=error_msg,
                sources=[],
                tool_calls=[],
                reasoning="Error during streaming"
            )
            yield error_msg 