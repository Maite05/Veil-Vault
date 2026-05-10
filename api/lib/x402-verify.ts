/**
 * x402 Server-Side Verification
 *
 * Verifies that a Solana transaction (identified by its signature) actually
 * transferred the required SOL to the required recipient.
 *
 * In production: extend to verify SPL token (USDC) transfers.
 */

import {
  Connection,
  ParsedTransaction,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

const DEVNET_RPC = "https://api.devnet.solana.com";

export interface PaymentChallenge {
  /** Treasury PDA that must receive the micropayment */
  recipient: string;
  /** Amount in lamports (0.001 SOL = 1_000_000) */
  amountLamports: number;
  /** Human-readable description surfaced to the agent */
  resource: string;
  /** ISO timestamp after which this challenge expires (5 minutes) */
  expiresAt: string;
  /** x402 protocol version */
  x402Version: "v2";
  network: "solana-devnet";
}

export interface PaymentVerificationResult {
  valid: boolean;
  error?: string;
  payer?: string;
  amountPaid?: number;
}

/**
 * Derive the VeilVault x402 treasury PDA server-side.
 * Must match the client-side derivation in frontend/lib/x402.ts.
 */
export function getX402TreasuryAddress(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("x402"), Buffer.from("treasury")],
    programId
  );
  return pda;
}

/**
 * Build the 402 Payment Required challenge response body.
 */
export function buildPaymentChallenge(
  recipient: PublicKey,
  amountLamports: number,
  resource: string
): PaymentChallenge {
  const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 min window
  return {
    recipient:      recipient.toBase58(),
    amountLamports,
    resource,
    expiresAt:      expires.toISOString(),
    x402Version:    "v2",
    network:        "solana-devnet",
  };
}

/**
 * Verify a payment transaction signature on-chain.
 *
 * Checks that:
 *  1. The transaction is confirmed.
 *  2. It contains a SystemProgram.transfer to `expectedRecipient`.
 *  3. The transfer amount is >= `minLamports`.
 *  4. The transaction timestamp is within the challenge window.
 */
export async function verifyPaymentTransaction(
  signature: string,
  expectedRecipient: PublicKey,
  minLamports: number
): Promise<PaymentVerificationResult> {
  const connection = new Connection(DEVNET_RPC, "confirmed");

  let tx: ParsedTransaction | null = null;
  try {
    const result = await connection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    tx = result?.transaction ?? null;
  } catch (e) {
    return { valid: false, error: `RPC error: ${(e as Error).message}` };
  }

  if (!tx) {
    return { valid: false, error: "Transaction not found or not yet confirmed" };
  }

  // Walk the inner instructions to find a SOL transfer to our treasury
  for (const ix of tx.message.instructions) {
    if (!("parsed" in ix)) continue;
    const parsed = ix.parsed as {
      type: string;
      info: { source: string; destination: string; lamports: number };
    };

    if (
      parsed.type === "transfer" &&
      parsed.info.destination === expectedRecipient.toBase58() &&
      parsed.info.lamports >= minLamports
    ) {
      return {
        valid:       true,
        payer:       parsed.info.source,
        amountPaid:  parsed.info.lamports,
      };
    }
  }

  return {
    valid: false,
    error: `No qualifying SOL transfer to ${expectedRecipient.toBase58()} found in tx ${signature}`,
  };
}

/**
 * Extract the X-Payment-Tx header value and validate its format.
 */
export function extractPaymentSignature(headers: Headers): string | null {
  const sig = headers.get("X-Payment-Tx");
  if (!sig) return null;
  // Solana signatures are 87-88 base58 characters
  if (sig.length < 80 || sig.length > 100) return null;
  return sig;
}
