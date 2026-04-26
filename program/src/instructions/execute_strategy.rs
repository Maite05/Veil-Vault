use anchor_lang::prelude::*;
use crate::errors::VaultError;
use crate::state::vault::VaultState;

/// Executes a strategy operation while enforcing on-chain guardrails AND
/// transferring lamports from the vault PDA to the whitelisted protocol.
///
/// How the FHE + guardrail model works:
///   1. Off-chain, the operator evaluates the encrypted strategy params
///      homomorphically to decide WHAT to do (e.g. rebalance X lamports into
///      protocol Y). The result is an encrypted operation descriptor.
///   2. The operator also computes `op_proof` — a commitment that binds the
///      operation to the stored `strategy_params_hash` (SHA-256(op || hash)).
///      On devnet this is simulated; production would use a ZK-SNARK.
///   3. The Solana program verifies the proof and enforces plaintext guardrails:
///      time-lock, spending limit, protocol whitelist, max drawdown.
///   4. If all checks pass the program transfers `amount_lamports` from the
///      vault PDA directly to the protocol account (real capital deployment).
///   5. The protocol later returns principal + yield; the owner calls
///      `harvest_yield` to record the gain.
#[derive(Accounts)]
pub struct ExecuteStrategy<'info> {
    /// The vault owner signs as operator (single-authority for MVP).
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ VaultError::Unauthorized,
        constraint = !vault.is_paused @ VaultError::VaultPaused,
        constraint = vault.strategy_params_len > 0 @ VaultError::NoStrategyParams,
    )]
    pub vault: Account<'info, VaultState>,

    /// The whitelisted protocol that receives the deployed capital.
    /// Validated against vault.approved_protocols inside the handler.
    /// CHECK: key is checked against the on-chain approved_protocols whitelist.
    #[account(mut)]
    pub protocol_account: UncheckedAccount<'info>,
}

pub fn handler(
    ctx: Context<ExecuteStrategy>,
    encrypted_op: Vec<u8>,
    op_proof: [u8; 64],
    amount_lamports: u64,
) -> Result<()> {
    // Capture keys before the mutable borrow of vault.
    let protocol = ctx.accounts.protocol_account.key();
    let vault_key = ctx.accounts.vault.key();
    let owner_key = ctx.accounts.owner.key();
    let clock = Clock::get()?;

    // ── All guardrail checks + state update (scoped mutable borrow) ──────────
    {
        let vault = &mut ctx.accounts.vault;

        // ── Guardrail 1: time-lock ────────────────────────────────────────────
        if vault.last_executed_at > 0 {
            let elapsed = clock.unix_timestamp.saturating_sub(vault.last_executed_at);
            require!(elapsed >= vault.time_lock_secs, VaultError::TimeLockActive);
        }

        // ── Guardrail 2: spending limit ───────────────────────────────────────
        require!(
            amount_lamports <= vault.spending_limit_lamports,
            VaultError::SpendingLimitExceeded
        );

        // ── Guardrail 3: protocol whitelist ───────────────────────────────────
        let approved = (0..vault.approved_protocols_count as usize)
            .any(|i| vault.approved_protocols[i] == protocol);
        require!(approved, VaultError::ProtocolNotApproved);

        // ── Guardrail 4: max drawdown ─────────────────────────────────────────
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

        // ── Sufficient balance ────────────────────────────────────────────────
        require!(
            vault.net_value_lamports >= amount_lamports,
            VaultError::InsufficientBalance
        );

        // ── FHE proof check (devnet simulation) ───────────────────────────────
        verify_op_proof_simulated(&encrypted_op, &vault.strategy_params_hash, &op_proof)?;

        // ── Commit state changes ──────────────────────────────────────────────
        vault.net_value_lamports = vault.net_value_lamports.saturating_sub(amount_lamports);
        vault.last_executed_at = clock.unix_timestamp;
    } // ← mutable borrow of vault dropped here

    emit!(StrategyExecuted {
        vault: vault_key,
        operator: owner_key,
        protocol,
        amount_lamports,
        encrypted_op_len: encrypted_op.len() as u16,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Strategy executed: {} lamports → protocol {}",
        amount_lamports,
        protocol
    );

    // ── Transfer lamports: vault PDA → protocol account ───────────────────────
    // Direct lamport manipulation is valid for program-owned PDAs. The mutable
    // borrow on Account<VaultState> is already released above.
    let vault_info = ctx.accounts.vault.to_account_info();
    let protocol_info = ctx.accounts.protocol_account.to_account_info();

    **vault_info.try_borrow_mut_lamports()? -= amount_lamports;
    **protocol_info.try_borrow_mut_lamports()? += amount_lamports;

    Ok(())
}

/// Simulated proof verification for devnet.
///
/// Checks that the first 32 bytes of op_proof equal:
///   SHA-256(encrypted_op || strategy_params_hash)[..32]
///
/// Production: replace with a ZK-SNARK verifier from the Encrypt-REFHE SDK.
fn verify_op_proof_simulated(
    encrypted_op: &[u8],
    params_hash: &[u8; 32],
    op_proof: &[u8; 64],
) -> Result<()> {
    use anchor_lang::solana_program::hash::hash;

    let mut preimage = Vec::with_capacity(encrypted_op.len() + 32);
    preimage.extend_from_slice(encrypted_op);
    preimage.extend_from_slice(params_hash);

    let digest = hash(&preimage);

    require!(
        digest.as_ref() == &op_proof[..32],
        VaultError::InvalidFheProof
    );
    Ok(())
}

#[event]
pub struct StrategyExecuted {
    pub vault: Pubkey,
    pub operator: Pubkey,
    pub protocol: Pubkey,
    pub amount_lamports: u64,
    pub encrypted_op_len: u16,
    pub timestamp: i64,
}
