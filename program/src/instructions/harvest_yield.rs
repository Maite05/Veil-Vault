use anchor_lang::prelude::*;
use crate::errors::VaultError;
use crate::state::vault::VaultState;

/// Records yield (and returned principal) from a whitelisted protocol.
///
/// Capital deployment lifecycle:
///   1. `execute_strategy` — lamports leave vault PDA → protocol account.
///   2. Protocol generates yield off-chain (or on another chain via Ika).
///   3. Protocol transfers (principal + yield) back to the vault PDA directly.
///   4. Owner calls `harvest_yield` with the total returned amount.
///   5. Program verifies the lamports are actually in the vault, then updates
///      `net_value_lamports` and `total_yield_earned_lamports`.
///
/// The check is: vault's on-chain lamport balance must cover
/// (current net value + returned_lamports), ensuring the protocol transfer
/// happened before this instruction can succeed.
#[derive(Accounts)]
pub struct HarvestYield<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ VaultError::Unauthorized,
        constraint = !vault.is_paused @ VaultError::VaultPaused,
    )]
    pub vault: Account<'info, VaultState>,
}

pub fn handler(ctx: Context<HarvestYield>, returned_lamports: u64) -> Result<()> {
    require!(returned_lamports > 0, VaultError::ZeroDeposit);

    // Read actual on-chain balance before the mutable borrow.
    let actual_lamports = ctx.accounts.vault.to_account_info().lamports();
    let clock = Clock::get()?;

    let vault = &mut ctx.accounts.vault;

    // Verify the protocol has already sent the lamports back.
    // Invariant: actual_lamports = rent + net_value + returned (when returned is present).
    // Since rent > 0, checking actual >= net + returned is sufficient.
    let required = vault.net_value_lamports.saturating_add(returned_lamports);
    require!(actual_lamports >= required, VaultError::InsufficientBalance);

    // Update net value and track cumulative yield.
    vault.net_value_lamports = vault.net_value_lamports.saturating_add(returned_lamports);

    // Yield = how much net value has grown above total deposits.
    vault.total_yield_earned_lamports = vault
        .net_value_lamports
        .saturating_sub(vault.total_deposited_lamports);

    emit!(YieldHarvested {
        vault: vault.key(),
        owner: ctx.accounts.owner.key(),
        returned_lamports,
        new_net_value: vault.net_value_lamports,
        total_yield_earned: vault.total_yield_earned_lamports,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Yield harvested: {} lamports returned; net value now {}; cumulative yield {}",
        returned_lamports,
        vault.net_value_lamports,
        vault.total_yield_earned_lamports,
    );
    Ok(())
}

#[event]
pub struct YieldHarvested {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub returned_lamports: u64,
    pub new_net_value: u64,
    pub total_yield_earned: u64,
    pub timestamp: i64,
}
