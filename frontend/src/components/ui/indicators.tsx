import { colors } from "../../constants/theme";

export const Badge = ({ text, type }: { text: string; type: "confidential" | "limited" }) => (
  <span style={{
    background: type === "confidential" ? `${colors.primary}18` : `${colors.tertiary}18`,
    color: type === "confidential" ? colors.primary : colors.tertiary,
    border: `1px solid ${type === "confidential" ? colors.primary : colors.tertiary}33`,
    fontSize: 9, fontWeight: 900, letterSpacing: "0.15em", padding: "3px 8px",
    borderRadius: 2, textTransform: "uppercase", backdropFilter: "blur(8px)"
  }}>
    {text}
  </span>
);

export const RiskDot = ({ level }: { level: "HIGH" | "MEDIUM" | "LOW" }) => {
  const color = level === "HIGH" ? colors.error : level === "MEDIUM" ? colors.tertiary : colors.success;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}80` }} />
      <span style={{ fontSize: 10, fontWeight: 600, color: color, letterSpacing: "0.05em" }}>{level}</span>
    </div>
  );
};