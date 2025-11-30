import asyncio
import time
import re
from typing import List, Dict, Optional, Any
from wallet import CDPWallet
from mcp import MalloryMCP
from x402 import X402Gateway
from contract import BountyForgeClient


class BountyAgent:
    def __init__(self):
        self.discovered_bounties: List[Dict] = []
        self.last_analysis: Optional[Dict[str, Any]] = None
        self.min_reward_threshold = 500000
        
        self.wallet = CDPWallet()
        self.wallet.configure()
        self.wallet.create_or_load_wallet()
        
        wallet_address = self.wallet.get_address()
        signing_keypair = self.wallet.get_signing_keypair()
        
        self.mcp = MalloryMCP()
        self.x402 = X402Gateway()
        self.contract = BountyForgeClient(
            wallet_address=wallet_address,
            wallet_keypair=signing_keypair
        )

    def filter_bounties(self, bounties: List[Dict]) -> List[Dict]:
        filtered = []
        for bounty in bounties:
            if bounty.get("status", "").lower() != "open":
                continue
            if bounty.get("reward", 0) < self.min_reward_threshold:
                continue
            filtered.append(bounty)
        return filtered

    def discover_bounties(self) -> List[Dict]:
        try:
            on_chain_bounties = asyncio.run(self.contract.get_open_bounties())
            filtered = self.filter_bounties(on_chain_bounties)
            
            seen_ids = set()
            unique_bounties = []
            for bounty in filtered:
                bounty_id = bounty.get("id")
                if bounty_id and bounty_id not in seen_ids:
                    seen_ids.add(bounty_id)
                    unique_bounties.append(bounty)
            
            return unique_bounties
        except Exception as e:
            print(f"Error discovering bounties: {e}")
            return []

    def select_bounty(self, bounties: List[Dict]) -> Optional[Dict]:
        if not bounties:
            return None
        sorted_bounties = sorted(bounties, key=lambda x: x.get("reward", 0), reverse=True)
        return sorted_bounties[0]
    
    def _extract_wallet_address(self, text: str) -> Optional[str]:
        solana_pattern = r'\b[1-9A-HJ-NP-Za-km-z]{32,44}\b'
        solana_match = re.search(solana_pattern, text)
        if solana_match:
            addr = solana_match.group(0)
            if len(addr) >= 32:
                return addr
        return None
    
    def _calculate_smart_money_score(self, labels: List[Dict], pnl_summary: Dict, pnl: Dict) -> float:
        score = 0.0
        
        label_items = labels.get("labels", []) if isinstance(labels, dict) else labels
        for label in label_items:
            label_name = (label.get("label") or "").lower()
            confidence = float(label.get("confidence", 0))
            if any(x in label_name for x in ["smart", "whale", "influencer"]):
                score += 0.3 * confidence
        
        if pnl_summary:
            win_rate = float(pnl_summary.get("win_rate", 0))
            if win_rate > 0.6:
                score += 0.3
            elif win_rate > 0.5:
                score += 0.2
        
        if pnl:
            pnl_pct = float(pnl.get("pnl_percentage", 0))
            if pnl_pct > 100:
                score += 0.2
            elif pnl_pct > 50:
                score += 0.15
            elif pnl_pct > 0:
                score += 0.1
        
        return min(score, 1.0)
    
    def _calculate_risk_score(self, balance: Dict, txs: Dict, pnl: Dict) -> float:
        risk = 0.5
        
        total_usd = balance.get("total_usd_value", 0) if isinstance(balance, dict) else 0
        if total_usd < 1000:
            risk += 0.2
        elif total_usd > 100000:
            risk -= 0.1
        
        tx_items = (txs.get("transactions", []) if isinstance(txs, dict) else [])[:10]
        if len(tx_items) < 5:
            risk += 0.1
        
        if pnl:
            pnl_pct = float(pnl.get("pnl_percentage", 0))
            if pnl_pct < -50:
                risk += 0.2
            elif pnl_pct < 0:
                risk += 0.1
        
        return max(0.0, min(risk, 1.0))
    
    def _calculate_confidence(self, data_quality: Dict) -> float:
        confidence = 0.5
        if data_quality.get("has_balance"):
            confidence += 0.15
        if data_quality.get("has_pnl"):
            confidence += 0.15
        if data_quality.get("has_labels"):
            confidence += 0.1
        if data_quality.get("has_transactions"):
            confidence += 0.1
        return min(confidence, 1.0)
    
    def generate_solution(self, bounty: Dict, reason_result: Dict, needs: List[str]) -> Optional[str]:
        self.last_analysis = None
        bounty_type = (bounty.get("type") or bounty.get("bounty_type") or "").lower()
        
        if not bounty_type:
            description = (bounty.get('description', '') or '').lower()
            if any(word in description for word in ['wallet', 'analyze wallet', 'wallet intelligence']):
                bounty_type = "wallet_intelligence"
            elif any(word in description for word in ['token', 'screening', 'find tokens']):
                bounty_type = "token_screening"
        
        if bounty_type == "wallet_intelligence":
            return self._generate_wallet_intelligence_solution(bounty, reason_result)
        if bounty_type == "token_screening":
            return self._generate_token_screening_solution(bounty, reason_result)

        description = bounty.get('description', '')
        wallet_addr = self._extract_wallet_address(description)
        if wallet_addr:
            bounty['wallet_address'] = wallet_addr
            return self._generate_wallet_intelligence_solution(bounty, reason_result)
        
        return f"Solution for bounty: {description}"

    def _generate_wallet_intelligence_solution(self, bounty: Dict, reason_result: Dict) -> Optional[str]:
        wallet_address = (
            bounty.get("wallet_address") or 
            reason_result.get("wallet") or 
            self._extract_wallet_address(bounty.get("description", ""))
        )
        chain = bounty.get("chain", "solana")
        
        if not wallet_address:
            return "No wallet address found"

        print(f"Analyzing wallet {wallet_address}...")
        
        balance = self.x402.get_current_balance(wallet_address, chain) or {}
        txs = self.x402.get_transactions(wallet_address, chain) or {}
        pnl = self.x402.get_pnl(wallet_address, chain) or {}
        pnl_summary = self.x402.get_pnl_summary(wallet_address, chain) or {}
        labels = self.x402.get_labels(wallet_address, chain) or {}

        data_quality = {
            "has_balance": bool(balance.get("total_usd_value") is not None),
            "has_pnl": bool(pnl or pnl_summary),
            "has_labels": bool(labels.get("labels") if isinstance(labels, dict) else labels),
            "has_transactions": bool(txs.get("transactions") if isinstance(txs, dict) else txs)
        }

        smart_money_score = self._calculate_smart_money_score(labels, pnl_summary, pnl)
        is_smart_money = smart_money_score >= 0.5
        risk_score = self._calculate_risk_score(balance, txs, pnl)
        confidence = self._calculate_confidence(data_quality)

        total_usd = balance.get("total_usd_value", 0) if isinstance(balance, dict) else 0
        pnl_30d = float(pnl.get("pnl_percentage", 0)) if pnl else 0.0
        
        label_items = labels.get("labels", []) if isinstance(labels, dict) else labels
        activity_pattern = "Unknown"
        if label_items:
            label_names = [lbl.get("label", "") for lbl in label_items[:3]]
            activity_pattern = ", ".join(label_names) or "Standard"
        elif txs.get("transactions") if isinstance(txs, dict) else []:
            tx_count = len(txs.get("transactions", []))
            if tx_count > 100:
                activity_pattern = "High-frequency trader"
            elif tx_count > 20:
                activity_pattern = "Active trader"
            else:
                activity_pattern = "Low activity"

        lines = [
            "=" * 80,
            "WALLET INTELLIGENCE REPORT",
            "=" * 80,
            f"Wallet: {wallet_address}",
            f"Chain: {chain}",
            "",
            "ANALYSIS:",
            f"  Smart Money: {'YES' if is_smart_money else 'NO'} (confidence: {confidence:.0%})",
            f"  Risk Score: {risk_score:.2f}",
            f"  PnL (30d): {pnl_30d:+.1f}%",
            f"  Activity: {activity_pattern}",
            "",
            "METRICS:",
            f"  Balance: ${total_usd:,.2f}",
            f"  Smart Score: {smart_money_score:.2f}",
        ]

        if pnl_summary and isinstance(pnl_summary, dict):
            lines.append(f"  Win Rate: {float(pnl_summary.get('win_rate', 0))*100:.1f}%")

        lines.append("=" * 80)

        summary = "\n".join(lines)
        self.last_analysis = {
            "type": "wallet_intelligence",
            "wallet": wallet_address,
            "chain": chain,
            "is_smart_money": is_smart_money,
            "confidence": confidence,
            "risk_score": risk_score,
            "summary": summary
        }
        return summary

    def _generate_token_screening_solution(self, bounty: Dict, reason_result: Dict) -> Optional[str]:
        chain = bounty.get("chain", "solana")
        filters = {
            "min_volume_usd": bounty.get("min_volume_usd", 1_000_000),
            "min_holders": bounty.get("min_holders", 1_000),
            "min_holder_growth": bounty.get("min_holder_growth", 5)
        }

        print(f"Screening tokens on {chain}...")
        
        netflows = self.x402.get_smart_money_netflows([chain]) or {}
        screener = self.x402.get_token_screener(chain, filters, page=1, per_page=10) or {}
        tokens = screener.get("tokens", []) if isinstance(screener, dict) else []

        ranked_tokens = []
        net_items = netflows.get("netflows", []) if isinstance(netflows, dict) else []
        netflow_map = {item.get("token_address"): item for item in net_items[:20]} if net_items else {}

        for token in tokens:
            token_address = token.get("token_address") or token.get("token")
            volume = float(token.get("volume_24h_usd", 0))
            holders = int(token.get("holders", 0))
            growth = float(token.get("holder_growth_24h", 0))
            price_change = float(token.get("price_change_24h", 0))
            
            netflow_data = netflow_map.get(token_address, {})
            inflow = float(netflow_data.get("netflow_usd", 0))
            
            confidence = 0.5
            if volume > filters["min_volume_usd"] * 2:
                confidence += 0.2
            if holders > filters["min_holders"] * 2:
                confidence += 0.15
            if growth > filters["min_holder_growth"] * 2:
                confidence += 0.15
            if inflow > 0:
                confidence += 0.1
            
            ranked_tokens.append({
                "token": token.get("token", token_address),
                "inflow": round(inflow, 2),
                "confidence": round(min(confidence, 1.0), 2),
                "volume": volume,
                "holders": holders,
                "growth": growth,
                "price_change": price_change
            })

        ranked_tokens.sort(key=lambda x: (x["confidence"], x["inflow"]), reverse=True)
        top_tokens = ranked_tokens[:5]

        lines = [
            "=" * 80,
            "TOKEN SCREENING REPORT",
            "=" * 80,
            f"Chain: {chain}",
            "",
            "TOP TOKENS:"
        ]

        if top_tokens:
            for i, token in enumerate(top_tokens, 1):
                lines.append(f"{i}. {token['token']} (confidence: {token['confidence']:.0%})")
                lines.append(f"   Inflow: ${token['inflow']:,.0f}")
                lines.append(f"   Volume: ${token['volume']:,.0f}")
        else:
            lines.append("  No tokens matched filters")

        lines.append("=" * 80)

        summary = "\n".join(lines)
        self.last_analysis = {
            "type": "token_screening",
            "chain": chain,
            "summary": summary,
            "tokens": top_tokens
        }
        return summary

    def scan_loop(self, interval_seconds: int = 300):
        print("Agent started")
        wallet_address = self.wallet.get_address()
        if wallet_address:
            print(f"Wallet: {wallet_address}")
        
        print(f"Scanning every {interval_seconds}s...\n")
        
        while True:
            try:
                print(f"[{time.strftime('%H:%M:%S')}] Scanning...")
                bounties = self.discover_bounties()
                
                if bounties:
                    print(f"Found {len(bounties)} bounties")
                    selected = self.select_bounty(bounties)
                    
                    if selected:
                        bounty_id = selected.get('id')
                        print(f"\nBounty #{bounty_id}: {selected.get('description')[:60]}...")
                        print(f"Reward: {selected.get('reward', 0) / 1e6:.2f} USDC")
                        
                        reason_result = self.mcp.reason(selected.get('description', ''))
                        needs = reason_result.get('needs', []) if reason_result else []
                        
                        solution = self.generate_solution(selected, reason_result or {}, needs)
                        if solution:
                            print(f"\n{solution}\n")
                else:
                    print("No bounties found")
                
                print(f"Waiting {interval_seconds}s...\n")
                time.sleep(interval_seconds)
                
            except KeyboardInterrupt:
                print("\nAgent stopped")
                break
            except Exception as e:
                print(f"Error: {e}")
                time.sleep(interval_seconds)