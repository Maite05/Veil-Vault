function VaultDetailPage() {
  const [activeAction, setActiveAction] = useState<DepositWithdraw>("Deposit");
  const [amount, setAmount] = useState("0.00");
  const [activeChartTab, setActiveChartTab] = useState("APY Performance");

  const chartPath = "M 30 140 C 80 130 130 100 180 60 C 230 20 280 30 330 50 C 380 65 420 80 460 70";
  const areaPath = "M 30 140 C 80 130 130 100 180 60 C 230 20 280 30 330 50 C 380 65 420 80 460 70 L 460 160 L 30 160 Z";

  return (
    <section style={{ padding: "32px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", cursor: "pointer" }}>
          Vaults
        </span>
        <MaterialIcon name="chevron_right" size={14} style={{ color: "#475569" }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: colors.primary, textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Arbitrum Alpha-Delta Neutral
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
        {/* Left Column */}
        <div>
          {/* Title */}
          <div style={{ marginBottom: 24 }}>
            <h2
              style={{
                fontFamily: "Manrope, sans-serif",
                fontSize: 44,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#fff",
                marginBottom: 12,
                lineHeight: 1.1,
              }}
            >
              Alpha-Delta Neutral
            </h2>
            <p style={{ color: colors.onSurfaceVariant, fontSize: 14, marginBottom: 20 }}>
              Hedged yield farming across GMX and Uniswap V3 liquidity pools.
            </p>
            <div style={{ display: "flex", gap: 32 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                  Net APY
                </span>
                <div
                  style={{
                    fontFamily: "Manrope, sans-serif",
                    fontSize: 38,
                    fontWeight: 900,
                    color: colors.tertiary,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.1,
                  }}
                >
                  24.82%
                </div>
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                  Total Value Locked
                </span>
                <div
                  style={{
                    fontFamily: "Manrope, sans-serif",
                    fontSize: 38,
                    fontWeight: 900,
                    color: "#fff",
                    letterSpacing: "-0.03em",
                    lineHeight: 1.1,
                  }}
                >
                  $4.2M
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div
            style={{
              background: colors.surfaceContainerLow,
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {["APY Performance", "TVL Growth"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveChartTab(t)}
                    style={{
                      padding: "7px 14px",
                      fontSize: 12,
                      fontWeight: 700,
                      background: activeChartTab === t
                        ? `linear-gradient(135deg, ${colors.primary}40, ${colors.primaryContainer}40)`
                        : "transparent",
                      color: activeChartTab === t ? colors.primary : "#64748b",
                      border: activeChartTab === t ? `1px solid ${colors.primary}30` : "1px solid transparent",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontFamily: "Manrope, sans-serif",
                      transition: "all 0.2s",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <MaterialIcon name="calendar_today" size={18} style={{ color: "#475569", cursor: "pointer" }} />
                <MaterialIcon name="download" size={18} style={{ color: "#475569", cursor: "pointer" }} />
              </div>
            </div>

            <svg width="100%" height="180" viewBox="0 30 490 160" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={colors.primary} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={colors.tertiary} stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.primary} stopOpacity="0.12" />
                  <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#chartArea)" />
              <path d={chartPath} fill="none" stroke="url(#chartGrad)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              {["JAN 01", "FEB 15", "MAR 30", "MAY 15", "JUN 30", "AUG 15"].map((d) => (
                <span key={d} style={{ fontSize: 9, color: "#475569", fontFamily: "Inter" }}>{d}</span>
              ))}
            </div>
          </div>

          {/* Investment Strategy + FHE/MPC */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div
              style={{
                background: colors.surfaceContainerLow,
                borderRadius: 16,
                padding: 22,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: `${colors.primary}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcon name="target" size={16} style={{ color: colors.primary }} />
                </div>
                <span style={{ fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 15, color: "#fff" }}>
                  Investment Strategy
                </span>
              </div>
              <p style={{ color: colors.onSurfaceVariant, fontSize: 12, lineHeight: 1.7, marginBottom: 16 }}>
                This vault utilizes a Fully Homomorphic Encryption (FHE) layer to execute trades on decentralized exchanges without revealing execution logic to front-running bots.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Risk Profile", value: "Low-Medium" },
                  { label: "Rebalance Frequency", value: "Every 12 Hours" },
                  { label: "Asset Exposure", value: "ETH, USDC" },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "#64748b" }}>{item.label}</span>
                    <span style={{ color: colors.primary, fontWeight: 600 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { icon: "lock", title: "FHE Processing", subtitle: "Active & Verified", badge: "LIVE", badgeColor: "#4ade80" },
                { icon: "group", title: "MPC Custody", subtitle: "2-of-3 Threshold", badge: "SECURE", badgeColor: colors.primary },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    background: colors.surfaceContainerLow,
                    borderRadius: 16,
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flex: 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: `${colors.primaryContainer}30`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcon name={item.icon} size={18} style={{ color: colors.primary }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", fontFamily: "Manrope, sans-serif" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      background: `${item.badgeColor}20`,
                      color: item.badgeColor,
                      padding: "4px 10px",
                      borderRadius: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {item.badge}
                  </span>
                </div>
              ))}

              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 0",
                  background: "transparent",
                  border: `1px solid ${colors.outlineVariant}60`,
                  borderRadius: 12,
                  color: colors.onSurfaceVariant,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  cursor: "pointer",
                  fontFamily: "Manrope, sans-serif",
                  transition: "all 0.2s",
                }}
              >
                <MaterialIcon name="security" size={14} />
                View Audit Reports
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Deposit/Withdraw Panel */}
          <div
            style={{
              background: colors.surfaceContainerLow,
              borderRadius: 16,
              padding: 20,
            }}
          >
            {/* Tabs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                background: colors.surfaceContainerHighest,
                borderRadius: 10,
                padding: 4,
                marginBottom: 20,
              }}
            >
              {(["Deposit", "Withdraw"] as DepositWithdraw[]).map((action) => (
                <button
                  key={action}
                  onClick={() => setActiveAction(action)}
                  style={{
                    padding: "9px 0",
                    fontSize: 13,
                    fontWeight: 700,
                    background: activeAction === action ? "#fff" : "transparent",
                    color: activeAction === action ? colors.surface : "#64748b",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontFamily: "Manrope, sans-serif",
                    transition: "all 0.2s",
                  }}
                >
                  {action}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Amount
                </span>
                <span style={{ fontSize: 11, color: "#64748b" }}>Balance: 12.45 USDC</span>
              </div>
              <div
                style={{
                  background: colors.surfaceContainerHighest,
                  borderRadius: 10,
                  padding: "14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#fff",
                    fontSize: 22,
                    fontWeight: 300,
                    fontFamily: "Manrope, sans-serif",
                    outline: "none",
                    width: "60%",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: colors.surfaceContainer,
                    padding: "6px 12px",
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, #2775CA, #2775CA)`,
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>USDC</span>
                </div>
              </div>
            </div>

            {/* Quick amounts */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
              {["25%", "50%", "75%", "MAX"].map((pct) => (
                <button
                  key={pct}
                  style={{
                    padding: "7px 0",
                    fontSize: 11,
                    fontWeight: 700,
                    background: pct === "MAX" ? colors.surfaceContainerHighest : "transparent",
                    color: pct === "MAX" ? "#fff" : "#64748b",
                    border: `1px solid ${colors.outlineVariant}40`,
                    borderRadius: 6,
                    cursor: "pointer",
                    fontFamily: "Manrope, sans-serif",
                    transition: "all 0.2s",
                  }}
                >
                  {pct}
                </button>
              ))}
            </div>

            {/* Vault Capacity */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: "#64748b" }}>Vault Capacity</span>
                <span style={{ color: "#fff", fontWeight: 600 }}>84% Full</span>
              </div>
              <div style={{ height: 4, background: colors.surfaceContainerHighest, borderRadius: 2 }}>
                <div
                  style={{
                    height: "100%",
                    width: "84%",
                    borderRadius: 2,
                    background: `linear-gradient(90deg, ${colors.primary}, ${colors.primaryContainer})`,
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 20 }}>
              <span style={{ color: "#64748b", textTransform: "uppercase", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em" }}>
                Gas Fee
              </span>
              <span style={{ color: colors.onSurfaceVariant }}>~$1.42</span>
            </div>

            {/* CTA */}
            <button
              style={{
                width: "100%",
                padding: "14px 0",
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryContainer})`,
                color: colors.onPrimary,
                fontWeight: 700,
                fontSize: 15,
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "Manrope, sans-serif",
                marginBottom: 12,
              }}
            >
              Confirm {activeAction}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
              <MaterialIcon name="lock" size={12} style={{ color: "#64748b" }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                End-to-End Cryptographic Security
              </span>
            </div>
          </div>

          {/* Recent Activity */}
          <div
            style={{
              background: colors.surfaceContainerLow,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <MaterialIcon name="history" size={18} style={{ color: colors.onSurfaceVariant }} />
              <span style={{ fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 15, color: "#fff" }}>
                Recent Activity
              </span>
            </div>

            {recentActivity.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr auto",
                  gap: 8,
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: i < recentActivity.length - 1 ? `1px solid ${colors.outlineVariant}20` : "none",
                }}
              >
                <span style={{ fontSize: 13, color: colors.onSurfaceVariant }}>{item.type}</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: item.type === "Yield Claim" ? "#4ade80" : "#fff",
                    fontFamily: "monospace",
                  }}
                >
                  {item.amount}
                </span>
                <span style={{ fontSize: 11, color: "#475569" }}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 40,
          textAlign: "center",
          color: "#334155",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        Veil Vault V2.4.0-Stable • Powered by ZK-Proofs & MPC • Audit Hash: 0xa7...f2e
      </div>
    </section>
  );
}