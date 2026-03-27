/**
 * CommandBar.jsx — Global Markets Terminal command bar
 *
 * Row 1 (32px, always visible):
 *   [Market Pulse] [FILTER▾] [SORT▾] [EXCHANGE▾] [spacer] [Top Movers] [⊞ CARDS | ≡ LIST] [REFRESH]
 *
 * Row 2 (collapsible panel):
 *   FILTER  — MARKET row / SECTOR row / MOVERS row
 *   SORT    — SORT BY row / GROUPS row / DENSITY row
 *   EXCHANGE — EXCHANGE row
 *
 * Inline styles only. JetBrains Mono throughout.
 */

import { useState, useEffect } from 'react';

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:          '#080f1a',
  surface:     '#0a1420',
  border:      '#1a2f4a',
  labelText:   '#2a4a6a',
  muted:       '#3d6080',
  inactive:    '#4a7fa5',
  hover:       '#7ab8d8',
  green:       '#00d4aa',
  red:         '#ff6b6b',
  greenBg:     '#0d2e1e',
  greenBorder: '#1d5c3a',
  redBg:       '#1e0a0a',
  redBorder:   '#5c1d1d',
  blueBg:      '#0d1e2e',
  blueBorder:  '#2a6090',
};

// ── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ children, active, variant = 'default', onClick, style: extra }) {
  const [hov, setHov] = useState(false);

  let bg, border, color;
  if (active) {
    if (variant === 'exchange') {
      bg = C.blueBg; border = C.blueBorder; color = C.hover;
    } else {
      bg = C.greenBg; border = C.green; color = C.green;
    }
  } else if (hov) {
    bg = 'transparent'; border = '#2a4a6a'; color = C.hover;
  } else {
    bg = 'transparent'; border = C.border; color = C.inactive;
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        padding: '2px 8px',
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 120ms ease',
        background: bg,
        border: `0.5px solid ${border}`,
        color,
        lineHeight: 1.6,
        ...(extra || {}),
      }}
    >
      {children}
    </button>
  );
}

// ── ActionChip (always-inactive action buttons) ───────────────────────────────
function ActionChip({ children, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        padding: '2px 8px',
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 120ms ease',
        background: 'transparent',
        border: `0.5px solid ${C.border}`,
        color: hov ? C.hover : C.inactive,
        lineHeight: 1.6,
      }}
    >
      {children}
    </button>
  );
}

// ── Labeled row (Option C interior pattern) ───────────────────────────────────
function LabeledRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{
        width: 68,
        flexShrink: 0,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        letterSpacing: '0.10em',
        fontWeight: 500,
        color: C.labelText,
        textTransform: 'uppercase',
        alignSelf: 'center',
        lineHeight: 1,
      }}>
        {label}
      </div>
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        {children}
      </div>
    </div>
  );
}

