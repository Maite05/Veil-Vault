import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { VeilVaultClient, findVaultPda, findDWalletRecordPda } from "../../lib/solana";

// ─── VaultState account byte offsets ─────────────────────────────────────────
// Layout (Anchor Borsh):
//   [0..8]    discriminator
//   [8..40]   owner Pubkey
//   [40]      bump u8
//   [41]      dwallet Option discriminant
//   [42..74]  dwallet Pubkey (if Some)
//   [74..106] fhe_pubkey [u8;32]
//   [106..138] strategy_params_hash [u8;32]
//   [138..650] strategy_params_ct [u8;512]
//   [650..652] strategy_params_len u16
//   [652..660] total_deposited_lamports u64
//   [660..668] net_value_lamports u64
//   [668..670] max_drawdown_bps u16
//   [670..678] spending_limit_lamports u64
//   [678..686] time_lock_secs i64
//   [686..694] last_executed_at i64
//   [694..950] approved_protocols [Pubkey;8]
//   [950]     approved_protocols_count u8
//   [951..1207] perf_summary_ct [u8;256]
//   [1207..1209] perf_summary_len u16
//   [1209]    is_paused bool
//   [1210..1218] created_at i64
//   [1218..1226] total_yield_earned_lamports u64
const OFF_TOTAL_DEPOSITED = 652;
const OFF_NET_VALUE        = 660;
const OFF_IS_PAUSED        = 1209;
const OFF_YIELD_EARNED     = 1218;

// DWalletRecord: [0..8] disc, [8..40] vault, [40] bump, [41..73] id,
//                [73..106] pubkey (33 bytes), [106] chain_bitmap, [107] is_approved
const OFF_DWALLET_APPROVED = 107;

