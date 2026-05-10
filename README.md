# VeilVault – Encrypted Bridgeless Strategy Vault

**Veiled. Bridgeless. Autonomous.**  
A confidential yield strategy vault on Solana that lets users deposit native assets from any chain (no bridges) and run hidden strategies using fully homomorphic encryption.

**Submitted to:** Colosseum Frontier Hackathon 2026 – Solana Track + Encrypt & Ika Track  
**Live Demo (Devnet):** https://veil-vault-pi.vercel.app  
**Demo Video:** https://youtu.be/KXeAP_rFUbo  
**Program ID (Devnet):** `G8SzxHU2uHnxNSvjXhdgfHmjGjBL4hdzm1frkHyYbusS`  
**Agent API:** `POST https://veil-vault-pi.vercel.app/api/agent/execute-strategy`

## Solana Track — Qualification Checklist

| Requirement | Status |
|---|---|
| Project name + description | ✅ VeilVault — encrypted bridgeless strategy vault |
| Unique Solana program in Rust (Anchor) | ✅ `program/` — 10 instructions, deployed to devnet |
| Contract address in README | ✅ `G8SzxHU2uHnxNSvjXhdgfHmjGjBL4hdzm1frkHyYbusS` |
| Public GitHub + setup instructions | ✅ This repo — see Quick Start below |
| Demo video (≤ 3 min) | ✅ https://youtu.be/KXeAP_rFUbo |
| Live demo link | ✅ https://veil-vault-pi.vercel.app |
| **Bonus: x402 on Solana** | ✅ Strategy execution requires a 0.001 SOL x402 micropayment, bundled atomically with the execute_strategy instruction |

### x402 Integration