// ── Segmented control (connected buttons, shared borders) ─────────────────────
function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex' }}>
      {options.map((opt, i) => {
        const active  = value === opt.value;
        const isFirst = i === 0;
        const isLast  = i === options.length - 1;
        const br      = isFirst ? '2px 0 0 2px' : isLast ? '0 2px 2px 0' : '0';
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              padding: '2px 10px',
              borderRadius: br,
              cursor: 'pointer',
              transition: 'all 120ms ease',
              background: active ? C.greenBg : 'transparent',
              borderTop:    `0.5px solid ${active ? C.green : C.border}`,
              borderBottom: `0.5px solid ${active ? C.green : C.border}`,
              borderRight:  `0.5px solid ${active ? C.green : C.border}`,
              borderLeft:   i === 0 ? `0.5px solid ${active ? C.green : C.border}` : 'none',
              color: active ? C.green : C.inactive,
              lineHeight: 1.6,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────
function TabBtn({ label, preview, open, onClick, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => { if (!disabled) setHov(true); }}
      onMouseLeave={() => setHov(false)}
      style={{
        height: 32,
        padding: '0 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        letterSpacing: '0.08em',
        fontWeight: 500,
        opacity: disabled ? 0.35 : 1,
        background: open ? 'rgba(0,212,170,0.04)' : 'transparent',
        color: open ? C.green : hov ? C.hover : C.muted,
        borderTop:    'none',
        borderLeft:   'none',
        borderRight:  `0.5px solid ${C.border}`,
        borderBottom: open ? `1.5px solid ${C.green}` : '1.5px solid transparent',
        transition: 'color 150ms ease, opacity 150ms ease',
        outline: 'none',
      }}
    >
      {label}
      {!open && preview && !disabled && (
        <span style={{ fontSize: 8, color: C.muted }}>{preview}</span>
      )}
      <span style={{
        display: 'inline-block',
        fontSize: 8,
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 150ms ease',
      }}>
        ▾
      </span>
    </button>
  );
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
function IconCards() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <rect x="0" y="0" width="5" height="5" rx="1" fill="currentColor" opacity="0.9"/>
      <rect x="7" y="0" width="5" height="5" rx="1" fill="currentColor" opacity="0.9"/>
      <rect x="0" y="7" width="5" height="5" rx="1" fill="currentColor" opacity="0.9"/>
      <rect x="7" y="7" width="5" height="5" rx="1" fill="currentColor" opacity="0.9"/>
    </svg>
  );
}

function IconList() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <rect x="0" y="1"  width="12" height="2" rx="0.5" fill="currentColor"/>
      <rect x="0" y="5"  width="12" height="2" rx="0.5" fill="currentColor"/>
      <rect x="0" y="9"  width="12" height="2" rx="0.5" fill="currentColor"/>
    </svg>
  );
}

// ── View toggle (permanent, no panel) ────────────────────────────────────────
function ViewToggle({ viewMode, onViewChange }) {
  const [hovCards, setHovCards] = useState(false);
  const [hovList,  setHovList]  = useState(false);

  const cardsActive = viewMode === 'grid';
  const listActive  = viewMode === 'list';

  const btnBase = {
    height: 20,
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    transition: 'all 120ms ease',
    whiteSpace: 'nowrap',
    outline: 'none',
    borderTop:    `0.5px solid ${C.border}`,
    borderBottom: `0.5px solid ${C.border}`,
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      borderLeft: `0.5px solid ${C.border}`,
      flexShrink: 0,
    }}>
      {/* CARDS button */}
      <button
        onClick={() => onViewChange('grid')}
        onMouseEnter={() => setHovCards(true)}
        onMouseLeave={() => setHovCards(false)}
        style={{
          ...btnBase,
          borderRadius: '3px 0 0 3px',
          borderLeft:  `0.5px solid ${cardsActive ? C.green : hovCards ? '#2a4a6a' : C.border}`,
          borderRight: 'none',
          borderTop:    `0.5px solid ${cardsActive ? C.green : hovCards ? '#2a4a6a' : C.border}`,
          borderBottom: `0.5px solid ${cardsActive ? C.green : hovCards ? '#2a4a6a' : C.border}`,
          background: cardsActive ? C.greenBg : 'transparent',
          color: cardsActive ? C.green : hovCards ? C.hover : C.muted,
        }}
      >
        <IconCards />
        CARDS
      </button>

      {/* LIST button */}
      <button
        onClick={() => onViewChange('list')}
        onMouseEnter={() => setHovList(true)}
        onMouseLeave={() => setHovList(false)}
        style={{
          ...btnBase,
          borderRadius: '0 3px 3px 0',
          borderLeft:  `0.5px solid ${listActive ? C.green : C.border}`,
          borderRight: `0.5px solid ${listActive ? C.green : hovList ? '#2a4a6a' : C.border}`,
          borderTop:    `0.5px solid ${listActive ? C.green : hovList ? '#2a4a6a' : C.border}`,
          borderBottom: `0.5px solid ${listActive ? C.green : hovList ? '#2a4a6a' : C.border}`,
          background: listActive ? C.greenBg : 'transparent',
          color: listActive ? C.green : hovList ? C.hover : C.muted,
        }}
      >
        <IconList />
        LIST
      </button>
    </div>
  );
}

