import React from "react";
import { colors, globalStyles } from "./constants/theme";
import { Sidebar, Header } from "./components/layout";
import { MaterialIcon } from "./components/ui";
import { PortfolioPage, VaultsBrowserPage, VaultDetailPage } from "./pages";
import { useNavigation } from "./hooks";
import type { NavItem } from "./types";

// ─── Placeholder for sections not yet built ───────────────────────────────────

interface ComingSoonProps { section: NavItem }

const ComingSoon: React.FC<ComingSoonProps> = ({ section }) => (
  <div
    style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: "60vh", gap: 16,
      color: colors.outline, fontFamily: "'Manrope', sans-serif",
    }}
  >
    <MaterialIcon name="construction" size={64} style={{ opacity: 0.25 }} />
    <p style={{ fontSize: 18, fontWeight: 600 }}>{section} — Coming Soon</p>
  </div>
);

// ─── Background ambient glow ──────────────────────────────────────────────────

const AmbientGlow: React.FC = () => (
  <div
    style={{
      position: "fixed", bottom: 0, right: 0,
      width: "35%", height: "50%",
      opacity: 0.04, pointerEvents: "none", zIndex: -1,
      background: `radial-gradient(ellipse at bottom right, ${colors.primary}, transparent 70%)`,
    }}
  />
);

// ─── Root app ─────────────────────────────────────────────────────────────────

export default function App() {
  const { activeNav, activeTab, setActiveTab, handleNavChange } = useNavigation();

  const renderPage = () => {
    if (activeNav === "Portfolio")                            return <PortfolioPage />;
    if (activeNav === "Vaults" && activeTab === "Overview")  return <VaultDetailPage />;
    if (activeNav === "Vaults")                              return <VaultsBrowserPage />;
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
