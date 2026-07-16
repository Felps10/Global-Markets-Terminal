/**
 * SourcePill.jsx
 *
 * Small monospace provenance pill (e.g. FMP / EODHD / BRAPI) shown next to
 * quote data. Shared by ChartResearchPage and AssetDetailDrawer.
 */

export default function SourcePill({ label, color }) {
  return (
    <span style={{
      fontFamily:    "'JetBrains Mono', monospace",
      fontSize:      9,
      fontWeight:    600,
      color:         color,
      background:    `${color}18`,
      border:        `1px solid ${color}44`,
      borderRadius:  3,
      padding:       '3px 8px',
      display:       'inline-block',
      letterSpacing: '0.04em',
    }}>
      {label}
    </span>
  );
}