VeilVault implements the [x402 Payment Required protocol](https://x402.org) on Solana:

- **Protected resource:** `execute_strategy` instruction
- **Payment:** 0.001 SOL transfer to the VeilVault treasury PDA (`seeds: ["x402", "treasury"]`)
- **Atomicity:** The x402 fee transfer and strategy execution are bundled in a single Solana transaction — either both succeed or both fail, making double-spend impossible
- **On-chain enforcement:** The combined transaction is the payment proof; no off-chain oracle or server required
- **Code:** `frontend/lib/x402.ts` — full x402 protocol implementation for Solana

This demonstrates x402's natural fit with Solana's composable transaction model: what would require a round-trip HTTP 402 challenge on the web is solved in a single atomic on-chain transaction.

## Zerion Agent + x402 — Autonomous Strategy Execution

VeilVault exposes a machine-readable REST API that autonomous agents (such as Zerion-powered AI agents) can use to execute private vault strategies without any human intervention.

### Architecture

```mermaid
flowchart TD
    subgraph ZerionAgent ["Zerion Autonomous Agent"]
        A1["Portfolio Analysis\n(Zerion API)"]
        A2["Rebalancing Decision\n(AI Model)"]
        A3["Build FHE Operation\n(Encrypt REFHE client)"]
    end

    subgraph x402Flow ["x402 Payment Flow"]
        B1["POST /api/agent/execute-strategy\n(no payment header)"]
        B2["← 402 Payment Required\n{recipient, amountLamports, resource}"]
        B3["SOL Transfer → Treasury PDA\n(autonomous payment)"]
        B4["POST /api/agent/execute-strategy\n(X-Payment-Tx: signature)"]
    end

    subgraph VeilVaultAPI ["VeilVault API (Vercel Serverless)"]
        C1["Verify x402 payment on-chain"]
        C2["Build unsigned execute_strategy tx\n(x402 fee + strategy ix)"]
        C3["Return unsigned tx to agent"]
    end

    subgraph SolanaProgram ["Solana Anchor Program"]
        D1["Verify FHE proof"]
        D2["Enforce 4 guardrails"]
        D3["Transfer lamports vault→protocol"]
        D4["Collect x402 treasury fee"]
    end

    A1 --> A2 --> A3 --> B1
    B1 --> B2 --> B3 --> B4
    B4 --> C1 --> C2 --> C3
    C3 -->|"Agent signs + broadcasts"| D1
    D1 --> D2 --> D3 --> D4

    style ZerionAgent fill:#1a1b20,stroke:#F7931A,stroke-width:2px
    style x402Flow    fill:#1a1b20,stroke:#F7931A,stroke-width:2px
    style SolanaProgram fill:#1a1b20,stroke:#00ff9d,stroke-width:2px
```

### API Reference

**Health check:** `GET /api/agent/ping` → `{"ok":true,"agent":"VeilVault x402","version":"1.0.0"}`

**x402 Treasury PDA:** `DqbtqKBrQrwoc7EN9aQX58B641y5KcZWD29DxxPtGz5q`

**Endpoint:** `POST /api/agent/execute-strategy`

**Round 1 — Discover payment requirement (no headers)**
```
← 402 Payment Required
{
  "x402Version": "v2",
  "network": "solana-devnet",
  "recipient": "<treasury PDA>",
  "amountLamports": 1000000,
  "resource": "execute_strategy — FHE-guarded capital deployment",
  "expiresAt": "<ISO timestamp>"
}
```

**Round 2 — Submit with payment proof**
```
→ POST /api/agent/execute-strategy
   X-Payment-Tx: <payment transaction signature>
   Content-Type: application/json

   {
     "owner": "<agent wallet pubkey>",
     "encryptedOpB64": "<base64 FHE-encrypted operation>",
     "opProofB64": "<base64 64-byte SHA-256 proof>",
     "amountLamports": "50000000",
     "protocolAccount": "<whitelisted protocol pubkey>"
   }

← 200 OK
   {
     "unsignedTxB64": "<base64 unsigned transaction>",
     "description": "x402 fee + execute_strategy — atomic bundle",
     "x402FeeLamports": 1000000,
     "vaultPda": "<vault PDA>",
     "hint": "Sign with owner keypair and broadcast to devnet"
   }
```

### Running the Zerion Agent Example

```bash
# Install deps (already in project)
npm install

# Set your agent wallet private key (base58)
export AGENT_PRIVATE_KEY="<your-devnet-keypair>"

# Run the autonomous agent cycle
npx ts-node docs/zerion-agent-example.ts
```

The agent will:
1. Detect a rebalancing opportunity (simulated Zerion portfolio signal)
2. Hit the API → receive 402 → pay autonomously → retry
3. Sign the returned unsigned transaction and broadcast to devnet
4. Print the Solana Explorer link for the confirmed execution

### Why This Is Powerful

| Feature | Benefit |
|---|---|
| **x402 + Solana atomicity** | Fee payment and strategy execution in a single tx — no double-spend risk |
| **Non-custodial** | Agent signs locally; server never holds private keys |
| **FHE privacy** | Strategy logic stays hidden from the API itself — only the proof is verified |
| **Ika multi-chain** | Agent can trigger bridgeless BTC/ETH operations via dWallet |
| **Guardrails** | On-chain limits (max drawdown, spending limit, whitelist) can't be bypassed |

## Target Users & Use Cases

| User | Problem today | VeilVault solution |
|------|--------------|-------------------|
| **Institutional trader / family office** | Strategies are fully visible on-chain — front-running, copy-trading inevitable | FHE-encrypted parameters; on-chain guardrails they control without exposing intent |
| **DAO treasury manager** | Multi-chain assets fragmented across custodians and bridges; bridge hacks are existential | Ika dWallets custody native BTC/ETH without wrapping; spending limits enforced by the Solana program |
| **High-net-worth individual in emerging market** | Needs yield on crypto savings without exposing wallet activity (regulatory or personal risk) | Bridgeless deposit from any chain; confidential vault that looks opaque on-chain |
| **DeFi protocol / LP** | Wants to run private yield strategy vaults for users without revealing the allocations | VeilVault as a primitive: set encrypted strategy params, let the contract execute within guardrails |
| **AI agent operator** | Agent manages funds across chains; needs decentralized guardrails it can't exceed | Spending limits, time-locks, and protocol whitelists enforced at the program level — no trusted operator needed |

**Primary use cases on devnet today:**
- Deposit native SOL → encrypted yield strategy → withdraw with interest
- Register an Ika dWallet binding to custody native BTC/ETH without bridges
- Set FHE-encrypted strategy params; execute under 4 on-chain guardrails
- Harvest yield returned from protocol; track encrypted P&L

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

- **Ika dWallets (2PC-MPC)**: Enables programmable, decentralized multi-chain signing. The Solana program jointly controls the dWallet and enforces on-chain guardrails. → [Ika Solana Devnet Pre-Alpha Docs](https://docs.ika.xyz)
- **Encrypt REFHE FHE**: Strategy parameters and vault state are stored and computed homomorphically. Rebalancing and risk checks happen without ever decrypting the data during execution. → [Encrypt Solana Devnet Pre-Alpha Docs](https://docs.encrypt.xyz)

Removing either breaks the core experience of **bridgeless + confidential** strategy execution.

> **Note on devnet simulation:** Ika's 2PC-MPC ceremony runs on Sui devnet (pre-alpha SDK). VeilVault simulates the dWallet binding deterministically on devnet while enforcing the full on-chain account structure and guardrails. Encrypt's REFHE verifier is also pre-alpha; the program stores and commits to real FHE ciphertexts with SHA-256 hash proofs — production swaps in the real REFHE verifier with no program changes required.

**VeilVault also fits the AI agent guardrails use case:** spending limits, time-locks, protocol whitelists, and max drawdown are enforced at the program level — making it suitable as a decentralised guardrail layer for autonomous agents managing multi-chain capital.

```mermaid
flowchart TD
    subgraph User ["User Layer"]
        A["Connect Wallet + Approve Actions"]
    end

    subgraph Ika ["Ika Network (2PC-MPC)"]
        B["dWallet Creation\nProgrammable Multi-Chain Signing"]
        C["Native Asset Control\n(BTC / ETH / RWAs)"]
    end

    subgraph Solana ["Solana - Control & Settlement Layer"]
        D["VeilVault Anchor Program\n- Guardrails Enforcement\n- Policy Engine"]
        E["Encrypted Vault State\n- Strategy Parameters\n- Position Sizes\n- Risk Rules"]
        F["FHE Computation Layer\n(Encrypt REFHE)\n- Homomorphic Rebalancing\n- Risk Checks\n- Yield Calculations"]
    end

    subgraph Execution ["Execution Layer"]
        G["Solana DeFi Protocols\n(Kamino, Jupiter, etc.)"]
    end

    subgraph Owner ["Owner Only"]
        H["Threshold Decryption\nDecrypted Performance Summary"]
    end

    A -->|Authorization| B
    B <-->|Joint Signing| D
    C -->|Bridgeless Deposit| B
    D -->|Enforce Policies| E
    E <-->|Store & Compute Encrypted| F
    F -->|Encrypted Result| D
    D -->|Guarded Tx| G
    G -->|Returns| D
    D -->|Owner Decrypts| H

    style E fill:#1a1a2e,stroke:#00ff9d,stroke-width:2px
    style F fill:#16213e,stroke:#00ff9d,stroke-width:2px
```

## Key Features (MVP – Demoable on Devnet)

**On-chain program (10 instructions):**
- `initialize_vault` — create vault with FHE pubkey + 4 guardrails (drawdown / spending limit / time-lock / whitelist)
- `create_dwallet` / `approve_dwallet` — register and ratify an Ika 2PC-MPC dWallet binding
- `deposit` — SOL or bridgeless native-asset deposit (Ika dWallet flow)
- `set_strategy_params` — store FHE ciphertext with SHA-256 hash commitment
- `execute_strategy` — verify proof → enforce all 4 guardrails → **real lamport transfer vault → protocol**
- `harvest_yield` — record principal + yield returned from protocol; update net value on-chain
- `withdraw` — owner-only with drawdown protection
- `update_performance` — store encrypted P&L blob
- `add_approved_protocol` / `set_paused` — governance + emergency stop

**Frontend (React + Vite):**
- Solana Wallet Adapter (Phantom / Solflare / Torus) connected in header
- Setup-vault flow (3 sequential txs: init + createDWallet + approve)
- Real SOL deposit panel with wallet balance, quick %, tx sig feedback
- Live vault stats from chain (total deposited / net value / yield earned)
- Devnet endpoint pre-configured

## Architecture

```mermaid
graph TD
    User["User / Wallet\n(Phantom / Solflare)"] -->|"SOL deposit\nor bridgeless asset"| FE["React + Vite\nFrontend"]
    FE -->|"initialize_vault\ncreate_dwallet\napprove_dwallet"| SP["Solana Anchor Program\nG8SzxHU2u..."]
    FE -->|"deposit / execute_strategy\nharvest_yield / withdraw"| SP

    SP -->|"enforces 4 guardrails\n(drawdown / limit / timelock / whitelist)"| GR["On-chain Guardrails"]
    SP -->|"stores ciphertext + SHA-256\nhash commitment"| FHE["Encrypt REFHE Layer\n(devnet: AES-GCM sim\nprod: real REFHE)"]
    SP -->|"registers & approves\ndWallet binding"| IKA["Ika dWallet Layer\n(devnet: stub\nprod: 2PC-MPC on Sui)"]

    IKA -->|"custody of native BTC/ETH\nno bridge, no wrap"| NATIVE["Native Assets\n(BTC / ETH / RWAs)"]
    SP -->|"lamports vault → protocol"| PROTO["Whitelisted Protocol\n(yield source)"]
    PROTO -->|"principal + yield\nreturned to vault"| SP

    SP -->|"encrypted P&L blob\nowner-only decrypt"| PERF["Performance Summary\n(FHE-encrypted)"]
```

> **Devnet simulation note:** Ika dWallet creation uses a deterministic stub (real 2PC-MPC ceremony runs on Sui devnet — SDK is pre-alpha). Encrypt REFHE uses AES-GCM + magic header on devnet; production swaps to the real REFHE verifier. All on-chain guardrails, lamport transfers, and account structures are real and verifiable today.

## Tech Stack
- **Solana Program**: Anchor 0.29 (Rust) — 10 instructions, deployed to devnet
- **Privacy**: Encrypt REFHE FHE (devnet simulation → production REFHE verifier)
- **Custody**: Ika dWallets 2PC-MPC (devnet stub → production Sui integration)
- **Frontend**: React 19 + Vite 6 + Solana Wallet Adapter (Phantom / Solflare)
- **Browser compat**: `vite-plugin-node-polyfills` — polyfills `stream`, `crypto`, `buffer` for wallet-adapter dependencies
- **Styling**: Inline design system (Material You tokens)
- **RPC**: Solana devnet (Helius / QuickNode recommended for production)

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
# From repo root (Vite is configured at the root level)
npm install
npm run dev
# open http://localhost:5173

# To build for production / deploy (Vercel, Netlify, etc.)
npm run build
```

Connect **Phantom** or **Solflare** on devnet. On first visit click  
**"Setup Vault + dWallet"** — this sends 5 transactions that initialise your  
on-chain vault, register the Ika dWallet binding, whitelist a yield protocol,  
and encrypt + store your strategy params on-chain. Then deposit SOL and run the  
Zerion Agent cycle from the vault detail page.

### Verify program correctness (without Solana toolchain)

```bash
cd program
cargo check   # passes — zero errors, only pre-existing Anchor macro warnings
```

Full `anchor build` requires the Solana platform tools on Linux / WSL / macOS  
(the SBF linker does not run on Windows natively). The program is deployed at:

**Program ID (Devnet):** `G8SzxHU2uHnxNSvjXhdgfHmjGjBL4hdzm1frkHyYbusS`
