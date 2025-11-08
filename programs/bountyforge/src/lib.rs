#![allow(unexpected_cfgs, deprecated)]

use anchor_lang::prelude::*;
use instructions::*;
mod constants;
mod instructions;
mod state;
declare_id!("DUYYaLDvkWfFYKB8HshseMi6f5X9ShxaydsfrJLrkGMM");

#[program]
pub mod bountyforge {
    use super::*;
    pub fn post_bounty(
        ctx: Context<PostBounty>,
        bounty_id: u64,
        description: String,
        reward: u64,
    ) -> Result<()> {
        let bump = ctx.bumps.bounty;
        ctx.accounts
            .post_bounty(bounty_id, description, reward, bump)
    }
}
