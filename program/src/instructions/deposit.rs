use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::errors::VaultError;
use crate::state::vault::{DepositRecord, DWalletRecord, VaultState};

#[derive(Accounts)]
#[instruction(amount_lamports: u64, source_chain: u8, bridgeless: bool, dwallet_tx_id: [u8; 32], deposit_index: u64)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    // VaultState is 1226 bytes — Box it to keep try_accounts within the
    // 4096-byte BPF stack frame limit.
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump,
        constraint = !vault.is_paused @ VaultError::VaultPaused,
    )]
    pub vault: Box<Account<'info, VaultState>>,

    /// For bridgeless deposits this must be the approved DWalletRecord PDA.
    /// For regular (non-bridgeless) deposits pass the DWalletRecord address anyway;
    /// the approval constraint only fires when bridgeless=true.
    #[account(
        seeds = [b"dwallet", vault.key().as_ref()],
        bump = dwallet_record.bump,
        constraint = !bridgeless || dwallet_record.is_approved @ VaultError::DWalletNotApproved,
    )]
    pub dwallet_record: Box<Account<'info, DWalletRecord>>,

    #[account(
        init,
        payer = depositor,
        space = DepositRecord::space(),
        seeds = [b"deposit", vault.key().as_ref(), &deposit_index.to_le_bytes()],
        bump,
    )]
    pub deposit_record: Box<Account<'info, DepositRecord>>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Deposit>,
    amount_lamports: u64,
    source_chain: u8,
    bridgeless: bool,
    dwallet_tx_id: [u8; 32],
    deposit_index: u64,
) -> Result<()> {
    require!(amount_lamports > 0, VaultError::ZeroDeposit);
    require!(source_chain <= 3, VaultError::InvalidChain);

    // Transfer SOL from depositor to vault PDA.
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.depositor.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        amount_lamports,
    )?;

    let clock = Clock::get()?;
    let vault = &mut ctx.accounts.vault;
    vault.total_deposited_lamports = vault
        .total_deposited_lamports
        .saturating_add(amount_lamports);
    vault.net_value_lamports = vault.net_value_lamports.saturating_add(amount_lamports);

    let record = &mut ctx.accounts.deposit_record;
    record.vault = vault.key();
    record.depositor = ctx.accounts.depositor.key();
    record.bump = ctx.bumps.deposit_record;
    record.amount_lamports = amount_lamports;
    record.source_chain = source_chain;
    record.is_bridgeless = bridgeless;
    record.dwallet_tx_id = if bridgeless { dwallet_tx_id } else { [0u8; 32] };
    record.deposited_at = clock.unix_timestamp;
    record.deposit_index = deposit_index;

    emit!(DepositMade {
        vault: vault.key(),
        depositor: ctx.accounts.depositor.key(),
        amount_lamports,
        source_chain,
        is_bridgeless: bridgeless,
        dwallet_tx_id: record.dwallet_tx_id,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Deposit: {} lamports from chain {} (bridgeless={})",
        amount_lamports,
        source_chain,
        bridgeless
    );
    Ok(())
}

#[event]
pub struct DepositMade {
    pub vault: Pubkey,
    pub depositor: Pubkey,
    pub amount_lamports: u64,
    pub source_chain: u8,
    pub is_bridgeless: bool,
    pub dwallet_tx_id: [u8; 32],
    pub timestamp: i64,
}
