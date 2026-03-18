/**
 * AssetListView.jsx — Flat sortable data table for LIST view
 * v2: inline column filters + active filters strip + result count footer
 *
 * Inline styles only (except scrollbar + input pseudo-elements via <style>).
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { useWatchlist } from '../context/WatchlistContext.jsx';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:        '#080f1a',
  headerBg:  '#060d17',
  filterBg:  '#050b15',
  surface:   '#0a1420',
  border:    '#1a2f4a',
  rowBorder: '#0d1e30',
  rowHover:  '#0d1929',
  muted:     '#3d6080',
  labelDim:  '#2a4a6a',
  colHdr:    '#2a4a6a',
  colActive: '#4a7fa5',
  text:      '#c8d8e8',
  textBold:  '#e2e8f0',
  green:     '#00d4aa',
  red:       '#ff6b6b',
  amber:     '#FFB300',
  starDim:   '#2a4a6a',
};

// ── CHG% filter options ───────────────────────────────────────────────────────
const CHG_PCT_OPTIONS = [
  { value: 'all',  label: 'ALL'   },
  { value: '>2',   label: '>+2%'  },
  { value: '0-2',  label: '0–2%'  },
  { value: '-2-0', label: '-2–0%' },
  { value: '<-2',  label: '<-2%'  },
];

// ── Sector badge colors by group_id ──────────────────────────────────────────
const GROUP_BADGE = {
  'equities':       { bg: '#0d1e2e', color: '#4a7fa5', border: '#1a3050' },
  'currencies':     { bg: '#1a1a0a', color: '#7a7230', border: '#3a3818' },
  'indices':        { bg: '#0d1428', color: '#4a4a90', border: '#1e1e50' },
  'digital-assets': { bg: '#1a0a1a', color: '#7a30a0', border: '#3a1850' },
  'commodities':    { bg: '#1a0e0a', color: '#8a5030', border: '#3a2018' },
  'fixed-income':   { bg: '#0a1a0a', color: '#2a6a2a', border: '#185018' },
};
const DEFAULT_BADGE = { bg: '#0d1e2e', color: '#4a7fa5', border: '#1a3050' };

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtPrice(price, asset) {
  if (price == null || !isFinite(price)) return '—';
  if (asset?.isB3) return 'R$ ' + price.toFixed(2);
  if (asset?.cat === 'fx') return price.toFixed(4);
  if (asset?.isCrypto) {
    if (price >= 1000) return '$' + Math.round(price).toLocaleString();
    if (price >= 1)    return '$' + price.toFixed(2);
    return '$' + price.toFixed(4);
  }
  if (asset?.exchange === 'INDEX') return price.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '$' + price.toFixed(2);
}

function fmtChange(val, asset) {
  if (val == null || !isFinite(val)) return '—';
  const decimals = asset?.cat === 'fx' ? 4 : 2;
  const abs = Math.abs(val);
  if (abs >= 1000) return (val >= 0 ? '+' : '') + val.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return (val >= 0 ? '+' : '') + val.toFixed(decimals);
}

function fmtVolume(vol, asset) {
  if (asset?.cat === 'fx' || asset?.cat === 'indices') return '—';
  if (!vol || vol === 0) return '—';
  if (vol >= 1e9) return (vol / 1e9).toFixed(1) + 'B';
  if (vol >= 1e6) return (vol / 1e6).toFixed(1) + 'M';
  if (vol >= 1e3) return (vol / 1e3).toFixed(1) + 'K';
  return String(vol);
}

function fmtMktCap(mc, asset) {
  if (asset?.cat === 'fx' || asset?.exchange === 'FOREX' || asset?.exchange === 'INDEX') return '—';
  if (!mc || mc === 0) return '—';
  if (mc >= 1e12) return (mc / 1e12).toFixed(2) + 'T';
  if (mc >= 1e9)  return (mc / 1e9).toFixed(1) + 'B';
  if (mc >= 1e6)  return (mc / 1e6).toFixed(1) + 'M';
  return '—';
}

function pctColor(pct) {
  if (pct == null) return C.muted;
  if (pct > 0) return C.green;
  if (pct < 0) return C.red;
  return C.muted;
}

// ── Sort arrow ────────────────────────────────────────────────────────────────
function SortArrow({ dir }) {
  return (
    <span style={{ marginLeft: 3, fontSize: 8, opacity: 0.8 }}>
      {dir === 'asc' ? '↑' : '↓'}
    </span>
  );
}

// ── Column definitions ────────────────────────────────────────────────────────
const COLS = [
  { key: 'pin',      label: '',         width: 32,  align: 'center', sortable: false },
  { key: 'ticker',   label: 'TICKER',   width: 90,  align: 'left'   },
  { key: 'name',     label: 'NAME',     width: null, align: 'left'  },
  { key: 'price',    label: 'PRICE',    width: 90,  align: 'right'  },
  { key: 'chgPct',   label: 'CHG %',    width: 80,  align: 'right'  },
  { key: 'chgAbs',   label: 'CHG $',    width: 70,  align: 'right'  },
  { key: 'volume',   label: 'VOLUME',   width: 70,  align: 'right'  },
  { key: 'mktCap',   label: 'MKT CAP', width: 80,  align: 'right'  },
  { key: 'sector',   label: 'SECTOR',   width: 100, align: 'left'   },
  { key: 'exchange', label: 'EXCH',     width: 60,  align: 'left'   },
];

// ── Active filter chip ────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      padding: '1px 5px 1px 6px',
      borderRadius: 2,
      background: '#0d2e1e',
      border: '0.5px solid #1d5c3a',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 8,
      color: C.green,
      letterSpacing: '0.06em',
      flexShrink: 0,
    }}>
      {label}
      <button
        onClick={onRemove}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: C.green,
          padding: 0,
          fontSize: 10,
          lineHeight: 1,
          opacity: 0.6,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </span>
  );
}

// ── Single-select filter dropdown (CHG%) ──────────────────────────────────────
function FilterSingleSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find(o => o.value === value);
  const isActive = value !== 'all';

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(p => !p); }}
        style={{
          width: '100%',
          height: 20,
          padding: '0 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
          background: isActive ? '#0d2e1e' : '#040b12',
          border: `0.5px solid ${isActive ? C.green : C.border}`,
          color: isActive ? C.green : C.muted,
          borderRadius: 2,
          cursor: 'pointer',
          letterSpacing: '0.06em',
          outline: 'none',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label || 'ALL'}
        </span>
        <span style={{ flexShrink: 0, marginLeft: 2, fontSize: 7 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          minWidth: 70,
          zIndex: 50,
          background: C.surface,
          border: `0.5px solid ${C.border}`,
          borderRadius: 2,
          marginTop: 2,
          overflow: 'hidden',
        }}>
          {options.map(opt => (
            <div
              key={opt.value}
              onMouseDown={(e) => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
              style={{
                padding: '4px 8px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                color: opt.value === value ? C.green : '#4a7fa5',
                background: opt.value === value ? '#0d2e1e' : 'transparent',
                cursor: 'pointer',
                letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = '#0d1929'; }}
              onMouseLeave={e => { if (opt.value !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Multi-select filter dropdown (GROUP, EXCHANGE) ────────────────────────────
function FilterMultiSelect({ values, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const count = values.size;
  const label = count === 0 ? placeholder : `${count} SEL`;
  const isActive = count > 0;

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(p => !p); }}
        style={{
          width: '100%',
          height: 20,
          padding: '0 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
          background: isActive ? '#0d2e1e' : '#040b12',
          border: `0.5px solid ${isActive ? C.green : C.border}`,
          color: isActive ? C.green : C.muted,
          borderRadius: 2,
          cursor: 'pointer',
          letterSpacing: '0.06em',
          outline: 'none',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <span style={{ flexShrink: 0, marginLeft: 2, fontSize: 7 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          minWidth: 90,
          maxHeight: 160,
          overflowY: 'auto',
          zIndex: 50,
          background: C.surface,
          border: `0.5px solid ${C.border}`,
          borderRadius: 2,
          marginTop: 2,
        }}>
          {options.map(opt => {
            const sel = values.has(opt.id);
            return (
              <div
                key={opt.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  const next = new Set(values);
                  if (sel) next.delete(opt.id); else next.add(opt.id);
                  onChange(next);
                }}
                style={{
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 8,
                  color: sel ? C.green : '#4a7fa5',
                  background: sel ? '#0d2e1e' : 'transparent',
                  cursor: 'pointer',
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#0d1929'; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ width: 10, flexShrink: 0, fontSize: 9 }}>{sel ? '✓' : ' '}</span>
                {opt.display_name || opt.id}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AssetListView({
  marketData,
  assets,
  passes,
  subgroups,
  groups,
  onAssetClick,
}) {
  const { isAuthenticated }      = useAuth();
  const { pin, unpin, isPinned } = useWatchlist();

  // Sort state
  const [sortCol, setSortCol] = useState('ticker');
  const [sortDir, setSortDir] = useState('asc');

  // Filter state
  const [filterPinned,    setFilterPinned]    = useState(false);
  const [filterTicker,    setFilterTicker]    = useState('');
  const [filterName,      setFilterName]      = useState('');
  const [filterChgPct,    setFilterChgPct]    = useState('all');
  const [filterGroups,    setFilterGroups]    = useState(new Set());
  const [filterExchanges, setFilterExchanges] = useState(new Set());

  // Subgroup lookup: id → { display_name, group_id }
  const subgroupMap = useMemo(() => {
    const m = new Map();
    (subgroups || []).forEach(s => m.set(s.id, s));
    return m;
  }, [subgroups]);

  // Group lookup: id → group (for filter strip labels)
  const groupMap = useMemo(() => {
    const m = new Map();
    (groups || []).forEach(g => m.set(g.id, g));
    return m;
  }, [groups]);

  // All unique exchanges derived from assets prop
  const allExchanges = useMemo(() => {
    if (!assets) return [];
    return [...new Set(Object.values(assets).map(a => a.exchange).filter(Boolean))].sort();
  }, [assets]);

  // Active filter indicators
  const hasActiveFilters = (
    filterPinned || filterTicker !== '' || filterName !== '' ||
    filterChgPct !== 'all' || filterGroups.size > 0 || filterExchanges.size > 0
  );

  function clearAllFilters() {
    setFilterPinned(false);
    setFilterTicker('');
    setFilterName('');
    setFilterChgPct('all');
    setFilterGroups(new Set());
    setFilterExchanges(new Set());
  }

  // Column header click (sort)
  function handleColClick(key) {
    if (key === sortCol) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
  }

  // Filtered + sorted row list
  const rows = useMemo(() => {
    if (!marketData || !assets) return [];

    const visible = Object.keys(assets).filter(sym => {
      if (!marketData[sym]) return false;
      if (!passes(sym)) return false;
      const d = marketData[sym];
      const a = assets[sym];

      if (filterPinned && !isPinned('asset', sym)) return false;
      if (filterTicker && !sym.toLowerCase().includes(filterTicker.toLowerCase())) return false;
      if (filterName   && !(a.name || '').toLowerCase().includes(filterName.toLowerCase())) return false;

      if (filterChgPct !== 'all') {
        const pct = d.changePct ?? 0;
        if (filterChgPct === '>2'   && !(pct > 2))              return false;
        if (filterChgPct === '0-2'  && !(pct >= 0 && pct <= 2)) return false;
        if (filterChgPct === '-2-0' && !(pct >= -2 && pct < 0)) return false;
        if (filterChgPct === '<-2'  && !(pct < -2))             return false;
      }

      if (filterGroups.size > 0) {
        const sg = subgroupMap.get(a.cat);
        if (!sg || !filterGroups.has(sg.group_id)) return false;
      }

      if (filterExchanges.size > 0 && !filterExchanges.has(a.exchange)) return false;

      return true;
    });

    const getSortVal = (sym) => {
      const d = marketData[sym];
      const a = assets[sym];
      switch (sortCol) {
        case 'ticker':   return sym;
        case 'name':     return a.name || '';
        case 'price':    return d.price ?? null;
        case 'chgPct':   return d.changePct ?? null;
        case 'chgAbs':   return d.changeAbs ?? d.change ?? null;
        case 'volume':   return d.volume ?? null;
        case 'mktCap':   return d.marketCap ?? null;
        case 'sector': {
          const sg = subgroupMap.get(a.cat);
          return sg?.display_name || a.cat || '';
        }
        case 'exchange': return a.exchange || '';
        default: return null;
      }
    };

    return [...visible].sort((symA, symB) => {
      const va = getSortVal(symA);
      const vb = getSortVal(symB);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [
    marketData, assets, passes, sortCol, sortDir, subgroupMap,
    filterPinned, filterTicker, filterName, filterChgPct,
    filterGroups, filterExchanges, isPinned,
  ]);

  // Shared input style (used in filter row)
  const inputStyle = {
    width: '100%',
    height: 20,
    padding: '0 4px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    background: '#040b12',
    border: `0.5px solid ${C.border}`,
    color: C.text,
    borderRadius: 2,
    outline: 'none',
    boxSizing: 'border-box',
    letterSpacing: '0.06em',
  };

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <style>{`
        .alv-scroll::-webkit-scrollbar       { width: 4px; }
        .alv-scroll::-webkit-scrollbar-track { background: #060d17; }
        .alv-scroll::-webkit-scrollbar-thumb { background: #1a2f4a; border-radius: 2px; }
        .alv-scroll { scrollbar-width: thin; scrollbar-color: #1a2f4a #060d17; }
        .alv-input::placeholder { color: #1a2f4a; }
        .alv-input:focus { border-color: #2a4a6a !important; }
      `}</style>

      {/* ── Active filters strip ──────────────────────────────────────────── */}
      {hasActiveFilters && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '5px 10px',
          background: '#060d17',
          borderBottom: `0.5px solid ${C.border}`,
          flexWrap: 'wrap',
          minHeight: 28,
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8,
            color: C.labelDim,
            letterSpacing: '0.10em',
            flexShrink: 0,
            marginRight: 2,
          }}>
            ACTIVE:
          </span>

          {filterPinned && (
            <FilterChip label="★ PINNED" onRemove={() => setFilterPinned(false)} />
          )}
          {filterTicker && (
            <FilterChip label={`TICKER: ${filterTicker.toUpperCase()}`} onRemove={() => setFilterTicker('')} />
          )}
          {filterName && (
            <FilterChip label={`NAME: ${filterName}`} onRemove={() => setFilterName('')} />
          )}
          {filterChgPct !== 'all' && (
            <FilterChip
              label={`CHG%: ${CHG_PCT_OPTIONS.find(o => o.value === filterChgPct)?.label ?? filterChgPct}`}
              onRemove={() => setFilterChgPct('all')}
            />
          )}
          {[...filterGroups].map(gid => (
            <FilterChip
              key={gid}
              label={`GROUP: ${(groupMap.get(gid)?.display_name || gid).toUpperCase()}`}
              onRemove={() => { const next = new Set(filterGroups); next.delete(gid); setFilterGroups(next); }}
            />
          ))}
          {[...filterExchanges].map(exch => (
            <FilterChip
              key={exch}
              label={`EXCH: ${exch}`}
              onRemove={() => { const next = new Set(filterExchanges); next.delete(exch); setFilterExchanges(next); }}
            />
          ))}

          <button
            onClick={clearAllFilters}
            style={{
              marginLeft: 4,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8,
              letterSpacing: '0.08em',
              color: '#4a7fa5',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '1px 0',
              flexShrink: 0,
            }}
          >
            CLEAR ALL ×
          </button>
        </div>
      )}

      {/* ── Scroll container ──────────────────────────────────────────────── */}
      <div
        className="alv-scroll"
        style={{ height: 'calc(100vh - 200px)', overflowY: 'auto' }}
      >
        <table style={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
          background: C.bg,
        }}>
          <colgroup>
            {COLS.map(col => (
              <col key={col.key} style={{ width: col.width ? col.width : undefined }} />
            ))}
          </colgroup>

          <thead>
            {/* ── Row 1: Sort / column labels ── */}
            <tr style={{
              height: 28,
              background: C.headerBg,
              borderBottom: `0.5px solid ${C.border}`,
              position: 'sticky',
              top: 0,
              zIndex: 2,
            }}>
              {COLS.map(col => {
                const isActive = sortCol === col.key;
                const sortable = col.sortable !== false;
                return (
                  <th
                    key={col.key}
                    onClick={sortable ? () => handleColClick(col.key) : undefined}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 8,
                      letterSpacing: '0.10em',
                      fontWeight: 500,
                      color: isActive ? C.colActive : C.colHdr,
                      textAlign: col.align,
                      padding: col.key === 'pin' ? '0' : '0 8px',
                      cursor: sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      background: C.headerBg,
                      transition: 'color 100ms',
                    }}
                    onMouseEnter={e => { if (sortable) e.currentTarget.style.color = C.colActive; }}
                    onMouseLeave={e => { e.currentTarget.style.color = isActive ? C.colActive : C.colHdr; }}
                  >
                    {col.label}
                    {isActive && sortable && <SortArrow dir={sortDir} />}
                  </th>
                );
              })}
            </tr>

            {/* ── Row 2: Inline filter inputs ── */}
            <tr style={{
              height: 30,
              background: C.filterBg,
              borderBottom: `0.5px solid ${C.border}`,
              position: 'sticky',
              top: 28,
              zIndex: 2,
            }}>
              {/* PIN — toggle pinned-only */}
              <th style={{ padding: 0, textAlign: 'center', background: C.filterBg }}>
                <button
                  onClick={() => setFilterPinned(p => !p)}
                  title={filterPinned ? 'Show all' : 'Pinned only'}
                  style={{
                    background: filterPinned ? '#0d2e1e' : 'transparent',
                    border: `0.5px solid ${filterPinned ? C.green : C.border}`,
                    color: filterPinned ? C.green : C.starDim,
                    borderRadius: 2,
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '1px 5px',
                    lineHeight: 1,
                    outline: 'none',
                    transition: 'all 120ms ease',
                  }}
                >
                  ★
                </button>
              </th>

              {/* TICKER — text input */}
              <th style={{ padding: '0 4px', background: C.filterBg }}>
                <input
                  className="alv-input"
                  value={filterTicker}
                  onChange={e => setFilterTicker(e.target.value)}
                  placeholder="FILTER"
                  style={inputStyle}
                />
              </th>

              {/* NAME — text input */}
              <th style={{ padding: '0 4px', background: C.filterBg }}>
                <input
                  className="alv-input"
                  value={filterName}
                  onChange={e => setFilterName(e.target.value)}
                  placeholder="FILTER"
                  style={inputStyle}
                />
              </th>

              {/* PRICE — not filterable */}
              <th style={{ textAlign: 'right', padding: '0 8px', background: C.filterBg }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: C.labelDim }}>—</span>
              </th>

              {/* CHG% — single-select dropdown */}
              <th style={{ padding: '0 4px', background: C.filterBg, position: 'relative', overflow: 'visible' }}>
                <FilterSingleSelect
                  value={filterChgPct}
                  options={CHG_PCT_OPTIONS}
                  onChange={setFilterChgPct}
                />
              </th>

              {/* CHG$ — not filterable */}
              <th style={{ textAlign: 'right', padding: '0 8px', background: C.filterBg }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: C.labelDim }}>—</span>
              </th>

              {/* VOLUME — not filterable */}
              <th style={{ textAlign: 'right', padding: '0 8px', background: C.filterBg }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: C.labelDim }}>—</span>
              </th>

              {/* MKT CAP — not filterable */}
              <th style={{ textAlign: 'right', padding: '0 8px', background: C.filterBg }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: C.labelDim }}>—</span>
              </th>

              {/* SECTOR/GROUP — multi-select dropdown */}
              <th style={{ padding: '0 4px', background: C.filterBg, position: 'relative', overflow: 'visible' }}>
                <FilterMultiSelect
                  values={filterGroups}
                  options={(groups || []).map(g => ({ id: g.id, display_name: g.display_name || g.id }))}
                  onChange={setFilterGroups}
                  placeholder="ALL"
                />
              </th>

              {/* EXCHANGE — multi-select dropdown */}
              <th style={{ padding: '0 4px', background: C.filterBg, position: 'relative', overflow: 'visible' }}>
                <FilterMultiSelect
                  values={filterExchanges}
                  options={allExchanges.map(e => ({ id: e, display_name: e }))}
                  onChange={setFilterExchanges}
                  placeholder="ALL"
                />
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {rows.map((sym, idx) => {
              const d   = marketData[sym];
              const a   = assets[sym];
              if (!d || !a) return null;

              const sg       = subgroupMap.get(a.cat);
              const groupId  = sg?.group_id || 'equities';
              const badge    = GROUP_BADGE[groupId] || DEFAULT_BADGE;
              const isLast   = idx === rows.length - 1;
              const pinned   = isPinned('asset', sym);
              const chg      = d.changeAbs ?? d.change ?? null;
              const chgPct   = d.changePct ?? null;
              const displaySym = a.display || sym;

              return (
                <AssetRow
                  key={sym}
                  sym={sym}
                  displaySym={displaySym}
                  d={d} a={a} sg={sg} badge={badge}
                  chg={chg} chgPct={chgPct}
                  pinned={pinned} isLast={isLast}
                  isAuthenticated={isAuthenticated}
                  onPin={() => pinned ? unpin('asset', sym) : pin('asset', sym)}
                  onClick={() => onAssetClick(sym)}
                />
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={COLS.length} style={{
                  padding: '48px 0',
                  textAlign: 'center',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: C.labelDim,
                  letterSpacing: '0.08em',
                }}>
                  NO ASSETS MATCH CURRENT FILTERS
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Result count footer ───────────────────────────────────────────── */}
      <div style={{
        padding: '5px 12px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        color: C.muted,
        letterSpacing: '0.08em',
        borderTop: `0.5px solid ${C.border}`,
        background: C.headerBg,
      }}>
        {rows.length} {rows.length === 1 ? 'RESULT' : 'RESULTS'}
        {hasActiveFilters && (
          <span style={{ color: C.labelDim }}> — FILTERED</span>
        )}
      </div>
    </div>
  );
}

// ── Asset row (extracted for hover state) ─────────────────────────────────────
function AssetRow({ sym, displaySym, d, a, sg, badge, chg, chgPct, pinned, isLast, isAuthenticated, onPin, onClick }) {
  const [hov, setHov] = useState(false);

  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        height: 36,
        background: hov ? C.rowHover : 'transparent',
        borderBottom: isLast ? 'none' : `0.5px solid ${C.rowBorder}`,
        cursor: 'pointer',
        transition: 'background 100ms',
      }}
    >
      {/* PIN */}
      <td style={{ textAlign: 'center', padding: 0 }}>
        {isAuthenticated && (
          <button
            onClick={(e) => { e.stopPropagation(); onPin(); }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              lineHeight: 1,
              color: pinned ? C.amber : C.starDim,
              padding: '2px 4px',
              transition: 'color 120ms',
            }}
          >
            {pinned ? '★' : '☆'}
          </button>
        )}
      </td>

      {/* TICKER */}
      <td style={{ padding: '0 8px' }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, fontWeight: 700,
          color: C.textBold,
          letterSpacing: '0.04em',
        }}>
          {displaySym}
        </span>
      </td>

      {/* NAME */}
      <td style={{ padding: '0 8px', minWidth: 0 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: '#4a7fa5',
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {a.name}
        </span>
      </td>

      {/* PRICE */}
      <td style={{ padding: '0 8px', textAlign: 'right' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.text }}>
          {fmtPrice(d.price, a)}
        </span>
      </td>

      {/* CHG % */}
      <td style={{ padding: '0 8px', textAlign: 'right' }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, fontWeight: 600,
          color: pctColor(chgPct),
        }}>
          {chgPct != null ? (chgPct >= 0 ? '+' : '') + chgPct.toFixed(2) + '%' : '—'}
        </span>
      </td>

      {/* CHG $ */}
      <td style={{ padding: '0 8px', textAlign: 'right' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: pctColor(chg) }}>
          {fmtChange(chg, a)}
        </span>
      </td>

      {/* VOLUME */}
      <td style={{ padding: '0 8px', textAlign: 'right' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: C.muted }}>
          {fmtVolume(d.volume, a)}
        </span>
      </td>

      {/* MKT CAP */}
      <td style={{ padding: '0 8px', textAlign: 'right' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: C.muted }}>
          {fmtMktCap(d.marketCap, a)}
        </span>
      </td>

      {/* SECTOR */}
      <td style={{ padding: '0 8px' }}>
        {sg && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8, fontWeight: 500,
            padding: '1px 5px',
            borderRadius: 2,
            background: badge.bg,
            color: badge.color,
            border: `0.5px solid ${badge.border}`,
            display: 'inline-block',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {sg.display_name}
          </span>
        )}
      </td>

      {/* EXCHANGE */}
      <td style={{ padding: '0 8px' }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
          padding: '1px 4px',
          borderRadius: 1,
          background: '#0a1420',
          color: C.muted,
          border: `0.5px solid ${C.border}`,
          display: 'inline-block',
        }}>
          {a.exchange}
        </span>
      </td>
    </tr>
  );
}
