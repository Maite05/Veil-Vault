/**
 * Server-Side VeilVault Execution
 *
 * Constructs an UNSIGNED execute_strategy transaction for the agent to sign
 * and broadcast.  The server never holds any user private key — the agent
 * retains full custody.
 *
 * Flow:
 *   1. API verifies x402 payment (verifyPaymentTransaction).
 *   2. API calls buildAgentExecutionTx → returns an unsigned serialised tx.
 *   3. Agent receives the tx, signs it, and broadcasts to Solana devnet.
 *
 * Why unsigned?
 *   The owner (agent wallet) must sign execute_strategy because the program
 *   checks that the owner pubkey matches the vault's stored owner field.
 *   Having the server sign on behalf of the user would be custodial.
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { createHash } from "crypto";

const DEVNET_RPC = "https://api.devnet.solana.com";

export const PROGRAM_ID = new PublicKey(
  "G8SzxHU2uHnxNSvjXhdgfHmjGjBL4hdzm1frkHyYbusS"
);

// ─── PDA helpers (must match program/src) ─────────────────────────────────────

function findVaultPda(owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    PROGRAM_ID
  )[0];
}

function findX402TreasuryPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("x402"), Buffer.from("treasury")],
    PROGRAM_ID
  )[0];
}

// ─── Borsh-lite encoders (mirrors the Anchor discriminator + param encoding) ──

function discriminator(name: string): Buffer {
  // Anchor discriminator = SHA-256("global:<name>")[0..8]
  return createHash("sha256")
    .update(`global:${name}`)
    .digest()
    .slice(0, 8);
}

function encodeBytes(b: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32LE(b.length, 0);
  return Buffer.concat([len, Buffer.from(b)]);
}

function encodeFixedArray(b: Uint8Array): Buffer {
  return Buffer.from(b); // 64-byte op_proof, fixed size
}

function encodeU64LE(n: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(n, 0);
  return buf;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface AgentExecutionRequest {
  /** Agent's Solana wallet that owns the vault */
  owner: string;
  /** FHE-encrypted operation bytes (base64) */
  encryptedOpB64: string;
  /** 64-byte op proof (base64) — SHA-256(encrypted_op ∥ strategy_params_hash) */
  opProofB64: string;
  /** Amount of SOL-equivalent lamports to execute */
  amountLamports: string;
  /** Protocol account to receive the deployed funds (must be whitelisted on-chain) */
  protocolAccount: string;
}

export interface AgentExecutionResponse {
  /** Base64-encoded UNSIGNED transaction ready for agent to sign + broadcast */
  unsignedTxB64: string;
  /** Human-readable description of the transaction contents */
  description: string;
  /** x402 fee included in the transaction */
  x402FeeLamports: number;
  /** Vault PDA that will execute the strategy */
  vaultPda: string;
}

/**
 * Build an unsigned Solana transaction containing:
 *   1. x402 micropayment (SOL transfer → treasury PDA)
 *   2. execute_strategy instruction (FHE-guarded capital deployment)
 *
 * The agent signs this with its wallet and broadcasts.
 * Both instructions are ATOMIC — x402 fee is proof of intent to pay.
 */
export async function buildAgentExecutionTx(
  req: AgentExecutionRequest,
  x402FeeLamports: number
): Promise<AgentExecutionResponse> {
  const connection    = new Connection(DEVNET_RPC, "confirmed");
  const owner         = new PublicKey(req.owner);
  const protocolAcct  = new PublicKey(req.protocolAccount);
  const vaultPda      = findVaultPda(owner);
  const treasury      = findX402TreasuryPda();
  const amountLamports = BigInt(req.amountLamports);

  const encryptedOp = Buffer.from(req.encryptedOpB64, "base64");
  const opProof     = Buffer.from(req.opProofB64,     "base64");

  // Instruction 1: x402 micropayment (SOL → treasury PDA)
  const x402Ix = SystemProgram.transfer({
    fromPubkey: owner,
    toPubkey:   treasury,
    lamports:   x402FeeLamports,
  });

  // Instruction 2: execute_strategy
  const data = Buffer.concat([
    discriminator("execute_strategy"),
    encodeBytes(encryptedOp),
    encodeFixedArray(opProof),
    encodeU64LE(amountLamports),
  ]);

  const executeIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: owner,        isSigner: true,  isWritable: true  },
      { pubkey: vaultPda,     isSigner: false, isWritable: true  },
      { pubkey: protocolAcct, isSigner: false, isWritable: true  },
    ],
    data,
  });

  // Assemble unsigned transaction
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction();
  tx.recentBlockhash   = blockhash;
  tx.feePayer          = owner;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.add(x402Ix, executeIx);

  return {
    unsignedTxB64:   tx.serialize({ requireAllSignatures: false }).toString("base64"),
    description:     `x402 fee (${x402FeeLamports} lamports) + execute_strategy (${amountLamports} lamports) — atomic bundle`,
    x402FeeLamports,
    vaultPda:        vaultPda.toBase58(),
  };
}
