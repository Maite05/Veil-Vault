/**
 * POST /api/agent/execute-strategy
 *
 * x402-gated VeilVault strategy execution endpoint for autonomous agents.
 * Uses the standard Node.js HTTP handler format (no framework needed).
 *
 * Full protocol docs: README.md → "Zerion Agent + x402"
 */

import type { IncomingMessage, ServerResponse } from "http";
import { PublicKey } from "@solana/web3.js";
import {
  buildPaymentChallenge,
  verifyPaymentTransaction,
  getX402TreasuryAddress,
} from "../lib/x402-verify";
import {
  PROGRAM_ID,
  buildAgentExecutionTx,
  type AgentExecutionRequest,
} from "../lib/vault-executor";

const X402_FEE_LAMPORTS = 1_000_000; // 0.001 SOL per strategy execution
const TREASURY = getX402TreasuryAddress(PROGRAM_ID);

function setCommonHeaders(res: ServerResponse): void {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers",
    "Content-Type, X-Payment-Tx, X-Agent-Id");
}

function json(res: ServerResponse, status: number, body: unknown): void {
  setCommonHeaders(res);
  res.statusCode = status;
  res.end(JSON.stringify(body, null, 2));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  // CORS preflight
  if (req.method === "OPTIONS") {
    setCommonHeaders(res);
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed. Use POST." });
    return;
  }

  // ── Step 1: Check for payment proof header ────────────────────────────────
  const paymentSig = (req.headers["x-payment-tx"] as string | undefined)?.trim();

  if (!paymentSig || paymentSig.length < 80) {
    // No payment header — return 402 challenge
    const challenge = buildPaymentChallenge(
      TREASURY,
      X402_FEE_LAMPORTS,
      "execute_strategy — FHE-guarded capital deployment"
    );
    json(res, 402, {
      ...challenge,
      note: "Transfer the required lamports to `recipient` on Solana devnet, " +
            "then retry with the transaction signature in X-Payment-Tx header.",
      docs: "https://github.com/Maite05/Veil-Vault#x402-integration",
    });
    return;
  }

  // ── Step 2: Verify payment on-chain ──────────────────────────────────────
  const verification = await verifyPaymentTransaction(
    paymentSig, TREASURY, X402_FEE_LAMPORTS
  );

  if (!verification.valid) {
    json(res, 402, {
      error:    "Payment verification failed",
      detail:   verification.error,
      required: { recipient: TREASURY.toBase58(), amountLamports: X402_FEE_LAMPORTS },
    });
    return;
  }

  // ── Step 3: Parse and validate body ──────────────────────────────────────
  let body: Partial<AgentExecutionRequest>;
  try {
    body = (await readBody(req)) as Partial<AgentExecutionRequest>;
  } catch {
    json(res, 400, { error: "Invalid JSON body" });
    return;
  }

  const required = ["owner","encryptedOpB64","opProofB64","amountLamports","protocolAccount"] as const;
  const missing  = required.filter(k => !body[k]);
  if (missing.length > 0) {
    json(res, 400, { error: "Missing required fields", missing });
    return;
  }

  try {
    new PublicKey(body.owner!);
    new PublicKey(body.protocolAccount!);
  } catch {
    json(res, 400, { error: "Invalid public key in owner or protocolAccount" });
    return;
  }

  // ── Step 4: Build unsigned execution transaction ─────────────────────────
  try {
    const result = await buildAgentExecutionTx(
      body as AgentExecutionRequest,
      X402_FEE_LAMPORTS
    );
    json(res, 200, {
      ...result,
      paymentVerified: true,
      payer: verification.payer,
      hint: "Sign `unsignedTxB64` with the `owner` keypair and broadcast to devnet.",
    });
  } catch (e) {
    json(res, 500, {
      error:  "Failed to build execution transaction",
      detail: (e as Error).message,
    });
  }
}
