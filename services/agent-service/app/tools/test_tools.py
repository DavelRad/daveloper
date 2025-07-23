import unittest
from unittest.mock import patch, MagicMock
from app.tools.github_tools import get_github_profile, list_github_repos, get_recent_commits
from app.tools.portfolio_tool import get_portfolio_projects

class TestGitHubTools(unittest.TestCase):
    @patch('app.tools.github_tools.requests.get')
    def test_get_github_profile(self, mock_get):
        mock_get.return_value = MagicMock(status_code=200, json=lambda: {"login": "daveloper"})
        result = get_github_profile.invoke({"username": "daveloper"})
        self.assertEqual(result["login"], "daveloper")

    @patch('app.tools.github_tools.requests.get')
    def test_list_github_repos(self, mock_get):
        mock_get.return_value = MagicMock(status_code=200, json=lambda: [{"name": "repo1"}])
        result = list_github_repos.invoke({"username": "daveloper"})
        self.assertEqual(result[0]["name"], "repo1")

    @patch('app.tools.github_tools.requests.get')
    def test_get_recent_commits(self, mock_get):
        mock_get.return_value = MagicMock(status_code=200, json=lambda: [{"sha": "abc123"}])
        result = get_recent_commits.invoke({"username": "daveloper", "repo": "repo1", "limit": 1})
        self.assertEqual(result[0]["sha"], "abc123")

class TestPortfolioTool(unittest.TestCase):
    @patch('app.tools.portfolio_tool.requests.get')
    def test_get_portfolio_projects(self, mock_get):
        mock_get.return_value = MagicMock(status_code=200, json=lambda: [{"title": "Project X"}])
        result = get_portfolio_projects.invoke({"endpoint": "https://daveloper.dev/api/projects"})
        self.assertEqual(result[0]["title"], "Project X")

if __name__ == "__main__":
    unittest.main() 