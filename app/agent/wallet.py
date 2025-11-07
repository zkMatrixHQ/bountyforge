import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

try:
    from cdp import Cdp, Wallet
except ImportError:
    Cdp = None
    Wallet = None

load_dotenv(Path(__file__).parent / ".env")

class CDPWallet:
    def __init__(self, api_key_id: Optional[str] = None, api_key_secret: Optional[str] = None):
        self.api_key_id = api_key_id or os.getenv("CDP_API_KEY_ID")
        self.api_key_secret = api_key_secret or os.getenv("CDP_API_KEY_SECRET")
        self.wallet = None
        self._configured = False
        
    def configure(self) -> bool:
        if Cdp is None:
            print("cdp-sdk not installed. Run: pip install cdp-sdk")
            return False
        
        try:
            if not self.api_key_id or not self.api_key_secret:
                print("CDP API credentials not found. Set CDP_API_KEY_ID and CDP_API_KEY_SECRET in .env file")
                print("Get credentials from: https://portal.cdp.coinbase.com/projects/api-keys")
                return False
            
            Cdp.configure(self.api_key_id, self.api_key_secret)
            self._configured = True
            print("CDP SDK configured successfully")
            return True
        except Exception as e:
            print(f"Error configuring CDP SDK: {e}")
            return False
    
    def create_or_load_wallet(self, wallet_id: Optional[str] = None) -> bool:
        if not self._configured:
            if not self.configure():
                return False
        
        if Wallet is None:
            print("cdp-sdk not installed. Run: pip install cdp-sdk")
            return False
        
        try:
            if wallet_id:
                self.wallet = Wallet.load(wallet_id)
                print(f"Loaded existing wallet: {wallet_id}")
            else:
                self.wallet = Wallet.create()
                print("Wallet created")
                print(f"Wallet ID: {self.wallet.id}")
                print(f"Public address: {self.wallet.default_address}")
                
                if hasattr(self.wallet, 'public_key'):
                    print(f"Public key: {self.wallet.public_key}")
                
                if hasattr(self.wallet, 'private_key'):
                    print(f"Private key: {self.wallet.private_key}")
                elif hasattr(self.wallet, 'seed'):
                    print(f"Seed: {self.wallet.seed}")
            
            return True
        except Exception as e:
            print(f"Error creating/loading wallet: {e}")
            return False
    
    def get_address(self) -> Optional[str]:
        if self.wallet:
            return self.wallet.default_address
        return None
    
    def get_balance(self) -> Optional[dict]:
        if not self.wallet:
            return None
        try:
            return self.wallet.balance()
        except Exception as e:
            print(f"Error getting balance: {e}")
            return None
