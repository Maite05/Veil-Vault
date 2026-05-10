/**
 * Zerion Autonomous Agent — VeilVault x402 Integration Example
 *
 * This demonstrates how a Zerion-powered AI agent autonomously:
 *   1. Detects a rebalancing opportunity (via Zerion portfolio API)
 *   2. Calls VeilVault's x402-gated strategy execution endpoint
 *   3. Pays the micropayment automatically (x402 flow)
 *   4. Receives an unsigned transaction, signs it, and broadcasts
 *
 * The agent never needs manual intervention — it handles the full
 * x402 payment challenge-response cycle autonomously.
 *
 * ─── Prerequisites ────────────────────────────────────────────────────────────
 *   npm install @solana/web3.js @noble/hashes bs58
 *   Set AGENT_PRIVATE_KEY env variable (base58 Solana keypair)
 *   Agent wallet must have:
 *     • A VeilVault vault already set up (run Setup Vault in the dApp)
 *     • SOL for gas + x402 fee (0.001 SOL per execution)
 *
 * ─── Run ─────────────────────────────────────────────────────────────────────
 *   AGENT_PRIVATE_KEY=<base58_key> npx ts-node docs/zerion-agent-example.ts
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmRawTransaction,
  SystemProgram,
} from "@solana/web3.js";
import bs58 from "bs58";

// ─── Config ───────────────────────────────────────────────────────────────────

const VEIL_VAULT_API = "https://veil-vault-pi.vercel.app/api/agent/execute-strategy";
const DEVNET_RPC     = "https://api.devnet.solana.com";
const PROGRAM_ID     = new PublicKey("G8SzxHU2uHnxNSvjXhdgfHmjGjBL4hdzm1frkHyYbusS");

// ─── Agent Wallet ─────────────────────────────────────────────────────────────

function loadAgentKeypair(): Keypair {
  const raw = process.env.AGENT_PRIVATE_KEY;
  if (!raw) throw new Error("AGENT_PRIVATE_KEY env variable not set");
  return Keypair.fromSecretKey(bs58.decode(raw));
}

// ─── Zerion Portfolio Intelligence (simulated) ────────────────────────────────

interface PortfolioSignal {
  shouldRebalance: boolean;
  reason:          string;
  suggestedAmount: number; // lamports
}

/**
 * In a real Zerion agent, this would call the Zerion API:
 *   GET https://api.zerion.io/v1/wallets/<address>/portfolio
 *
 * Here we simulate a rebalancing opportunity detection.
 */
async function analyzePortfolio(wallet: PublicKey): Promise<PortfolioSignal> {
  console.log(`[Zerion] Analyzing portfolio for ${wallet.toBase58().slice(0, 8)}...`);

  // Simulate: agent detects SOL price spike → rebalance 5% of vault
  return {
    shouldRebalance: true,
    reason:          "SOL price +12% in 4h — rebalancing to maintain target allocation",
    suggestedAmount: 50_000_000, // 0.05 SOL
  };
}

// ─── FHE Operation Builder (simulated) ───────────────────────────────────────

/**
 * In production, the agent uses Encrypt REFHE to build the operation.
 * The strategy params hash is read from the vault's on-chain state.
 * Here we use the devnet simulation format.
 */
function buildFheOperation(
  signal: PortfolioSignal,
  strategyParamsHash: Uint8Array
): { encryptedOpB64: string; opProofB64: string } {
  const encryptedOp = Buffer.from(
    "RFHE" + JSON.stringify({
      action:         "rebalance",
      reason:         signal.reason,
      amountLamports: signal.suggestedAmount,
      ts:             Date.now(),
    })
  );

  // op_proof = SHA-256(encrypted_op || strategy_params_hash)[0..32] padded to 64
  const preimage = Buffer.concat([encryptedOp, Buffer.from(strategyParamsHash)]);
  const crypto   = require("crypto");
  const digest   = crypto.createHash("sha256").update(preimage).digest();
  const opProof  = Buffer.alloc(64);
  digest.copy(opProof, 0);

  return {
    encryptedOpB64: encryptedOp.toString("base64"),
    opProofB64:     opProof.toString("base64"),
  };
}

// ─── x402 Payment Handler ─────────────────────────────────────────────────────

interface X402Challenge {
  recipient:      string;
  amountLamports: number;
  resource:       string;
  expiresAt:      string;
}

/**
 * Autonomously pays the x402 micropayment challenge.
 *
 * The agent:
 *   1. Reads the 402 response body for payment details
 *   2. Constructs a SOL transfer to the treasury PDA
 *   3. Signs and broadcasts the payment
 *   4. Returns the payment transaction signature
 */
