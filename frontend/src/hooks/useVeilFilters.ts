import { useState, useMemo } from 'react';
import { VAULTS } from '../data';
import { RiskFilter, SortOption } from '../types';

export const useVaultFilters = () => {
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("All Levels");
  const [sortBy, setSortBy] = useState<SortOption>("Highest APY");

  const filteredVaults = useMemo(() => {
    return VAULTS.filter(v => {
      if (riskFilter === "All Levels") return true;
      return riskFilter.includes(v.risk);
    }).sort((a, b) => sortBy === "Highest APY" ? b.apy - a.apy : a.apy - b.apy);
  }, [riskFilter, sortBy]);

  return { filteredVaults, riskFilter, setRiskFilter, sortBy, setSortBy };
};