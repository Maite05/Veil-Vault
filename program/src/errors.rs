use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    #[msg("Only the vault owner can call this instruction")]
    Unauthorized,

    #[msg("The dWallet has not been approved yet")]
    DWalletNotApproved,

    #[msg("A dWallet is already registered for this vault")]
    DWalletAlreadyRegistered,

    #[msg("Deposit amount must be greater than zero")]
    ZeroDeposit,

    #[msg("Encrypted strategy params exceed maximum allowed size")]
    ParamsTooLarge,

    #[msg("Strategy params hash does not match stored hash")]
    ParamsHashMismatch,

    #[msg("No strategy params have been set")]
    NoStrategyParams,

    #[msg("Protocol is not in the vault's approved list")]
    ProtocolNotApproved,

    #[msg("Operation amount exceeds the per-transaction spending limit")]
    SpendingLimitExceeded,

    #[msg("Time lock has not elapsed since the last execution")]
    TimeLockActive,

    #[msg("Withdrawal would exceed the maximum drawdown threshold")]
    MaxDrawdownExceeded,

    #[msg("Insufficient vault balance for this withdrawal")]
    InsufficientBalance,

    #[msg("The vault is currently paused")]
    VaultPaused,

    #[msg("FHE operation proof verification failed")]
    InvalidFheProof,

    #[msg("Approved protocols list is at capacity")]
    ProtocolListFull,

    #[msg("Encrypted performance summary exceeds maximum size")]
    PerformanceSummaryTooLarge,

    #[msg("Source chain identifier is invalid")]
    InvalidChain,
}
