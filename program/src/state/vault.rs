use anchor_lang::prelude::*;

// Chain identifiers
pub const CHAIN_SOLANA: u8 = 0;
pub const CHAIN_BITCOIN: u8 = 1;
pub const CHAIN_ETHEREUM: u8 = 2;
pub const CHAIN_RWA: u8 = 3;

//  Size caps
pub const MAX_ENCRYPTED_PARAMS: usize = 512;
pub const MAX_ENCRYPTED_PERF: usize = 256;
pub const MAX_APPROVED_PROTOCOLS: usize = 8;

// VaultState
/// Root account for a VeilVault. One per owner.
#[account]
pub struct VaultState {
    /// Wallet that owns and controls this vault.
    pub owner: Pubkey,
    pub bump: u8,

    /// Optional pointer to a registered DWalletRecord (bridgeless custody).
    pub dwallet: Option<Pubkey>,

    // FHE identity 
    /// Owner's Encrypt-REFHE public key (compressed representation for on-chain storage).
    pub fhe_pubkey: [u8; 32],

    /// SHA-256 of the raw FHE ciphertext currently stored in strategy_params_ct.
    pub strategy_params_hash: [u8; 32],

    /// Serialised FHE ciphertext of the strategy parameters (alloc %, risk
    /// thresholds, rebalance triggers). Actual computations happen off-chain;
    /// the program only stores and commits to this blob.
    pub strategy_params_ct: [u8; MAX_ENCRYPTED_PARAMS],
    pub strategy_params_len: u16,

    // Plaintext guardrails (enforced on-chain)
    pub total_deposited_lamports: u64,
    /// Current estimated vault net value (updated by operator after execution).
    pub net_value_lamports: u64,
    /// Maximum allowed drawdown in basis points (e.g. 1000 = 10 %).
    pub max_drawdown_bps: u16,
    /// Maximum lamports that can leave the vault in a single execute_strategy tx.
    pub spending_limit_lamports: u64,
    /// Minimum seconds that must elapse between strategy executions.
    pub time_lock_secs: i64,
    pub last_executed_at: i64,

    /// Whitelist of protocol program IDs this vault may interact with.
    pub approved_protocols: [Pubkey; MAX_APPROVED_PROTOCOLS],
    pub approved_protocols_count: u8,

    // Encrypted performance summary
    /// FHE-encrypted P&L summary. Only the owner can decrypt with their key.
    pub perf_summary_ct: [u8; MAX_ENCRYPTED_PERF],
    pub perf_summary_len: u16,

    pub is_paused: bool,
    pub created_at: i64,
}

impl VaultState {
    pub fn space() -> usize {
        8   // Anchor discriminator
        + 32 + 1            // owner, bump
        + 1 + 32            // Option<Pubkey> for dwallet
        + 32                // fhe_pubkey
        + 32                // strategy_params_hash
        + MAX_ENCRYPTED_PARAMS + 2  // strategy_params_ct, len
        + 8 + 8             // total_deposited_lamports, net_value_lamports
        + 2 + 8 + 8 + 8     // max_drawdown_bps, spending_limit, time_lock, last_executed
        + (32 * MAX_APPROVED_PROTOCOLS) + 1  // approved_protocols, count
        + MAX_ENCRYPTED_PERF + 2  // perf_summary_ct, len
        + 1 + 8             // is_paused, created_at
    }
}

// DWalletRecord 
/// Stores the Ika dWallet binding for a vault.
///
/// Ika implements 2PC-MPC: the Solana program and the user jointly hold a
/// threshold key. The dWallet lives on Sui (pre-alpha devnet) and can custody
/// native BTC / ETH / RWAs without wrapping. This account records the binding
/// and the on-chain approval that activates bridgeless deposits.
#[account]
pub struct DWalletRecord {
    /// Parent vault this dWallet belongs to.
    pub vault: Pubkey,
    pub bump: u8,

    /// Ika dWallet object ID on the Sui network (32-byte object digest).
    pub dwallet_id: [u8; 32],

    /// Aggregated 2PC-MPC public key (compressed secp256k1, 33 bytes).
    pub dwallet_pubkey: [u8; 33],

    /// Bitmask of chains this dWallet can sign for.
    /// bit 0 = Solana, bit 1 = Bitcoin, bit 2 = Ethereum, bit 3 = RWA
    pub chain_bitmap: u8,

    /// True once the vault owner has called approve_dwallet.
    pub is_approved: bool,

    pub created_at: i64,
}

impl DWalletRecord {
    pub fn space() -> usize {
        8 + 32 + 1 + 32 + 33 + 1 + 1 + 8
    }
}

// DepositRecord
/// One record per deposit event. Used for accounting and proof of bridgeless flow.
#[account]
pub struct DepositRecord {
    pub vault: Pubkey,
    pub depositor: Pubkey,
    pub bump: u8,

    pub amount_lamports: u64,
    /// CHAIN_* constant identifying where the asset originates.
    pub source_chain: u8,
    /// True if the deposit was routed through an Ika dWallet (bridgeless).
    pub is_bridgeless: bool,
    /// Ika transaction digest for bridgeless deposits; zeroed otherwise.
    pub dwallet_tx_id: [u8; 32],

    pub deposited_at: i64,
    /// Monotonically-increasing index scoped to this vault; used as PDA seed.
    pub deposit_index: u64,
}

impl DepositRecord {
    pub fn space() -> usize {
        8 + 32 + 32 + 1 + 8 + 1 + 1 + 32 + 8 + 8
    }
}
