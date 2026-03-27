import { useState, useEffect } from "react";

export default function HamburgerMenu({
  open,
  onClose,
  currentPath,
  onNavigate,
  user,
  onLogout,
  theme,
  onThemeToggle,
  terminalMode,
}) {
  const [confirmTarget, setConfirmTarget] = useState(null); // 'global' | 'brasil' | null

  useEffect(() => {
    if (!open) { setConfirmTarget(null); return; }
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const isActive = (path) => currentPath === path || currentPath?.startsWith(path + '/');

  const SectionLabel = ({ children }) => (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1.5px", marginBottom: 10 }}>
      {children}
    </div>
  );

  const Divider = () => <div style={{ height: 1, background: "var(--c-border)", margin: "4px 18px" }} />;

  const NavItem = ({ icon, label, path, accent }) => {
    const active = isActive(path);
    const color = accent || "#00E676";
    return (
      <button
        onClick={() => onNavigate(path)}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: active ? 700 : 400,
          color: active ? color : "var(--c-text-2)",
          background: active ? (color + "0F") : "transparent",
          border: "none", borderLeft: `2px solid ${active ? color : "transparent"}`,
          padding: "8px 12px", cursor: "pointer", transition: "all 0.15s ease",
          borderRadius: "0 6px 6px 0", marginBottom: 2,
        }}
      >
        <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{icon}</span>{label}
      </button>
    );
  };

  const dashboardPath = terminalMode === "brasil" ? "/app/brasil" : "/app/global";

  // ── Confirmation overlay ──────────────────────────────────────────────────
  const ConfirmDialog = () => {
    if (!confirmTarget) return null;
    const isBrasil = confirmTarget === "brasil";
    const accent = isBrasil ? "#F9C300" : "#00E676";
    const targetPath = isBrasil ? "/app/brasil" : "/app/global";
    return (
      <div style={{
        position: "absolute", inset: 0, zIndex: 10,
        background: "var(--c-panel)", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "0 24px",
      }}>
        <div style={{
          width: "100%", maxWidth: 240, padding: "28px 20px",
          border: `1px solid ${accent}40`, borderRadius: 10,
          background: accent + "08", textAlign: "center",
        }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>{isBrasil ? "🇧🇷" : "🌐"}</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
            color: "var(--c-text)", letterSpacing: "0.5px", marginBottom: 8,
          }}>
            Switch to {isBrasil ? "Brasil" : "Global"} Terminal?
          </div>
          <div style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--c-text-2)",
            lineHeight: 1.6, marginBottom: 20,
          }}>
            This will navigate to the {isBrasil ? "Brazilian" : "global"} market view.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={() => setConfirmTarget(null)}
              style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
                color: "var(--c-text-2)", background: "transparent",
                border: "1px solid var(--c-border)", borderRadius: 6,
                padding: "8px 18px", cursor: "pointer", letterSpacing: "0.5px",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => { onNavigate(targetPath); setConfirmTarget(null); }}
              style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
                color: "#080f1a", background: accent,
                border: "none", borderRadius: 6,
                padding: "8px 18px", cursor: "pointer", letterSpacing: "0.5px",
              }}
            >
              Switch →
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--c-overlay)", zIndex: 200 }} />}

      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 280,
        background: "var(--c-panel)", borderRight: "1px solid var(--c-border)",
        zIndex: 201, overflowY: "auto", display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 18px 16px", borderBottom: "1px solid var(--c-border)", flexShrink: 0 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "#00E676", letterSpacing: "1.5px" }}>MENU</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--c-text-2)", fontSize: 18, lineHeight: 1, padding: "2px 6px" }}>✕</button>
        </div>

        {/* Confirmation dialog overlay */}
        <ConfirmDialog />

        {/* Section 1 — Mode Switch */}
        <div style={{ padding: "16px 18px" }}>
          <SectionLabel>TERMINAL</SectionLabel>
          {[
            { key: "global", label: "Global Terminal", icon: "🌐", accent: "#00E676", path: "/app/global" },
            { key: "brasil", label: "Brasil Terminal", icon: "🇧🇷", accent: "#F9C300", path: "/app/brasil" },
          ].map(mode => {
            const active = terminalMode === mode.key;
            return (
              <button
                key={mode.key}
                onClick={() => { if (!active) setConfirmTarget(mode.key); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  height: 40, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700,
                  color: active ? "#080f1a" : "var(--c-text-2)",
                  background: active ? mode.accent : "transparent",
                  border: active ? "none" : "1px solid var(--c-border)",
                  borderRadius: 8, padding: "0 14px", cursor: active ? "default" : "pointer",
                  transition: "all 0.2s ease", marginBottom: 6,
                  letterSpacing: "0.3px",
                }}
              >
                <span style={{ fontSize: 16 }}>{mode.icon}</span>
                {mode.label}
                {active && <span style={{ marginLeft: "auto", fontSize: 9, opacity: 0.6 }}>ACTIVE</span>}
              </button>
            );
          })}
        </div>

        <Divider />

        {/* Section 2 — Terminal Pages */}
        <div style={{ padding: "16px 18px" }}>
          <SectionLabel>PAGES</SectionLabel>
          <NavItem icon="📊" label="Dashboard" path={dashboardPath} />
          <NavItem icon="🔥" label="Heatmap" path="/app/heatmap" />
          <NavItem icon="📋" label="Catalog" path="/app/catalog" />
          <NavItem icon="📰" label="News" path="/app/news" />
          <NavItem icon="★"  label="Watchlist" path="/app/watchlist" />
        </div>

        <Divider />

        {/* Section 3 — Markets */}
        <div style={{ padding: "16px 18px" }}>
          <SectionLabel>MARKETS</SectionLabel>
          <NavItem icon="📊" label="Chart & Research" path="/markets/research" accent="#3b82f6" />
          <NavItem icon="📐" label="Fundamentals" path="/markets/fundamentals" accent="#3b82f6" />
          <NavItem icon="🌍" label="Macro Hub" path="/markets/macro" accent="#3b82f6" />
          <NavItem icon="⚡" label="Signals" path="/markets/signals" accent="#3b82f6" />
        </div>

        <Divider />

        {/* Section 4 — Clube */}
        <div style={{ padding: "16px 18px" }}>
          <SectionLabel>CLUBE</SectionLabel>
          <NavItem icon="💼" label="Dashboard" path="/clube" accent="#8b5cf6" />
          <NavItem icon="📄" label="Report" path="/clube/report" accent="#8b5cf6" />
        </div>

        {/* Section 5 — Admin (conditional) */}
        {user?.role === "admin" && (
          <>
            <Divider />
            <div style={{ padding: "16px 18px" }}>
              <SectionLabel>ADMIN</SectionLabel>
              <NavItem icon="⚙" label="Taxonomy" path="/admin" accent="#f59e0b" />
            </div>
          </>
        )}

        <Divider />

        {/* Section 6 — Appearance */}
        <div style={{ padding: "16px 18px" }}>
          <SectionLabel>APPEARANCE</SectionLabel>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--c-text-2)" }}>
              {theme === "dark" ? "🌙 Dark mode" : "☀️ Light mode"}
            </span>
            <button onClick={onThemeToggle}
              style={{
                width: 44, height: 24, borderRadius: 12, position: "relative", padding: 0, cursor: "pointer",
                background: theme === "dark" ? "rgba(0,230,118,0.2)" : "rgba(99,102,241,0.2)",
                border: `1px solid ${theme === "dark" ? "#00E67640" : "rgba(99,102,241,0.4)"}`,
                transition: "all 0.25s ease",
              }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%", position: "absolute", top: 3,
                left: theme === "dark" ? 23 : 3,
                background: theme === "dark" ? "#00E676" : "#6366f1",
                transition: "left 0.25s ease",
              }} />
            </button>
          </div>
        </div>

        <Divider />

        {/* Account */}
        <div style={{ padding: "16px 18px 24px", marginTop: "auto" }}>
          {user && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>
                {user.name || user.email}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--c-text-3)", marginTop: 2 }}>
                {user.role?.toUpperCase() || "USER"}
              </div>
            </div>
          )}
          <button
            onClick={() => onNavigate("/app/settings")}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--c-text-2)",
              background: "transparent", border: "none", padding: "8px 0", cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 14 }}>⚙</span> Settings
          </button>
          <button
            onClick={onLogout}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FF5252",
              background: "transparent", border: "none", padding: "8px 0", cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 14 }}>↪</span> Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
