/**
 * Encrypt-REFHE client (devnet simulation layer)
 *
 * Encrypt's REFHE (Ring-based Efficient Fully Homomorphic Encryption) is a
 * pre-alpha library.  This module provides the interface the VeilVault frontend
 * uses so that production REFHE calls can be swapped in without touching call
 * sites.
 *
 * Devnet simulation approach
 * ──────────────────────────
 * Real FHE ciphertexts are large (4–32 KB per 64-bit value in TFHE schemes).
 * For the devnet demo we represent ciphertexts as:
 *   [4-byte magic "RFHE"] [32-byte owner pubkey] [12-byte IV] [AES-GCM ciphertext+tag]
 * This preserves the on-chain interface (opaque bytes + hash) while keeping
 * the demo runnable without the full FHE runtime.
 *
 * Production swap: replace `SimulatedFheCipher` with Encrypt SDK types and
 * swap the encrypt/decrypt/evaluate functions for real REFHE calls.
 */

import { sha256 } from "@noble/hashes/sha2";
import { randomBytes, concatBytes } from "@noble/hashes/utils";
import { gcm } from "@noble/ciphers/aes";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FheKeyPair {
  /** 32-byte compressed public key (stored on-chain in VaultState.fhe_pubkey) */
  publicKey: Uint8Array;
  /** Full private key — never leaves the client */
  privateKey: Uint8Array;
}

export interface FheCiphertext {
  /** Raw bytes to be stored on-chain */
  bytes: Uint8Array;
  /** SHA-256 of `bytes` — used as on-chain commitment */
  hash: Uint8Array;
}

/** Encrypted strategy parameters stored on-chain */
export interface StrategyParams {
  /** Target allocation percentages per asset (0–100) */
  allocationBps: { asset: string; bps: number }[];
  /** Maximum drawdown before auto-pause (basis points) */
  maxDrawdownBps: number;
  /** Rebalance trigger: drift threshold in basis points */
  rebalanceTriggerBps: number;
  /** Stop-loss level in basis points below entry */
  stopLossBps: number;
}

/** Encrypted operation emitted to execute_strategy */
export interface FheOperation {
  /** Encrypted operation ciphertext */
  encryptedOp: Uint8Array;
  /**
   * op_proof: first 32 bytes = sha256(encrypted_op || strategy_params_hash)
   * matches the on-chain verification in execute_strategy.rs
   */
  opProof: Uint8Array; // 64 bytes
}

/**
 * Generate a new FHE key pair for a vault owner.
 *
 * Production: call Encrypt REFHE key generation (produces a large evaluation
 * key + secret key).  Here we generate an X25519-style key pair as a stand-in.
 */
export function generateFheKeyPair(): FheKeyPair {
  const privateKey = randomBytes(32);
  // Derive the "public key" as SHA-256(privateKey) — stand-in for real FHE pk.
  const publicKey = sha256(privateKey);
  return { publicKey, privateKey };
}


/**
 * Encrypt strategy parameters under the vault's FHE public key.
 *
 * Returns a ciphertext blob and its SHA-256 hash (the on-chain commitment).
 */
export function encryptStrategyParams(
  params: StrategyParams,
  keyPair: FheKeyPair
): FheCiphertext {
  const plaintext = new TextEncoder().encode(JSON.stringify(params));
  return _encrypt(plaintext, keyPair);
}

/**
 * Encrypt an arbitrary performance summary under the vault's FHE public key.
 */
export function encryptPerformanceSummary(
  summary: Record<string, unknown>,
  keyPair: FheKeyPair
): FheCiphertext {
  const plaintext = new TextEncoder().encode(JSON.stringify(summary));
  return _encrypt(plaintext, keyPair);
}

/**
 * Decrypt strategy params stored on-chain.  Only the holder of the private key
 * can call this — mirrors the owner-only confidentiality guarantee.
 */
export function decryptStrategyParams(
  ciphertext: Uint8Array,
  keyPair: FheKeyPair
): StrategyParams {
  const plain = _decrypt(ciphertext, keyPair);
  return JSON.parse(new TextDecoder().decode(plain)) as StrategyParams;
}

