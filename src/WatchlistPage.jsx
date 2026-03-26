import { useNavigate } from 'react-router-dom';
import { useWatchlist } from './context/WatchlistContext.jsx';
import { STATIC_CATEGORIES, STATIC_ASSETS_MAP } from './GlobalMarketsTerminal.jsx';

// Simple price formatter — avoids importing the private formatPrice from GMT
function fmt(symbol, price, assets) {
  if (price == null) return "—";
  const asset = assets?.[symbol];
  if (asset?.isB3)       return "R$ " + price.toFixed(2);
  if (asset?.cat === "fx") return price.toFixed(4);
  if (price >= 1000)     return "$" + Math.round(price).toLocaleString();
  if (price >= 1)        return "$" + price.toFixed(2);
  return "$" + price.toFixed(4);
}

// ─── Shared row for an individual asset ───────────────────────────────────────
function AssetWatchRow({ symbol, marketData, assets, onUnpin }) {
  const asset   = assets?.[symbol];
  const live    = marketData?.[symbol];
  const pct     = live?.changePct;
  const pctColor = pct == null ? "#475569" : pct >= 0 ? "#00E676" : "#FF5252";
  const arrow   = pct == null ? "" : pct >= 0 ? "▲ " : "▼ ";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "11px 20px",
      borderBottom: "1px solid rgba(51,65,85,0.3)",
      background: "rgba(255,255,255,0.01)",
    }}>
      {/* Ticker */}
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700,
        color: "#e2e8f0", minWidth: 68,
      }}>
        {symbol}
      </span>

      {/* Name */}
      <span style={{
        fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#475569",
        flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {asset?.name || ""}
      </span>

      {/* Price */}
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600,
        color: "#cbd5e1", minWidth: 90, textAlign: "right",
      }}>
        {live?.price != null ? fmt(symbol, live.price, assets) : "—"}
      </span>

      {/* Change % */}
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
        color: pctColor, minWidth: 72, textAlign: "right",
      }}>
        {pct != null ? arrow + (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%" : "—"}
      </span>

      {/* Unpin */}
      <button
        onClick={() => onUnpin('asset', symbol)}
        title="Unpin"
        style={{
          background: "transparent", border: "none", cursor: "pointer",
          fontSize: 16, color: "#FFB300", lineHeight: 1, padding: "2px 4px",
          flexShrink: 0,
        }}
      >★</button>
    </div>
  );
}

