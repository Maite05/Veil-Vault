# VeilVault – Encrypted Bridgeless Strategy Vault

**Veiled. Bridgeless. Autonomous.**  
A confidential yield strategy vault on Solana that lets users deposit native assets from any chain (no bridges) and run hidden strategies using fully homomorphic encryption.

**Submitted to:** Colosseum Frontier Hackathon 2026 – Encrypt & Ika Track + Main Competition  
**Live Demo (Devnet):** [https://veilvault.dev] ← replace with your actual link  
**Demo Video:** [Loom / YouTube link – keep under 5 minutes]  
**Program ID (Devnet):** `PasteYourAnchorProgramIdHere...`

## The Problem
Cross-chain movement still depends on risky bridges that get hacked regularly. Meanwhile, all DeFi strategies and positions are completely public — making front-running and copy-trading easy. Privacy-conscious users and institutions (especially in emerging markets like South Africa) need a way to use native assets held on other chains as collateral or in yield strategies on Solana without exposing their financial life.

## The Solution

**VeilVault** is a decentralized strategy vault that delivers:
- **Bridgeless deposits** of native BTC, ETH, or RWAs directly via **Ika dWallets** — no wrapping, no middlemen.
- **Fully encrypted strategies** powered by **Encrypt’s REFHE (Fully Homomorphic Encryption)** — rules, position sizes, and computations stay hidden on-chain during execution.
- **Programmable guardrails** enforced by a Solana Anchor program (spending limits, approved protocols, time-locks, max drawdown, recovery).

Solana becomes the fast, low-fee control and settlement layer while everything sensitive remains veiled.

**Target users**: Privacy-focused traders, DAOs, institutions, and users in high-remittance regions who want confidential yield without visible flows or bridge risk.

## Core Integration of Encrypt & Ika
VeilVault is built **around** these two primitives — they are fundamental to the product:

- **Ika dWallets (2PC-MPC)**: Enables programmable, decentralized multi-chain signing. The Solana program jointly controls the dWallet and enforces on-chain guardrails.
- **Encrypt REFHE FHE**: Strategy parameters and vault state are stored and computed homomorphically. Rebalancing and risk checks happen without ever decrypting the data during execution.

Removing either breaks the core experience of **bridgeless + confidential** strategy execution.

## Key Features (MVP – Demoable on Devnet)
- Create and approve an Ika dWallet from the Solana program
- Bridgeless deposit of native assets (mocked/simulated on devnet)
- Set encrypted strategy parameters
- Guarded private execution (e.g. rebalance into Solana yield protocols)
- Owner-only decrypted performance summary

## Tech Stack
- **Solana Program**: Anchor (Rust)
- **Privacy & Custody**: Encrypt REFHE (FHE) + Ika dWallets (pre-alpha devnet)
- **Frontend**: Next.js + Tailwind + Solana wallet adapter (Phantom / Solflare)
- **RPC**: Helius or QuickNode (devnet)

## Quick Start (Devnet)

### Prerequisites

```bash
# 1. Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# 2. Solana CLI (v1.18+)
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# 3. Anchor CLI (v0.29.0)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.29.0 && avm use 0.29.0

# 4. Node deps
npm install
```

### Build & deploy the Anchor program

```bash
# Configure devnet wallet
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/id.json   # skip if you have one
solana airdrop 2

# Compile Rust → BPF and generate IDL
anchor build

# Sync program ID across all source files
anchor keys sync

# Deploy
bash scripts/deploy-devnet.sh
```

After deployment update the Program ID in:
- `program/src/lib.rs` → `declare_id!("...")`
- `Anchor.toml` → `veil_vault = "..."`
- `frontend/lib/solana.ts` → `PROGRAM_ID = new PublicKey("...")`

### Run tests (localnet)

```bash
# Terminal 1 – local validator
solana-test-validator --reset

# Terminal 2 – test suite
anchor test --skip-local-validator
# or: npm test
```

### Run the frontend

```bash
cd frontend
npm install
npm run dev
# open http://localhost:3000
```

**Program ID (Devnet):** `5Jn23ZQaF8LVbm5WQASc7QWcAhq9QPLJQGFxmC2gUwgB`
