import requests
from typing import List
from pydantic import BaseModel, Field
from langchain_core.tools import tool

PORTFOLIO_API_URL = "https://daveloper.dev/api/projects"

class PortfolioInput(BaseModel):
    endpoint: str = Field(default=PORTFOLIO_API_URL, description="Portfolio API endpoint")

@tool("get_portfolio_projects", args_schema=PortfolioInput)
def get_portfolio_projects(endpoint: str) -> List[dict]:
    """Fetch project list from the portfolio site."""
    resp = requests.get(endpoint)
    resp.raise_for_status()
    return resp.json() 