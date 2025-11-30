import requests
from typing import Dict, Optional


class MalloryMCP:
    def __init__(self, base_url: str = "http://localhost:3001"):
        self.base_url = base_url
    
    def reason(self, bounty_description: str, context: Optional[str] = None) -> Optional[Dict]:
        try:
            response = requests.post(
                f"{self.base_url}/mcp/reason",
                json={
                    "bounty": bounty_description,
                    "context": context
                },
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"MCP error: {e}")
            return None
