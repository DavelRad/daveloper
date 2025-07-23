import os
import requests
from typing import List
from pydantic import BaseModel, Field
from langchain_core.tools import tool

GITHUB_API_URL = "https://api.github.com"
GITHUB_USERNAME = os.getenv("GITHUB_USERNAME", "daveloper")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

HEADERS = {"Authorization": f"token {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}

class RepoInput(BaseModel):
    username: str = Field(default=GITHUB_USERNAME, description="GitHub username")

class CommitsInput(BaseModel):
    username: str = Field(default=GITHUB_USERNAME, description="GitHub username")
    repo: str = Field(..., description="Repository name")
    limit: int = Field(default=5, description="Number of commits to fetch")

@tool("get_github_profile", args_schema=RepoInput)
def get_github_profile(username: str) -> dict:
    """Fetch GitHub user profile information."""
    url = f"{GITHUB_API_URL}/users/{username}"
    resp = requests.get(url, headers=HEADERS)
    resp.raise_for_status()
    return resp.json()

@tool("list_github_repos", args_schema=RepoInput)
def list_github_repos(username: str) -> List[dict]:
    """List public repositories for a GitHub user."""
    url = f"{GITHUB_API_URL}/users/{username}/repos"
    resp = requests.get(url, headers=HEADERS)
    resp.raise_for_status()
    return resp.json()

@tool("get_recent_commits", args_schema=CommitsInput)
def get_recent_commits(username: str, repo: str, limit: int = 5) -> List[dict]:
    """Get recent commits for a repository."""
    url = f"{GITHUB_API_URL}/repos/{username}/{repo}/commits"
    params = {"per_page": limit}
    resp = requests.get(url, headers=HEADERS, params=params)
    resp.raise_for_status()
    return resp.json() 