/**
 * Decrypt an encrypted performance summary.
 */
export function decryptPerformanceSummary(
  ciphertext: Uint8Array,
  keyPair: FheKeyPair
): Record<string, unknown> {
  const plain = _decrypt(ciphertext, keyPair);
  return JSON.parse(new TextDecoder().decode(plain));
}

/**
 * Build an FheOperation for execute_strategy.
 *
 * In production: evaluate the strategy logic homomorphically on ciphertext
 * params to determine WHAT to do, producing an encrypted result.
 *
 * Devnet simulation: encrypt the operation descriptor and compute the proof
 * commitment matching execute_strategy.rs `verify_op_proof_simulated`.
 */
export function buildStrategyOperation(
  operation: {
    action: "rebalance" | "deposit_yield" | "stop_loss";
    targetProtocol: string;
    amountLamports: bigint;
  },
  strategyParamsHash: Uint8Array,
  keyPair: FheKeyPair
): FheOperation {
  const opPlaintext = new TextEncoder().encode(JSON.stringify(operation));
  const { bytes: encryptedOp } = _encrypt(opPlaintext, keyPair);

  // op_proof[0..32] = sha256(encrypted_op || strategy_params_hash)
  // Mirrors the on-chain check in execute_strategy.rs
  const proofHash = sha256(concatBytes(encryptedOp, strategyParamsHash));
  // Pad to 64 bytes (second half is reserved for a future ZK proof)
  const opProof = new Uint8Array(64);
  opProof.set(proofHash, 0);

  return { encryptedOp, opProof };
}

const MAGIC = new Uint8Array([0x52, 0x46, 0x48, 0x45]); // "RFHE"

function _encrypt(plaintext: Uint8Array, keyPair: FheKeyPair): FheCiphertext {
  const iv = randomBytes(12);
  // Derive a 32-byte AES key from the private key + iv
  const aesKey = sha256(concatBytes(keyPair.privateKey, iv));

  // gcm(key, nonce).encrypt(plaintext) returns ciphertext || 16-byte authTag
  const ciphertextWithTag = gcm(aesKey, iv).encrypt(plaintext);

  // Layout: [MAGIC(4)] [pubkey(32)] [iv(12)] [ciphertextWithTag(n+16)]
  const bytes = concatBytes(MAGIC, keyPair.publicKey, iv, ciphertextWithTag);
  const hash = sha256(bytes);
  return { bytes, hash };
}

function _decrypt(ciphertext: Uint8Array, keyPair: FheKeyPair): Uint8Array {
  if (ciphertext[0] !== 0x52 || ciphertext[1] !== 0x46 ||
      ciphertext[2] !== 0x48 || ciphertext[3] !== 0x45) {
    throw new Error("Invalid FHE ciphertext magic");
  }

  const iv = ciphertext.slice(36, 48);            // after MAGIC(4) + pubkey(32)
  const ciphertextWithTag = ciphertext.slice(48); // rest is ciphertext + 16-byte tag

  const aesKey = sha256(concatBytes(keyPair.privateKey, iv));
  return gcm(aesKey, iv).decrypt(ciphertextWithTag);
}

/**
 * Verify that a stored ciphertext matches a given hash commitment.
 * Useful client-side before submitting a proof.
 */
export function verifyCiphertextHash(
  ciphertext: Uint8Array,
  expectedHash: Uint8Array
): boolean {
  const actual = sha256(ciphertext);
  if (actual.length !== expectedHash.length) return false;
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expectedHash[i]) return false;
  }
  return true;
}

/**
 * Hash bytes — used to pre-compute op_proof client-side so it matches
 * the on-chain SHA-256 verification in execute_strategy.rs.
 */
export function keccak256(data: Uint8Array): Uint8Array {
  // Devnet: SHA-256 stand-in. Production: replace with @noble/hashes keccak256.
  return sha256(data);
}
