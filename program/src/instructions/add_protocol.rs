use anchor_lang::prelude::*;
use crate::errors::VaultError;
use crate::state::vault::{VaultState, MAX_APPROVED_PROTOCOLS};

/// Adds a protocol to the vault's approved execution whitelist.
///
/// Only approved protocol program IDs may be used as targets in execute_strategy.
/// This enforces that the vault owner explicitly opts into each protocol,
/// providing a plaintext guardrail even though the strategy logic is encrypted.
#[derive(Accounts)]
pub struct AddApprovedProtocol<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ VaultError::Unauthorized,
    )]
    pub vault: Account<'info, VaultState>,
}

pub fn handler(ctx: Context<AddApprovedProtocol>, protocol: Pubkey) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    require!(
        (vault.approved_protocols_count as usize) < MAX_APPROVED_PROTOCOLS,
        VaultError::ProtocolListFull
    );

    let idx = vault.approved_protocols_count as usize;
    vault.approved_protocols[idx] = protocol;
    vault.approved_protocols_count += 1;

    msg!("Protocol approved: {}", protocol);
    Ok(())
}
