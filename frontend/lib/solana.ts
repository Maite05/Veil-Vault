/**
 * VeilVault Anchor program client
 *
 * Wraps every instruction in the Solana Anchor program with typed TypeScript
 * helpers.  Import from React hooks to interact with the on-chain program.
 *
 * Uses @noble/hashes (browser-compatible) instead of Node's `crypto` module
 * so this file works in both Vite browser builds and Node test environments.
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { sha256 } from "@noble/hashes/sha256";

/** Replace after `anchor deploy --provider.cluster devnet` */
export const PROGRAM_ID = new PublicKey(
  "G8SzxHU2uHnxNSvjXhdgfHmjGjBL4hdzm1frkHyYbusS"
);

// ─── PDA helpers ──────────────────────────────────────────────────────────────

export function findVaultPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    PROGRAM_ID
  );
}

export function findDWalletRecordPda(vaultPda: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("dwallet"), vaultPda.toBuffer()],
    PROGRAM_ID
  );
}

export function findDepositRecordPda(
  vaultPda: PublicKey,
  depositIndex: bigint
): [PublicKey, number] {
  const idxBuf = Buffer.alloc(8);
  idxBuf.writeBigUInt64LE(depositIndex);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("deposit"), vaultPda.toBuffer(), idxBuf],
    PROGRAM_ID
  );
}

// ─── Borsh serialisation helpers ─────────────────────────────────────────────

function encodeU8(v: number): Buffer {
  const b = Buffer.alloc(1); b.writeUInt8(v); return b;
}
function encodeU16LE(v: number): Buffer {
  const b = Buffer.alloc(2); b.writeUInt16LE(v); return b;
}
function encodeU64LE(v: bigint): Buffer {
  const b = Buffer.alloc(8); b.writeBigUInt64LE(v); return b;
}
function encodeI64LE(v: bigint): Buffer {
  const b = Buffer.alloc(8); b.writeBigInt64LE(v); return b;
}
function encodeBytes(data: Uint8Array): Buffer {
  const lenBuf = Buffer.alloc(4); lenBuf.writeUInt32LE(data.length);
  return Buffer.concat([lenBuf, Buffer.from(data)]);
}
function encodeFixedArray(data: Uint8Array): Buffer {
  return Buffer.from(data);
}

/** 8-byte Anchor instruction discriminator = SHA-256("global:<name>")[0..8] */
function discriminator(name: string): Buffer {
  const input = new TextEncoder().encode(`global:${name}`);
  return Buffer.from(sha256(input)).slice(0, 8);
}

// ─── Instruction argument types ───────────────────────────────────────────────

export interface InitializeVaultArgs {
  fhePubkey: Uint8Array;          // 32 bytes
  maxDrawdownBps: number;
  spendingLimitLamports: bigint;
  timeLockSecs: bigint;
}

export interface CreateDWalletArgs {
  dwalletId: Uint8Array;          // 32 bytes (Sui object digest)
  dwalletPubkey: Uint8Array;      // 33 bytes (compressed secp256k1)
  chainBitmap: number;            // bitmask: bit0=Solana, bit1=BTC, bit2=ETH
}

export interface DepositArgs {
  amountLamports: bigint;
  sourceChain: number;
  bridgeless: boolean;
  dwalletTxId: Uint8Array;        // 32 bytes; zeros for non-bridgeless
  depositIndex: bigint;
}

export interface SetStrategyParamsArgs {
  encryptedParams: Uint8Array;
  paramsHash: Uint8Array;         // 32 bytes
}