// ─── WatchlistPage ─────────────────────────────────────────────────────────────
// TODO: WatchlistPage needs marketData from a shared context (currently no live prices when rendered standalone)
export default function WatchlistPage({ watchlistItems: propItems, marketData, assets: propAssets, categories: propCategories, onNavigate: propOnNavigate } = {}) {
  const navigate = useNavigate();
  const { items: ctxItems, unpin } = useWatchlist();
  const watchlistItems = propItems || ctxItems || [];
  const assets = propAssets || STATIC_ASSETS_MAP;
  const categories = propCategories || STATIC_CATEGORIES;
  const onNavigate = propOnNavigate || ((key) => navigate(key === 'dashboard' ? '/app/global' : '/app/global'));

  const pinnedAssets    = (watchlistItems || []).filter(i => i.type === 'asset');
  const pinnedSubgroups = (watchlistItems || []).filter(i => i.type === 'subgroup');
  const isEmpty         = pinnedAssets.length === 0 && pinnedSubgroups.length === 0;

  // ── EMPTY STATE ─────────────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "120px 0", gap: 20, textAlign: "center",
      }}>
        <div style={{ fontSize: 56, opacity: 0.18 }}>★</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700,
          color: "#334155", letterSpacing: "2px",
        }}>
          YOUR WATCHLIST IS EMPTY
        </div>
        <div style={{
          fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#334155",
          maxWidth: 360, lineHeight: 1.7,
        }}>
          Star assets or groups from the dashboard to track them here.
        </div>
        <button
          onClick={() => onNavigate('dashboard')}
          style={{
            marginTop: 8,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
            color: "#64748b", background: "transparent",
            border: "1px solid rgba(51,65,85,0.7)", borderRadius: 6,
            padding: "9px 24px", cursor: "pointer", letterSpacing: "1px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#00E676"; e.currentTarget.style.color = "#00E676"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(51,65,85,0.7)"; e.currentTarget.style.color = "#64748b"; }}
        >
          GO TO DASHBOARD
        </button>
      </div>
    );
  }

  // ── SECTION LABEL ───────────────────────────────────────────────────────────
  const SectionHead = ({ children }) => (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
      color: "#334155", letterSpacing: "2px",
      padding: "14px 20px 8px",
      borderBottom: "1px solid rgba(51,65,85,0.4)",
    }}>
      {children}
    </div>
  );

  return (
    <div style={{ paddingTop: 24 }}>

      {/* ── PINNED ASSETS ─────────────────────────────────────────────────────── */}
      {pinnedAssets.length > 0 && (
        <div style={{
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(51,65,85,0.4)",
          borderRadius: 8, overflow: "hidden", marginBottom: 24,
        }}>
          <SectionHead>PINNED ASSETS</SectionHead>

          {/* Column header */}
          <div style={{
            display: "flex", gap: 12, padding: "7px 20px",
            borderBottom: "1px solid rgba(51,65,85,0.3)",
          }}>
            {["SYMBOL", "NAME", "PRICE", "CHANGE", ""].map((h, i) => (
              <span key={i} style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                color: "#334155", letterSpacing: "1.5px",
                flex: i === 1 ? 1 : i === 0 ? "0 0 68px" : i === 2 ? "0 0 90px" : i === 3 ? "0 0 72px" : "0 0 24px",
                textAlign: i >= 2 ? "right" : "left",
              }}>{h}</span>
            ))}
          </div>

          {pinnedAssets.map(item => (
            <AssetWatchRow
              key={item.id}
              symbol={item.target_id}
              marketData={marketData}
              assets={assets}
              onUnpin={unpin}
            />
          ))}
        </div>
      )}

      {/* ── PINNED SUBGROUPS ──────────────────────────────────────────────────── */}
      {pinnedSubgroups.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {pinnedSubgroups.map(item => {
            const cat = categories?.[item.target_id];

            // All assets belonging to this subgroup
            const subgroupSymbols = assets
              ? Object.entries(assets)
                  .filter(([, a]) => a.cat === item.target_id)
                  .map(([sym]) => sym)
              : [];

            return (
              <div key={item.id} style={{
                background: "rgba(255,255,255,0.015)",
                border: "1px solid rgba(51,65,85,0.4)",
                borderRadius: 8, overflow: "hidden",
              }}>
                {/* Subgroup header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 20px",
                  borderBottom: "1px solid rgba(51,65,85,0.4)",
                  background: "rgba(255,255,255,0.02)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {cat?.icon && <span style={{ fontSize: 16 }}>{cat.icon}</span>}
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
                      color: cat?.color || "#e2e8f0", letterSpacing: "1px",
                    }}>
                      {cat?.label || item.target_id}
                    </span>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                      color: "#334155", letterSpacing: "0.5px",
                    }}>
                      {subgroupSymbols.length} assets
                    </span>
                  </div>
                  <button
                    onClick={() => unpin('subgroup', item.target_id)}
                    title="Unpin group"
                    style={{
                      background: "transparent", border: "none", cursor: "pointer",
                      fontSize: 16, color: "#FFB300", lineHeight: 1, padding: "2px 4px",
                    }}
                  >★</button>
                </div>

                {/* Assets in subgroup */}
                {subgroupSymbols.length === 0 ? (
                  <div style={{ padding: "16px 20px", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#334155" }}>
                    No assets in this group.
                  </div>
                ) : (
                  subgroupSymbols.map(sym => (
                    <AssetWatchRow
                      key={sym}
                      symbol={sym}
                      marketData={marketData}
                      assets={assets}
                      onUnpin={() => {}} // subgroup assets can't be individually unpinned here
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
