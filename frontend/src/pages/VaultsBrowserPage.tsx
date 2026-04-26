import React from "react";
import { colors, fontFamily } from "../constants/theme";
import { VaultCard, VaultFilterBar } from "../components/vault";
import { useVaultFilters } from "../hooks/useVaultFilters";

export const VaultsBrowserPage: React.FC = () => {
  const {
    riskFilter, assetFilter, sortBy, viewMode, filteredVaults,
    setRiskFilter, setAssetFilter, setSortBy, setViewMode,
  } = useVaultFilters();

  return (
    <section style={{ padding: "32px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Hero */}
      <div style={{ marginBottom: 40 }}>
        <h2
          style={{
            fontFamily:    fontFamily.headline,
            fontSize:      48,
            fontWeight:    800,
            letterSpacing: "-0.03em",
            color:         "#fff",
            marginBottom:  12,
          }}
        >
          Vaults Browser
        </h2>
        <p style={{ color: colors.onSurfaceVariant, fontSize: 17, lineHeight: 1.65, fontWeight: 300, maxWidth: 600 }}>
          Access institutional-grade yield strategies protected by Fully Homomorphic
          Encryption. Secure your assets in non-custodial, high-performance vaults.
        </p>
      </div>

      {/* Filters */}
      <VaultFilterBar
        riskFilter={riskFilter}
        assetFilter={assetFilter}
        sortBy={sortBy}
        viewMode={viewMode}
        onRiskChange={setRiskFilter}
        onAssetChange={setAssetFilter}
        onSortChange={setSortBy}
        onViewChange={setViewMode}
      />

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {filteredVaults.map((vault) => (
          <VaultCard key={vault.id} vault={vault} />
        ))}
      </div>
    </section>
  );
};
