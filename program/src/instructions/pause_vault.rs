use anchor_lang::prelude::*;
use crate::errors::VaultError;
use crate::state::vault::VaultState;

/// Toggle the vault's paused state. While paused, deposits, strategy execution,
/// and withdrawals are all blocked. Only the owner can pause or unpause.
#[derive(Accounts)]
pub struct SetPaused<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ VaultError::Unauthorized,
    )]
    pub vault: Account<'info, VaultState>,
}

pub fn handler(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
    ctx.accounts.vault.is_paused = paused;

    let clock = Clock::get()?;
    emit!(VaultPauseToggled {
        vault: ctx.accounts.vault.key(),
        owner: ctx.accounts.owner.key(),
        paused,
        timestamp: clock.unix_timestamp,
    });

    msg!("Vault {} paused={}", ctx.accounts.vault.key(), paused);
    Ok(())
}

#[event]
pub struct VaultPauseToggled {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub paused: bool,
    pub timestamp: i64,
}