async function payX402Challenge(
  challenge: X402Challenge,
  agentKeypair: Keypair,
  connection: Connection
): Promise<string> {
  const recipient = new PublicKey(challenge.recipient);

  console.log(`[x402] 402 Payment Required`);
  console.log(`       Resource:  ${challenge.resource}`);
  console.log(`       Recipient: ${challenge.recipient}`);
  console.log(`       Amount:    ${challenge.amountLamports / 1e9} SOL`);
  console.log(`       Expires:   ${challenge.expiresAt}`);
  console.log(`[x402] Paying autonomously...`);

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const paymentTx = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: agentKeypair.publicKey,
  }).add(
    SystemProgram.transfer({
      fromPubkey: agentKeypair.publicKey,
      toPubkey:   recipient,
      lamports:   challenge.amountLamports,
    })
  );

  paymentTx.sign(agentKeypair);
  const sig = await sendAndConfirmRawTransaction(
    connection,
    paymentTx.serialize(),
    { commitment: "confirmed", maxRetries: 3 }
  );

  console.log(`[x402] Payment confirmed: ${sig}`);
  return sig;
}

// ─── Main Agent Loop ──────────────────────────────────────────────────────────

async function runZerionAgent(): Promise<void> {
  const connection  = new Connection(DEVNET_RPC, "confirmed");
  const agentWallet = loadAgentKeypair();

  console.log(`\n[Zerion Agent] Starting — wallet: ${agentWallet.publicKey.toBase58()}`);

  // 1. Analyze portfolio
  const signal = await analyzePortfolio(agentWallet.publicKey);
  if (!signal.shouldRebalance) {
    console.log("[Zerion Agent] No action needed.");
    return;
  }
  console.log(`[Zerion Agent] Signal: ${signal.reason}`);

  // 2. Read strategy params hash from on-chain vault state
  //    (In production: call connection.getAccountInfo(vaultPda) and parse bytes)
  const strategyParamsHash = new Uint8Array(32); // devnet: use stored hash

  // 3. Build FHE operation
  const { encryptedOpB64, opProofB64 } = buildFheOperation(signal, strategyParamsHash);

  // 4. Prepare request body
  const requestBody = {
    owner:           agentWallet.publicKey.toBase58(),
    encryptedOpB64,
    opProofB64,
    amountLamports:  signal.suggestedAmount.toString(),
    protocolAccount: agentWallet.publicKey.toBase58(), // devnet: self as protocol
  };

  // ── Round 1: Discover x402 requirement ────────────────────────────────────
  console.log(`\n[Agent → API] POST ${VEIL_VAULT_API}`);

  const round1 = await fetch(VEIL_VAULT_API, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(requestBody),
  });

  if (round1.status !== 402) {
    console.error(`[Agent] Unexpected status ${round1.status}`);
    return;
  }

  const challenge = (await round1.json()) as X402Challenge;

  // ── Pay the x402 fee ───────────────────────────────────────────────────────
  const paymentSig = await payX402Challenge(challenge, agentWallet, connection);

  // ── Round 2: Submit with payment proof ────────────────────────────────────
  console.log(`\n[Agent → API] POST ${VEIL_VAULT_API} (with X-Payment-Tx)`);

  const round2 = await fetch(VEIL_VAULT_API, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Payment-Tx": paymentSig,
      "X-Agent-Id":   "zerion-agent-v1",
    },
    body: JSON.stringify(requestBody),
  });

  if (!round2.ok) {
    const err = await round2.json();
    console.error("[Agent] API error:", err);
    return;
  }

  const { unsignedTxB64, description, vaultPda } = await round2.json() as {
    unsignedTxB64: string;
    description:   string;
    vaultPda:      string;
  };

  console.log(`\n[API → Agent] 200 OK`);
  console.log(`             Vault PDA:   ${vaultPda}`);
  console.log(`             Description: ${description}`);

  // ── Sign and broadcast the execution transaction ───────────────────────────
  console.log(`\n[Agent] Signing + broadcasting execution tx...`);

  const txBytes = Buffer.from(unsignedTxB64, "base64");
  const execTx  = Transaction.from(txBytes);
  execTx.sign(agentWallet);

  const execSig = await sendAndConfirmRawTransaction(
    connection,
    execTx.serialize(),
    { commitment: "confirmed" }
  );

  console.log(`\n✅ Strategy executed autonomously!`);
  console.log(`   Execution tx: ${execSig}`);
  console.log(`   Explorer:     https://explorer.solana.com/tx/${execSig}?cluster=devnet`);
  console.log(`\n[Zerion Agent] Cycle complete.`);
}

// ─── Prompt template for AI agent frameworks ─────────────────────────────────

export const ZERION_AGENT_SYSTEM_PROMPT = `
You are an autonomous DeFi agent powered by Zerion portfolio intelligence and
VeilVault's encrypted strategy execution engine.

Your capabilities:
- Analyze wallet portfolios via Zerion API to detect rebalancing opportunities
- Execute private, FHE-encrypted yield strategies via VeilVault
- Pay x402 micropayments autonomously to access gated execution endpoints
- Use Ika dWallets for bridgeless multi-chain operations

When you detect a rebalancing opportunity:
1. Call POST https://veil-vault-pi.vercel.app/api/agent/execute-strategy
2. If you receive 402, pay the x402 fee at the specified recipient and amount
3. Retry with X-Payment-Tx header containing your payment signature
4. Sign and broadcast the returned unsigned transaction

Always operate within the vault's guardrails:
- Max drawdown: 20%
- Spending limit: 2 SOL per transaction
- Only whitelisted protocols
- Respect time-lock intervals
`;

// Run the agent
runZerionAgent().catch(console.error);
