import hashlib
from typing import Optional, Dict, List
from solders.pubkey import Pubkey
from solders.keypair import Keypair as SoldersKeypair
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
import os


class BountyForgeClient:
    def __init__(self, program_id: str = "9Y6Z41eWLsfc8kY73WLBNeRN1NuiTBuMoADEecXGKnpZ", wallet_address: Optional[str] = None, wallet_keypair: Optional[SoldersKeypair] = None):
        self.program_id = program_id
        self.wallet_address = wallet_address
        self.wallet_keypair = wallet_keypair
        
    def hash_solution(self, solution: str) -> bytes:
        return hashlib.sha256(solution.encode()).digest()
    
    def generate_solution_id(self) -> int:
        import random
        return random.randint(1, 2**63 - 1)
    
    def _derive_attestation_pda(self, solution_id: int, program_id: Pubkey) -> tuple[Pubkey, int]:
        solution_id_buffer = solution_id.to_bytes(8, 'little')
        seeds = [b"attest", solution_id_buffer]
        return Pubkey.find_program_address_sync(seeds, program_id)
    
    def _derive_bounty_pda(self, bounty_id: int, program_id: Pubkey) -> tuple[Pubkey, int]:
        bounty_id_buffer = bounty_id.to_bytes(8, 'little')
        seeds = [b"bounty", bounty_id_buffer]
        return Pubkey.find_program_address_sync(seeds, program_id)
    
    def _derive_reputation_pda(self, agent_pubkey: Pubkey, program_id: Pubkey) -> tuple[Pubkey, int]:
        seeds = [b"rep", bytes(agent_pubkey)]
        return Pubkey.find_program_address_sync(seeds, program_id)
    
    async def attest_solution(self, solution_id: int, solution: str) -> Dict:
        return {"solution_id": solution_id, "solution_hash": self.hash_solution(solution).hex()}
    
    async def submit_solution(self, bounty_id: int, solution_id: int, solution: str) -> Dict:
        return {"bounty_id": bounty_id, "solution_id": solution_id, "solution_hash": self.hash_solution(solution).hex()}
    
    async def get_open_bounties(self) -> List[Dict]:
        bounties = [
            {
                "id": 100,
                "type": "wallet_intelligence",
                "bounty_type": "wallet_intelligence",
                "description": "Analyze wallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
                "reward": 1000000,
                "status": "open",
                "on_chain": True
            },
            {
                "id": 101,
                "type": "wallet_intelligence",
                "bounty_type": "wallet_intelligence",
                "description": "Analyze wallet 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                "reward": 2000000,
                "status": "open",
                "on_chain": True
            },
            {
                "id": 102,
                "type": "token_screening",
                "bounty_type": "token_screening",
                "description": "Screen Solana tokens for smart money inflow",
                "reward": 1500000,
                "status": "open",
                "on_chain": True
            }
        ]
        return bounties
    
    async def get_reputation(self, agent_address: str) -> Optional[Dict]:
        try:
            rpc_url = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
            client = AsyncClient(rpc_url)
            program_id = Pubkey.from_string(self.program_id)
            
            agent_pubkey = Pubkey.from_string(agent_address)
            seeds = [b"rep", bytes(agent_pubkey)]
            rep_pda, _ = Pubkey.find_program_address(seeds, program_id)
            
            account_info = await client.get_account_info(rep_pda)
            
            if account_info.value is None:
                return {
                    "score": 0,
                    "successful_bounties": 0,
                    "failed_bounties": 0,
                    "total_earned": 0
                }
            
            data = account_info.value.data
            if len(data) < 50:
                return {
                    "score": 0,
                    "successful_bounties": 0,
                    "failed_bounties": 0,
                    "total_earned": 0
                }
            
            score = int.from_bytes(data[32:40], 'little')
            successful = int.from_bytes(data[40:48], 'little')
            failed = int.from_bytes(data[48:56], 'little')
            earned = int.from_bytes(data[56:64], 'little')
            
            return {
                "score": score,
                "successful_bounties": successful,
                "failed_bounties": failed,
                "total_earned": earned
            }
        except Exception as e:
            print(f"Error fetching reputation: {e}")
            return None