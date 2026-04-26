import React from "react";
import { colors } from "../constants/theme";
import {
  VaultDetailHeader,
  VaultAPYChart,
  InvestmentStrategy,
  SecurityBadges,
  DepositPanel,
  RecentActivityPanel,
} from "../components/detail";

export const VaultDetailPage: React.FC = () => (
  <section style={{ padding: "32px", maxWidth: 1200, margin: "0 auto" }}>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>

      {/* ── Left column ── */}
      <div>
        <VaultDetailHeader
          breadcrumb="Arbitrum Alpha-Delta Neutral"
          title="Alpha-Delta Neutral"
          description="Hedged yield farming across GMX and Uniswap V3 liquidity pools."
          netApy="24.82%"
          tvl="$4.2M"
        />

        <VaultAPYChart />

        {/* Investment strategy + security badges side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <InvestmentStrategy />
          <SecurityBadges />
        </div>
      </div>

      {/* ── Right column ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <DepositPanel />
        <RecentActivityPanel />
      </div>
    </div>

    {/* Footer */}
    <div
      style={{
        marginTop:     40,
        textAlign:     "center",
        color:         "#334155",
        fontSize:      10,
        fontWeight:    600,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
      }}
    >
      Veil Vault V2.4.0-Stable • Powered by ZK-Proofs &amp; MPC • Audit Hash: 0xa7...f2e
    </div>
  </section>
);
