import hashlib
from typing import Optional, Dict
from pathlib import Path


class BountyForgeClient:
    def __init__(self, program_id: str = "DUYYaLDvkWfFYKB8HshseMi6f5X9ShxaydsfrJLrkGMM"):
        self.program_id = program_id
        
    def hash_solution(self, solution: str) -> bytes:
        return hashlib.sha256(solution.encode()).digest()
    
    def generate_solution_id(self) -> int:
        import random
        return random.randint(1, 2**63 - 1)
    
    def prepare_attestation(self, solution_id: int, solution: str) -> Dict:
        solution_hash = self.hash_solution(solution)
        return {
            "solution_id": solution_id,
            "solution_hash": solution_hash.hex(),
            "solution": solution
        }
    
    def prepare_submission(self, bounty_id: int, solution_id: int, solution: str) -> Dict:
        solution_hash = self.hash_solution(solution)
        return {
            "bounty_id": bounty_id,
            "solution_id": solution_id,
            "solution_hash": solution_hash.hex(),
            "solution": solution
        }
    
    async def attest_solution(self, solution_id: int, solution: str) -> Dict:
        return self.prepare_attestation(solution_id, solution)
    
    async def submit_solution(self, bounty_id: int, solution_id: int, solution: str) -> Dict:
        return self.prepare_submission(bounty_id, solution_id, solution)