// Persist deposit index per vault across page refreshes.
function getDepositIndex(vaultKey: string): bigint {
  try {
    return BigInt(localStorage.getItem(`vv-di-${vaultKey}`) ?? "0");
  } catch {
    return 0n;
  }
}
function bumpDepositIndex(vaultKey: string): void {
  const next = getDepositIndex(vaultKey) + 1n;
  localStorage.setItem(`vv-di-${vaultKey}`, String(next));
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface OnChainVaultState {
  totalDepositedSol: number;
  netValueSol:       number;
  yieldEarnedSol:    number;
  isPaused:          boolean;
}

export interface UseVaultReturn {
  /** Whether this wallet's vault account exists on-chain. */
  vaultExists:     boolean;
  /** Whether the vault's Ika dWallet binding is approved. */
  dwalletApproved: boolean;
  /** Decoded on-chain vault state (null when vault doesn't exist yet). */
  vault:           OnChainVaultState | null;
  /** Connected wallet's current SOL balance. */
  walletBalanceSol: number;
  loading:  boolean;
  error:    string | null;
  /** Signature of the most recent successful transaction. */
  txSig:    string | null;
  /** Initialise vault + create + approve dWallet in sequence. */
  setupVault:   () => Promise<void>;
  /** Deposit SOL into the vault. */
  depositSol:   (sol: number) => Promise<void>;
  /** Withdraw SOL from the vault. */
  withdrawSol:  (sol: number) => Promise<void>;
  /** Re-fetch on-chain state. */
  refresh:      () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVault(): UseVaultReturn {
  const { connection }  = useConnection();
  const wallet          = useWallet();

  const [vaultExists,     setVaultExists]     = useState(false);
  const [dwalletApproved, setDwalletApproved] = useState(false);
  const [vault,           setVault]           = useState<OnChainVaultState | null>(null);
  const [walletBalanceSol, setWalletBalance]  = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [txSig,    setTxSig]    = useState<string | null>(null);

  // ── Read on-chain state ──────────────────────────────────────────────────────

  const readVault = useCallback(async () => {
    if (!wallet.publicKey) {
      setVaultExists(false);
      setVault(null);
      setWalletBalance(0);
      return;
    }

    const [vaultPda]   = findVaultPda(wallet.publicKey);
    const [dwalletPda] = findDWalletRecordPda(vaultPda);

    const [vaultInfo, walletLamports, dwalletInfo] = await Promise.all([
      connection.getAccountInfo(vaultPda),
      connection.getBalance(wallet.publicKey),
      connection.getAccountInfo(dwalletPda),
    ]);

    setWalletBalance(walletLamports / LAMPORTS_PER_SOL);

    if (!vaultInfo || vaultInfo.data.length < OFF_YIELD_EARNED + 8) {
      setVaultExists(false);
      setVault(null);
      setDwalletApproved(false);
      return;
    }

    setVaultExists(true);

    const d = vaultInfo.data;
    setVault({
      totalDepositedSol: Number(d.readBigUInt64LE(OFF_TOTAL_DEPOSITED)) / LAMPORTS_PER_SOL,
      netValueSol:       Number(d.readBigUInt64LE(OFF_NET_VALUE))        / LAMPORTS_PER_SOL,
      yieldEarnedSol:    Number(d.readBigUInt64LE(OFF_YIELD_EARNED))     / LAMPORTS_PER_SOL,
      isPaused:          d[OFF_IS_PAUSED] === 1,
    });

    if (dwalletInfo && dwalletInfo.data.length > OFF_DWALLET_APPROVED) {
      setDwalletApproved(dwalletInfo.data[OFF_DWALLET_APPROVED] === 1);
    } else {
      setDwalletApproved(false);
    }
  }, [wallet.publicKey, connection]);

  useEffect(() => { readVault(); }, [readVault]);

  // ── Client factory ───────────────────────────────────────────────────────────

  const getClient = useCallback((): VeilVaultClient => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Connect your wallet first.");
    }
    return new VeilVaultClient(connection, {
      publicKey:       wallet.publicKey,
      signTransaction: wallet.signTransaction,
    });
  }, [connection, wallet]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const setupVault = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTxSig(null);
    try {
      const client = getClient();
      const owner  = wallet.publicKey!;

      // 1. Initialize vault with a simulated FHE pubkey (random 32 bytes).
      const fhePubkey = crypto.getRandomValues(new Uint8Array(32));
      await client.initializeVault({
        fhePubkey,
        maxDrawdownBps:        2000,   // 20% max drawdown
        spendingLimitLamports: 2n * BigInt(LAMPORTS_PER_SOL),
        timeLockSecs:          0n,
      });

      // 2. Register a simulated Ika dWallet binding (devnet stub).
      //    In production this comes from the Ika SDK 2PC-MPC ceremony on Sui.
      const dwalletId     = crypto.getRandomValues(new Uint8Array(32));
      const dwalletPubkey = new Uint8Array(33);
      dwalletPubkey[0]    = 0x02; // compressed secp256k1 point prefix

      await client.createDWallet({
        dwalletId,
        dwalletPubkey,
        chainBitmap: 0b0111, // Solana | Bitcoin | Ethereum
      });

      // 3. Approve the dWallet (on-chain ratification of 2PC ceremony).
      const sig = await client.approveDWallet();
      setTxSig(sig);

      await readVault();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getClient, wallet.publicKey, readVault]);

  const depositSol = useCallback(async (sol: number) => {
    setLoading(true);
    setError(null);
    setTxSig(null);
    try {
      const client = getClient();
      const [vaultPda] = findVaultPda(wallet.publicKey!);
      const vaultKey   = vaultPda.toBase58();

      const depositIndex = getDepositIndex(vaultKey);
      const sig = await client.deposit({
        amountLamports: BigInt(Math.round(sol * LAMPORTS_PER_SOL)),
        sourceChain:    0,   // CHAIN_SOLANA
        bridgeless:     false,
        dwalletTxId:    new Uint8Array(32),
        depositIndex,
      });
      bumpDepositIndex(vaultKey);
      setTxSig(sig);
      await readVault();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [getClient, wallet.publicKey, readVault]);

  const withdrawSol = useCallback(async (sol: number) => {
    setLoading(true);
    setError(null);
    setTxSig(null);
    try {
      const client = getClient();
      const sig = await client.withdraw(BigInt(Math.round(sol * LAMPORTS_PER_SOL)));
      setTxSig(sig);
      await readVault();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [getClient, readVault]);

  return {
    vaultExists,
    dwalletApproved,
    vault,
    walletBalanceSol,
    loading,
    error,
    txSig,
    setupVault,
    depositSol,
    withdrawSol,
    refresh: readVault,
  };
}
