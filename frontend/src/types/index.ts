export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";
export type NavItem = "Portfolio" | "Vaults" | "Strategy" | "Security" | "Settings";
export type ActiveTab = "Overview" | "Yields" | "History";
export type ViewMode = "Grid" | "List";
export type SortOption = "Highest APY" | "Lowest APY" | "Highest TVL" | "Newest";
export type RiskFilter = "All Levels" | "High Risk" | "Medium Risk" | "Low Risk";
export type AssetFilter = "All Assets" | "ETH" | "USDC" | "WBTC" | "DAI";
export type TimeRange = "1W" | "1M" | "1Y";
export type DepositWithdraw = "Deposit" | "Withdraw";

export interface Asset { symbol: string; }

export interface RiskComponent {
  label: string;
  value: string;
  color: "primary" | "tertiary" | "error";
}

export interface Vault {
  id: string;
  name: string;
  subtitle: string;
  risk: RiskLevel;
  apy: number;
  apyLabel: string;
  tvl: string;
  assets: Asset[];
  icon: string;
  iconGradient: string;
  badge: string;
  badgeType: "confidential" | "limited";
  baseApy?: number;
  boost?: number;
  description?: string;
  riskComponents?: RiskComponent[];
  isWide?: boolean;
}