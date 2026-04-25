import React from "react";
import { colors, fontFamily } from "../../constants/theme";
import { MaterialIcon, GradientButton } from "../ui";
import { useDepositForm } from "../../hooks";
import type { DepositWithdraw } from "../../types";

const QUICK_PERCENTAGES = [
  { label: "25%",  value: 25  },
  { label: "50%",  value: 50  },
  { label: "75%",  value: 75  },
  { label: "MAX",  value: 100 },
];

export const DepositPanel: React.FC = () => {
  const {
    activeAction, amount,
    setActiveAction, setAmount,
    applyPercent, handleConfirm,
  } = useDepositForm();

  return (
    <div style={{ background: colors.surfaceContainerLow, borderRadius: 16, padding: 20 }}>
      {/* Deposit / Withdraw tab toggle */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "1fr 1fr",
          background:          colors.surfaceContainerHighest,
          borderRadius:        10,
          padding:             4,
          marginBottom:        20,
        }}
      >
        {(["Deposit", "Withdraw"] as DepositWithdraw[]).map((action) => (
          <button
            key={action}
            onClick={() => setActiveAction(action)}
            style={{
              padding:      "9px 0",
              fontSize:     13,
              fontWeight:   700,
              background:   activeAction === action ? "#fff" : "transparent",
              color:        activeAction === action ? colors.surface : "#64748b",
              border:       "none",
              borderRadius: 8,
              cursor:       "pointer",
              fontFamily:   fontFamily.headline,
              transition:   "all 0.2s",
            }}
          >
            {action}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Amount
          </span>
          <span style={{ fontSize: 11, color: "#64748b" }}>Balance: 12.45 USDC</span>
        </div>

        <div
          style={{
            background:   colors.surfaceContainerHighest,
            borderRadius: 10,
            padding:      "14px 16px",
            display:      "flex",
            justifyContent: "space-between",
            alignItems:   "center",
          }}
        >
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              background:  "transparent",
              border:      "none",
              color:       "#fff",
              fontSize:    22,
              fontWeight:  300,
              fontFamily:  fontFamily.headline,
              outline:     "none",
              width:       "60%",
            }}
          />
          <div
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          6,
              background:   colors.surfaceContainer,
              padding:      "6px 12px",
              borderRadius: 8,
            }}
          >
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#2775CA" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>USDC</span>
          </div>
        </div>
      </div>

      {/* Quick-select percentages */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        {QUICK_PERCENTAGES.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => applyPercent(value)}
            style={{
              padding:      "7px 0",
              fontSize:     11,
              fontWeight:   700,
              background:   label === "MAX" ? colors.surfaceContainerHighest : "transparent",
              color:        label === "MAX" ? "#fff" : "#64748b",
              border:       `1px solid ${colors.outlineVariant}40`,
              borderRadius: 6,
              cursor:       "pointer",
              fontFamily:   fontFamily.headline,
              transition:   "all 0.2s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Vault capacity */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
          <span style={{ color: "#64748b" }}>Vault Capacity</span>
          <span style={{ color: "#fff", fontWeight: 600 }}>84% Full</span>
        </div>
        <div style={{ height: 4, background: colors.surfaceContainerHighest, borderRadius: 2 }}>
          <div
            style={{
              height:       "100%",
              width:        "84%",
              borderRadius: 2,
              background:   `linear-gradient(90deg, ${colors.primary}, ${colors.primaryContainer})`,
            }}
          />
        </div>
      </div>

      {/* Gas fee */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 20 }}>
        <span style={{ color: "#64748b", textTransform: "uppercase", fontSize: 9, fontWeight: 700, letterSpacing: "0.10em" }}>
          Gas Fee
        </span>
        <span style={{ color: colors.onSurfaceVariant }}>~$1.42</span>
      </div>

      {/* CTA */}
      <GradientButton fullWidth size="lg" style={{ marginBottom: 12 }} onClick={handleConfirm}>
        Confirm {activeAction}
      </GradientButton>

      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
        <MaterialIcon name="lock" size={12} style={{ color: "#64748b" }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          End-to-End Cryptographic Security
        </span>
      </div>
    </div>
  );
};
