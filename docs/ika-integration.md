# Ika dWallet Integration Guide

## What Ika Is

Ika implements **2PC-MPC (Two-Party Computation + Multi-Party Computation)**: a threshold
signing protocol where two parties — the user and the Solana program — jointly control a
private key without either party ever holding the full key.

The dWallet lives on **Sui** (pre-alpha devnet). It can generate addresses and sign
transactions for any chain: Bitcoin, Ethereum, Solana, RWAs. This is what enables
**bridgeless deposits** — native BTC or ETH is sent directly to the dWallet's chain-native
address and the Solana vault program controls when and how those funds move.

No wrapping. No bridge. No honeypot.

---

## VeilVault Integration Architecture

```
User Wallet (Solana)
       │
       │  1. create_dwallet ix
       ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│  Solana Anchor Program  │◄────────│  Ika MPC Network (Sui)  │
│  (vault guardrails)     │  2PC    │  (key share + signing)  │
└─────────────────────────┘         └─────────────────────────┘
       │                                        │
       │  Holds program key share               │  Holds user key share
       └──────────────┬─────────────────────────┘
                      │
              ┌───────▼───────┐
              │  dWallet PK   │  ← Native address on BTC / ETH / Solana
              └───────────────┘
                      │
          Receives native assets (no bridge)
```

---

## On-Chain Accounts

### `DWalletRecord` (PDA: `["dwallet", vault_pubkey]`)

| Field | Type | Description |
|---|---|---|
| `vault` | `Pubkey` | Parent vault |
| `dwallet_id` | `[u8; 32]` | Ika dWallet object ID on Sui |
| `dwallet_pubkey` | `[u8; 33]` | Aggregated MPC pubkey (compressed secp256k1) |
| `chain_bitmap` | `u8` | Supported chains bitmask (bit 0=SOL, 1=BTC, 2=ETH, 3=RWA) |
| `is_approved` | `bool` | Whether the vault owner has ratified this dWallet |

---

## Integration Flow (Step-by-Step)

### Step 1 — Create a dWallet (off-chain, Ika SDK)

```typescript
import { createDWallet, CHAIN_BITCOIN, CHAIN_ETHEREUM, chainBitmap } from "../lib/ika";

const result = await createDWallet({
  chains: [CHAIN_BITCOIN, CHAIN_ETHEREUM],
  vaultPubkey: vaultPda,
  userPubkey: wallet.publicKey,
});
// result.dwalletId      → 32-byte Sui object digest
// result.dwalletPubkey  → 33-byte compressed secp256k1 key
// result.chainAddresses → { bitcoin: "bc1q...", ethereum: "0x..." }
```

> **Devnet note**: The `createDWallet` function in `frontend/lib/ika.ts` simulates the
> 2PC-MPC ceremony deterministically. Swap for the real Ika SDK when it ships.

### Step 2 — Register the dWallet on Solana

```typescript
await client.createDWallet({
  dwalletId: result.dwalletId,
  dwalletPubkey: result.dwalletPubkey,
  chainBitmap: chainBitmap(CHAIN_BITCOIN, CHAIN_ETHEREUM),
});
```

This calls the `create_dwallet` instruction and creates a `DWalletRecord` PDA linked to the vault.

### Step 3 — Approve the dWallet

```typescript
await client.approveDWallet();
```

The vault owner must explicitly approve the dWallet. This mirrors the on-chain ratification
step of the Ika 2PC ceremony: the Solana program consents before the dWallet can act
on behalf of the vault.

After this call `DWalletRecord.is_approved = true` and bridgeless deposits are unlocked.

### Step 4 — Receive a Bridgeless Deposit

The user (or their counterparty) sends native BTC/ETH to `result.chainAddresses.bitcoin`
(or `.ethereum`). Ika's MPC network detects the on-chain event and produces a deposit intent.

```typescript
import { simulateBridgelessDeposit } from "../lib/ika";

const intent = await simulateBridgelessDeposit(
  result.dwalletId,
  CHAIN_BITCOIN,
  100_000n,       // satoshis
  1_000_000n      // lamports per satoshi (demo rate)
);

// Register the deposit on Solana
await client.deposit({
  amountLamports: intent.equivalentLamports,
  sourceChain: CHAIN_BITCOIN,
  bridgeless: true,
  dwalletTxId: intent.dwalletTxId,
  depositIndex: 0n,
});
```

### Step 5 — Execute a Strategy (dWallet signs the cross-chain tx)

When `execute_strategy` passes all guardrails, the vault emits a `StrategyExecuted` event.
The operator then calls `requestDWalletSignature` to co-sign the cross-chain transaction:

```typescript
import { requestDWalletSignature } from "../lib/ika";

const { signature } = await requestDWalletSignature({
  txBytes: unsignedEthTx,
  chain: CHAIN_ETHEREUM,
  programApprovalSignature: strategyExecutedEventProof,
});

// Broadcast `signature` to the Ethereum network
```

---

## Guardrails Enforced Before dWallet Can Sign

The Solana program enforces these rules **before** it will co-sign any operation:

| Guardrail | Field | Description |
|---|---|---|
| Time-lock | `time_lock_secs` | Minimum seconds between executions |
| Spending limit | `spending_limit_lamports` | Max per-tx outflow |
| Protocol whitelist | `approved_protocols` | Only approved dApps |
| Max drawdown | `max_drawdown_bps` | Vault can't lose more than N% of deposits |

---

## Devnet vs Production

| Feature | Devnet (now) | Production (Ika GA) |
|---|---|---|
| dWallet creation | Deterministic simulation | Real 2PC-MPC on Sui |
| Signing ceremony | SHA-256 mock | Threshold ECDSA |
| Cross-chain tx | Not broadcast | Broadcast to target chain |
| Deposit proof | Structural check | Threshold signature verification |

---

## References

- Ika Protocol: pre-alpha devnet (docs not yet public)
- Colosseum Frontier Hackathon 2026 – Ika Track
- VeilVault README: `../README.md`
