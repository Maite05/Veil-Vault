# VeilVault

**Veiled. Bridgeless. Autonomous.**  
Private yield infrastructure for the multi-chain agent economy on Solana.

**Submitted to:** Colosseum Frontier Hackathon 2026  
**Tracks:** Main Competition + Encrypt & Ika + Zerion Autonomous Agents  

**Live Demo:** [https://veil-vault-pi.vercel.app](https://veil-vault-pi.vercel.app)  
**Demo Video:** [https://youtu.be/KXeAP_rFUbo](https://youtu.be/KXeAP_rFUbo)  
**Program ID (Devnet):** `G8SzxHU2uHnxNSvjXhdgfHmjGjBL4hdzm1frkHyYbusS`

## Vision

VeilVault is building the **private & programmable yield layer** for Solana’s emerging agent economy.

We enable users and autonomous agents to deploy capital across chains **without bridges**, run **fully confidential strategies**, and enforce strong on-chain guardrails — all while paying natively via x402.

By combining Ika’s dWallets, Encrypt’s FHE, and atomic x402 payments, we’re creating infrastructure that institutions, DAOs, and AI agents can actually trust with serious capital.

## The Problem

- Bridge hacks remain one of crypto’s biggest vulnerabilities (billions lost).
- Public strategies lead to constant front-running and alpha leakage.
- The rapid rise of autonomous AI agents creates a critical need for decentralized custody and guardrails they cannot exceed.

Current solutions force users to choose between **security**, **privacy**, or **performance**. VeilVault removes that tradeoff.

## Our Solution

VeilVault is a decentralized strategy vault that delivers:

- **Bridgeless custody** of native assets (BTC, ETH, RWAs) using **Ika dWallets**
- **Confidential computation** of strategies using **Encrypt REFHE (FHE)**
- **Atomic agent payments** via the **x402 protocol** on Solana
- **Programmable guardrails** (max drawdown, spending limits, time-locks, protocol whitelists)

Solana acts as the fast, low-cost control and settlement layer while keeping sensitive logic and positions veiled.

## Key Innovation & Technical Highlights

- Deep integration of **Ika 2PC-MPC dWallets** for true bridgeless multi-chain custody
- **Encrypt REFHE FHE** for fully encrypted strategy execution (no decryption during computation)
- **x402 + Solana atomicity** — agents can autonomously pay and execute in a single transaction
- 10-instruction Anchor program with robust on-chain guardrails
- Full **Zerion Agent** integration (autonomous discovery → payment → execution loop)

**Live and working on devnet** with x402 micropayments, FHE execution, and agent flows.

## Target Users & Market Opportunity

| Segment                        | Use Case                              | Pain Point Addressed              |
|--------------------------------|---------------------------------------|-----------------------------------|
| AI Agent Operators             | Autonomous multi-chain yield          | Safe guardrails + payments        |
| Institutions & Family Offices  | Private alpha protection              | Front-running & MEV               |
| Emerging Market HNW            | Confidential yield on savings         | Privacy + regulatory risk         |
| DAOs & Treasury Teams          | Multi-chain asset management          | Bridge risk + fragmentation       |

**Initial focus:** Agent operators and privacy-conscious power users, expanding into institutional and emerging market capital.

**Monetization:** x402 micropayments per execution + future premium strategy marketplace and enterprise SaaS.

## Post-Hackathon Roadmap

- Mainnet launch + security audit
- Full production integration with Ika and Encrypt
- Agent SDK for easy adoption by other protocols
- Geographic focus on high-remittance markets (South Africa & Nigeria first)
- Institutional product tier for private yield vaults

We are actively building toward a scalable infrastructure business and are highly interested in the **Colosseum Accelerator**.

## Team

**Simatu S & Maite L** — Technical Founders (Johannesburg, South Africa)  
Deep experience in Solana, MPC, and cryptographic systems. Building VeilVault from first principles to solve both frontier technical challenges and real problems in emerging markets.

## Technical Architecture

```mermaid
flowchart TD
    subgraph Agent ["Zerion Autonomous Agent"]
        A1[Portfolio Analysis via Zerion] 
        A2[Decides to Rebalance]
        A1 --> A2
    end

    subgraph Payment ["x402 Payment Flow"]
        B1[POST /api/agent/execute-strategy]
        B2[402 Payment Required]
        B3[Agent Pays 0.001 SOL]
        B4[Submit with Payment Proof]
        B1 --> B2 --> B3 --> B4
    end

    subgraph VeilVault ["VeilVault Core"]
        C1[Verify x402 Payment on-chain]
        C2[Run FHE Strategy Computation\n(Encrypt REFHE)]
        C3[Enforce Guardrails]
        C4[Execute Strategy]
        C1 --> C2 --> C3 --> C4
    end

    subgraph Ika ["Ika + Execution"]
        D1[dWallet Signing\n(Bridgeless)]
        D2[Interact with DeFi Protocols\n(Kamino, Jupiter etc.)]
    end

    Agent --> Payment --> VeilVault --> Ika  



Full technical details, API specs, setup instructions, and agent example code are available below.

## **Tech Stack**

### **Solana Program**: Anchor (Rust)
#### **Privacy**: Encrypt REFHE (FHE)
#### **Custody**: Ika dWallets (2PC-MPC)
#### **Frontend**: React + Vite
#### **Payments**: x402 Protocol

### **VeilVault** — Privacy that doesn’t sacrifice power.

Built during Colosseum Frontier Hackathon 2026 with strong ambition to become core infrastructure for the next era of onchain capital.