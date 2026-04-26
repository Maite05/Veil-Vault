/**
 * Ika dWallet integration client
 *
 * Ika implements 2PC-MPC (Two-Party Computation + Multi-Party Computation):
 *   • The Solana program holds one share of the signing key.
 *   • The user holds the other share.
 *   • Together they produce a valid signature for any supported chain
 *     (Bitcoin, Ethereum, Solana, RWAs) WITHOUT either party having the full key.
 *
 * This enables **bridgeless deposits**: native BTC or ETH can be sent to the
 * dWallet's address directly, and the Solana program controls when / how those
 * funds are moved — no wrapping, no bridge.
 *
 * Integration status: Ika is pre-alpha devnet.
 * ──────────────────────────────────────────────────────────────────────────────
 * Devnet simulation approach
 * ──────────────────────────
 * The Ika SDK is not yet publicly available as a stable npm package.
 * This file provides the interface VeilVault needs and stubs the network calls
 * so the demo runs on devnet today.  When the Ika SDK ships, replace the
 * `_ikaDevnetCall` stub with real SDK calls.
 *
 * Real Ika flow reference: https://docs.ika.xyz (pre-alpha docs)
 */

import { randomBytes, createHash } from "crypto";
import { PublicKey } from "@solana/web3.js";


export const CHAIN_SOLANA = 0;
export const CHAIN_BITCOIN = 1;
export const CHAIN_ETHEREUM = 2;
export const CHAIN_RWA = 3;

/** Bitmask helpers */
export function chainBitmap(...chains: number[]): number {
  return chains.reduce((acc, c) => acc | (1 << c), 0);
}

export interface DWalletConfig {
  /** Which chains this dWallet will custody */
  chains: number[];
  /** Vault's Solana public key — one MPC participant */
  vaultPubkey: PublicKey;
  /** User's Solana public key — the other MPC participant */
  userPubkey: PublicKey;
}

export interface DWalletCreateResult {
  /**
   * Ika dWallet object ID on Sui (32-byte object digest).
   * Stored in DWalletRecord.dwallet_id on-chain.
   */
  dwalletId: Uint8Array;
  /**
   * Aggregated 2PC-MPC public key (compressed secp256k1, 33 bytes).
   * This is the address that receives native BTC/ETH for bridgeless deposits.
   */
  dwalletPubkey: Uint8Array;
  /** Address string for each chain the dWallet supports */
  chainAddresses: Record<string, string>;
  chainBitmap: number;
}

export interface BridgelessDepositIntent {
  /** Ika transaction digest (32 bytes) — stored in DepositRecord.dwallet_tx_id */
  dwalletTxId: Uint8Array;
  /** Chain the deposit came from */
  sourceChain: number;
  /** Amount in the native chain's smallest unit */
  nativeAmount: bigint;
  /** Equivalent lamports credited to the Solana vault */
  equivalentLamports: bigint;
  /** On-chain proof that the Ika signing ceremony completed */
  proofBytes: Uint8Array;
}

export interface DWalletSignRequest {
  /** Raw transaction bytes to be signed */
  txBytes: Uint8Array;
  /** Chain identifier */
  chain: number;
  /** Program-side approval must be obtained before signing */
  programApprovalSignature: Uint8Array;
}


/**
 * Create a new Ika dWallet.
 *
 * Production flow:
 *   1. Vault program calls `ika::create_dwallet` on Sui via CPI/IBC.
 *   2. User's client runs the 2PC key generation protocol with Ika's MPC nodes.
 *   3. The aggregated pubkey is returned and stored on-chain.
 *
 * Devnet: generate deterministic pseudo-keys from the vault + user pubkeys.
 */
