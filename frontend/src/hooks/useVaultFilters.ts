import { useState, useMemo } from "react";
import type { RiskFilter, AssetFilter, SortOption, ViewMode, Vault } from "../types";
import { VAULTS } from "../data";

interface UseVaultFiltersReturn {
  riskFilter:    RiskFilter;
  assetFilter:   AssetFilter;
  sortBy:        SortOption;
  viewMode:      ViewMode;
  filteredVaults: Vault[];
  setRiskFilter:  (v: RiskFilter)  => void;
  setAssetFilter: (v: AssetFilter) => void;
  setSortBy:      (v: SortOption)  => void;
  setViewMode:    (v: ViewMode)    => void;
}

/**
 * Encapsulates all filter, sort, and view-toggle state for the
 * Vaults Browser page, and derives the filtered vault list.
 */
export function useVaultFilters(): UseVaultFiltersReturn {
  const [riskFilter,  setRiskFilter]  = useState<RiskFilter>("All Levels");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("All Assets");
  const [sortBy,      setSortBy]      = useState<SortOption>("Highest APY");
  const [viewMode,    setViewMode]    = useState<ViewMode>("Grid");

  const filteredVaults = useMemo<Vault[]>(() => {
    return VAULTS
      .filter((v) => {
        if (riskFilter === "All Levels") return true;
        const map: Record<RiskFilter, Vault["risk"] | null> = {
          "All Levels":  null,
          "High Risk":   "HIGH",
          "Medium Risk": "MEDIUM",
          "Low Risk":    "LOW",
        };
        return v.risk === map[riskFilter];
      })
      .sort((a, b) => {
        if (sortBy === "Highest APY") return b.apy - a.apy;
        if (sortBy === "Lowest APY")  return a.apy - b.apy;
        return 0;
      });
  }, [riskFilter, sortBy]);

  return {
    riskFilter, assetFilter, sortBy, viewMode,
    filteredVaults,
    setRiskFilter, setAssetFilter, setSortBy, setViewMode,
  };
}
