import requests
from typing import Dict, Optional

class X402Gateway:
    def __init__(self, base_url: str = "http://localhost:3002"):
        self.base_url = base_url
    
    def pay_for_switchboard(self, amount: float) -> Optional[Dict]:
        try:
            response = requests.post(
                f"{self.base_url}/api/switchboard",
                headers={"X-402-Payment": str(amount)},
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error calling x402 gateway: {e}")
            return None
    
    def pay_for_llm(self, amount: float) -> Optional[Dict]:
        try:
            response = requests.post(
                f"{self.base_url}/api/llm",
                headers={"X-402-Payment": str(amount)},
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error calling x402 gateway: {e}")
            return None
    
    def pay_for_data(self, amount: float) -> Optional[Dict]:
        try:
            response = requests.post(
                f"{self.base_url}/api/data",
                headers={"X-402-Payment": str(amount)},
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error calling x402 gateway: {e}")
            return None

