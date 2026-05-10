/**
 * x402 – Payment Required protocol implementation for Solana
 *
 * x402 is an HTTP-layer payment standard (https://x402.org) that uses the
 * HTTP 402 "Payment Required" status code to gate access to resources.
 *
 * Flow
 * ────
 *   1. Client requests a resource (e.g. strategy execution).
 *   2. Server / contract responds: 402 Payment Required + payment details.
 *   3. Client constructs a payment transaction (SOL transfer to fee account).
 *   4. Payment is bundled atomically with the original instruction.
 *   5. Contract accepts the combined transaction as proof of payment.
 *
 * Solana advantage
 * ─────────────────
 * Solana's composable transaction model lets us bundle the fee transfer and
 * the strategy execution instruction in ONE atomic transaction.  Either both
 * succeed or both fail — no double-spend risk, no separate approval step.
 *
 * VeilVault integration
 * ──────────────────────
 * - Protected resource : `execute_strategy` instruction
 * - Payment amount     : X402_FEE_LAMPORTS (0.001 SOL)
 * - Fee recipient      : X402_FEE_ACCOUNT (vault program treasury PDA)
 * - Payment proof      : transaction signature returned to the caller
 */

import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("G8SzxHU2uHnxNSvjXhdgfHmjGjBL4hdzm1frkHyYbusS");

/** 0.001 SOL — micro-fee per strategy execution */
export const X402_FEE_LAMPORTS = 1_000_000n;

/**
 * Treasury PDA for x402 fee collection.
 * Seeds: ["x402", "treasury"] under the VeilVault program.
 * The program accumulates fees here; upgrade authority can withdraw.
 */
export const [X402_FEE_ACCOUNT] = PublicKey.findProgramAddressSync(
  [Buffer.from("x402"), Buffer.from("treasury")],
  PROGRAM_ID
);

export interface X402PaymentRequirement {
  /** Destination for the micropayment */
  recipient: PublicKey;
  /** Amount in lamports */
  feeLamports: bigint;
  /** Human-readable description of what's being unlocked */
  resource: string;
  /** Network where payment must occur */
  network: "devnet" | "mainnet-beta";
}

export interface X402PaymentResult {
  /** TransactionInstruction to prepend to the protected instruction */
  paymentInstruction: TransactionInstruction;
  /** Payment details for display and logging */
  requirement: X402PaymentRequirement;
}

/**
 * Build the x402 payment requirement for VeilVault strategy execution.
 *
 * Returns a `SystemProgram.transfer` instruction that should be prepended
 * to the `execute_strategy` instruction in the same transaction.
 *
 * The combined transaction is the "payment proof" — it atomically transfers
 * the fee and executes the strategy.
 */
export function buildX402Payment(payer: PublicKey): X402PaymentResult {
  const requirement: X402PaymentRequirement = {
    recipient:    X402_FEE_ACCOUNT,
    feeLamports:  X402_FEE_LAMPORTS,
    resource:     "execute_strategy — FHE-guarded capital deployment",
    network:      "devnet",
  };

  const paymentInstruction = SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey:   X402_FEE_ACCOUNT,
    lamports:   Number(X402_FEE_LAMPORTS),
  });

  return { paymentInstruction, requirement };
}

/**
 * Format the x402 payment amount for display.
 */
export function formatX402Fee(lamports: bigint): string {
  return `${(Number(lamports) / 1_000_000_000).toFixed(3)} SOL`;
}

/**
 * Simulate the 402 challenge response — in a real deployment this would
 * come from an HTTP 402 response header, e.g.:
 *
 *   HTTP/1.1 402 Payment Required
 *   X-Payment-Network: solana-devnet
 *   X-Payment-Recipient: X4o2VvmP...
 *   X-Payment-Amount: 1000000
 *   X-Payment-Resource: execute_strategy
 */
export function logX402Challenge(req: X402PaymentRequirement): void {
  console.group("[x402] 402 Payment Required");
  console.log("Resource:   ", req.resource);
  console.log("Network:    ", req.network);
  console.log("Recipient:  ", req.recipient.toBase58());
  console.log("Amount:     ", formatX402Fee(req.feeLamports));
  console.groupEnd();
}
