import React, { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { colors, globalStyles, fontFamily } from "./src/constants/theme";
import { Sidebar, Header } from "./src/components/layout";
import { MaterialIcon, GradientText } from "./src/components/ui";
import { PortfolioPage, VaultsBrowserPage, VaultDetailPage } from "./src/pages";
import { useNavigation } from "./src/hooks";
import type { NavItem } from "./src/types";

// ─── Landing screen (not connected) ──────────────────────────────────────────

const FEATURES = [
  {
    icon: "lock",
    title: "FHE-Encrypted Strategies",
    desc:  "Strategy logic computed homomorphically — front-runners and MEV bots see nothing.",
  },
  {
    icon: "hub",
    title: "Ika Bridgeless Custody",
    desc:  "Deposit native BTC, ETH, or RWAs via 2PC-MPC dWallets. No bridges. No wrapping.",
  },
  {
    icon: "verified_user",
    title: "On-Chain Guardrails",
    desc:  "Spending limits, time-locks, drawdown caps, and protocol whitelists enforced by Solana.",
  },
];

const Landing: React.FC = () => (
  <div style={{
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
    background: colors.surface,
    textAlign: "center",
  }}>
    {/* Ambient glow */}
    <div style={{
      position: "fixed", top: "30%", left: "50%", transform: "translateX(-50%)",
      width: 600, height: 300, pointerEvents: "none", zIndex: 0,
      background: `radial-gradient(ellipse, ${colors.primary}08, transparent 70%)`,
    }} />

    <div style={{ position: "relative", zIndex: 1, maxWidth: 640 }}>
      {/* Badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: `${colors.primary}14`, border: `1px solid ${colors.primary}28`,
        borderRadius: 6, padding: "6px 14px", marginBottom: 28,
      }}>
        <MaterialIcon name="science" size={13} style={{ color: colors.primary }} />
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.18em",
          color: colors.primary, textTransform: "uppercase",
        }}>
          Colosseum Frontier · Encrypt & Ika Track
        </span>
      </div>

      {/* Title */}
      <GradientText style={{
        fontSize: 72, fontWeight: 900, letterSpacing: "-0.04em",
        lineHeight: 1, display: "block", marginBottom: 16,
        fontFamily: fontFamily.headline,
      }}>
        VeilVault
      </GradientText>

      <p style={{
        fontSize: 18, color: colors.onSurfaceVariant,
        lineHeight: 1.6, marginBottom: 40, fontFamily: fontFamily.body,
      }}>
        Confidential yield strategies on Solana.{" "}
        <span style={{ color: "#fff" }}>Deposit native assets from any chain</span> — no bridges,
        no wrapping — and run{" "}
        <span style={{ color: "#fff" }}>FHE-encrypted strategies</span> that stay
        hidden from MEV and front-runners throughout execution.
      </p>

      {/* Connect CTA */}
      <div style={{ marginBottom: 56 }}>
        <WalletMultiButton style={{
          height: 52, fontSize: 15, fontWeight: 700,
          fontFamily: fontFamily.headline,
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryContainer} 100%)`,
          border: "none", borderRadius: 8, padding: "0 36px",
          color: colors.onPrimary, cursor: "pointer",
        }}>
          Connect Wallet to Start
        </WalletMultiButton>
        <p style={{ fontSize: 11, color: "#475569", marginTop: 12 }}>
          Phantom · Solflare · Torus — Solana Devnet
        </p>
      </div>

      {/* Features */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, textAlign: "left" }}>
        {FEATURES.map(({ icon, title, desc }) => (
          <div key={title} style={{
            background: colors.surfaceContainerLow,
            borderRadius: 12, padding: "18px 16px",
            border: `1px solid rgba(255,255,255,0.05)`,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, marginBottom: 10,
              background: `${colors.primary}18`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <MaterialIcon name={icon} size={16} style={{ color: colors.primary }} />
            </div>
            <p style={{
              fontSize: 13, fontWeight: 700, color: "#fff",
              fontFamily: fontFamily.headline, marginBottom: 6,
            }}>
              {title}
            </p>
            <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Placeholder for sections not yet built ──────────────────────────────────

interface ComingSoonProps { section: NavItem }
const ComingSoon: React.FC<ComingSoonProps> = ({ section }) => (
  <div style={{
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    minHeight: "60vh", gap: 16,
    color: colors.outline, fontFamily: "'Manrope', sans-serif",
  }}>
    <MaterialIcon name="construction" size={64} style={{ opacity: 0.25 }} />
    <p style={{ fontSize: 18, fontWeight: 600 }}>{section} — Coming Soon</p>
  </div>
);

// ─── Background ambient glow ──────────────────────────────────────────────────

const AmbientGlow: React.FC = () => (
  <div style={{
    position: "fixed", bottom: 0, right: 0,
    width: "35%", height: "50%",
    opacity: 0.04, pointerEvents: "none", zIndex: -1,
    background: `radial-gradient(ellipse at bottom right, ${colors.primary}, transparent 70%)`,
  }} />
);

// ─── Root app ─────────────────────────────────────────────────────────────────

export default function App() {
  const { connected } = useWallet();
  const { activeNav, activeTab, setActiveTab, handleNavChange } = useNavigation();

  // Auto-navigate to Vaults when wallet connects for the first time.
  useEffect(() => {
    if (connected) handleNavChange("Vaults");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // Show landing screen until wallet is connected.
  if (!connected) return (
    <>
      <style>{globalStyles}</style>
      <Landing />
    </>
  );

  const renderPage = () => {
    if (activeNav === "Portfolio")                           return <PortfolioPage />;
    if (activeNav === "Vaults" && activeTab === "Overview") return <VaultDetailPage />;
    if (activeNav === "Vaults")                             return <VaultsBrowserPage />;
    return <ComingSoon section={activeNav} />;
  };

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ minHeight: "100vh", background: colors.surface }}>
        <Sidebar activeNav={activeNav} onNavChange={handleNavChange} />
        <main style={{ marginLeft: 272, minHeight: "100vh" }}>
          <Header activeTab={activeTab} onTabChange={setActiveTab} />
          {renderPage()}
        </main>
        <AmbientGlow />
      </div>
    </>
  );
}
