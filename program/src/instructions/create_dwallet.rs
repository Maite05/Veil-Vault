use anchor_lang::prelude::*;
use crate::errors::VaultError;
use crate::state::vault::{DWalletRecord, VaultState};


#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateDWalletParams {
    /// Ika dWallet object ID on Sui (32-byte object digest).
    pub dwallet_id: [u8; 32],
    /// Aggregated 2PC-MPC public key (compressed secp256k1, 33 bytes).
    pub dwallet_pubkey: [u8; 33],
    /// Bitmask of chains this dWallet supports (bit 0=Solana, 1=Bitcoin, 2=Ethereum, 3=RWA).
    pub chain_bitmap: u8,
}

#[derive(Accounts)]
pub struct CreateDWallet<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ VaultError::Unauthorized,
        constraint = vault.dwallet.is_none() @ VaultError::DWalletAlreadyRegistered,
    )]
    pub vault: Account<'info, VaultState>,

    #[account(
        init,
        payer = owner,
        space = DWalletRecord::space(),
        seeds = [b"dwallet", vault.key().as_ref()],
        bump,
    )]
    pub dwallet_record: Account<'info, DWalletRecord>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateDWallet>, params: CreateDWalletParams) -> Result<()> {
    let clock = Clock::get()?;
    let record = &mut ctx.accounts.dwallet_record;

    record.vault = ctx.accounts.vault.key();
    record.bump = ctx.bumps.dwallet_record;
    record.dwallet_id = params.dwallet_id;
    record.dwallet_pubkey = params.dwallet_pubkey;
    record.chain_bitmap = params.chain_bitmap;
    record.is_approved = false;
    record.created_at = clock.unix_timestamp;

    // Store the DWalletRecord address in the vault state.
    ctx.accounts.vault.dwallet = Some(record.key());

    emit!(DWalletRegistered {
        vault: ctx.accounts.vault.key(),
        dwallet_record: record.key(),
        dwallet_id: params.dwallet_id,
        chain_bitmap: params.chain_bitmap,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Ika dWallet registered (pending approval). ID: {:?}",
        params.dwallet_id
    );
    Ok(())
}

/// Separate approval step mirrors the Ika 2PC-MPC ceremony: the vault owner
/// explicitly ratifies the dWallet before it can be used for bridgeless deposits.

#[derive(Accounts)]
pub struct ApproveDWallet<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ VaultError::Unauthorized,
    )]
    pub vault: Account<'info, VaultState>,

    #[account(
        mut,
        seeds = [b"dwallet", vault.key().as_ref()],
        bump = dwallet_record.bump,
        constraint = dwallet_record.vault == vault.key(),
    )]
    pub dwallet_record: Account<'info, DWalletRecord>,
}

pub fn approve_handler(ctx: Context<ApproveDWallet>) -> Result<()> {
    let record = &mut ctx.accounts.dwallet_record;
    record.is_approved = true;

    let clock = Clock::get()?;
    emit!(DWalletApproved {
        vault: ctx.accounts.vault.key(),
        dwallet_record: record.key(),
        dwallet_id: record.dwallet_id,
        timestamp: clock.unix_timestamp,
    });

    msg!("Ika dWallet approved for vault: {}", ctx.accounts.vault.key());
    Ok(())
}

#[event]
pub struct DWalletRegistered {
    pub vault: Pubkey,
    pub dwallet_record: Pubkey,
    pub dwallet_id: [u8; 32],
    pub chain_bitmap: u8,
    pub timestamp: i64,
}

#[event]
pub struct DWalletApproved {
    pub vault: Pubkey,
    pub dwallet_record: Pubkey,
    pub dwallet_id: [u8; 32],
    pub timestamp: i64,
}
