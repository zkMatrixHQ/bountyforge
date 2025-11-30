import requests
from typing import Dict, Optional, Any, List


class X402Gateway:
    def __init__(self, base_url: str = "http://localhost:3002"):
        self.base_url = base_url.rstrip("/")

    def _post(self, path: str, payment: float, payload: Optional[Dict[str, Any]] = None) -> Optional[Dict]:
        url = f"{self.base_url}{path}"
        try:
            response = requests.post(
                url,
                headers={
                    "X-402-Payment": str(payment),
                    "Content-Type": "application/json"
                },
                json=payload or {},
                timeout=15
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Gateway error {path}: {e}")
            return None

    def get_current_balance(self, address: str, chain: str = "solana") -> Optional[Dict]:
        return self._post("/api/nansen/current-balance", 0.01, {"address": address, "chain": chain})

    def get_transactions(self, address: str, chain: str = "solana", limit: int = 50, page: int = 1) -> Optional[Dict]:
        return self._post("/api/nansen/transactions", 0.01, {"address": address, "chain": chain, "limit": limit, "page": page})

    def get_pnl(self, address: str, chain: str = "solana", page: int = 1, per_page: int = 100) -> Optional[Dict]:
        return self._post("/api/nansen/pnl", 0.01, {"address": address, "chain": chain, "page": page, "per_page": per_page})

    def get_pnl_summary(self, address: str, chain: str = "solana") -> Optional[Dict]:
        return self._post("/api/nansen/pnl-summary", 0.01, {"address": address, "chain": chain})

    def get_labels(self, address: str, chain: str = "solana") -> Optional[Dict]:
        return self._post("/api/nansen/labels", 0.01, {"address": address, "chain": chain})

    def get_smart_money_netflows(self, chains: Optional[List[str]] = None, page: int = 1, per_page: int = 100) -> Optional[Dict]:
        return self._post("/api/nansen/smart-money-netflows", 0.01, {"chains": chains or ["solana"], "page": page, "per_page": per_page})

    def get_token_screener(self, chain: str = "solana", filters: Optional[Dict[str, Any]] = None, page: int = 1, per_page: int = 50) -> Optional[Dict]:
        payload = {"chain": chain, "page": page, "per_page": per_page}
        if filters:
            payload.update(filters)
        return self._post("/api/nansen/token-screener", 0.01, payload)

    def get_flows(self, address: str, chain: str = "solana", page: int = 1, per_page: int = 50) -> Optional[Dict]:
        return self._post("/api/nansen/flows", 0.01, {"address": address, "chain": chain, "page": page, "per_page": per_page})

    def get_flow_intelligence(self, token_address: str, chain: str = "solana") -> Optional[Dict]:
        return self._post("/api/nansen/flow-intelligence", 0.01, {"token_address": token_address, "chain": chain})