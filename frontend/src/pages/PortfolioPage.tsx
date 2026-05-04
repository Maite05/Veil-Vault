import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { colors, fontFamily } from "../constants/theme";
import { MaterialIcon } from "../components/ui";
import {
  TvlCard,
  NetWorthCard,
  SecurityPulse,
  YieldChart,
  ActivePositionsTable,
  InfoCards,
} from "../components/portfolio";
import { useVault } from "../hooks";

export const PortfolioPage: React.FC = () => {
  const { publicKey } = useWallet();
  const { vault, vaultExists, loading } = useVault();

  const shortKey = publicKey
    ? `${publicKey.toBase58().slice(0, 6)}…${publicKey.toBase58().slice(-4)}`
    : "";

  // Yield % relative to deposits
  const yieldPct = vault && vault.totalDepositedSol > 0
    ? ((vault.yieldEarnedSol / vault.totalDepositedSol) * 100).toFixed(2)
    : "0.00";

  return (
    <section style={{ padding: "32px", maxWidth: 1200, margin: "0 auto" }}>

      {/* FHE banner */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: `${colors.primary}14`, border: `1px solid ${colors.primary}28`,
        borderRadius: 6, padding: "6px 14px", marginBottom: 20,
      }}>
        <MaterialIcon name="lock" size={14} style={{ color: colors.primary }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: colors.primary, textTransform: "uppercase" }}>
          Fully Homomorphic Encryption Active
        </span>
      </div>

      {/* Title row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h2 style={{ fontFamily: fontFamily.headline, fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", marginBottom: 8 }}>
            {shortKey ? `${shortKey}` : "My Portfolio"}
          </h2>
          <p style={{ color: colors.onSurfaceVariant, fontSize: 15 }}>
            {vaultExists
              ? "Your encrypted vault — strategy parameters and balances protected by FHE."
              : "No vault found. Set one up on the Vaults tab."}
          </p>
        </div>

        {/* Live yield badge */}
        <div style={{ background: colors.surfaceContainerHigh, borderRadius: 12, padding: "14px 22px", textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>
            Yield Earned
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: vaultExists && vault!.yieldEarnedSol > 0 ? "#4ade80" : "#475569", fontFamily: fontFamily.headline }}>
            {loading ? "…" : vaultExists ? `+${yieldPct}%` : "—"}
          </div>
        </div>
      </div>

      {/* TVL + Net Worth — real on-chain data */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, marginBottom: 20 }}>
        <TvlCard
          netValueSol={vault?.netValueSol ?? 0}
          totalDepositedSol={vault?.totalDepositedSol ?? 0}
          vaultExists={vaultExists}
        />
        <NetWorthCard
          netValueSol={vault?.netValueSol ?? 0}
          yieldEarnedSol={vault?.yieldEarnedSol ?? 0}
          vaultExists={vaultExists}
        />
      </div>

      {/* Security + Yield */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20, marginBottom: 20 }}>
        <SecurityPulse />
        <YieldChart />
      </div>

      {/* Active positions table */}
      <ActivePositionsTable />

      {/* Info cards */}
      <InfoCards />
    </section>
  );
};
