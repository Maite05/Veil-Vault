



export default function App() {
    const [activeNav, setActiveNav] = useState<NavItem>("Vaults");
    const [activeTab, setActiveTab] = useState<ActiveTab>("Yields");

    const handleNavChange = (nav: NavItem) => {
        setActiveNav(nav);
        if (nav === "Portfolio") setActiveTab("Overview");
        if(nav === "Vaults") setActiveTab ("Yeilds");
    };

    const renderContent = () => {
        if (activeNav === "Portfolio") return <PortfolioPage />;
        if (activeNav === "Vaults" && activeTab === "Overview") return <VaultDetailPage />;
        if (activeNav === "Vaults")return <VaultBrowsePage />;
        return (
          <div style={{ padding: 80, textAlign: "center", color: colors.outline, fontFamily: "Manrope, sans-serif" }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>
              <MaterialIcon name="construction" size={64} />
            </div>
            <p style={{ fontSize: 18, fontWeight: 600 }}>{activeNav} — Coming Soon</p>
           </div>
        );
  };

    return (
       <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@200;400;500;700;800;900&family=Inter:wght@300;400;600&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
          background: ${colors.surface};
          color: ${colors.onSurface};
          font-family: 'Inter', sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        
        ::-webkit-scrollbar { display: none; }
        
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-smoothing: antialiased;
          vertical-align: middle;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        button:hover { opacity: 0.9; }
        
        select option {
          background: ${colors.surfaceContainerHigh};
          color: ${colors.onSurface};
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: colors.surface }}>
        <Sidebar activeNav={activeNav} onNavChange={handleNavChange} />

        <main style={{ marginLeft: 272, minHeight: "100vh" }}>
          <Header activeTab={activeTab} onTabChange={setActiveTab} />
          {renderContent()}
        </main>

        {/* Background decoration */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            right: 0,
            width: "35%",
            height: "50%",
            opacity: 0.04,
            pointerEvents: "none",
            zIndex: -1,
            background: `radial-gradient(ellipse at bottom right, ${colors.primary}, transparent 70%)`,
          }}
        />
      </div>
    </>
  );
    } 






}