import { useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { VaultsBrowserPage } from "./pages/VaultsBrowserPage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { globalStyles, colors } from "./constants/theme";
import { NavItem } from "./types";

export default function App() {
  const [activeNav, setActiveNav] = useState<NavItem>("Vaults");

  return (
    <div style={{ minHeight: "100vh", background: colors.surface }}>
      <style>{globalStyles}</style>
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />
      
      <main style={{ marginLeft: 272 }}>
        <Header />
        {activeNav === "Vaults" ? <VaultsBrowserPage /> : <PortfolioPage />}
      </main>
    </div>
  );
}