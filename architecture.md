# VeilVault — Architecture

## Overview

VeilVault is a confidential yield vault on Solana. Users deposit native assets from any chain and run hidden strategies enforced by an Anchor program. Three primitives compose the core experience:

| Primitive | Role | Devnet status |
|---|---|---|
| **Encrypt REFHE** | FHE-encrypt strategy params; build op proofs | AES-GCM simulation; real REFHE verifier is a drop-in swap |
| **Ika dWallets** | Bridgeless multi-chain custody via 2PC-MPC | Deterministic stub; real ceremony runs on Sui devnet |
| **x402** | Micropayment gate for agent-facing API | Live — 0.001 SOL to treasury PDA, verified on-chain |

---

## Repository layout

```
veil-vault/
├── program/                    Anchor (Rust) — 10 instructions
│   └── src/
│       ├── lib.rs              Entry point; declare_id!
│       ├── state/vault.rs      VaultState account (1226 bytes)
│       └── instructions/       One file per instruction
├── frontend/
│   ├── main.tsx                React entry; Buffer polyfill; RootErrorBoundary
│   ├── App.tsx                 Root component; routing; ErrorBoundary
│   ├── lib/
│   │   ├── solana.ts           VeilVaultClient — typed wrappers for all 10 instructions
│   │   ├── fhe.ts              Encrypt REFHE simulation (AES-GCM + SHA-256 proofs)
│   │   ├── ika.ts              Ika dWallet simulation (deterministic stubs)
│   │   └── x402.ts            x402 client — builds payment instruction + treasury PDA
│   └── src/
│       ├── components/
│       │   ├── detail/         VaultDetailPage panels (Deposit, Agent, Performance…)
│       │   ├── layout/         Header, Sidebar, MobileNav
│       │   └── ui/             GradientButton, MaterialIcon, GradientText
│       ├── context/
│       │   └── WalletContextProvider.tsx   Phantom + Solflare adapters; devnet endpoint
│       ├── hooks/
│       │   ├── useVault.ts     On-chain vault state reader + all action callbacks
│       │   ├── useNavigation.ts
│       │   └── useIsMobile.ts  768 px breakpoint
│       ├── pages/              LandingPage, VaultDetailPage, StrategyPage, SecurityPage…
│       └── types/index.ts      Shared TypeScript types
├── api/                        Vercel Serverless Functions (Node.js / TypeScript)
│   ├── package.json            { "type": "commonjs" }  — overrides root ESM
│   ├── tsconfig.json           CommonJS target for API functions
│   ├── agent/
│   │   ├── ping.ts             GET /api/agent/ping — health check
│   │   └── execute-strategy.ts POST /api/agent/execute-strategy — x402-gated
│   └── lib/
│       ├── x402-verify.ts      Verifies payment tx on-chain; builds 402 challenge
│       └── vault-executor.ts   Builds unsigned execute_strategy transaction for agent
├── index.html                  Vite entry; body background; global error handler
├── vite.config.ts              nodePolyfills (stream, crypto, buffer); React plugin
├── vercel.json                 rewrites → SPA fallback; api/ auto-detected
└── .vercelignore               Excludes dist/, program/, docs/ from upload
```

---

## On-chain program (`program/`)

**Program ID (Devnet):** `G8SzxHU2uHnxNSvjXhdgfHmjGjBL4hdzm1frkHyYbusS`

### VaultState account layout (1226 bytes)

| Offset | Field | Type | Notes |
|---|---|---|---|
| 0–8 | discriminator | [u8;8] | Anchor |
| 8–40 | owner | Pubkey | |
| 40 | bump | u8 | |
| 41–74 | dwallet | Option\<Pubkey\> | |
| 74–106 | fhe_pubkey | [u8;32] | Set at init |
| 106–138 | strategy_params_hash | [u8;32] | SHA-256(ciphertext) |
| 138–650 | strategy_params_ct | [u8;512] | AES-GCM ciphertext |
| 650–652 | strategy_params_len | u16 | >0 = params set |
| 652–660 | total_deposited_lamports | u64 | |
| 660–668 | net_value_lamports | u64 | |
| 668–670 | max_drawdown_bps | u16 | Guardrail 1 |
| 670–678 | spending_limit_lamports | u64 | Guardrail 2 |
| 678–686 | time_lock_secs | i64 | Guardrail 3 |
| 686–694 | last_executed_at | i64 | |
| 694–950 | approved_protocols | [Pubkey;8] | Guardrail 4 whitelist |
| 950 | approved_protocols_count | u8 | |
| 951–1207 | perf_summary_ct | [u8;256] | Encrypted P&L |
| 1207–1209 | perf_summary_len | u16 | |
| 1209 | is_paused | bool | Emergency stop |
| 1210–1218 | created_at | i64 | |
| 1218–1226 | total_yield_earned_lamports | u64 | |

### Instructions

