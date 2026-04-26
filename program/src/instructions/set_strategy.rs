use anchor_lang::prelude::*;
use crate::errors::VaultError;
use crate::state::vault::{VaultState, MAX_ENCRYPTED_PARAMS};

/// Stores FHE-encrypted strategy parameters on-chain.
///
/// The ciphertext encodes: target allocations per asset, risk thresholds,
/// rebalance trigger deltas, and stop-loss levels — all encrypted under the
/// owner's Encrypt-REFHE public key. The program never decrypts this blob;
/// it only commits to it via the SHA-256 hash so that execute_strategy can
/// prove operations are consistent with the registered params.
#[derive(Accounts)]
pub struct SetStrategyParams<'info> {
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

pub fn handler(
    ctx: Context<SetStrategyParams>,
    encrypted_params: Vec<u8>,
    params_hash: [u8; 32],
) -> Result<()> {
    require!(
        encrypted_params.len() <= MAX_ENCRYPTED_PARAMS,
        VaultError::ParamsTooLarge
    );

    let vault = &mut ctx.accounts.vault;

    // Copy ciphertext into fixed-size buffer.
    let len = encrypted_params.len();
    vault.strategy_params_ct[..len].copy_from_slice(&encrypted_params);
    // Zero any remaining bytes from a previous (potentially longer) ciphertext.
    vault.strategy_params_ct[len..].fill(0);
    vault.strategy_params_len = len as u16;
    vault.strategy_params_hash = params_hash;

    let clock = Clock::get()?;
    emit!(StrategyParamsSet {
        vault: vault.key(),
        params_hash,
        ciphertext_len: len as u16,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Strategy params updated. Ciphertext {} bytes, hash {:?}",
        len,
        &params_hash[..4]
    );
    Ok(())
}

#[event]
pub struct StrategyParamsSet {
    pub vault: Pubkey,
    pub params_hash: [u8; 32],
    pub ciphertext_len: u16,
    pub timestamp: i64,
}
