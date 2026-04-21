function PortfolioPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("1M");

  // Simple sparkline path
  const sparklinePoints = [
    { x: 0, y: 70 },
    { x: 60, y: 60 },
    { x: 120, y: 65 },
    { x: 180, y: 40 },
    { x: 240, y: 55 },
    { x: 300, y: 30 },
    { x: 360, y: 35 },
  ];

  const pathD = sparklinePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <section style={{ padding: "32px", maxWidth: 1200, margin: "0 auto" }}>
      {/* FHE Banner */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: `${colors.primary}14`,
          border: `1px solid ${colors.primary}28`,
          borderRadius: 6,
          padding: "6px 14px",
          marginBottom: 20,
        }}
      >
        <MaterialIcon name="lock" size={14} style={{ color: colors.primary }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: colors.primary, textTransform: "uppercase" }}>
          Fully Homomorphic Encryption Active
        </span>
      </div>

      {/* Title Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h2
            style={{
              fontFamily: "Manrope, sans-serif",
              fontSize: 44,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#fff",
              marginBottom: 8,
            }}
          >
            Curated Portfolio
          </h2>
          <p style={{ color: colors.onSurfaceVariant, fontSize: 15 }}>
            Total assets protected by multi-party computation protocols.
          </p>
        </div>
        <div
          style={{
            background: colors.surfaceContainerHigh,
            borderRadius: 12,
            padding: "14px 22px",
            textAlign: "right",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>
            24H Change
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#4ade80", fontFamily: "Manrope, sans-serif" }}>
            ↑ +4.28%
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, marginBottom: 20 }}>
        {/* TVL Card */}
        <div
          style={{
            background: colors.surfaceContainerLow,
            borderRadius: 16,
            padding: 28,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.15em" }}>
              Total Value Locked
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                background: `${colors.secondary}20`,
                color: colors.secondary,
                padding: "3px 8px",
                borderRadius: 2,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Global Aggregate
            </span>
          </div>
          <div
            style={{
              fontFamily: "Manrope, sans-serif",
              fontSize: 52,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-0.04em",
              lineHeight: 1,
              marginBottom: 24,
            }}
          >
            $14,290,042
            <span style={{ color: colors.onSurfaceVariant, fontSize: 36 }}>.80</span>
          </div>

          {/* Mini Bar Chart */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 60 }}>
            {[40, 55, 45, 60, 50, 70, 65, 75, 80, 90].map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  borderRadius: 3,
                  background:
                    i === 9
                      ? `linear-gradient(180deg, ${colors.primary}, ${colors.primaryContainer})`
                      : colors.surfaceContainerHighest,
                  transition: "height 0.3s ease",
                }}
              />
            ))}
          </div>
        </div>

        {/* Net Worth Card */}
        <div
          style={{
            background: `linear-gradient(145deg, ${colors.primaryContainer}aa, ${colors.secondaryContainer}88)`,
            borderRadius: 16,
            padding: 24,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: `${colors.primaryFixed}99`,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              display: "block",
              marginBottom: 8,
            }}
          >
            Net Worth
          </span>
          <div
            style={{
              fontFamily: "Manrope, sans-serif",
              fontSize: 34,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-0.03em",
              marginBottom: 6,
            }}
          >
            $842,104.10
          </div>
          <p style={{ fontSize: 12, color: `${colors.primaryFixed}80`, marginBottom: 20 }}>
            Available across 4 segregated vaults
          </p>

          {[
            { name: "ETH Delta Strategy", value: "$428k", pct: 65 },
            { name: "USDC Stabilizer", value: "$312k", pct: 45 },
          ].map((item) => (
            <div key={item.name} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: colors.primaryFixed }}>{item.name}</span>
                <span style={{ color: "#fff", fontWeight: 600 }}>{item.value}</span>
              </div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.15)", borderRadius: 2 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${item.pct}%`,
                    borderRadius: 2,
                    background: "rgba(255,255,255,0.6)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security + Yield Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20, marginBottom: 20 }}>
        {/* Security Pulse */}
        <div
          style={{
            background: colors.surfaceContainerLow,
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `${colors.primary}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="security" size={18} style={{ color: colors.primary }} />
            </div>
            <span style={{ fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>
              Security Pulse
            </span>
          </div>

          {securityItems.map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                paddingLeft: 16,
                borderLeft: `2px solid ${colors.primaryContainer}`,
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                {item.label}
              </span>
              <span style={{ fontSize: 13, color: colors.onSurface }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Yield Performance */}
        <div
          style={{
            background: colors.surfaceContainerLow,
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <span style={{ fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>
              Yield Performance
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              {(["1W", "1M", "1Y"] as TimeRange[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeRange(t)}
                  style={{
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    background: timeRange === t ? colors.surfaceContainerHighest : "transparent",
                    color: timeRange === t ? "#fff" : "#64748b",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontFamily: "Manrope, sans-serif",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div style={{ position: "relative" }}>
            <svg width="100%" height="120" viewBox="0 0 360 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={colors.primary} stopOpacity="0.6" />
                  <stop offset="100%" stopColor={colors.primaryContainer} stopOpacity="1" />
                </linearGradient>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.primary} stopOpacity="0.15" />
                  <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={`M 0 80 L 60 65 L 120 70 L 180 35 L 240 50 L 300 20 L 360 30 L 360 100 L 0 100 Z`}
                fill="url(#areaGrad)"
              />
              <path
                d={`M 0 80 L 60 65 L 120 70 L 180 35 L 240 50 L 300 20 L 360 30`}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Peak label */}
              <rect x="250" y="6" width="80" height="20" rx="4" fill={`${colors.surfaceContainerHighest}cc`} />
              <text x="290" y="20" fill={colors.onSurfaceVariant} fontSize="9" textAnchor="middle" fontFamily="Inter">
                Peak APY: 18.4%
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* Active Positions */}
      <div
        style={{
          background: colors.surfaceContainerLow,
          borderRadius: 16,
          padding: 28,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h3 style={{ fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 22, color: "#fff", marginBottom: 6 }}>
              Active Positions
            </h3>
            <p style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
              Manage your deployed capital across specialized cryptographic vaults.
            </p>
          </div>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              color: colors.primary,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "Manrope, sans-serif",
            }}
          >
            View Strategy Explorer <MaterialIcon name="arrow_forward" size={16} />
          </button>
        </div>

        {/* Table Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr 80px 40px",
            gap: 16,
            padding: "0 12px",
            marginBottom: 12,
          }}
        >
          {["Vault Name", "Net Value", "All-Time Yield", "APY", "Privacy Level", ""].map((h) => (
            <span key={h} style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              {h}
            </span>
          ))}
        </div>

        {portfolioPositions.map((pos, i) => (
          <div
            key={pos.id}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr 80px 40px",
              gap: 16,
              alignItems: "center",
              padding: "14px 12px",
              borderRadius: 10,
              background: i % 2 === 0 ? "transparent" : `${colors.surfaceContainerHighest}30`,
              marginBottom: 4,
              transition: "background 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${colors.primaryContainer}50, ${colors.secondaryContainer}50)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcon name={pos.icon} size={18} style={{ color: colors.primary }} />
              </div>
              <div>
                <div style={{ fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 14, color: "#fff" }}>
                  {pos.name}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{pos.subtitle}</div>
              </div>
            </div>
            <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: "#fff" }}>
              {pos.netValue}
            </span>
            <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: "#4ade80" }}>
              {pos.allTimeYield}
            </span>
            <APYBadge value={pos.apy} />
            <PrivacyBars count={pos.privacyBars} />
            <button
              style={{
                background: "transparent",
                border: "none",
                color: "#475569",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <MaterialIcon name="more_vert" size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* Bottom Info Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {[
          {
            icon: "history",
            title: "Recent Security Event",
            content: "FHE key shard rotation completed successfully 4 hours ago. All vault operations remained online during the process.",
          },
          {
            icon: "auto_awesome",
            title: "Strategy Suggestion",
            content: "Based on your risk profile, diversifying 15% of Stable Shield into the new 'Solana Sentinel' vault could increase projected monthly yield by 2.4%.",
          },
          {
            icon: "hub",
            title: "Network Status",
            content: "Global node latency currently at 14ms across primary regions.",
            badge: "OPERATIONAL",
          },
        ].map((card) => (
          <div
            key={card.title}
            style={{
              background: colors.surfaceContainerLow,
              borderRadius: 16,
              padding: 22,
            }}
          >
            <MaterialIcon name={card.icon} size={20} style={{ color: colors.onSurfaceVariant, marginBottom: 12 }} />
            <h4
              style={{
                fontFamily: "Manrope, sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: "#fff",
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {card.title}
              {card.badge && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    background: "#4ade8020",
                    color: "#4ade80",
                    padding: "2px 8px",
                    borderRadius: 2,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {card.badge}
                </span>
              )}
            </h4>
            <p style={{ color: colors.onSurfaceVariant, fontSize: 12, lineHeight: 1.65 }}>
              {card.content}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
