import { colors } from "../../constants/theme";
import { NavItem } from "../../types";
import { MaterialIcon } from "../ui/MaterialIcon";

export const Sidebar = ({ activeNav, onNavChange }: { activeNav: NavItem; onNavChange: (n: NavItem) => void }) => {
  const menuItems: { name: NavItem; icon: string }[] = [
    { name: "Portfolio", icon: "grid_view" },
    { name: "Vaults", icon: "account_balance_wallet" },
    { name: "Strategy", icon: "Insights" },
    { name: "Security", icon: "verified_user" },
    { name: "Settings", icon: "settings" },
  ];

  return (
    <aside style={{
      width: 272, height: "100vh", position: "fixed", left: 0, top: 0,
      background: colors.surface, borderRight: `1px solid ${colors.outline}`,
      padding: "32px 24px", zIndex: 100
    }}>
      {/* Logo and Nav Mapping from original VeilVault */}
      {menuItems.map((item) => (
        <div key={item.name} onClick={() => onNavChange(item.name)} style={{
          padding: "12px 16px", cursor: "pointer", borderRadius: 12,
          color: activeNav === item.name ? colors.primary : colors.onSurfaceVariant,
          background: activeNav === item.name ? `${colors.primary}10` : "transparent"
        }}>
           <MaterialIcon name={item.icon} />
           <span style={{ marginLeft: 12 }}>{item.name}</span>
        </div>
      ))}
    </aside>
  );
};