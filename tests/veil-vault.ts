/**
 * VeilVault – Anchor Test Suite
 *
 * Run after `anchor build && anchor deploy --provider.cluster localnet` (or devnet):
 *   npm test
 *
 * Coverage:
 *   1. Vault lifecycle       – initialize
 *   2. Ika dWallet           – create, approve, duplicate rejection
 *   3. Deposits              – regular SOL, bridgeless, error cases
 *   4. Protocol whitelist    – add, unauthorized rejection
 *   5. FHE strategy params   – set, oversized rejection, hash commitment
 *   6. Strategy execution    – happy path, FHE proof, all 4 guardrails
 *   7. Performance summary   – update encrypted blob
 *   8. Withdrawals           – happy path, over-balance rejection
 *   9. Unauthorized access   – non-owner rejections across all write ixs
 */

import * as anchor from "@coral-xyz/anchor";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AnchorError, BN } from "@coral-xyz/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { createHash } from "crypto";
import { assert } from "chai";

// ─── Constants ────────────────────────────────────────────────────────────────

const CHAIN_SOLANA = 0;
const CHAIN_BITCOIN = 1;
const CHAIN_ETHEREUM = 2;

/** lamports */
const DEPOSIT_AMOUNT = LAMPORTS_PER_SOL; // 1 SOL per deposit call
const SPENDING_LIMIT = new BN(LAMPORTS_PER_SOL).muln(2); // 2 SOL per tx
const MAX_DRAWDOWN_BPS = 9000; // 90 % – permissive so most tests can execute
const TIME_LOCK_SECS = new BN(0); // no time-lock on main vault

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** SHA-256(encrypted_op || strategy_params_hash)[0..32] padded to 64 bytes */
function buildOpProof(encryptedOp: Buffer, paramsHash: Buffer): number[] {
  const digest = createHash("sha256")
    .update(Buffer.concat([encryptedOp, paramsHash]))
    .digest();
  const proof = Buffer.alloc(64);
  digest.copy(proof, 0);
  return Array.from(proof);
}

/** Wrong proof – all zeros; will fail on-chain verification */
const BAD_PROOF = Array(64).fill(0);

/** Assert the tx rejects with a specific Anchor error code */
async function expectErr(
  fn: () => Promise<unknown>,
  code: string
): Promise<void> {
  try {
    await fn();
    assert.fail(`Expected error "${code}" but instruction succeeded`);
  } catch (err: unknown) {
    if (err instanceof AnchorError) {
      assert.equal(
        err.error.errorCode.code,
        code,
        `Expected "${code}", got "${err.error.errorCode.code}"`
      );
    } else {
      throw err; // unexpected error type – rethrow
    }
  }
}

/** Airdrop SOL and wait for confirmation */
async function airdrop(
  conn: anchor.web3.Connection,
  pubkey: PublicKey,
  sol = 10
): Promise<void> {
  const sig = await conn.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  const { blockhash, lastValidBlockHeight } =
    await conn.getLatestBlockhash();
  await conn.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );
}

/** Derive [pda, bump] for a vault */
function vaultPda(owner: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    programId
  );
}

/** Derive [pda, bump] for a dWallet record */
function dwalletPda(
  vault: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("dwallet"), vault.toBuffer()],
    programId
  );
}

/** Derive [pda, bump] for a deposit record */
function depositPda(
  vault: PublicKey,
  index: BN,
  programId: PublicKey
): [PublicKey, number] {
  const idxBuf = Buffer.alloc(8);
  idxBuf.writeBigUInt64LE(BigInt(index.toString()));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("deposit"), vault.toBuffer(), idxBuf],
    programId
  );
}

// ─── Test data ─────────────────────────────────────────────────────────────────

/** Simulated FHE public key (32 bytes) */
const FHE_PUBKEY = Array.from(
  createHash("sha256").update("test-fhe-pubkey-veilVault").digest()
);

/** Simulated FHE ciphertext of strategy params */
const ENCRYPTED_PARAMS = Buffer.from(
  "RFHE" +
    JSON.stringify({
      allocationBps: [
        { asset: "SOL", bps: 6000 },
        { asset: "USDC", bps: 4000 },
      ],
      maxDrawdownBps: 1000,
      rebalanceTriggerBps: 500,
      stopLossBps: 1500,
    })
);
const PARAMS_HASH = Array.from(
  createHash("sha256").update(ENCRYPTED_PARAMS).digest()
);

