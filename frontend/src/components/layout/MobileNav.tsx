import React from "react";
import { colors, fontFamily } from "../../constants/theme";
import { MaterialIcon } from "../ui";
import type { SidebarProps, NavItem } from "../../types";

const NAV_LINKS: { icon: string; label: NavItem }[] = [
  { icon: "dashboard",              label: "Portfolio" },
  { icon: "account_balance_wallet", label: "Vaults"    },
  { icon: "explore",                label: "Strategy"  },
  { icon: "verified_user",          label: "Security"  },
  { icon: "settings",               label: "Settings"  },
];

export const MobileNav: React.FC<SidebarProps> = ({ activeNav, onNavChange }) => (
  <nav
    style={{
      position:       "fixed",
      bottom:         0,
      left:           0,
      right:          0,
      height:         64,
      background:     "rgba(26, 27, 32, 0.95)",
      backdropFilter: "blur(20px)",
      borderTop:      "1px solid rgba(255,255,255,0.08)",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-around",
      zIndex:         50,
      paddingBottom:  "env(safe-area-inset-bottom)",
    }}
  >
    {NAV_LINKS.map(({ icon, label }) => {
      const isActive = activeNav === label;
      return (
        <button
          key={label}
          type="button"
          onClick={() => onNavChange(label)}
          style={{
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            gap:            3,
            background:     "transparent",
            border:         "none",
            cursor:         "pointer",
            padding:        "6px 12px",
            borderRadius:   8,
            color:          isActive ? colors.primary : "#475569",
            transition:     "color 0.2s",
          }}
        >
          <MaterialIcon name={icon} size={22} style={{ color: isActive ? colors.primary : "#475569" }} />
          <span style={{
            fontSize:      9,
            fontWeight:    700,
            fontFamily:    fontFamily.headline,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}>
            {label}
          </span>
        </button>
      );
    })}
  </nav>
);
