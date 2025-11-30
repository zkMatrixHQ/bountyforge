import os
import asyncio
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

try:
    from cdp import CdpClient
except ImportError:
    CdpClient = None

load_dotenv(Path(__file__).parent / ".env")

class CDPWallet:
    def __init__(self, api_key_id: Optional[str] = None, api_key_secret: Optional[str] = None, wallet_secret: Optional[str] = None):
        self.api_key_id = api_key_id or os.getenv("CDP_API_KEY_ID")
        self.api_key_secret = api_key_secret or os.getenv("CDP_API_KEY_SECRET")
        self.wallet_secret = wallet_secret or os.getenv("CDP_WALLET_SECRET")
        self.client = None
        self.wallet = None
        self._configured = False
        
    def configure(self) -> bool:
        if CdpClient is None:
            print("cdp-sdk not installed. Run: pip install cdp-sdk")
            return False
        
        try:
            if not self.api_key_id or not self.api_key_secret:
                print("CDP API credentials not found")
                return False
            
            self.client = CdpClient(
                api_key_id=self.api_key_id,
                api_key_secret=self.api_key_secret,
                wallet_secret=self.wallet_secret
            )
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
        
        if CdpClient is None:
            return False
        
        try:
            if wallet_id:
                self.wallet = asyncio.run(self.client.solana.get_account(wallet_id))
                print(f"Loaded wallet: {wallet_id}")
            else:
                self.wallet = asyncio.run(self.client.solana.create_account())
                print("Wallet created")
                print(f"Public address: {self.wallet.address}")
            
            return True
        except Exception as e:
            print(f"Error with wallet: {e}")
            return False
    
    def get_address(self) -> Optional[str]:
        if self.wallet:
            return self.wallet.address
        return None
    
    def get_signing_address(self) -> Optional[str]:
        keypair = self.get_signing_keypair()
        if keypair:
            return str(keypair.pubkey())
        return None
    
    def get_balance(self) -> Optional[dict]:
        if not self.wallet or not self.client:
            return None
        try:
            balances = asyncio.run(self.client.solana.list_token_balances(self.wallet.address))
            return balances
        except Exception as e:
            print(f"Error getting balance: {e}")
            return None
    
    def get_signing_keypair(self) -> Optional['SoldersKeypair']:
        try:
            from solders.keypair import Keypair as SoldersKeypair
            import json
            
            keypair_path = Path(__file__).parent / ".agent_keypair.json"
            
            if keypair_path.exists():
                with open(keypair_path, 'r') as f:
                    keypair_data = json.load(f)
                    keypair_bytes = bytes(keypair_data)
                    if len(keypair_bytes) == 64:
                        return SoldersKeypair.from_bytes(keypair_bytes)
            
            keypair = SoldersKeypair()
            full_keypair_bytes = bytes(keypair)
            with open(keypair_path, 'w') as f:
                json.dump(list(full_keypair_bytes), f)
            print(f"Created signing keypair: {keypair.pubkey()}")
            print(f"Fund this address with SOL for fees: {keypair.pubkey()}")
            return keypair
        except Exception as e:
            print(f"Error with signing keypair: {e}")
            return None
