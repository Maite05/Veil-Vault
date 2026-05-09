import React, { useState } from "react";
import { colors, fontFamily, globalStyles } from "./src/constants/theme";
import { Sidebar, Header, MobileNav } from "./src/components/layout";
import { MaterialIcon } from "./src/components/ui";
import { PortfolioPage, VaultsBrowserPage, VaultDetailPage, LandingPage, StrategyPage, SecurityPage, VaultHistoryPage, SettingsPage } from "./src/pages";
import { useNavigation, useIsMobile } from "./src/hooks";
import type { NavItem, ActiveTab } from "./src/types";

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

// ─── Mobile tab strip (Overview / Yields / History) ──────────────────────────

const TABS: ActiveTab[] = ["Overview", "Yields", "History"];

const MobileTabStrip: React.FC<{ activeTab: ActiveTab; onTabChange: (t: ActiveTab) => void }> = ({ activeTab, onTabChange }) => (
  <div style={{
    position:       "sticky",
    top:            64,
    zIndex:         39,
    display:        "flex",
    background:     `${colors.surface}f0`,
    backdropFilter: "blur(12px)",
    padding:        "0 16px",
    gap:            4,
  }}>
    {TABS.map(tab => (
      <button
        key={tab}
        type="button"
        onClick={() => onTabChange(tab)}
        style={{
          flex:          1,
          padding:       "12px 0",
          background:    "transparent",
          border:        "none",
          borderBottom:  activeTab === tab ? `2px solid ${colors.primary}` : "2px solid transparent",
          color:         activeTab === tab ? colors.primary : colors.outline,
          fontSize:      13,
          fontWeight:    activeTab === tab ? 700 : 400,
          fontFamily:    fontFamily.headline,
          cursor:        "pointer",
          transition:    "all 0.2s",
        }}
      >
        {tab}
      </button>
    ))}
  </div>
);

// ─── Root app ─────────────────────────────────────────────────────────────────

export default function App() {
  const [showLanding,  setShowLanding]  = useState(true);
  const [searchQuery,  setSearchQuery]  = useState("");
  const { activeNav, activeTab, setActiveTab, handleNavChange } = useNavigation();
  const isMobile = useIsMobile();

  const goHome = () => setShowLanding(true);

  if (showLanding) {
    return (
      <>
        <style>{globalStyles}</style>
        <LandingPage onLaunch={() => setShowLanding(false)} />
      </>
    );
  }

  const renderPage = () => {
    if (activeNav === "Portfolio")                            return <PortfolioPage />;
    if (activeNav === "Vaults" && activeTab === "Overview")  return <VaultDetailPage />;
    if (activeNav === "Vaults" && activeTab === "History")   return <VaultHistoryPage />;
    if (activeNav === "Vaults")                              return <VaultsBrowserPage onOpenVault={() => setActiveTab("Overview")} searchQuery={searchQuery} />;
    if (activeNav === "Strategy")                            return <StrategyPage />;
    if (activeNav === "Security")                            return <SecurityPage />;
    if (activeNav === "Settings")                            return <SettingsPage />;
    return <ComingSoon section={activeNav} />;
  };

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ minHeight: "100vh", background: colors.surface }}>
        {!isMobile && <Sidebar activeNav={activeNav} onNavChange={handleNavChange} onHome={goHome} />}
        <main style={{
          marginLeft:    isMobile ? 0 : 272,
          minHeight:     "100vh",
          paddingBottom: isMobile ? 72 : 0,
        }}>
          <Header
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onHome={goHome}
            searchQuery={searchQuery}
            onSearchChange={q => { setSearchQuery(q); if (activeNav !== "Vaults") handleNavChange("Vaults"); }}
          />
          {isMobile && activeNav === "Vaults" && (
            <MobileTabStrip activeTab={activeTab} onTabChange={setActiveTab} />
          )}
          {renderPage()}
        </main>
        {isMobile && <MobileNav activeNav={activeNav} onNavChange={handleNavChange} onHome={goHome} />}
        <AmbientGlow />
      </div>
    </>
  );
}
