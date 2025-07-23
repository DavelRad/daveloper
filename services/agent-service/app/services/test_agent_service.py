import unittest
from unittest.mock import patch, MagicMock
from app.services.agent_service import AgentService
import dotenv, os
dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

class TestAgentServiceIntegration(unittest.TestCase):
    @patch('app.tools.github_tools.requests.get')
    def test_agent_calls_github_tool(self, mock_get):
        mock_get.return_value = MagicMock(status_code=200, json=lambda: {"login": "DavelRad"})
        agent = AgentService()
        response = agent.send_message(
            message="Show me my GitHub profile",
            session_id="testsession",
            use_tools=True
        )
        self.assertIn("DavelRad", response["response"])
        self.assertIn("GitHub profile", response["response"])

if __name__ == "__main__":
    unittest.main() 