import React from "react";
import { colors, fontFamily } from "../../constants/theme";
import { MaterialIcon } from "../ui";
import type { HeaderProps, ActiveTab } from "../../types";

const TABS: ActiveTab[] = ["Overview", "Yields", "History"];

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => (
<header
    style={{
      position:      "sticky",
      top:           0,
      zIndex:        40,
      display:       "flex",
      alignItems:    "center",
      justifyContent:"space-between",
      height:        64,
      padding:       "0 32px",
      background:    `${colors.surface}cc`,
      backdropFilter:"blur(16px)",
    }}
  >
    {/* ── Left: search + tabs ── */}
    <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
      <div style={{ position: "relative" }}>
        <MaterialIcon
          name="search"
          size={18}
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#475569" }}
        />
        <input
          type="text"
          placeholder="Search strategies..."
          style={{
            background:   colors.surfaceContainerLow,
            border:       "none",
            borderRadius: 24,
            paddingLeft:  40,
            paddingRight: 16,
            paddingTop:   7,
            paddingBottom:7,
            fontSize:     13,
            color:        colors.onSurface,
            width:        240,
            outline:      "none",
            fontFamily:   fontFamily.body,
          }}
        />
      </div>

      <nav style={{ display: "flex", gap: 24 }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            style={{
              background:   "transparent",
              border:       "none",
              borderBottom: activeTab === tab
                ? `2px solid ${colors.primaryContainer}`
                : "2px solid transparent",
              color:        activeTab === tab ? colors.primary : colors.outline,
              fontWeight:   500,
              fontSize:     14,
              fontFamily:   fontFamily.headline,
              paddingBottom:4,
              cursor:       "pointer",
              transition:   "all 0.2s",
            }}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>

    {/* ── Right: actions + avatar ── */}
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {(["notifications", "account_balance"] as const).map((icon) => (
        <button
          key={icon}
          style={{ background: "transparent", border: "none", color: colors.outline, cursor: "pointer", padding: 8, borderRadius: 8 }}
        >
          <MaterialIcon name={icon} size={22} />
        </button>
      ))}

      <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.10)", margin: "0 4px" }} />

      <button
        style={{
          padding:    "6px 14px",
          fontSize:   12,
          fontWeight: 700,
          color:      colors.primary,
          background: "transparent",
          border:     `1px solid ${colors.primary}33`,
          borderRadius: 4,
          cursor:     "pointer",
          fontFamily: fontFamily.headline,
        }}
      >
        Withdraw
      </button>
      <button
        style={{
          padding:    "6px 14px",
          fontSize:   12,
          fontWeight: 700,
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryContainer} 100%)`,
          color:      colors.onPrimary,
          border:     "none",
          borderRadius: 4,
          cursor:     "pointer",
          fontFamily: fontFamily.headline,
        }}
      >
        Deposit
      </button>

      <div
        style={{
          width:        32,
          height:       32,
          borderRadius: "50%",
          border:       `1px solid ${colors.primary}33`,
          background:   `linear-gradient(135deg, ${colors.primaryContainer}, ${colors.secondaryContainer})`,
          display:      "flex",
          alignItems:   "center",
          justifyContent:"center",
          fontSize:     11,
          fontWeight:   700,
          color:        colors.primary,
          marginLeft:   4,
        }}
      >
        0x7F
      </div>
    </div>
  </header>
);
