import React from "react";
import { colors, fontFamily } from "../../constants/theme";
import { MaterialIcon, GradientText, GradientButton } from "../ui";
import type { SidebarProps, NavItem } from "../../types";

interface NavLink {
  icon:  string;
  label: NavItem;
}

const NAV_LINKS: NavLink[] = [
  { icon: "dashboard",             label: "Portfolio" },
  { icon: "account_balance_wallet",label: "Vaults"    },
  { icon: "explore",               label: "Strategy"  },
  { icon: "verified_user",         label: "Security"  },
  { icon: "settings",              label: "Settings"  },
];

const UTILITY_LINKS = [
  { icon: "help",        label: "Support"       },
  { icon: "description", label: "Documentation" },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeNav, onNavChange }) => (
  <aside
    style={{
      position:      "fixed",
      left:          16,
      top:           16,
      bottom:        16,
      width:         240,
      borderRadius:  16,
      background:    "rgba(26, 27, 32, 0.70)",
      backdropFilter:"blur(20px)",
      display:       "flex",
      flexDirection: "column",
      padding:       "24px 16px",
      zIndex:        50,
      boxShadow:     "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
    }}
  >
    {/* ── Logo ── */}
    <div style={{ marginBottom: 36 }}>
      <GradientText style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", display: "block", fontFamily: fontFamily.headline }}>
        Veil Vault
      </GradientText>
      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: `${colors.primary}60`, marginTop: 4 }}>
        MPC Protected
      </p>
    </div>

    {/* ── Nav ── */}
    <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
      {NAV_LINKS.map(({ icon, label }) => {
        const isActive = activeNav === label;
        return (
          <button
            key={label}
            onClick={() => onNavChange(label)}
            style={{
              display:     "flex",
              alignItems:  "center",
              gap:         12,
              padding:     "10px 14px",
              borderRadius: 8,
              background:  isActive
                ? `linear-gradient(90deg, ${colors.primaryContainer}28 0%, transparent 100%)`
                : "transparent",
              borderRight: isActive ? `2px solid ${colors.primaryContainer}` : "2px solid transparent",
              color:       isActive ? colors.primary : colors.outline,
              fontWeight:  isActive ? 700 : 400,
              fontSize:    14,
              fontFamily:  fontFamily.headline,
              letterSpacing: "-0.01em",
              cursor:      "pointer",
              transition:  "all 0.2s ease",
              textAlign:   "left",
              border:      "none",
              outline:     "none",
            }}
          >
            <MaterialIcon name={icon} size={20} />
            {label}
          </button>
        );
      })}
    </nav>

    {/* ── Bottom ── */}
    <div style={{ marginTop: "auto", paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <GradientButton fullWidth>Connect Wallet</GradientButton>

      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 12 }}>
        {UTILITY_LINKS.map(({ icon, label }) => (
          <button
            key={label}
            style={{
              display:    "flex",
              alignItems: "center",
              gap:        10,
              padding:    "8px 14px",
              background: "transparent",
              border:     "none",
              color:      "#64748b",
              fontSize:   12,
              cursor:     "pointer",
              borderRadius: 6,
              fontFamily: fontFamily.body,
            }}
          >
            <MaterialIcon name={icon} size={16} />
            {label}
          </button>
        ))}
      </div>
    </div>
  </aside>
);
