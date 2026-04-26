use anchor_lang::prelude::*;
use crate::errors::VaultError;
use crate::state::vault::VaultState;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ VaultError::Unauthorized,
        constraint = !vault.is_paused @ VaultError::VaultPaused,
    )]
    pub vault: Account<'info, VaultState>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Withdraw>, amount_lamports: u64) -> Result<()> {
    let clock = Clock::get()?;

    // ── All guardrail checks + state update (mutable borrow scoped here) ─────
    // The borrow on ctx.accounts.vault MUST be dropped before we call
    // to_account_info() below for the lamport transfer.
    {
        let vault = &mut ctx.accounts.vault;

        // Time-lock
        if vault.last_executed_at > 0 {
            let elapsed = clock.unix_timestamp.saturating_sub(vault.last_executed_at);
            require!(elapsed >= vault.time_lock_secs, VaultError::TimeLockActive);
        }

        // Sufficient balance
        require!(
            vault.net_value_lamports >= amount_lamports,
            VaultError::InsufficientBalance
        );

        // Max drawdown guard
        let total = vault.total_deposited_lamports;
        if total > 0 {
            let new_net = vault.net_value_lamports.saturating_sub(amount_lamports);
            let drawdown_bps = total
                .saturating_sub(new_net)
                .saturating_mul(10_000)
                / total;
            require!(
                drawdown_bps <= vault.max_drawdown_bps as u64,
                VaultError::MaxDrawdownExceeded
            );
        }

        // Commit the accounting change before the lamport transfer.
        vault.net_value_lamports = vault.net_value_lamports.saturating_sub(amount_lamports);
    } // ← mutable borrow of ctx.accounts.vault dropped here

    // ── Transfer lamports from vault PDA → owner ──────────────────────────────
    // Direct lamport manipulation is safe now that the Account<VaultState>
    // mutable borrow has been released.
    let vault_info = ctx.accounts.vault.to_account_info();
    let owner_info = ctx.accounts.owner.to_account_info();

    **vault_info.try_borrow_mut_lamports()? -= amount_lamports;
    **owner_info.try_borrow_mut_lamports()? += amount_lamports;

    emit!(WithdrawalMade {
        vault: ctx.accounts.vault.key(),
        owner: ctx.accounts.owner.key(),
        amount_lamports,
        remaining_net_value: ctx.accounts.vault.net_value_lamports,
        timestamp: clock.unix_timestamp,
    });

    msg!("Withdrawal: {} lamports to owner", amount_lamports);
    Ok(())
}

#[event]
pub struct WithdrawalMade {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub amount_lamports: u64,
    pub remaining_net_value: u64,
    pub timestamp: i64,
}
