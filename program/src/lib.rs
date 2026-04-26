use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

// Generated keypair stored at program-keypair.json (gitignored).
// After `anchor deploy` this is the on-chain address.
declare_id!("5Jn23ZQaF8LVbm5WQASc7QWcAhq9QPLJQGFxmC2gUwgB");

#[program]
pub mod veil_vault {
    use super::*;

    // ── Vault lifecycle ───────────────────────────────────────────────────────

    /// Initialise a new VeilVault. Registers the owner's FHE public key and
    /// sets plaintext guardrails (drawdown cap, spending limit, time-lock).
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        params: InitializeVaultParams,
    ) -> Result<()> {
        initialize_vault::handler(ctx, params)
    }

    // ── Ika dWallet (bridgeless custody) ──────────────────────────────────────

    /// Registers an Ika dWallet with this vault.
    ///
    /// The dWallet is created off-chain via the Ika SDK (2PC-MPC ceremony on
    /// Sui devnet) and then bound here so the Solana program can enforce
    /// guardrails on its signing authority. Deposits from the dWallet are
    /// considered "bridgeless" — native assets, no wrapping.
    pub fn create_dwallet(
        ctx: Context<CreateDWallet>,
        params: CreateDWalletParams,
    ) -> Result<()> {
        create_dwallet::handler(ctx, params)
    }

    /// Owner approves the registered dWallet, activating bridgeless deposits.
    ///
    /// Models the on-chain ratification step of the Ika 2PC-MPC ceremony:
    /// the vault program must explicitly consent before the dWallet can act
    /// on behalf of this vault.
    pub fn approve_dwallet(ctx: Context<ApproveDWallet>) -> Result<()> {
        create_dwallet::approve_handler(ctx)
    }

    // ── Deposits ──────────────────────────────────────────────────────────────

    /// Deposit SOL into the vault.
    ///
    /// Set `bridgeless = true` and supply the Ika `dwallet_tx_id` for native
    /// cross-chain assets that arrived via the dWallet custody flow (BTC, ETH,
    /// RWAs). The dWallet must be approved before bridgeless deposits are
    /// accepted.
    pub fn deposit(
        ctx: Context<Deposit>,
        amount_lamports: u64,
        source_chain: u8,
        bridgeless: bool,
        dwallet_tx_id: [u8; 32],
        deposit_index: u64,
    ) -> Result<()> {
        deposit::handler(ctx, amount_lamports, source_chain, bridgeless, dwallet_tx_id, deposit_index)
    }

    // ── FHE strategy management ───────────────────────────────────────────────

    /// Store FHE-encrypted strategy parameters on-chain.
    ///
    /// The ciphertext (encrypted under the owner's Encrypt-REFHE public key)
    /// encodes: target allocations, risk thresholds, rebalance triggers, and
    /// stop-loss levels. The program commits to the params via `params_hash`
    /// (SHA-256 of the ciphertext) so that execute_strategy can verify
    /// operations are derived from the registered strategy without ever
    /// decrypting the data.
    pub fn set_strategy_params(
        ctx: Context<SetStrategyParams>,
        encrypted_params: Vec<u8>,
        params_hash: [u8; 32],
    ) -> Result<()> {
        set_strategy::handler(ctx, encrypted_params, params_hash)
    }

    /// Execute a strategy operation under on-chain guardrails.
    ///
    /// The operator computes the encrypted operation off-chain (homomorphic
    /// evaluation of the strategy on ciphertext params) and submits:
    ///   • `encrypted_op` — the FHE ciphertext describing the operation
    ///   • `op_proof`     — a commitment binding the op to `strategy_params_hash`
    ///   • `protocol`     — target protocol (must be whitelisted)
    ///   • `amount_lamports` — plaintext amount (the guardrail-visible value)
    ///
    /// Guardrails checked: time-lock, spending limit, protocol whitelist,
    /// max drawdown. All pass → execution event emitted.
    pub fn execute_strategy(
        ctx: Context<ExecuteStrategy>,
        encrypted_op: Vec<u8>,
        op_proof: [u8; 64],
        protocol: Pubkey,
        amount_lamports: u64,
    ) -> Result<()> {
        execute_strategy::handler(ctx, encrypted_op, op_proof, protocol, amount_lamports)
    }

    /// Add a protocol to the vault's approved execution whitelist.
    pub fn add_approved_protocol(
        ctx: Context<AddApprovedProtocol>,
        protocol: Pubkey,
    ) -> Result<()> {
        add_protocol::handler(ctx, protocol)
    }

    // ── Withdrawals ───────────────────────────────────────────────────────────

    /// Pause or unpause the vault. All deposits, executions, and withdrawals
    /// are blocked while paused. Emergency stop for the vault owner.
    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        pause_vault::handler(ctx, paused)
    }

    /// Owner-only withdrawal with time-lock and drawdown enforcement.
    pub fn withdraw(ctx: Context<Withdraw>, amount_lamports: u64) -> Result<()> {
        withdraw::handler(ctx, amount_lamports)
    }

    // ── Performance reporting ─────────────────────────────────────────────────

    /// Update the encrypted performance summary.
    ///
    /// The summary (P&L, yield earned, risk metrics) is encrypted under the
    /// owner's FHE key. Only the owner can decrypt it off-chain. On-chain the
    /// blob is opaque — full confidentiality.
    pub fn update_performance(
        ctx: Context<UpdatePerformance>,
        encrypted_summary: Vec<u8>,
    ) -> Result<()> {
        update_performance::handler(ctx, encrypted_summary)
    }
}