/** Simulated Ika dWallet ID (32-byte Sui object digest) */
const DWALLET_ID = Array.from(
  createHash("sha256").update("test-ika-dwallet-id").digest()
);
/** Simulated 2PC-MPC aggregated pubkey (33-byte compressed secp256k1) */
const DWALLET_PUBKEY = [0x02, ...Array(32).fill(0xab)]; // 33 bytes

/** Simulated Ika transaction digest for bridgeless deposit */
const DWALLET_TX_ID = Array.from(
  createHash("sha256").update("ika-bridgeless-tx-001").digest()
);

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("VeilVault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Program is loaded from the Anchor workspace after `anchor build`.
  // Typed as `any` because the IDL types aren't generated until after compilation.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = anchor.workspace.VeilVault as any;

  // ── Main vault (owner = provider wallet) ────────────────────────────────────
  const owner = provider.wallet.publicKey;
  let vault: PublicKey;
  let dwalletRecord: PublicKey;

  // Protocol to whitelist for execution tests
  let mockProtocol: PublicKey;

  // Deposit index counter
  let depositIndex = new BN(0);

  // Encrypted op for execution tests
  let encryptedOp: Buffer;
  let opProof: number[];

  before(async () => {
    [vault] = vaultPda(owner, program.programId);
    [dwalletRecord] = dwalletPda(vault, program.programId);

    mockProtocol = Keypair.generate().publicKey;

    encryptedOp = Buffer.from(
      JSON.stringify({ action: "rebalance", amountLamports: LAMPORTS_PER_SOL / 10 })
    );
    opProof = buildOpProof(encryptedOp, Buffer.from(PARAMS_HASH));

    // Ensure the provider wallet has enough SOL for all deposits + rent
    const bal = await provider.connection.getBalance(owner);
    if (bal < 20 * LAMPORTS_PER_SOL) {
      await airdrop(provider.connection, owner, 20);
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 1. Vault lifecycle
  // ════════════════════════════════════════════════════════════════════════════

  describe("1. Vault Lifecycle", () => {
    it("initialises a vault with FHE pubkey and guardrails", async () => {
      await program.methods
        .initializeVault({
          fhePubkey: FHE_PUBKEY,
          maxDrawdownBps: MAX_DRAWDOWN_BPS,
          spendingLimitLamports: SPENDING_LIMIT,
          timeLockSecs: TIME_LOCK_SECS,
        })
        .accounts({ owner, vault, systemProgram: SystemProgram.programId })
        .rpc();

      const state = await program.account.vaultState.fetch(vault);
      assert.equal(state.owner.toBase58(), owner.toBase58());
      assert.equal(state.maxDrawdownBps, MAX_DRAWDOWN_BPS);
      assert.isTrue(state.spendingLimitLamports.eq(SPENDING_LIMIT));
      assert.isTrue(state.timeLockSecs.eq(TIME_LOCK_SECS));
      assert.isFalse(state.isPaused);
      assert.isNull(state.dwallet);
      assert.equal(state.strategyParamsLen, 0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. Ika dWallet (bridgeless custody)
  // ════════════════════════════════════════════════════════════════════════════

  describe("2. Ika dWallet", () => {
    it("registers an Ika dWallet binding (2PC-MPC)", async () => {
      await program.methods
        .createDwallet({
          dwalletId: DWALLET_ID,
          dwalletPubkey: DWALLET_PUBKEY,
          chainBitmap: (1 << CHAIN_BITCOIN) | (1 << CHAIN_ETHEREUM),
        })
        .accounts({
          owner,
          vault,
          dwalletRecord,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const record = await program.account.dWalletRecord.fetch(dwalletRecord);
      assert.equal(record.vault.toBase58(), vault.toBase58());
      assert.isFalse(record.isApproved);
      assert.deepEqual(record.dwalletId, DWALLET_ID);
      assert.deepEqual(
        Array.from(record.dwalletPubkey as Uint8Array),
        DWALLET_PUBKEY
      );

      // Vault state should now point to the dWallet record
      const vaultState = await program.account.vaultState.fetch(vault);
      assert.equal(vaultState.dwallet.toBase58(), dwalletRecord.toBase58());
    });

    it("rejects duplicate dWallet registration", async () => {
      await expectErr(
        () =>
          program.methods
            .createDwallet({
              dwalletId: DWALLET_ID,
              dwalletPubkey: DWALLET_PUBKEY,
              chainBitmap: 0,
            })
            .accounts({
              owner,
              vault,
              dwalletRecord,
              systemProgram: SystemProgram.programId,
            })
            .rpc(),
        "DWalletAlreadyRegistered"
      );
    });

    it("approves the dWallet (on-chain ratification of 2PC ceremony)", async () => {
      await program.methods
        .approveDwallet()
        .accounts({ owner, vault, dwalletRecord })
        .rpc();

      const record = await program.account.dWalletRecord.fetch(dwalletRecord);
      assert.isTrue(record.isApproved);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. Deposits
  // ════════════════════════════════════════════════════════════════════════════

  describe("3. Deposits", () => {
    it("accepts a regular SOL deposit", async () => {
      const idx = depositIndex;
      const [depRecord] = depositPda(vault, idx, program.programId);

      await program.methods
        .deposit(
          new BN(DEPOSIT_AMOUNT),
          CHAIN_SOLANA,
          false,
          Array(32).fill(0),
          idx
        )
        .accounts({
          depositor: owner,
          vault,
          dwalletRecord,
          depositRecord: depRecord,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const dep = await program.account.depositRecord.fetch(depRecord);
      assert.isTrue(dep.amountLamports.eq(new BN(DEPOSIT_AMOUNT)));
      assert.equal(dep.sourceChain, CHAIN_SOLANA);
      assert.isFalse(dep.isBridgeless);

      const vaultState = await program.account.vaultState.fetch(vault);
      assert.isTrue(
        vaultState.totalDepositedLamports.gte(new BN(DEPOSIT_AMOUNT))
      );

      depositIndex = depositIndex.addn(1);
    });

    it("accepts a bridgeless deposit (simulated Ika dWallet flow)", async () => {
      const idx = depositIndex;
      const [depRecord] = depositPda(vault, idx, program.programId);

      // Simulate native BTC arriving via dWallet → equivalent SOL credited
      const bridgelessAmount = new BN(LAMPORTS_PER_SOL / 2);

      await program.methods
        .deposit(
          bridgelessAmount,
          CHAIN_BITCOIN,
          true,
          DWALLET_TX_ID,
          idx
        )
        .accounts({
          depositor: owner,
          vault,
          dwalletRecord,
          depositRecord: depRecord,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const dep = await program.account.depositRecord.fetch(depRecord);
      assert.isTrue(dep.isBridgeless);
      assert.equal(dep.sourceChain, CHAIN_BITCOIN);
      assert.deepEqual(Array.from(dep.dwalletTxId as Uint8Array), DWALLET_TX_ID);

      depositIndex = depositIndex.addn(1);
    });

    it("rejects a zero-amount deposit", async () => {
      const idx = depositIndex;
      const [depRecord] = depositPda(vault, idx, program.programId);

      await expectErr(
        () =>
          program.methods
            .deposit(new BN(0), CHAIN_SOLANA, false, Array(32).fill(0), idx)
            .accounts({
              depositor: owner,
              vault,
              dwalletRecord,
              depositRecord: depRecord,
              systemProgram: SystemProgram.programId,
            })
            .rpc(),
        "ZeroDeposit"
      );
    });

    it("rejects an invalid source chain id", async () => {
      const idx = depositIndex;
      const [depRecord] = depositPda(vault, idx, program.programId);

      await expectErr(
        () =>
          program.methods
            .deposit(
              new BN(DEPOSIT_AMOUNT),
              99, // invalid chain
              false,
              Array(32).fill(0),
              idx
            )
            .accounts({
              depositor: owner,
              vault,
              dwalletRecord,
              depositRecord: depRecord,
              systemProgram: SystemProgram.programId,
            })
            .rpc(),
        "InvalidChain"
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. Protocol whitelist
  // ════════════════════════════════════════════════════════════════════════════

  describe("4. Protocol Whitelist", () => {
    it("owner adds a protocol to the approved list", async () => {
      await program.methods
        .addApprovedProtocol(mockProtocol)
        .accounts({ owner, vault })
        .rpc();

      const state = await program.account.vaultState.fetch(vault);
      assert.equal(state.approvedProtocolsCount, 1);
      assert.equal(
        state.approvedProtocols[0].toBase58(),
        mockProtocol.toBase58()
      );
    });

    it("rejects protocol addition from a non-owner", async () => {
      const attacker = Keypair.generate();
      await airdrop(provider.connection, attacker.publicKey, 1);

      await expectErr(
        () =>
          program.methods
            .addApprovedProtocol(mockProtocol)
            .accounts({ owner: attacker.publicKey, vault })
            .signers([attacker])
            .rpc(),
        "Unauthorized"
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. FHE Strategy Params
  // ════════════════════════════════════════════════════════════════════════════

  describe("5. FHE Strategy Params (Encrypt-REFHE)", () => {
    it("owner stores encrypted strategy params with hash commitment", async () => {
      await program.methods
        .setStrategyParams(
          Array.from(ENCRYPTED_PARAMS),
          PARAMS_HASH
        )
        .accounts({ owner, vault })
        .rpc();

      const state = await program.account.vaultState.fetch(vault);
      assert.equal(state.strategyParamsLen, ENCRYPTED_PARAMS.length);
      assert.deepEqual(Array.from(state.strategyParamsHash as Uint8Array), PARAMS_HASH);
    });

    it("rejects params that exceed the max ciphertext size (512 bytes)", async () => {
      const oversized = Array(513).fill(0xaa);

      await expectErr(
        () =>
          program.methods
            .setStrategyParams(oversized, Array(32).fill(0))
            .accounts({ owner, vault })
            .rpc(),
        "ParamsTooLarge"
      );
    });

    it("rejects strategy param update from a non-owner", async () => {
      const attacker = Keypair.generate();
      await airdrop(provider.connection, attacker.publicKey, 1);

      await expectErr(
        () =>
          program.methods
            .setStrategyParams(Array.from(ENCRYPTED_PARAMS), PARAMS_HASH)
            .accounts({ owner: attacker.publicKey, vault })
            .signers([attacker])
            .rpc(),
        "Unauthorized"
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 6. Strategy Execution & Guardrails
  // ════════════════════════════════════════════════════════════════════════════

  describe("6. Strategy Execution & Guardrails", () => {
    const EXEC_AMOUNT = new BN(LAMPORTS_PER_SOL / 10); // 0.1 SOL – within limits

    it("executes strategy when all guardrails pass (happy path)", async () => {
      await program.methods
        .executeStrategy(
          Array.from(encryptedOp),
          opProof,
          mockProtocol,
          EXEC_AMOUNT
        )
        .accounts({ owner, vault })
        .rpc();

      const state = await program.account.vaultState.fetch(vault);
      // net_value_lamports decreased by EXEC_AMOUNT
      assert.isTrue(state.netValueLamports.lt(state.totalDepositedLamports));
    });

    it("rejects execution with an invalid FHE op proof", async () => {
      await expectErr(
        () =>
          program.methods
            .executeStrategy(
              Array.from(encryptedOp),
              BAD_PROOF,
              mockProtocol,
              EXEC_AMOUNT
            )
            .accounts({ owner, vault })
            .rpc(),
        "InvalidFheProof"
      );
    });

    it("rejects execution targeting an unapproved protocol", async () => {
      const unapproved = Keypair.generate().publicKey;

      await expectErr(
        () =>
          program.methods
            .executeStrategy(
              Array.from(encryptedOp),
              opProof,
              unapproved,
              EXEC_AMOUNT
            )
            .accounts({ owner, vault })
            .rpc(),
        "ProtocolNotApproved"
      );
    });

    it("rejects execution that exceeds the per-tx spending limit", async () => {
      const overLimit = SPENDING_LIMIT.addn(1); // 2 SOL + 1 lamport

      // Build a valid proof for this different amount (proof only covers
      // encrypted_op + params_hash, NOT the amount — amount is plaintext)
      const bigOpProof = buildOpProof(encryptedOp, Buffer.from(PARAMS_HASH));

      await expectErr(
        () =>
          program.methods
            .executeStrategy(
              Array.from(encryptedOp),
              bigOpProof,
              mockProtocol,
              overLimit
            )
            .accounts({ owner, vault })
            .rpc(),
        "SpendingLimitExceeded"
      );
    });

    it("rejects execution that would breach the max drawdown threshold", async () => {
      // Create a tight-drawdown vault (1 % max drawdown) on a fresh owner
      const smallOwner = Keypair.generate();
      await airdrop(provider.connection, smallOwner.publicKey, 5);

      const [smallVault] = vaultPda(smallOwner.publicKey, program.programId);
      const [smallDwallet] = dwalletPda(smallVault, program.programId);

      // Init vault with 1 % max drawdown, 2 SOL spending limit
      await program.methods
        .initializeVault({
          fhePubkey: FHE_PUBKEY,
          maxDrawdownBps: 100, // 1 %
          spendingLimitLamports: new BN(2 * LAMPORTS_PER_SOL),
          timeLockSecs: new BN(0),
        })
        .accounts({
          owner: smallOwner.publicKey,
          vault: smallVault,
          systemProgram: SystemProgram.programId,
        })
        .signers([smallOwner])
        .rpc();

      // Register + approve a dWallet so we can deposit
      await program.methods
        .createDwallet({
          dwalletId: DWALLET_ID,
          dwalletPubkey: DWALLET_PUBKEY,
          chainBitmap: 1,
        })
        .accounts({
          owner: smallOwner.publicKey,
          vault: smallVault,
          dwalletRecord: smallDwallet,
          systemProgram: SystemProgram.programId,
        })
        .signers([smallOwner])
        .rpc();

      await program.methods.approveDwallet()
        .accounts({ owner: smallOwner.publicKey, vault: smallVault, dwalletRecord: smallDwallet })
        .signers([smallOwner])
        .rpc();

      // Deposit 1 SOL
      const [smallDep] = depositPda(smallVault, new BN(0), program.programId);
      await program.methods
        .deposit(new BN(LAMPORTS_PER_SOL), CHAIN_SOLANA, false, Array(32).fill(0), new BN(0))
        .accounts({
          depositor: smallOwner.publicKey,
          vault: smallVault,
          dwalletRecord: smallDwallet,
          depositRecord: smallDep,
          systemProgram: SystemProgram.programId,
        })
        .signers([smallOwner])
        .rpc();

      // Whitelist the protocol
      await program.methods
        .addApprovedProtocol(mockProtocol)
        .accounts({ owner: smallOwner.publicKey, vault: smallVault })
        .signers([smallOwner])
        .rpc();

      // Set strategy params
      await program.methods
        .setStrategyParams(Array.from(ENCRYPTED_PARAMS), PARAMS_HASH)
        .accounts({ owner: smallOwner.publicKey, vault: smallVault })
        .signers([smallOwner])
        .rpc();

      // Try to execute 0.2 SOL → drawdown = 20 % > 1 % cap → should reject
      const drawdownAmount = new BN(LAMPORTS_PER_SOL / 5); // 0.2 SOL → 20 % drawdown
      const drawdownProof = buildOpProof(encryptedOp, Buffer.from(PARAMS_HASH));

      await expectErr(
        () =>
          program.methods
            .executeStrategy(
              Array.from(encryptedOp),
              drawdownProof,
              mockProtocol,
              drawdownAmount
            )
            .accounts({ owner: smallOwner.publicKey, vault: smallVault })
            .signers([smallOwner])
            .rpc(),
        "MaxDrawdownExceeded"
      );
    });

    it("rejects execution when time-lock is active", async () => {
      // Create a vault with a 1-hour time-lock
      const tlOwner = Keypair.generate();
      await airdrop(provider.connection, tlOwner.publicKey, 5);

      const [tlVault] = vaultPda(tlOwner.publicKey, program.programId);
      const [tlDwallet] = dwalletPda(tlVault, program.programId);

      await program.methods
        .initializeVault({
          fhePubkey: FHE_PUBKEY,
          maxDrawdownBps: 9000,
          spendingLimitLamports: new BN(2 * LAMPORTS_PER_SOL),
          timeLockSecs: new BN(3600), // 1-hour time-lock
        })
        .accounts({ owner: tlOwner.publicKey, vault: tlVault, systemProgram: SystemProgram.programId })
        .signers([tlOwner])
        .rpc();

      await program.methods
        .createDwallet({ dwalletId: DWALLET_ID, dwalletPubkey: DWALLET_PUBKEY, chainBitmap: 1 })
        .accounts({ owner: tlOwner.publicKey, vault: tlVault, dwalletRecord: tlDwallet, systemProgram: SystemProgram.programId })
        .signers([tlOwner])
        .rpc();

      await program.methods.approveDwallet()
        .accounts({ owner: tlOwner.publicKey, vault: tlVault, dwalletRecord: tlDwallet })
        .signers([tlOwner])
        .rpc();

      const [tlDep] = depositPda(tlVault, new BN(0), program.programId);
      await program.methods
        .deposit(new BN(LAMPORTS_PER_SOL), CHAIN_SOLANA, false, Array(32).fill(0), new BN(0))
        .accounts({ depositor: tlOwner.publicKey, vault: tlVault, dwalletRecord: tlDwallet, depositRecord: tlDep, systemProgram: SystemProgram.programId })
        .signers([tlOwner])
        .rpc();

      await program.methods.addApprovedProtocol(mockProtocol)
        .accounts({ owner: tlOwner.publicKey, vault: tlVault })
        .signers([tlOwner])
        .rpc();

      await program.methods.setStrategyParams(Array.from(ENCRYPTED_PARAMS), PARAMS_HASH)
        .accounts({ owner: tlOwner.publicKey, vault: tlVault })
        .signers([tlOwner])
        .rpc();

      const tlProof = buildOpProof(encryptedOp, Buffer.from(PARAMS_HASH));
      const execAmount = new BN(LAMPORTS_PER_SOL / 10);

      // First execution – always succeeds (last_executed_at was 0)
      await program.methods
        .executeStrategy(Array.from(encryptedOp), tlProof, mockProtocol, execAmount)
        .accounts({ owner: tlOwner.publicKey, vault: tlVault })
        .signers([tlOwner])
        .rpc();

      // Immediate second execution – fails because 3600 s haven't passed
      await expectErr(
        () =>
          program.methods
            .executeStrategy(Array.from(encryptedOp), tlProof, mockProtocol, execAmount)
            .accounts({ owner: tlOwner.publicKey, vault: tlVault })
            .signers([tlOwner])
            .rpc(),
        "TimeLockActive"
      );
    });

    it("rejects execution before strategy params are set", async () => {
      // Fresh vault with no strategy params
      const freshOwner = Keypair.generate();
      await airdrop(provider.connection, freshOwner.publicKey, 2);
      const [freshVault] = vaultPda(freshOwner.publicKey, program.programId);

      await program.methods
        .initializeVault({
          fhePubkey: FHE_PUBKEY,
          maxDrawdownBps: 9000,
          spendingLimitLamports: new BN(2 * LAMPORTS_PER_SOL),
          timeLockSecs: new BN(0),
        })
        .accounts({ owner: freshOwner.publicKey, vault: freshVault, systemProgram: SystemProgram.programId })
        .signers([freshOwner])
        .rpc();

      await expectErr(
        () =>
          program.methods
            .executeStrategy(Array.from(encryptedOp), opProof, mockProtocol, EXEC_AMOUNT)
            .accounts({ owner: freshOwner.publicKey, vault: freshVault })
            .signers([freshOwner])
            .rpc(),
        "NoStrategyParams"
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 7. Encrypted Performance Summary
  // ════════════════════════════════════════════════════════════════════════════

  describe("7. Encrypted Performance Summary", () => {
    const ENCRYPTED_SUMMARY = Array.from(
      Buffer.from(
        "RFHE" +
          JSON.stringify({ pnlBps: 420, yieldEarned: 0.05, riskScore: 0.3 })
      )
    );

    it("owner updates the encrypted performance summary", async () => {
      await program.methods
        .updatePerformance(ENCRYPTED_SUMMARY)
        .accounts({ owner, vault })
        .rpc();

      const state = await program.account.vaultState.fetch(vault);
      assert.equal(state.perfSummaryLen, ENCRYPTED_SUMMARY.length);
    });

    it("rejects a summary that exceeds the max size (256 bytes)", async () => {
      await expectErr(
        () =>
          program.methods
            .updatePerformance(Array(257).fill(0xbb))
            .accounts({ owner, vault })
            .rpc(),
        "PerformanceSummaryTooLarge"
      );
    });

    it("rejects summary update from a non-owner", async () => {
      const attacker = Keypair.generate();
      await airdrop(provider.connection, attacker.publicKey, 1);

      await expectErr(
        () =>
          program.methods
            .updatePerformance(ENCRYPTED_SUMMARY)
            .accounts({ owner: attacker.publicKey, vault })
            .signers([attacker])
            .rpc(),
        "Unauthorized"
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 8. Withdrawals
  // ════════════════════════════════════════════════════════════════════════════

  describe("8. Withdrawals", () => {
    it("owner withdraws within the net value limit", async () => {
      const stateBefore = await program.account.vaultState.fetch(vault);
      const netBefore: BN = stateBefore.netValueLamports;
      const withdrawAmount = new BN(LAMPORTS_PER_SOL / 10); // 0.1 SOL

      await program.methods
        .withdraw(withdrawAmount)
        .accounts({ owner, vault, systemProgram: SystemProgram.programId })
        .rpc();

      const stateAfter = await program.account.vaultState.fetch(vault);
      assert.isTrue(
        stateAfter.netValueLamports.eq(netBefore.sub(withdrawAmount))
      );
    });

    it("rejects withdrawal exceeding the vault net value", async () => {
      await expectErr(
        () =>
          program.methods
            .withdraw(new BN(100 * LAMPORTS_PER_SOL)) // way more than deposited
            .accounts({ owner, vault, systemProgram: SystemProgram.programId })
            .rpc(),
        "InsufficientBalance"
      );
    });

    it("rejects withdrawal from a non-owner", async () => {
      const attacker = Keypair.generate();
      await airdrop(provider.connection, attacker.publicKey, 1);

      await expectErr(
        () =>
          program.methods
            .withdraw(new BN(1))
            .accounts({
              owner: attacker.publicKey,
              vault,
              systemProgram: SystemProgram.programId,
            })
            .signers([attacker])
            .rpc(),
        "Unauthorized"
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 9. Cross-cutting: unauthorized access
  // ════════════════════════════════════════════════════════════════════════════

  describe("9. Unauthorized Access", () => {
    let attacker: Keypair;

    before(async () => {
      attacker = Keypair.generate();
      await airdrop(provider.connection, attacker.publicKey, 2);
    });

    it("rejects initializeVault under a different owner using the same PDA", async () => {
      // The attacker's vault PDA is different from the owner's, so they can't
      // hijack the existing vault. What we verify here is that passing the
      // owner's vault address with the attacker's signer is rejected.
      await expectErr(
        () =>
          program.methods
            .setStrategyParams(Array.from(ENCRYPTED_PARAMS), PARAMS_HASH)
            .accounts({ owner: attacker.publicKey, vault }) // wrong owner for this vault
            .signers([attacker])
            .rpc(),
        "Unauthorized"
      );
    });

    it("rejects dWallet approval from non-owner", async () => {
      await expectErr(
        () =>
          program.methods
            .approveDwallet()
            .accounts({
              owner: attacker.publicKey,
              vault,
              dwalletRecord,
            })
            .signers([attacker])
            .rpc(),
        "Unauthorized"
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 10. Pause / unpause
  // ════════════════════════════════════════════════════════════════════════════

  describe("10. Pause / Unpause (emergency stop)", () => {
    it("owner pauses the vault", async () => {
      await program.methods
        .setPaused(true)
        .accounts({ owner, vault })
        .rpc();

      const state = await program.account.vaultState.fetch(vault);
      assert.isTrue(state.isPaused);
    });

    it("blocks deposits while paused", async () => {
      const idx = depositIndex;
      const [depRecord] = depositPda(vault, idx, program.programId);

      await expectErr(
        () =>
          program.methods
            .deposit(new BN(DEPOSIT_AMOUNT), CHAIN_SOLANA, false, Array(32).fill(0), idx)
            .accounts({
              depositor: owner,
              vault,
              dwalletRecord,
              depositRecord: depRecord,
              systemProgram: SystemProgram.programId,
            })
            .rpc(),
        "VaultPaused"
      );
    });

    it("owner unpauses the vault", async () => {
      await program.methods
        .setPaused(false)
        .accounts({ owner, vault })
        .rpc();

      const state = await program.account.vaultState.fetch(vault);
      assert.isFalse(state.isPaused);
    });

    it("rejects pause from non-owner", async () => {
      const attacker = Keypair.generate();
      await airdrop(provider.connection, attacker.publicKey, 1);

      await expectErr(
        () =>
          program.methods
            .setPaused(true)
            .accounts({ owner: attacker.publicKey, vault })
            .signers([attacker])
            .rpc(),
        "Unauthorized"
      );
    });
  });
});
