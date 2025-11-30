use crate::{constants::ANCHOR_DISCRIMINATOR};
use crate::state::{Bounty, BountyStatus, BountyType};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::{get_associated_token_address, AssociatedToken};
use anchor_spl::token::{transfer, Token, TokenAccount, Transfer};

#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct PostBounty<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 + // discriminator
                8 + // id: u64
                1 + // bounty_type: BountyType enum
                4 + 50 + // description: String (4 byte length + 50 chars max)
                8 + // reward: u64
                1 + 32 + // solution_hash: Option<[u8; 32]> (1 byte Some/None tag + 32 bytes)
                1 + // status: BountyStatus enum
                32 + // creator: Pubkey
                1 + // bump: u8
                32, // extra padding to ensure enough space
        seeds = [b"bounty", bounty_id.to_le_bytes().as_ref()],
        bump
    )]
    pub bounty: Account<'info, Bounty>,

    /// CHECK: USDC mint address (validated by token account)
    pub usdc_mint: AccountInfo<'info>,

    #[account(
        mut,
        constraint = creator_token_account.mint == usdc_mint.key(),
        constraint = creator_token_account.owner == creator.key()
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    /// CHECK: Bounty token account - will be initialized by ATA program
    /// Validated in instruction handler
    #[account(mut)]
    pub bounty_token_account: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> PostBounty<'info> {
    pub fn post_bounty(
        &mut self,
        bounty_id: u64,
        bounty_type: BountyType,
        description: String,
        reward: u64,
        bumps: &PostBountyBumps,
    ) -> Result<()> {
        // 1. Initialize bounty account - must be done first before any transfers
        // Using set_inner with init constraint - Anchor handles initialization
        self.bounty.set_inner(Bounty {
            id: bounty_id,
            bounty_type,
            description,
            reward,
            solution_hash: None,
            status: BountyStatus::Open,
            creator: self.creator.key(),
            bump: bumps.bounty,
        });

        // 2. Verify the bounty token account is correctly derived
        let expected_ata = get_associated_token_address(&self.bounty.key(), &self.usdc_mint.key());
        require!(
            self.bounty_token_account.key() == expected_ata,
            anchor_lang::error::ErrorCode::ConstraintTokenMint
        );

        // 3. Verify the token account is initialized (has data)
        require!(
            !self.bounty_token_account.data_is_empty(),
            anchor_lang::error::ErrorCode::AccountNotInitialized
        );

        // 4. Transfer USDC from creator to bounty PDA token account (escrow)
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = Transfer {
            from: self.creator_token_account.to_account_info(),
            to: self.bounty_token_account.clone(),
            authority: self.creator.to_account_info(),
        };

        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

        transfer(cpi_context, reward)?;

        Ok(())
    }
}