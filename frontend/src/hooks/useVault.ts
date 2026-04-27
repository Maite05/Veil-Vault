import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { sha256 } from "@noble/hashes/sha256";
import { VeilVaultClient, findVaultPda, findDWalletRecordPda } from "../../lib/solana";

// ─── VaultState account byte offsets ─────────────────────────────────────────
// Layout (Anchor Borsh):
//   [0..8]    discriminator
//   [8..40]   owner Pubkey
//   [40]      bump u8
//   [41]      dwallet Option discriminant
//   [42..74]  dwallet Pubkey (if Some)
//   [74..106] fhe_pubkey [u8;32]
//   [106..138] strategy_params_hash [u8;32]    ← needed for execute proof
//   [138..650] strategy_params_ct [u8;512]
//   [650..652] strategy_params_len u16          ← > 0 means params are set
//   [652..660] total_deposited_lamports u64
//   [660..668] net_value_lamports u64
//   [668..670] max_drawdown_bps u16
//   [670..678] spending_limit_lamports u64
//   [678..686] time_lock_secs i64
//   [686..694] last_executed_at i64
//   [694..950] approved_protocols [Pubkey;8]
//   [950]     approved_protocols_count u8
//   [951..1207] perf_summary_ct [u8;256]
//   [1207..1209] perf_summary_len u16           ← > 0 means P&L is stored
//   [1209]    is_paused bool
//   [1210..1218] created_at i64
//   [1218..1226] total_yield_earned_lamports u64
const OFF_STRATEGY_HASH    = 106;
const OFF_STRATEGY_LEN     = 650;
const OFF_TOTAL_DEPOSITED  = 652;
const OFF_NET_VALUE        = 660;
const OFF_PERF_LEN         = 1207;
const OFF_IS_PAUSED        = 1209;
const OFF_YIELD_EARNED     = 1218;

// DWalletRecord: [0..8] disc, [8..40] vault, [40] bump, [41..73] id,
//                [73..106] pubkey (33 bytes), [106] chain_bitmap, [107] is_approved
const OFF_DWALLET_APPROVED = 107;

