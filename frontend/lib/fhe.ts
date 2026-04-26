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
 *   [4-byte magic "RFHE"] [32-byte owner pubkey] [AES-GCM encrypted plaintext]
 * This preserves the on-chain interface (opaque bytes + hash) while keeping
 * the demo runnable without the full FHE runtime.
 *
 * Production swap: replace `SimulatedFheCipher` with Encrypt SDK types and
 * swap the encrypt/decrypt/evaluate functions for real REFHE calls.
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";

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
   * op_proof: first 32 bytes = keccak256(encrypted_op || strategy_params_hash)
   * matches the on-chain verification in execute_strategy.rs
   */
  opProof: Uint8Array; // 64 bytes
}

// ─── Key generation ───────────────────────────────────────────────────────────

/**
 * Generate a new FHE key pair for a vault owner.
 *
 * Production: call Encrypt REFHE key generation (produces a large evaluation
 * key + secret key).  Here we generate an X25519-style key pair as a stand-in.
 */
export function generateFheKeyPair(): FheKeyPair {
  const privateKey = randomBytes(32);
  // Derive the "public key" as SHA-256(privateKey) — stand-in for real FHE pk.
  const publicKey = new Uint8Array(
    createHash("sha256").update(privateKey).digest()
  );
  return { publicKey, privateKey };
}

// ─── Encryption ───────────────────────────────────────────────────────────────

/**
 * Encrypt strategy parameters under the vault's FHE public key.
 *
 * Returns a ciphertext blob and its SHA-256 hash (the on-chain commitment).
 */
export function encryptStrategyParams(
  params: StrategyParams,
  keyPair: FheKeyPair
): FheCiphertext {
  const plaintext = Buffer.from(JSON.stringify(params), "utf8");
  return _encrypt(plaintext, keyPair);
}

/**
 * Encrypt an arbitrary performance summary under the vault's FHE public key.
 */
export function encryptPerformanceSummary(
  summary: Record<string, unknown>,
  keyPair: FheKeyPair
): FheCiphertext {
  const plaintext = Buffer.from(JSON.stringify(summary), "utf8");
  return _encrypt(plaintext, keyPair);
}

// ─── Decryption (owner-only) ──────────────────────────────────────────────────

/**
 * Decrypt strategy params stored on-chain.  Only the holder of the private key
 * can call this — mirrors the owner-only confidentiality guarantee.
 */
export function decryptStrategyParams(
  ciphertext: Uint8Array,
  keyPair: FheKeyPair
): StrategyParams {
  const plain = _decrypt(ciphertext, keyPair);
  return JSON.parse(plain.toString("utf8")) as StrategyParams;
}

/**
 * Decrypt an encrypted performance summary.
 */
export function decryptPerformanceSummary(
  ciphertext: Uint8Array,
  keyPair: FheKeyPair
): Record<string, unknown> {
  const plain = _decrypt(ciphertext, keyPair);
  return JSON.parse(plain.toString("utf8"));
}

// ─── Homomorphic operation builder ───────────────────────────────────────────

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
  const opPlaintext = Buffer.from(JSON.stringify(operation), "utf8");
  const { bytes: encryptedOp } = _encrypt(opPlaintext, keyPair);

  // op_proof[0..32] = keccak256(encrypted_op || strategy_params_hash)
  // Mirrors the on-chain check in execute_strategy.rs
  const proofPreimage = Buffer.concat([Buffer.from(encryptedOp), Buffer.from(strategyParamsHash)]);
  const proofHash = createHash("sha256").update(proofPreimage).digest();
  // Pad to 64 bytes (second half is reserved for a future ZK proof)
  const opProof = new Uint8Array(64);
  opProof.set(proofHash, 0);

  return { encryptedOp, opProof };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAGIC = Buffer.from("RFHE");

function _encrypt(plaintext: Buffer, keyPair: FheKeyPair): FheCiphertext {
  // Derive a 32-byte AES key from the private key + a random nonce.
  const iv = randomBytes(12);
  const aesKey = createHash("sha256")
    .update(Buffer.from(keyPair.privateKey))
    .update(iv)
    .digest();

  const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Layout: [MAGIC(4)] [pubkey(32)] [iv(12)] [tag(16)] [ciphertext(n)]
  const bytes = Buffer.concat([
    MAGIC,
    Buffer.from(keyPair.publicKey),
    iv,
    tag,
    encrypted,
  ]);

  const hash = new Uint8Array(createHash("sha256").update(bytes).digest());
  return { bytes: new Uint8Array(bytes), hash };
}

function _decrypt(ciphertext: Uint8Array, keyPair: FheKeyPair): Buffer {
  const buf = Buffer.from(ciphertext);

  if (!buf.slice(0, 4).equals(MAGIC)) {
    throw new Error("Invalid FHE ciphertext magic");
  }

  const iv = buf.slice(36, 48);   // after MAGIC(4) + pubkey(32)
  const tag = buf.slice(48, 64);
  const encrypted = buf.slice(64);

  const aesKey = createHash("sha256")
    .update(Buffer.from(keyPair.privateKey))
    .update(iv)
    .digest();

  const decipher = createDecipheriv("aes-256-gcm", aesKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Verify that a stored ciphertext matches a given hash commitment.
 * Useful client-side before submitting a proof.
 */
export function verifyCiphertextHash(
  ciphertext: Uint8Array,
  expectedHash: Uint8Array
): boolean {
  const actual = createHash("sha256").update(Buffer.from(ciphertext)).digest();
  return Buffer.from(actual).equals(Buffer.from(expectedHash));
}

/**
 * Hash bytes exactly as Solana's `keccak::hash` does — used to pre-compute
 * op_proof client-side so it matches the on-chain verification.
 */
export function keccak256(data: Uint8Array): Uint8Array {
  // Node's crypto doesn't ship keccak256; use SHA-256 as devnet stand-in.
  // Production: replace with `@noble/hashes` keccak256.
  return new Uint8Array(createHash("sha256").update(Buffer.from(data)).digest());
}
