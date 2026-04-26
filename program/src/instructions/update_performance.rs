use anchor_lang::prelude::*;
use crate::errors::VaultError;
use crate::state::vault::{VaultState, MAX_ENCRYPTED_PERF};

/// Stores an FHE-encrypted performance summary in the vault.
///
/// The summary encodes P&L, yield earned, and risk metrics — all encrypted
/// under the owner's Encrypt-REFHE public key. Only the owner can decrypt it
/// using their private key off-chain. On-chain, the summary is opaque bytes.
#[derive(Accounts)]
pub struct UpdatePerformance<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ VaultError::Unauthorized,
    )]
    pub vault: Account<'info, VaultState>,
}

pub fn handler(
    ctx: Context<UpdatePerformance>,
    encrypted_summary: Vec<u8>,
) -> Result<()> {
    require!(
        encrypted_summary.len() <= MAX_ENCRYPTED_PERF,
        VaultError::PerformanceSummaryTooLarge
    );

    let vault = &mut ctx.accounts.vault;
    let len = encrypted_summary.len();
    vault.perf_summary_ct[..len].copy_from_slice(&encrypted_summary);
    vault.perf_summary_ct[len..].fill(0);
    vault.perf_summary_len = len as u16;

    let clock = Clock::get()?;
    emit!(PerformanceUpdated {
        vault: vault.key(),
        summary_len: len as u16,
        timestamp: clock.unix_timestamp,
    });

    msg!("Encrypted performance summary updated ({} bytes)", len);
    Ok(())
}

#[event]
pub struct PerformanceUpdated {
    pub vault: Pubkey,
    pub summary_len: u16,
    pub timestamp: i64,
}