| Instruction | Key checks | Effect |
|---|---|---|
| `initialize_vault` | Owner signs; vault PDA not exists | Creates VaultState; sets FHE pubkey + guardrails |
| `create_dwallet` | Owner signs | Creates DWalletRecord PDA with Ika binding |
| `approve_dwallet` | Owner signs | Sets `is_approved = true` on DWalletRecord |
| `deposit` | dWallet approved | Transfers lamports owner→vault; creates DepositRecord |
| `set_strategy_params` | Owner signs | Stores ciphertext + hash commitment |
| `execute_strategy` | Strategy params set; 4 guardrails pass; FHE proof valid | Transfers lamports vault→protocol |
| `harvest_yield` | Owner signs | Records returned principal + yield |
| `withdraw` | Owner signs; drawdown check | Transfers lamports vault→owner |
| `update_performance` | Owner signs | Stores encrypted P&L blob |
| `add_approved_protocol` | Owner signs | Appends pubkey to whitelist |

### FHE proof verification (`execute_strategy`)

```
op_proof[0..32] == SHA-256(encrypted_op || strategy_params_hash)
```

Production: replace SHA-256 check with Encrypt REFHE ZK-SNARK verifier (no program changes needed — same instruction signature).

---

## x402 Payment Protocol

```
Agent                    VeilVault API              Solana
  |                          |                        |
  |-- POST /execute-strategy→|                        |
  |                          |                        |
  |←── 402 {recipient, amt} ─|                        |
  |                          |                        |
  |── SOL transfer ──────────────────────────────────→|
  |                          |                        |
  |-- POST (X-Payment-Tx) ──→|                        |
  |                          |── verify tx on-chain ──→|
  |                          |←── confirmed ───────────|
  |                          |── build unsigned tx ────|
  |←── {unsignedTxB64} ──────|                        |
  |                          |                        |
  |── sign + broadcast ─────────────────────────────→|
```

- **Treasury PDA:** `seeds: ["x402", "treasury"]` under program ID → `DqbtqKBrQrwoc7EN9aQX58B641y5KcZWD29DxxPtGz5q`
- **Fee:** 1,000,000 lamports (0.001 SOL) per `execute_strategy` call
- **Atomicity:** The x402 SOL transfer and `execute_strategy` instruction are bundled in one Solana transaction

---

## Frontend data flow

```
useVault (hook)
  ├── readVault()          RPC: getAccountInfo(vaultPda) → parse VaultState bytes
  ├── setupVault()         5 sequential txns: init → createDWallet → approve → addProtocol → setParams
  ├── depositSol()         deposit instruction + DepositRecord PDA
  ├── executeStrategy()    FHE op → x402 payment ix + execute_strategy ix (atomic)
  ├── harvestYield()       returnAndHarvestYield: SOL transfer + harvest_yield (atomic)
  └── updateStrategyParams() encryptStrategyParams → set_strategy_params
```

**`VeilVaultClient` (`frontend/lib/solana.ts`)** — all instructions share `_send(ixs[])` which:
1. Gets latest blockhash
2. Builds Transaction with `feePayer = wallet.publicKey`
3. Signs via wallet adapter
4. Broadcasts + confirms at "confirmed" commitment

---

## Zerion Agent + x402 (frontend demo)

`AgentPanel` (`frontend/src/components/detail/AgentPanel.tsx`):

1. Calls `/api/agent/execute-strategy` → receives 402 with treasury PDA address
2. Builds FHE operation: `buildStrategyOperation(op, vault.strategyParamsHash, fheKeys)`
3. Calls `VeilVaultClient.executeStrategy()` — one wallet popup, one atomic tx
4. Shows Explorer link for confirmed transaction

---

## Deployment

**Live:** `https://veil-vault-pi.vercel.app`

| File | Purpose |
|---|---|
| `vercel.json` | `rewrites: [/((?!api/).*) → /index.html]`; API functions auto-detected in `api/` |
| `.vercelignore` | Excludes `dist/`, `program/`, `docs/`, `scripts/` from upload |
| `api/package.json` | `{"type":"commonjs"}` — overrides root `"type":"module"` for serverless functions |
| `vite.config.ts` | `nodePolyfills({include:["stream","crypto","buffer",...]})` — required for wallet-adapter deps on mobile |

**Deploy:**
```bash
npx vercel --prod --yes --force   # --force clears build cache
```

---

## Known devnet limitations

| Feature | Devnet behaviour | Production path |
|---|---|---|
| FHE encryption | AES-GCM + SHA-256 proof | Swap `fhe.ts` for Encrypt REFHE SDK |
| Ika dWallet | Deterministic stub (no 2PC ceremony) | Real ceremony on Sui devnet via Ika SDK |
| x402 verification | Parses real on-chain Solana tx | Same code; works in production |
| Yield protocol | Owner's own wallet as mock protocol | Real Kamino / Jupiter / Drift program IDs |