// Persist deposit index per vault across page refreshes.
function getDepositIndex(vaultKey: string): bigint {
  try { return BigInt(localStorage.getItem(`vv-di-${vaultKey}`) ?? "0"); }
  catch { return 0n; }
}
function bumpDepositIndex(vaultKey: string): void {
  localStorage.setItem(`vv-di-${vaultKey}`, String(getDepositIndex(vaultKey) + 1n));
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface OnChainVaultState {
  totalDepositedSol:  number;
  netValueSol:        number;
  yieldEarnedSol:     number;
  isPaused:           boolean;
  strategyParamsSet:  boolean;
  perfSummaryStored:  boolean;
  /** Raw 32-byte strategy params hash — used internally to build execute proofs. */
  strategyParamsHash: Uint8Array;
}

export interface UseVaultReturn {
  vaultExists:      boolean;
  dwalletApproved:  boolean;
  vault:            OnChainVaultState | null;
  walletBalanceSol: number;
  loading:          boolean;
  error:            string | null;
  txSig:            string | null;
  setupVault:       () => Promise<void>;
  depositSol:       (sol: number) => Promise<void>;
  withdrawSol:      (sol: number) => Promise<void>;
  executeStrategy:  (sol: number) => Promise<void>;
  harvestYield:     (returnedSol: number) => Promise<void>;
  updatePerformance:() => Promise<void>;
  refresh:          () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVault(): UseVaultReturn {
  const { connection } = useConnection();
  const wallet         = useWallet();

  const [vaultExists,      setVaultExists]     = useState(false);
  const [dwalletApproved,  setDwalletApproved] = useState(false);
  const [vault,            setVault]           = useState<OnChainVaultState | null>(null);
  const [walletBalanceSol, setWalletBalance]   = useState(0);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState<string | null>(null);
  const [txSig,    setTxSig]   = useState<string | null>(null);

  // ── Read on-chain state ──────────────────────────────────────────────────────

  const readVault = useCallback(async () => {
    if (!wallet.publicKey) {
      setVaultExists(false); setVault(null); setWalletBalance(0); return;
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
      setVaultExists(false); setVault(null); setDwalletApproved(false); return;
    }

    setVaultExists(true);
    const d = vaultInfo.data;

    setVault({
      totalDepositedSol:  Number(d.readBigUInt64LE(OFF_TOTAL_DEPOSITED)) / LAMPORTS_PER_SOL,
      netValueSol:        Number(d.readBigUInt64LE(OFF_NET_VALUE))        / LAMPORTS_PER_SOL,
      yieldEarnedSol:     Number(d.readBigUInt64LE(OFF_YIELD_EARNED))     / LAMPORTS_PER_SOL,
      isPaused:           d[OFF_IS_PAUSED] === 1,
      strategyParamsSet:  d.readUInt16LE(OFF_STRATEGY_LEN) > 0,
      perfSummaryStored:  d.readUInt16LE(OFF_PERF_LEN) > 0,
      strategyParamsHash: new Uint8Array(d.buffer, d.byteOffset + OFF_STRATEGY_HASH, 32),
    });

    setDwalletApproved(
      dwalletInfo && dwalletInfo.data.length > OFF_DWALLET_APPROVED
        ? dwalletInfo.data[OFF_DWALLET_APPROVED] === 1
        : false
    );
  }, [wallet.publicKey, connection]);

  useEffect(() => { readVault(); }, [readVault]);

  // ── Client factory ───────────────────────────────────────────────────────────

  const getClient = useCallback((): VeilVaultClient => {
    if (!wallet.publicKey || !wallet.signTransaction)
      throw new Error("Connect your wallet first.");
    return new VeilVaultClient(connection, {
      publicKey:       wallet.publicKey,
      signTransaction: wallet.signTransaction,
    });
  }, [connection, wallet]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const setupVault = useCallback(async () => {
    setLoading(true); setError(null); setTxSig(null);
    try {
      const client = getClient();
      const owner  = wallet.publicKey!;

      // 1. Initialise vault (FHE pubkey = random 32 bytes for devnet)
      await client.initializeVault({
        fhePubkey:             crypto.getRandomValues(new Uint8Array(32)),
        maxDrawdownBps:        2000,
        spendingLimitLamports: 2n * BigInt(LAMPORTS_PER_SOL),
        timeLockSecs:          0n,
      });

      // 2. Register a simulated Ika 2PC-MPC dWallet binding (devnet stub).
      //    Production: real dWallet ID from the Ika SDK ceremony on Sui devnet.
      const dwalletPubkey = new Uint8Array(33);
      dwalletPubkey[0]    = 0x02; // compressed secp256k1 point prefix
      await client.createDWallet({
        dwalletId:   crypto.getRandomValues(new Uint8Array(32)),
        dwalletPubkey,
        chainBitmap: 0b0111, // Solana | Bitcoin | Ethereum
      });

      // 3. Approve dWallet (ratifies the 2PC-MPC ceremony on-chain)
      await client.approveDWallet();

      // 4. Whitelist the owner's wallet as the mock yield protocol for devnet.
      //    Production: whitelist real Kamino / Jupiter / Drift program IDs.
      await client.addApprovedProtocol(owner);

      // 5. Set simulated FHE-encrypted strategy params.
      //    Production: real REFHE ciphertext from Encrypt SDK.
      const encryptedParams = new TextEncoder().encode(
        "RFHE" + JSON.stringify({
          allocationBps:       [{ asset: "SOL", bps: 6000 }, { asset: "USDC", bps: 4000 }],
          maxDrawdownBps:      1000,
          rebalanceTriggerBps: 500,
          stopLossBps:         1500,
        })
      );
      const paramsHash = Array.from(sha256(encryptedParams));
      const sig = await client.setStrategyParams({
        encryptedParams,
        paramsHash: new Uint8Array(paramsHash),
      });
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
    setLoading(true); setError(null); setTxSig(null);
    try {
      const client   = getClient();
      const [vaultPda] = findVaultPda(wallet.publicKey!);
      const vaultKey   = vaultPda.toBase58();
      const sig = await client.deposit({
        amountLamports: BigInt(Math.round(sol * LAMPORTS_PER_SOL)),
        sourceChain:    0,
        bridgeless:     false,
        dwalletTxId:    new Uint8Array(32),
        depositIndex:   getDepositIndex(vaultKey),
      });
      bumpDepositIndex(vaultKey);
      setTxSig(sig); await readVault();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [getClient, wallet.publicKey, readVault]);

  const withdrawSol = useCallback(async (sol: number) => {
    setLoading(true); setError(null); setTxSig(null);
    try {
      const sig = await getClient().withdraw(BigInt(Math.round(sol * LAMPORTS_PER_SOL)));
      setTxSig(sig); await readVault();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [getClient, readVault]);

  const executeStrategy = useCallback(async (sol: number) => {
    setLoading(true); setError(null); setTxSig(null);
    try {
      if (!vault?.strategyParamsSet)
        throw new Error("Strategy params not set — complete Setup Vault first.");

      const client = getClient();
      const owner  = wallet.publicKey!;

      // Build simulated FHE-encrypted operation descriptor.
      //   Production: real homomorphic evaluation result from Encrypt SDK.
      const encryptedOp = new TextEncoder().encode(
        "RFHE" + JSON.stringify({ action: "rebalance", amountSol: sol, ts: Date.now() })
      );

      // Compute devnet proof: SHA-256(encryptedOp || strategy_params_hash)[0..32] padded to 64.
      const preimage = new Uint8Array(encryptedOp.length + 32);
      preimage.set(encryptedOp, 0);
      preimage.set(vault.strategyParamsHash, encryptedOp.length);
      const digest  = sha256(preimage);
      const opProof = new Uint8Array(64); // zeros beyond first 32
      opProof.set(digest, 0);

      const sig = await client.executeStrategy({
        encryptedOp,
        opProof,
        // Owner's wallet acts as the mock yield protocol on devnet.
        // Production: real Kamino / Jupiter / Drift program address.
        protocolAccount: owner,
        amountLamports:  BigInt(Math.round(sol * LAMPORTS_PER_SOL)),
      });
      setTxSig(sig); await readVault();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [getClient, wallet.publicKey, vault, readVault]);

  const harvestYield = useCallback(async (returnedSol: number) => {
    setLoading(true); setError(null); setTxSig(null);
    try {
      // returnAndHarvestYield batches:
      //   1. System transfer: owner → vault  (simulates protocol returning funds)
      //   2. harvest_yield instruction        (program records the gain)
      const sig = await getClient().returnAndHarvestYield(
        BigInt(Math.round(returnedSol * LAMPORTS_PER_SOL))
      );
      setTxSig(sig); await readVault();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [getClient, readVault]);

  const updatePerformance = useCallback(async () => {
    setLoading(true); setError(null); setTxSig(null);
    try {
      if (!vault) throw new Error("Vault not initialised.");

      // Simulate FHE-encrypting the P&L summary.
      //   Production: encrypt with the owner's REFHE public key.
      const plaintext = JSON.stringify({
        totalDepositedSol: vault.totalDepositedSol,
        netValueSol:       vault.netValueSol,
        yieldEarnedSol:    vault.yieldEarnedSol,
        snapshotAt:        new Date().toISOString(),
      });
      // Prefix "RFHE" marks this as a simulated FHE ciphertext.
      const blob = new TextEncoder().encode("RFHE" + plaintext);
      // MAX_ENCRYPTED_PERF = 256 bytes — trim if over limit.
      const encryptedSummary = blob.slice(0, 256);

      const sig = await getClient().updatePerformance(encryptedSummary);
      setTxSig(sig); await readVault();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [getClient, vault, readVault]);

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
    executeStrategy,
    harvestYield,
    updatePerformance,
    refresh: readVault,
  };
}
