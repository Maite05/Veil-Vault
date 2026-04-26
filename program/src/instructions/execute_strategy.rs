use anchor_lang::prelude::*;
use crate::errors::VaultError;
use crate::state::vault::VaultState;

/// Executes a strategy operation while enforcing on-chain guardrails.
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
///   4. If all checks pass the program emits the execution event. The operator
///      then submits the actual CPI to the target protocol separately.
#[derive(Accounts)]
pub struct ExecuteStrategy<'info> {
    /// The vault owner signs as operator (single-authority for MVP).
    /// Extendable to a delegated keeper by replacing has_one with a separate
    /// `operator` allowlist stored in VaultState.
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
}

pub fn handler(
    ctx: Context<ExecuteStrategy>,
    encrypted_op: Vec<u8>,
    op_proof: [u8; 64],
    protocol: Pubkey,
    amount_lamports: u64,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;

    // ── Guardrail 1: time-lock ────────────────────────────────────────────────
    if vault.last_executed_at > 0 {
        let elapsed = clock.unix_timestamp.saturating_sub(vault.last_executed_at);
        require!(elapsed >= vault.time_lock_secs, VaultError::TimeLockActive);
    }

    // ── Guardrail 2: spending limit ───────────────────────────────────────────
    require!(
        amount_lamports <= vault.spending_limit_lamports,
        VaultError::SpendingLimitExceeded
    );

    // ── Guardrail 3: protocol whitelist ───────────────────────────────────────
    let approved = (0..vault.approved_protocols_count as usize)
        .any(|i| vault.approved_protocols[i] == protocol);
    require!(approved, VaultError::ProtocolNotApproved);

    // ── Guardrail 4: max drawdown ─────────────────────────────────────────────
    // After the execution the vault's net value would drop by amount_lamports.
    // Reject if that would breach the drawdown threshold.
    let total = vault.total_deposited_lamports;
    if total > 0 {
        let new_net = vault.net_value_lamports.saturating_sub(amount_lamports);
        let drawdown_bps = ((total.saturating_sub(new_net)) as u64)
            .saturating_mul(10_000)
            / total;
        require!(
            drawdown_bps <= vault.max_drawdown_bps as u64,
            VaultError::MaxDrawdownExceeded
        );
    }

    // ── FHE proof check (devnet simulation) ──────────────────────────────────
    // Production: verify a ZK proof that encrypted_op is consistent with
    // vault.strategy_params_hash using the Encrypt-REFHE verifier.
    // Devnet MVP: verify that op_proof[..32] == SHA-256(encrypted_op || strategy_params_hash).
    // We use a simple hash commitment here to show the binding structure.
    verify_op_proof_simulated(&encrypted_op, &vault.strategy_params_hash, &op_proof)?;

    // ── Record execution ──────────────────────────────────────────────────────
    vault.net_value_lamports = vault.net_value_lamports.saturating_sub(amount_lamports);
    vault.last_executed_at = clock.unix_timestamp;

    emit!(StrategyExecuted {
        vault: vault.key(),
        operator: ctx.accounts.owner.key(),
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
    Ok(())
}

/// Simulated proof verification for devnet.
///
/// Checks that the first 32 bytes of op_proof equal:
///   SHA-256(encrypted_op || strategy_params_hash)[..32]
///
/// Uses SHA-256 (solana_program::hash) to match the TypeScript client
/// which computes the same preimage with Node's crypto.createHash("sha256").
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

    // Hash::as_ref() returns &[u8; 32] — the inner field is private in some
    // versions of solana_program so we use the public AsRef impl instead.
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
