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

```bash
git clone https://github.com/Maite05/veilvault.git
cd veilvault

# Build & deploy program
cd program
anchor build
anchor deploy --provider.cluster devnet

# Run frontend
cd ../frontend
npm install
npm run dev
