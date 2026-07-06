/**
 * gmtBadges.jsx — Badge and banner components for the Global Markets Terminal.
 *
 * Extracted from GlobalMarketsTerminal.jsx for file-size reduction.
 * Pure presentational — no hooks, no state.
 */

import {
  EXCHANGE_COLORS, SOURCE_COLORS, GROUP_MACRO,
  STATIC_ASSETS_MAP, STATIC_CATEGORIES,
} from './gmtConfig.js';

export function ExchangeBadge({ exchange, style: extra }) {
  const color = EXCHANGE_COLORS[exchange] || "#9E9E9E";
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700,
      letterSpacing: "0.8px", color,
      background: color + "18", border: `1px solid ${color}28`,
      borderRadius: 3, padding: "1px 5px", whiteSpace: "nowrap",
      ...extra,
    }}>
      {exchange}
    </span>
  );
}

export function SourceBadge({ source, style: extra }) {
  const labels = { eodhd: "EODHD", yahoo: "Yahoo", finnhub: "Finnhub", alphaVantage: "Alpha Vantage", fred: "FRED", coingecko: "CoinGecko", fmp: "FMP", brapi: "BRAPI", bcb: "BCB", awesomeapi: "AwesomeAPI" };
  const color = SOURCE_COLORS[source] || "#9E9E9E";
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700,
      letterSpacing: "0.5px", color,
      background: color + "18", border: `1px solid ${color}28`,
      borderRadius: 3, padding: "1px 6px", whiteSpace: "nowrap",
      ...extra,
    }}>
      {labels[source] || source}
    </span>
  );
}

export function MacroBanner({ macroData, catKey }) {
  const cfg = GROUP_MACRO[catKey];
  if (!cfg || !macroData?.[cfg.fredKey]) return null;
  const series = macroData[cfg.fredKey];
  const latest = series.observations?.[0];
  if (!latest) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "rgba(21,101,192,0.08)", border: "1px solid rgba(21,101,192,0.2)",
      borderRadius: 6, padding: "8px 14px", marginBottom: 10,
    }}>
      <SourceBadge source="fred" />
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--c-text-2)" }}>
        {cfg.label}:
      </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "#1565C0" }}>
        {typeof latest.value === "number" ? latest.value.toFixed(2) : latest.value}{series.unit === "%" ? "%" : ""}
      </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--c-text-3)" }}>
        ({latest.date})
      </span>
    </div>
  );
}

export function CrossListBadge({ symbol }) {
  const asset = STATIC_ASSETS_MAP[symbol];
  if (!asset?.alsoIn || asset.alsoIn.length === 0) return null;
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 7, fontWeight: 700,
      letterSpacing: "0.5px", color: "#78909C",
      background: "rgba(120,144,156,0.12)", border: "1px solid rgba(120,144,156,0.25)",
      borderRadius: 3, padding: "1px 5px", whiteSpace: "nowrap",
    }}>
      +{asset.alsoIn.map(c => STATIC_CATEGORIES[c]?.label?.split(" ")[0] || c).join(",")}
    </span>
  );
}
