import os
import requests
from typing import List
from pydantic import BaseModel, Field
from langchain_core.tools import tool

GITHUB_API_URL = "https://api.github.com"
GITHUB_USERNAME = os.getenv("GITHUB_USERNAME", "daveloper")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

HEADERS = {"Authorization": f"token {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}

class ProfileInput(BaseModel):
    username: str = Field(default=GITHUB_USERNAME, description="GitHub username")

class RepoInput(BaseModel):
    username: str = Field(default=GITHUB_USERNAME, description="GitHub username")
    limit: int = Field(default=10, description="Maximum number of repositories to fetch")

class CommitsInput(BaseModel):
    username: str = Field(default=GITHUB_USERNAME, description="GitHub username")
    repo: str = Field(..., description="Repository name")
    limit: int = Field(default=5, description="Number of commits to fetch")

def filter_profile_data(profile: dict) -> dict:
    """Filter essential profile information to reduce token usage."""
    return {
        "login": profile.get("login"),
        "name": profile.get("name"),
        "bio": profile.get("bio"),
        "company": profile.get("company"),
        "location": profile.get("location"),
        "email": profile.get("email"),
        "public_repos": profile.get("public_repos"),
        "followers": profile.get("followers"),
        "following": profile.get("following"),
        "created_at": profile.get("created_at"),
        "html_url": profile.get("html_url")
    }

def filter_repo_data(repos: List[dict]) -> List[dict]:
    """Filter essential repository information to reduce token usage."""
    return [
        {
            "name": repo.get("name"),
            "description": repo.get("description"),
            "language": repo.get("language"),
            "stargazers_count": repo.get("stargazers_count"),
            "forks_count": repo.get("forks_count"),
            "created_at": repo.get("created_at"),
            "updated_at": repo.get("updated_at"),
            "html_url": repo.get("html_url"),
            "homepage": repo.get("homepage"),
            "topics": repo.get("topics", [])[:5]  # Limit topics to 5
        }
        for repo in repos
    ]

def filter_commit_data(commits: List[dict]) -> List[dict]:
    """Filter essential commit information to reduce token usage."""
    return [
        {
            "sha": commit.get("sha", "")[:7],  # Short SHA
            "message": commit.get("commit", {}).get("message", "")[:100],  # Truncate message
            "author": commit.get("commit", {}).get("author", {}).get("name"),
            "date": commit.get("commit", {}).get("author", {}).get("date"),
            "url": commit.get("html_url")
        }
        for commit in commits
    ]

@tool("get_github_profile", args_schema=ProfileInput)
def get_github_profile(username: str = GITHUB_USERNAME) -> dict:
    """Fetch GitHub user profile information with filtered data."""
    url = f"{GITHUB_API_URL}/users/{username}"
    resp = requests.get(url, headers=HEADERS)
    resp.raise_for_status()
    profile = resp.json()
    return filter_profile_data(profile)

@tool("list_github_repos", args_schema=RepoInput)
def list_github_repos(username: str = GITHUB_USERNAME, limit: int = 10) -> List[dict]:
    """List public repositories for a GitHub user with filtered data and limits."""
    url = f"{GITHUB_API_URL}/users/{username}/repos"
    params = {
        "sort": "updated",  # Get most recently updated repos
        "per_page": min(limit, 15),  # Cap at 15 to prevent overload
        "type": "public"
    }
    resp = requests.get(url, headers=HEADERS, params=params)
    resp.raise_for_status()
    repos = resp.json()
    
    # Filter and limit the data
    return filter_repo_data(repos[:limit])

@tool("get_recent_commits", args_schema=CommitsInput)
def get_recent_commits(username: str = GITHUB_USERNAME, repo: str = "", limit: int = 5) -> List[dict]:
    """Get recent commits for a repository with filtered data."""
    if not repo:
        # If no repo specified, return empty list
        return []
    
    url = f"{GITHUB_API_URL}/repos/{username}/{repo}/commits"
    params = {"per_page": min(limit, 10)}  # Cap at 10 commits
    resp = requests.get(url, headers=HEADERS, params=params)
    resp.raise_for_status()
    commits = resp.json()
    
    # Filter and return essential commit data
    return filter_commit_data(commits) 