// ── Refresh button ────────────────────────────────────────────────────────────
function RefreshBtn({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        height: 32,
        padding: '0 14px',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        background: 'transparent',
        borderTop:    'none',
        borderRight:  'none',
        borderBottom: 'none',
        borderLeft:   `0.5px solid ${C.border}`,
        cursor: 'pointer',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, fontWeight: 600, letterSpacing: '0.08em',
        color: hov ? C.green : C.muted,
        transition: 'color 150ms ease',
        outline: 'none',
      }}
    >
      REFRESH
    </button>
  );
}

// ── Reset button ──────────────────────────────────────────────────────────────
function ResetBtn({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        marginLeft: 'auto',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        letterSpacing: '0.06em',
        color: hov ? C.hover : C.muted,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'color 120ms ease',
        lineHeight: 1.6,
      }}
    >
      RESET
    </button>
  );
}

// ── CommandBar ────────────────────────────────────────────────────────────────
export default function CommandBar({
  // Market pulse
  sentiment, risingCount, fallingCount, avgChange,
  // Top movers: [{ symbol, changePct }]
  topMovers,
  // Filter
  activeFilter, onFilterChange,
  // Sort (maps to groupSort / groupDir)
  sortMode, sortDir, onSortChange,
  // Exchange (activeExchanges is a Set)
  activeExchanges, allExchanges, onExchangeToggle, onExchangeReset,
  // View ("grid" | "list") — no VIEW tab, toggle is in strip
  viewMode, onViewChange, onDensityChange, cardDensity,
  // Group collapse/expand
  onCollapseAll, onExpandAll, flatExpand,
  // Refresh
  onRefresh,
  // Taxonomy
  groups, subgroups,
}) {
  // openPanel: null | 'filter' | 'sort' | 'exchange'  (no 'view')
  const [openPanel,         setOpenPanel]         = useState(null);
  const [activeGroupFilter, setActiveGroupFilter]  = useState(null);
  const [density,           setDensity]            = useState(cardDensity || 'compact');

  const togglePanel = (key) => setOpenPanel(p => p === key ? null : key);

  // Close FILTER / EXCHANGE panels when switching to list view (they're redundant)
  useEffect(() => {
    if (viewMode === 'list') {
      setOpenPanel(p => (p === 'filter' || p === 'exchange') ? null : p);
    }
  }, [viewMode]);

  // Sentiment color
  const sentimentColor =
    sentiment === 'BULLISH' ? C.green :
    sentiment === 'BEARISH' ? C.red   :
    C.hover; // MIXED

  // Mover chips: 2 gainers + 2 losers
  const movers     = topMovers || [];
  const gainers    = movers.filter(m => m.changePct >= 0).slice(0, 2);
  const losers     = movers.filter(m => m.changePct <  0).slice(-2);
  const stripChips = [...gainers, ...losers];

  // Tab preview text
  const filterPreview =
    activeFilter === 'all'
      ? 'ALL'
      : (subgroups || []).find(s => s.id === activeFilter)?.display_name?.toUpperCase()
        || activeFilter.toUpperCase();

  const sortLabel   = sortMode === 'alpha' ? 'A-Z' : 'RETURN';
  const sortPreview = `${sortLabel} ${sortDir === 'asc' ? '↑' : '↓'}`;

  const exchSize    = activeExchanges?.size ?? 0;
  const exchArr     = activeExchanges ? [...activeExchanges] : [];
  const exchPreview =
    exchSize === 0 ? 'ALL' :
    exchSize === 1 ? exchArr[0] :
    `${exchArr[0]} +${exchSize - 1}`;

  // Subgroups visible in SECTOR row
  const visibleSubgroups = activeGroupFilter
    ? (subgroups || []).filter(s => s.group_id === activeGroupFilter)
    : (subgroups || []);

  // Sort composite key
  const sortComposite = `${sortMode}-${sortDir}`;

  return (
    <div style={{ background: C.bg, fontFamily: "'JetBrains Mono', monospace" }}>
      <style>{`@keyframes cmdPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>

      {/* ════════════════════════════════════════
          ROW 1 — TAB STRIP (32px, always visible)
          ════════════════════════════════════════ */}
      <div style={{
        height: 32,
        display: 'flex',
        alignItems: 'stretch',
        borderBottom: `0.5px solid ${C.border}`,
      }}>

        {/* SEGMENT A — Market Pulse */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 14px',
          borderRight: `0.5px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: sentimentColor,
            animation: 'cmdPulse 1.6s ease-in-out infinite',
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
            color: sentimentColor,
          }}>
            {sentiment || 'MIXED'}
          </span>
          <div style={{ width: '0.5px', height: 12, background: C.border, flexShrink: 0 }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, color: C.muted, whiteSpace: 'nowrap',
          }}>
            {risingCount ?? 0}↑&nbsp;&nbsp;{fallingCount ?? 0}↓&nbsp;&nbsp;avg {(avgChange ?? 0) >= 0 ? '+' : ''}{(avgChange ?? 0).toFixed(2)}%
          </span>
        </div>

        {/* SEGMENTS B–D — FILTER / SORT / EXCHANGE tabs (no VIEW tab) */}
        <TabBtn
          label="FILTER"
          preview={filterPreview}
          open={openPanel === 'filter'}
          onClick={() => togglePanel('filter')}
          disabled={viewMode === 'list'}
        />
        <TabBtn
          label="SORT"
          preview={sortPreview}
          open={openPanel === 'sort'}
          onClick={() => togglePanel('sort')}
        />
        <TabBtn
          label="EXCHANGE"
          preview={exchPreview}
          open={openPanel === 'exchange'}
          onClick={() => togglePanel('exchange')}
          disabled={viewMode === 'list'}
        />

        {/* SPACER */}
        <div style={{ flex: 1 }} />

        {/* SEGMENT F — Top Movers */}
        {stripChips.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '0 14px',
            borderLeft: `0.5px solid ${C.border}`,
          }}>
            {stripChips.map(m => {
              const pos = m.changePct >= 0;
              return (
                <span key={m.symbol} style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, fontWeight: 600,
                  padding: '1px 6px', borderRadius: 2,
                  background: pos ? '#0a2018' : '#1e0a0a',
                  color:      pos ? C.green   : C.red,
                  border:     `0.5px solid ${pos ? '#1d5c3a' : '#5c1d1d'}`,
                  whiteSpace: 'nowrap',
                }}>
                  {m.symbol} {pos ? '+' : ''}{m.changePct.toFixed(2)}%
                </span>
              );
            })}
          </div>
        )}

        {/* SEGMENT F1 — Collapse/Expand all (cards mode only) */}
        {viewMode === 'grid' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 12px', borderRight: `0.5px solid #1a2f4a` }}>
            <button
              onClick={onCollapseAll}
              style={{ height: 20, padding: '0 10px', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.06em', border: '0.5px solid #1a2f4a', borderRight: 'none', borderRadius: '3px 0 0 3px', background: 'transparent', color: '#3d6080', cursor: 'pointer', transition: 'all 0.12s' }}
              onMouseEnter={e => { e.target.style.color = '#7ab8d8'; e.target.style.borderColor = '#2a4a6a'; }}
              onMouseLeave={e => { e.target.style.color = '#3d6080'; e.target.style.borderColor = '#1a2f4a'; }}
            >COLLAPSE ALL</button>
            <button
              onClick={onExpandAll}
              style={{ height: 20, padding: '0 10px', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.06em', border: `0.5px solid ${flatExpand ? '#00d4aa' : '#1a2f4a'}`, borderRadius: '0 3px 3px 0', background: flatExpand ? '#0d2e1e' : 'transparent', color: flatExpand ? '#00d4aa' : '#3d6080', cursor: 'pointer', transition: 'all 0.12s' }}
              onMouseEnter={e => { if (!flatExpand) { e.target.style.color = '#7ab8d8'; e.target.style.borderColor = '#2a4a6a'; } }}
              onMouseLeave={e => { if (!flatExpand) { e.target.style.color = '#3d6080'; e.target.style.borderColor = '#1a2f4a'; } }}
            >EXPAND ALL</button>
          </div>
        )}

        {/* SEGMENT F2 — View toggle (permanent, between movers and refresh) */}
        <ViewToggle viewMode={viewMode} onViewChange={onViewChange} />

        {/* SEGMENT G — Refresh */}
        <RefreshBtn onClick={onRefresh} />
      </div>

      {/* ════════════════════════════════════════
          ROW 2 — ACTIVE PANEL (collapsible)
          ════════════════════════════════════════ */}
      <div style={{
        maxHeight: openPanel ? 260 : 0,
        overflow: 'hidden',
        opacity: openPanel ? 1 : 0,
        transition: 'max-height 180ms ease-out, opacity 120ms ease-out',
        background: C.surface,
        borderBottom: openPanel ? `0.5px solid ${C.border}` : 'none',
      }}>
        {openPanel && (
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* ── FILTER PANEL ── */}
            {openPanel === 'filter' && (
              <>
                <LabeledRow label="MARKET">
                  <Chip active={activeGroupFilter === null} onClick={() => setActiveGroupFilter(null)}>
                    ALL
                  </Chip>
                  {(groups || []).map(g => (
                    <Chip
                      key={g.id}
                      active={activeGroupFilter === g.id}
                      onClick={() => setActiveGroupFilter(g.id)}
                    >
                      {(g.display_name || g.id).toUpperCase()}
                    </Chip>
                  ))}
                </LabeledRow>

                <LabeledRow label="SECTOR">
                  <Chip active={activeFilter === 'all'} onClick={() => onFilterChange('all')}>
                    ALL
                  </Chip>
                  {visibleSubgroups.map(s => (
                    <Chip
                      key={s.id}
                      active={activeFilter === s.id}
                      onClick={() => onFilterChange(s.id)}
                    >
                      {(s.display_name || s.id).toUpperCase()}
                    </Chip>
                  ))}
                </LabeledRow>

                {movers.length > 0 && (
                  <LabeledRow label="MOVERS">
                    {movers.slice(0, 6).map(m => {
                      const pos = m.changePct >= 0;
                      return (
                        <span key={m.symbol} style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9, fontWeight: 600,
                          padding: '2px 8px', borderRadius: 2,
                          background: pos ? '#0a2018' : '#1e0a0a',
                          color:      pos ? C.green   : C.red,
                          border:     `0.5px solid ${pos ? '#1d5c3a' : '#5c1d1d'}`,
                          whiteSpace: 'nowrap',
                        }}>
                          {m.symbol} {pos ? '+' : ''}{m.changePct.toFixed(2)}%
                        </span>
                      );
                    })}
                  </LabeledRow>
                )}
              </>
            )}

            {/* ── SORT PANEL ── */}
            {openPanel === 'sort' && (
              <>
                <LabeledRow label="SORT BY">
                  <SegmentedControl
                    options={[
                      { value: 'alpha-asc',   label: 'A-Z ↑'    },
                      { value: 'alpha-desc',  label: 'A-Z ↓'    },
                      { value: 'return-asc',  label: 'RETURN ↑' },
                      { value: 'return-desc', label: 'RETURN ↓' },
                    ]}
                    value={sortComposite}
                    onChange={(val) => {
                      const dash = val.lastIndexOf('-');
                      onSortChange(val.slice(0, dash), val.slice(dash + 1));
                    }}
                  />
                </LabeledRow>

                <LabeledRow label="DENSITY">
                  {['compact', 'comfortable', 'spacious'].map(d => (
                    <Chip
                      key={d}
                      active={density === d}
                      onClick={() => { setDensity(d); onDensityChange(d); }}
                    >
                      {d.toUpperCase()}
                    </Chip>
                  ))}
                </LabeledRow>
              </>
            )}

            {/* ── EXCHANGE PANEL ── */}
            {openPanel === 'exchange' && (
              <LabeledRow label="EXCHANGE">
                {(allExchanges || []).map(exch => (
                  <Chip
                    key={exch}
                    active={activeExchanges?.has(exch) ?? false}
                    variant="exchange"
                    onClick={() => onExchangeToggle(exch)}
                  >
                    {exch}
                  </Chip>
                ))}
                {exchSize > 0 && <ResetBtn onClick={onExchangeReset} />}
              </LabeledRow>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
