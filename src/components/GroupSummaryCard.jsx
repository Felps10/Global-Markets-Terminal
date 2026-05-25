/**
 * GroupSummaryCard.jsx — Collapsed group overview card for the Global Markets Terminal.
 *
 * Two layout modes:
 *   "grid" — compact card for the all-collapsed grid view
 *   "row"  — full-width bar for individual collapsed groups
 *
 * Extracted from GlobalMarketsTerminal.jsx — previously an inline component
 * that closed over parent state (getGroupSymbols, marketData, assets).
 * Now receives these as explicit props.
 */

import { DENSITY_CONFIG } from './gmtConfig.js';

export default function GroupSummaryCard({
  catKey, cat, layout, onExpand, density = "compact",
  getGroupSymbols, marketData, assets,
}) {
  const syms = getGroupSymbols(catKey);
  const pcts = syms
    .map(s => marketData?.[s]?.changePct)
    .filter(n => typeof n === 'number' && !isNaN(n));
  const avg = pcts.length > 0 ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
  const totalMcap = syms.reduce((sum, s) => sum + (marketData?.[s]?.marketCap ?? 0), 0);
  const count = syms.length;

  const accentColor = avg > 0 ? "#00d4aa" : avg < 0 ? "#ff6b6b" : "#2a4a6a";
  const pctColor    = avg > 0 ? "#00d4aa" : avg < 0 ? "#ff6b6b" : "#3d6080";
  const pctLabel    = avg > 0 ? `▲ +${avg.toFixed(2)}%` : avg < 0 ? `▼ ${avg.toFixed(2)}%` : "— 0.00%";
  const barWidth    = Math.min(Math.abs(avg) / 5 * 100, 100);

  const fmtMcap = (mc) => {
    if (!mc) return "—";
    const p = assets[syms?.[0]]?.isB3 ? "R$ " : "$";
    if (mc >= 1e12) return p + (mc / 1e12).toFixed(2) + "T";
    if (mc >= 1e9)  return p + (mc / 1e9).toFixed(1) + "B";
    if (mc >= 1e6)  return p + (mc / 1e6).toFixed(1) + "M";
    return p + mc.toLocaleString();
  };

  const byAbs = [...syms]
    .filter(s => typeof marketData?.[s]?.changePct === 'number' && !isNaN(marketData[s].changePct))
    .sort((a, b) => Math.abs(marketData[b].changePct) - Math.abs(marketData[a].changePct));
  const topGainer = byAbs.find(s => marketData[s].changePct > 0) || null;
  const topLoser  = byAbs.find(s => marketData[s].changePct < 0) || null;

  const movers = (topGainer || topLoser) ? (
    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      {topGainer && (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, padding: "1px 4px", borderRadius: 1, background: "#0a2018", color: "#00d4aa", border: "0.5px solid #1d5c3a" }}>
          {assets[topGainer]?.display || topGainer} +{marketData[topGainer].changePct.toFixed(2)}%
        </span>
      )}
      {topLoser && (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, padding: "1px 4px", borderRadius: 1, background: "#1e0a0a", color: "#ff6b6b", border: "0.5px solid #5c1d1d" }}>
          {assets[topLoser]?.display || topLoser} {marketData[topLoser].changePct.toFixed(2)}%
        </span>
      )}
    </div>
  ) : null;

  const cardBase = {
    position: "relative", overflow: "hidden",
    background: "#0b1623", border: "0.5px solid #1a2f4a", borderRadius: 4,
    cursor: "pointer", transition: "border-color 120ms ease, background 120ms ease",
  };
  const onEnter = e => { e.currentTarget.style.borderColor = "#2a4a6a"; e.currentTarget.style.background = "#0d1929"; };
  const onLeave = e => { e.currentTarget.style.borderColor = "#1a2f4a"; e.currentTarget.style.background = "#0b1623"; };
  const accentBar = <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2.5, background: accentColor, borderRadius: "4px 0 0 4px" }} />;

  if (layout === "row") {
    return (
      <div onClick={onExpand} style={{ ...cardBase, display: "flex", alignItems: "center", gap: 16, padding: "12px 16px 14px 16px" }}
        onMouseEnter={onEnter} onMouseLeave={onLeave}>
        {accentBar}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "#1a2f4a" }}>
          <div style={{ height: 2, width: `${barWidth}%`, background: accentColor, borderRadius: 1 }} />
        </div>
        <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{cat.icon}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#c8d8e8", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {cat.label.toUpperCase()}
        </span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.08em", color: "#2a4a6a" }}>ASSETS</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#4a7fa5" }}>{count}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.08em", color: "#2a4a6a" }}>MKT CAP</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#4a7fa5" }}>{fmtMcap(totalMcap)}</span>
        </div>
        {movers && <div style={{ flexShrink: 0 }}>{movers}</div>}
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: pctColor, flexShrink: 0 }}>{pctLabel}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: "#1a3050", letterSpacing: "0.06em", flexShrink: 0 }}>EXPAND ▾</span>
      </div>
    );
  }

  const dc = DENSITY_CONFIG[density] || DENSITY_CONFIG.compact;
  return (
    <div className="gmt-group-card" onClick={onExpand} style={{ ...cardBase, padding: dc.cardPadding, transition: "all 0.2s ease, border-color 120ms ease, background 120ms ease" }}
      onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {accentBar}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: dc.iconSize, lineHeight: 1 }}>{cat.icon}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: dc.pctSize, fontWeight: 700, color: pctColor }}>{pctLabel}</span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: dc.nameSize, fontWeight: 600, letterSpacing: "0.06em", color: "#c8d8e8", marginTop: 10, marginBottom: 10 }}>
        {cat.label.toUpperCase()}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: dc.assetCountSize - 1, letterSpacing: "0.08em", color: "#2a4a6a" }}>ASSETS</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: dc.assetCountSize, color: "#4a7fa5" }}>{count}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: dc.mcapSize - 1, letterSpacing: "0.08em", color: "#2a4a6a" }}>MKT CAP</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: dc.mcapSize, color: "#4a7fa5" }}>{fmtMcap(totalMcap)}</span>
        </div>
      </div>
      {movers && <div style={{ marginTop: 8 }}>{movers}</div>}
      <div style={{ marginTop: 10 }}>
        <div style={{ background: "#1a2f4a", borderRadius: 1, height: dc.barHeight, width: "100%" }}>
          <div style={{ height: dc.barHeight, borderRadius: 1, width: `${barWidth}%`, background: accentColor, transition: "width 0.3s ease" }} />
        </div>
      </div>
      <span className="gmt-expand-hint" style={{ position: "absolute", bottom: 8, right: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: "#1a3050", letterSpacing: "0.06em", opacity: 0, transition: "opacity 150ms ease", pointerEvents: "none" }}>EXPAND ▾</span>
    </div>
  );
}
