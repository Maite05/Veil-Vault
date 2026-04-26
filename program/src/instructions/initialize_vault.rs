use anchor_lang::prelude::*;
use crate::state::vault::{VaultState, MAX_APPROVED_PROTOCOLS, MAX_ENCRYPTED_PARAMS, MAX_ENCRYPTED_PERF};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeVaultParams {
    /// Owner's Encrypt-REFHE public key (32-byte compressed form).
    pub fhe_pubkey: [u8; 32],
    /// Max drawdown in basis points before the vault is locked (e.g. 1000 = 10 %).
    pub max_drawdown_bps: u16,
    /// Max lamports that can leave in a single strategy execution.
    pub spending_limit_lamports: u64,
    /// Minimum seconds between strategy executions (time-lock).
    pub time_lock_secs: i64,
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = VaultState::space(),
        seeds = [b"vault", owner.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, VaultState>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeVault>, params: InitializeVaultParams) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;

    vault.owner = ctx.accounts.owner.key();
    vault.bump = ctx.bumps.vault;
    vault.dwallet = None;

    vault.fhe_pubkey = params.fhe_pubkey;
    vault.strategy_params_hash = [0u8; 32];
    vault.strategy_params_ct = [0u8; MAX_ENCRYPTED_PARAMS];
    vault.strategy_params_len = 0;

    vault.total_deposited_lamports = 0;
    vault.net_value_lamports = 0;
    vault.max_drawdown_bps = params.max_drawdown_bps;
    vault.spending_limit_lamports = params.spending_limit_lamports;
    vault.time_lock_secs = params.time_lock_secs;
    vault.last_executed_at = 0;

    vault.approved_protocols = [Pubkey::default(); MAX_APPROVED_PROTOCOLS];
    vault.approved_protocols_count = 0;

    vault.perf_summary_ct = [0u8; MAX_ENCRYPTED_PERF];
    vault.perf_summary_len = 0;
    vault.is_paused = false;
    vault.created_at = clock.unix_timestamp;

    emit!(VaultInitialized {
        vault: vault.key(),
        owner: vault.owner,
        max_drawdown_bps: vault.max_drawdown_bps,
        spending_limit_lamports: vault.spending_limit_lamports,
        time_lock_secs: vault.time_lock_secs,
        timestamp: clock.unix_timestamp,
    });

    msg!("VeilVault initialised: {}", vault.key());
    Ok(())
}

#[event]
pub struct VaultInitialized {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub max_drawdown_bps: u16,
    pub spending_limit_lamports: u64,
    pub time_lock_secs: i64,
    pub timestamp: i64,
}
