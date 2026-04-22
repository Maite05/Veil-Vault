import { useVaultFilters } from "../hooks/useVaultFilters";
import { VaultCard } from "../components/vault/VaultCard";
import { VaultFilterBar } from "../components/vault/VaultFilterBar";

export const VaultsBrowserPage = () => {
  const { filteredVaults, ...filterProps } = useVaultFilters();

  return (
    <div style={{ padding: "0 40px 40px 40px" }}>
      <VaultFilterBar {...filterProps} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {filteredVaults.map(vault => (
          <VaultCard key={vault.id} vault={vault} />
        ))}
      </div>
    </div>
  );
};