export interface ExecuteStrategyArgs {
  encryptedOp: Uint8Array;
  opProof: Uint8Array;            // 64 bytes
  protocolAccount: PublicKey;     // whitelisted protocol address (receives lamports)
  amountLamports: bigint;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class VeilVaultClient {
  constructor(
    public readonly connection: Connection,
    /** Wallet adapter shape — needs publicKey + signTransaction */
    public readonly wallet: {
      publicKey: PublicKey;
      signTransaction: (tx: Transaction) => Promise<Transaction>;
    }
  ) {}

  // initialize_vault ──────────────────────────────────────────────────────────

  async initializeVault(args: InitializeVaultArgs): Promise<string> {
    const owner = this.wallet.publicKey;
    const [vault] = findVaultPda(owner);

    const data = Buffer.concat([
      discriminator("initialize_vault"),
      encodeFixedArray(args.fhePubkey),
      encodeU16LE(args.maxDrawdownBps),
      encodeU64LE(args.spendingLimitLamports),
      encodeI64LE(args.timeLockSecs),
    ]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: owner,                   isSigner: true,  isWritable: true  },
        { pubkey: vault,                   isSigner: false, isWritable: true  },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    return this._send([ix]);
  }

  // create_dwallet ────────────────────────────────────────────────────────────

  async createDWallet(args: CreateDWalletArgs): Promise<string> {
    const owner = this.wallet.publicKey;
    const [vault]        = findVaultPda(owner);
    const [dwalletRecord] = findDWalletRecordPda(vault);

    const data = Buffer.concat([
      discriminator("create_dwallet"),
      encodeFixedArray(args.dwalletId),
      encodeFixedArray(args.dwalletPubkey),
      encodeU8(args.chainBitmap),
    ]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: owner,                   isSigner: true,  isWritable: true  },
        { pubkey: vault,                   isSigner: false, isWritable: true  },
        { pubkey: dwalletRecord,           isSigner: false, isWritable: true  },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    return this._send([ix]);
  }

  // approve_dwallet ───────────────────────────────────────────────────────────

  async approveDWallet(): Promise<string> {
    const owner = this.wallet.publicKey;
    const [vault]        = findVaultPda(owner);
    const [dwalletRecord] = findDWalletRecordPda(vault);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: owner,         isSigner: true,  isWritable: false },
        { pubkey: vault,         isSigner: false, isWritable: false },
        { pubkey: dwalletRecord, isSigner: false, isWritable: true  },
      ],
      data: discriminator("approve_dwallet"),
    });

    return this._send([ix]);
  }

  // deposit ───────────────────────────────────────────────────────────────────

  async deposit(args: DepositArgs): Promise<string> {
    const depositor = this.wallet.publicKey;
    const [vaultPda]      = findVaultPda(depositor);
    const [dwalletRecord] = findDWalletRecordPda(vaultPda);
    const [depositRecord] = findDepositRecordPda(vaultPda, args.depositIndex);

    const data = Buffer.concat([
      discriminator("deposit"),
      encodeU64LE(args.amountLamports),
      encodeU8(args.sourceChain),
      encodeU8(args.bridgeless ? 1 : 0),
      encodeFixedArray(args.dwalletTxId),
      encodeU64LE(args.depositIndex),
    ]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: depositor,               isSigner: true,  isWritable: true  },
        { pubkey: vaultPda,               isSigner: false, isWritable: true  },
        { pubkey: dwalletRecord,          isSigner: false, isWritable: false },
        { pubkey: depositRecord,          isSigner: false, isWritable: true  },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    return this._send([ix]);
  }

  // set_strategy_params ───────────────────────────────────────────────────────

  async setStrategyParams(args: SetStrategyParamsArgs): Promise<string> {
    const owner = this.wallet.publicKey;
    const [vault] = findVaultPda(owner);

    const data = Buffer.concat([
      discriminator("set_strategy_params"),
      encodeBytes(args.encryptedParams),
      encodeFixedArray(args.paramsHash),
    ]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: owner, isSigner: true,  isWritable: false },
        { pubkey: vault, isSigner: false, isWritable: true  },
      ],
      data,
    });

    return this._send([ix]);
  }

  // execute_strategy ──────────────────────────────────────────────────────────
  // Note: `protocol` is now an Account in the accounts list (not a param).
  // The vault transfers lamports directly to protocolAccount on success.

  async executeStrategy(args: ExecuteStrategyArgs): Promise<string> {
    const owner = this.wallet.publicKey;
    const [vault] = findVaultPda(owner);

    const data = Buffer.concat([
      discriminator("execute_strategy"),
      encodeBytes(args.encryptedOp),
      encodeFixedArray(args.opProof),
      encodeU64LE(args.amountLamports),
    ]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: owner,                   isSigner: true,  isWritable: false },
        { pubkey: vault,                   isSigner: false, isWritable: true  },
        { pubkey: args.protocolAccount,    isSigner: false, isWritable: true  },
      ],
      data,
    });

    return this._send([ix]);
  }

  // harvest_yield ─────────────────────────────────────────────────────────────

  async harvestYield(returnedLamports: bigint): Promise<string> {
    const owner = this.wallet.publicKey;
    const [vault] = findVaultPda(owner);

    const data = Buffer.concat([
      discriminator("harvest_yield"),
      encodeU64LE(returnedLamports),
    ]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: owner, isSigner: true,  isWritable: false },
        { pubkey: vault, isSigner: false, isWritable: true  },
      ],
      data,
    });

    return this._send([ix]);
  }

  // returnAndHarvestYield ─────────────────────────────────────────────────────
  // Batches two instructions in one transaction:
  //   1. System transfer: owner → vault  (the "protocol" sends funds back)
  //   2. harvest_yield                   (program records the returned amount)
  // Both instructions execute atomically, so the lamport balance check in
  // harvest_yield sees the new funds immediately.

  async returnAndHarvestYield(returnedLamports: bigint): Promise<string> {
    const owner = this.wallet.publicKey;
    const [vault] = findVaultPda(owner);

    const transferIx = new TransactionInstruction({
      programId: SystemProgram.programId,
      keys: [
        { pubkey: owner, isSigner: true,  isWritable: true  },
        { pubkey: vault, isSigner: false, isWritable: true  },
      ],
      data: (() => {
        // System program Transfer instruction layout: [u32 instruction_index=2, u64 lamports]
        const b = Buffer.alloc(12);
        b.writeUInt32LE(2, 0);
        b.writeBigUInt64LE(returnedLamports, 4);
        return b;
      })(),
    });

    const harvestData = Buffer.concat([
      discriminator("harvest_yield"),
      encodeU64LE(returnedLamports),
    ]);
    const harvestIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: owner, isSigner: true,  isWritable: false },
        { pubkey: vault, isSigner: false, isWritable: true  },
      ],
      data: harvestData,
    });

    return this._send([transferIx, harvestIx]);
  }

  // add_approved_protocol ─────────────────────────────────────────────────────

  async addApprovedProtocol(protocol: PublicKey): Promise<string> {
    const owner = this.wallet.publicKey;
    const [vault] = findVaultPda(owner);

    const data = Buffer.concat([
      discriminator("add_approved_protocol"),
      protocol.toBuffer(),
    ]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: owner, isSigner: true,  isWritable: false },
        { pubkey: vault, isSigner: false, isWritable: true  },
      ],
      data,
    });

    return this._send([ix]);
  }

  // withdraw ──────────────────────────────────────────────────────────────────

  async withdraw(amountLamports: bigint): Promise<string> {
    const owner = this.wallet.publicKey;
    const [vault] = findVaultPda(owner);

    const data = Buffer.concat([
      discriminator("withdraw"),
      encodeU64LE(amountLamports),
    ]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: owner,                   isSigner: true,  isWritable: true  },
        { pubkey: vault,                   isSigner: false, isWritable: true  },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    return this._send([ix]);
  }

  // update_performance ────────────────────────────────────────────────────────

  async updatePerformance(encryptedSummary: Uint8Array): Promise<string> {
    const owner = this.wallet.publicKey;
    const [vault] = findVaultPda(owner);

    const data = Buffer.concat([
      discriminator("update_performance"),
      encodeBytes(encryptedSummary),
    ]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: owner, isSigner: true,  isWritable: false },
        { pubkey: vault, isSigner: false, isWritable: true  },
      ],
      data,
    });

    return this._send([ix]);
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  private async _send(instructions: TransactionInstruction[]): Promise<string> {
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();

    const tx = new Transaction({
      feePayer: this.wallet.publicKey,
      recentBlockhash: blockhash,
    });
    tx.add(...instructions);

    const signed = await this.wallet.signTransaction(tx);
    const sig = await this.connection.sendRawTransaction(signed.serialize());
    await this.connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    );
    return sig;
  }
}