export async function createDWallet(
  config: DWalletConfig
): Promise<DWalletCreateResult> {
  // Simulated 2PC-MPC key derivation
  const seed = createHash("sha256")
    .update(config.vaultPubkey.toBuffer())
    .update(config.userPubkey.toBuffer())
    .update(randomBytes(16)) // nonce so each call produces a unique dWallet
    .digest();

  // dWallet ID: 32-byte Sui object digest (simulated)
  const dwalletId = new Uint8Array(seed);

  // Aggregated MPC pubkey: 33-byte compressed secp256k1 (simulated)
  const dwalletPubkey = new Uint8Array(33);
  dwalletPubkey[0] = 0x02; // compressed prefix
  dwalletPubkey.set(seed.slice(0, 32), 1);

  const bitmap = chainBitmap(...config.chains);

  // Derive pseudo-addresses per chain
  const chainAddresses: Record<string, string> = {};
  if (config.chains.includes(CHAIN_SOLANA)) {
    chainAddresses["solana"] = new PublicKey(seed).toBase58();
  }
  if (config.chains.includes(CHAIN_BITCOIN)) {
    chainAddresses["bitcoin"] = `bc1q${Buffer.from(seed.slice(0, 20)).toString("hex")}`;
  }
  if (config.chains.includes(CHAIN_ETHEREUM)) {
    chainAddresses["ethereum"] = `0x${Buffer.from(seed.slice(0, 20)).toString("hex")}`;
  }
  if (config.chains.includes(CHAIN_RWA)) {
    chainAddresses["rwa"] = Buffer.from(seed.slice(0, 16)).toString("hex");
  }

  console.log("[Ika] dWallet created (devnet sim):", {
    dwalletId: Buffer.from(dwalletId).toString("hex").slice(0, 16) + "...",
    chainAddresses,
  });

  return { dwalletId, dwalletPubkey, chainAddresses, chainBitmap: bitmap };
}

/**
 * Simulate a bridgeless deposit arriving via an Ika dWallet.
 *
 * Production flow:
 *   1. User sends native BTC/ETH to the dWallet chain address.
 *   2. Ika MPC nodes detect the on-chain event and produce a signing intent.
 *   3. The vault program approves the intent (verifying guardrails).
 *   4. Ika signs a Solana tx that credits the vault.
 *
 * Devnet: generate a mock transaction digest and proof bytes.
 */
export async function simulateBridgelessDeposit(
  dwalletId: Uint8Array,
  sourceChain: number,
  nativeAmount: bigint,
  /** Simple exchange rate for demo: 1 unit = N lamports */
  lamportsPerUnit = 1_000_000n
): Promise<BridgelessDepositIntent> {
  const dwalletTxId = new Uint8Array(
    createHash("sha256")
      .update(Buffer.from(dwalletId))
      .update(Buffer.from(BigInt(Date.now()).toString()))
      .digest()
  );

  const equivalentLamports = nativeAmount * lamportsPerUnit;

  // Proof bytes: [dwalletId(32)] [txId(32)] — in production a threshold signature
  const proofBytes = new Uint8Array(64);
  proofBytes.set(dwalletId.slice(0, 32), 0);
  proofBytes.set(dwalletTxId, 32);

  console.log("[Ika] Bridgeless deposit intent:", {
    sourceChain,
    nativeAmount: nativeAmount.toString(),
    equivalentLamports: equivalentLamports.toString(),
    txId: Buffer.from(dwalletTxId).toString("hex").slice(0, 16) + "...",
  });

  return { dwalletTxId, sourceChain, nativeAmount, equivalentLamports, proofBytes };
}

/**
 * Request a co-signature from Ika for a cross-chain transaction.
 *
 * This is how the vault executes strategy operations on non-Solana chains:
 *   1. Vault program emits an approval event (guardrails passed).
 *   2. Client passes the program approval to this function.
 *   3. Ika's 2PC-MPC produces a combined signature.
 *   4. The signed tx is broadcast to the target chain.
 *
 * Devnet: returns a mock signature.
 */
export async function requestDWalletSignature(
  request: DWalletSignRequest
): Promise<{ signature: Uint8Array; chain: number }> {
  const sig = new Uint8Array(64);
  const hash = createHash("sha256")
    .update(request.txBytes)
    .update(request.programApprovalSignature)
    .digest();
  sig.set(hash, 0);
  sig.set(hash.slice(0, 32), 32);

  console.log("[Ika] Signing ceremony complete (devnet sim). Chain:", request.chain);
  return { signature: sig, chain: request.chain };
}

/**
 * Verify that a bridgeless deposit proof is valid.
 * Production: verify the Ika threshold signature against the dWallet pubkey.
 * Devnet: check structural integrity of the proof bytes.
 */
export function verifyDepositProof(
  proof: Uint8Array,
  dwalletId: Uint8Array
): boolean {
  if (proof.length !== 64) return false;
  // First 32 bytes must match the dWallet ID
  return Buffer.from(proof.slice(0, 32)).equals(Buffer.from(dwalletId));
}

/**
 * Format a dWallet ID for display.
 */
export function formatDWalletId(dwalletId: Uint8Array): string {
  return `0x${Buffer.from(dwalletId).toString("hex").slice(0, 8)}...${Buffer.from(dwalletId).toString("hex").slice(-8)}`;
}
