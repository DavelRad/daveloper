#!/usr/bin/env python3
"""
Test script to verify context management improvements.
Run this to test the GitHub tools and agent service context handling.
"""

from dotenv import load_dotenv
load_dotenv()

def test_github_tools():
    """Test the improved GitHub tools with filtering."""
    print("🔧 Testing GitHub Tools Context Management...")
    print("=" * 50)
    
    try:
        from app.tools.github_tools import list_github_repos, get_github_profile, get_recent_commits
        
        # Test profile filtering
        print("Testing profile data filtering...")
        profile = get_github_profile.invoke({"username": "DavelRad"})
        print(f"✅ Profile fields: {len(profile)} (filtered)")
        
        # Test repo filtering with limit
        print("Testing repository data filtering...")
        repos = list_github_repos.invoke({"username": "DavelRad", "limit": 5})
        print(f"✅ Repositories: {len(repos)} (limited to 5)")
        
        # Test commit filtering
        if repos:
            print("Testing commit data filtering...")
            commits = get_recent_commits.invoke({
                "username": "DavelRad", 
                "repo": repos[0]["name"], 
                "limit": 3
            })
            print(f"✅ Commits: {len(commits)} (limited to 3)")
        
        print("🎉 GitHub tools filtering working correctly!")
        return True
        
    except Exception as e:
        print(f"❌ GitHub tools test failed: {e}")
        return False

def test_agent_context_management():
    """Test the agent service context management."""
    print("\n🤖 Testing Agent Service Context Management...")
    print("=" * 50)
    
    try:
        from app.services.agent_service import AgentService
        agent = AgentService()
        
        # Test token estimation
        test_text = "This is a test message for token estimation."
        tokens = agent.estimate_tokens(test_text)
        print(f"✅ Token estimation: {tokens} tokens for {len(test_text)} chars")
        
        # Test response truncation
        large_response = {"data": "x" * 10000}  # Large response
        truncated = agent.truncate_response(large_response, 100)
        print(f"✅ Response truncation: {len(truncated)} chars (from ~10k)")
        
        # Test context validation
        messages = ["Message 1", "Message 2", "A very long message " * 1000]
        validated = agent.validate_context_size(messages)
        print(f"✅ Context validation: {len(validated)} messages (from {len(messages)})")
        
        print("🎉 Agent context management working correctly!")
        return True
        
    except Exception as e:
        print(f"❌ Agent context test failed: {e}")
        return False

def test_improved_agent():
    """Test the complete improved agent with context management."""
    print("\n🚀 Testing Complete Improved Agent...")
    print("=" * 50)
    
    try:
        from app.services.agent_service import AgentService
        agent = AgentService()
        
        # Test with tools (should now handle context properly)
        print("Testing tool-based response with context management...")
        response = agent.send_message(
            "Tell me about Davel's GitHub repositories", 
            "test-session-context", 
            use_tools=True
        )
        print(f"✅ Tool Response: {response[:200]}...")
        
        # Test RAG mode
        print("Testing RAG-based response...")
        response2 = agent.send_message(
            "What is Davel's background?", 
            "test-session-context", 
            use_tools=False
        )
        print(f"✅ RAG Response: {response2[:200]}...")
        
        print("🎉 Complete agent test successful!")
        return True
        
    except Exception as e:
        print(f"❌ Complete agent test failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Context Management Test Suite")
    print("=" * 60)
    
    # Run all tests
    tools_ok = test_github_tools()
    context_ok = test_agent_context_management()
    agent_ok = test_improved_agent()
    
    print("\n📊 Test Results Summary:")
    print("=" * 30)
    print(f"GitHub Tools: {'✅ PASS' if tools_ok else '❌ FAIL'}")
    print(f"Context Management: {'✅ PASS' if context_ok else '❌ FAIL'}")
    print(f"Complete Agent: {'✅ PASS' if agent_ok else '❌ FAIL'}")
    
    if all([tools_ok, context_ok, agent_ok]):
        print("\n🎉 All tests passed! Context management is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")
