/**
 * GMTHeader.jsx — Unified terminal header
 *
 * Layer 1 (48px)  Top bar:  hamburger · GMT logo · market pill · [space] · clock · user menu
 * Layer 2 (38px)  Nav bar:  TERMINAL · MARKETS ▾ · CATALOG · NEWS · [space] · LIVE · asset count
 * Layer 3 (48px)  Ticker:   dual scrolling price rows — only when showTicker === true
 *
 * Special modes:
 *   adminNav — { activeTab, onTabChange } — renders admin tabs instead of terminal nav,
 *              suppresses the ticker entirely.
 *
 * Exports:
 *   default  GMTHeader        — authenticated header (terminal + admin modes)
 *   named    GMTPublicHeader  — unauthenticated landing-page header (top bar only)
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LiveClock from './LiveClock.jsx';
import MarketStatusPill, { MARKETS } from './MarketStatusPill.jsx';
import TickerStrip from './TickerStrip.jsx';
import MarketsDropdown from './MarketsDropdown.jsx';
import { useTaxonomy } from '../context/TaxonomyContext.jsx';

// ─── Inject nav + dropdown styles ─────────────────────────────────────────────
const STYLE_ID = 'gmt-header-nav-styles';

function injectStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=IBM+Plex+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');
    .gmt-nav-item {
      position: relative;
      background: transparent;
      border: none;
      cursor: pointer;
      font-family: 'IBM Plex Sans', sans-serif;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #64748b;
      padding: 0;
      height: 38px;
      transition: color 0.15s;
    }
    .gmt-nav-item:hover { color: #cbd5e1; }
    .gmt-nav-item.active { color: #e2e8f0; }
    .gmt-nav-item.active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: #3b82f6;
      border-radius: 2px 2px 0 0;
    }
    .gmt-nav-item:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }
    .gmt-user-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: transparent;
      border: 1px solid rgba(51,65,85,0.6);
      border-radius: 4px;
      padding: 4px 10px 4px 6px;
      cursor: pointer;
      color: #cbd5e1;
      font-family: 'IBM Plex Sans', sans-serif;
      font-size: 12px;
      transition: border-color 0.15s;
    }
    .gmt-user-btn:hover { border-color: rgba(100,116,139,0.8); }
    .gmt-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      min-width: 200px;
      background: #0b1220;
      border: 1px solid rgba(51,65,85,0.85);
      border-radius: 6px;
      overflow: hidden;
      z-index: 200;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    }
    .gmt-dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 9px 16px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      font-family: 'IBM Plex Sans', sans-serif;
      font-size: 12px;
      text-align: left;
      transition: background 0.1s, color 0.1s;
    }
    .gmt-dropdown-item:hover { background: rgba(255,255,255,0.04); color: #e2e8f0; }
    .gmt-dropdown-item.danger { color: #f87171; }
    .gmt-dropdown-item.danger:hover { background: rgba(248,113,113,0.08); color: #fca5a5; }
    .gmt-dropdown-divider { height: 1px; background: rgba(30,41,59,0.8); margin: 2px 0; }
    .gmt-admin-tab {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      font-family: 'IBM Plex Sans', sans-serif;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #64748b;
      padding: 0 2px;
      height: 38px;
      transition: color 0.15s, border-color 0.15s;
    }
    .gmt-admin-tab:hover { color: #cbd5e1; }
    .gmt-admin-tab.active { color: #e2e8f0; border-bottom-color: #f59e0b; }
    .gmt-admin-tab:focus-visible { outline: 2px solid #f59e0b; outline-offset: 2px; }
  `;
  document.head.appendChild(el);
}

// ─── Logo SVG ─────────────────────────────────────────────────────────────────
function GmtLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0 }}>
      <rect width="22" height="22" rx="4" fill="rgba(59,130,246,0.15)" />
      <rect x="3"  y="14" width="3" height="5"  rx="1" fill="#3b82f6" />
      <rect x="7"  y="10" width="3" height="9"  rx="1" fill="#3b82f6" opacity="0.85" />
      <rect x="11" y="6"  width="3" height="13" rx="1" fill="#3b82f6" opacity="0.7" />
      <rect x="15" y="3"  width="3" height="16" rx="1" fill="#3b82f6" opacity="0.55" />
    </svg>
  );
}

// ─── Vertical divider ─────────────────────────────────────────────────────────
function VDiv({ mx = 12 }) {
  return (
    <div style={{
      width: 1, height: 20,
      background: 'rgba(51,65,85,0.5)',
      margin: `0 ${mx}px`,
      flexShrink: 0,
    }} />
  );
}

// ─── User initials ────────────────────────────────────────────────────────────
function getInitials(user) {
  if (!user?.name) return '?';
  const p = user.name.trim().split(/\s+/);
  return p.length === 1
    ? p[0][0].toUpperCase()
    : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

// ─── User dropdown ────────────────────────────────────────────────────────────
function UserDropdown({ user, onNav, onLogout, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="gmt-dropdown" ref={ref}>
      <div style={{ padding: '10px 16px 9px', borderBottom: '1px solid rgba(30,41,59,0.8)' }}>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
          {user.name}
        </div>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: '#475569', marginTop: 2 }}>
          {user.email || user.role}
        </div>
      </div>
      {user.role === 'admin' && (
        <button className="gmt-dropdown-item" onClick={() => { onNav?.('/admin'); onClose(); }}>
          <span>⚙</span> Admin Panel
          <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '1px 5px', borderRadius: 2 }}>
            ADMIN
          </span>
        </button>
      )}
      <button className="gmt-dropdown-item" onClick={() => { onNav?.('/clube'); onClose(); }}>
        <span>📊</span> Clube
      </button>
      <button className="gmt-dropdown-item" onClick={() => { onNav?.('/app/settings'); onClose(); }}>
        <span>⚙</span> Settings
      </button>
      <div className="gmt-dropdown-divider" />
      <button className="gmt-dropdown-item danger" onClick={() => { onLogout?.(); onClose(); }}>
        <span>↪</span> Sign Out
      </button>
    </div>
  );
}

// ─── Mode indicator badge (read-only — switching is in the hamburger menu) ───
function ModeBadge() {
  const location  = useLocation();
  const isBrasil  = location.pathname.startsWith('/app/brasil');
  const accent    = isBrasil ? '#F9C300' : '#00E676';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 14px', borderRadius: 20,
      background: isBrasil ? 'rgba(249,195,0,0.12)' : 'rgba(0,230,118,0.12)',
      border: `1px solid ${isBrasil ? 'rgba(249,195,0,0.3)' : 'rgba(0,230,118,0.3)'}`,
    }}>
      <span style={{ fontSize: 12 }}>{isBrasil ? '🇧🇷' : '🌐'}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
        letterSpacing: '1.5px', color: accent,
      }}>
        {isBrasil ? 'BRASIL' : 'GLOBAL'}
      </span>
    </div>
  );
}

// ─── Shared top bar (Layer 1) ─────────────────────────────────────────────────
function TopBar({ user, onMenuOpen, onNav, onLogout, selectedMarketId, setSelectedMarketId }) {
  const [dropOpen, setDropOpen] = useState(false);
  const selectedMarket = MARKETS.find(m => m.id === selectedMarketId) || MARKETS[0];

  return (
    <div style={{
      height: 48,
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '0 20px',
    }}>
      {/* LEFT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {onMenuOpen && (
          <button
            onClick={onMenuOpen}
            title="Menu"
            style={{
              background: 'transparent',
              border: '1px solid rgba(51,65,85,0.6)',
              borderRadius: 3,
              cursor: 'pointer',
              padding: '6px 9px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              flexShrink: 0,
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(100,116,139,0.8)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(51,65,85,0.6)'; }}
          >
            <div style={{ width: 16, height: 2, background: '#64748b', borderRadius: 1 }} />
            <div style={{ width: 16, height: 2, background: '#64748b', borderRadius: 1 }} />
            <div style={{ width: 11, height: 2, background: '#64748b', borderRadius: 1 }} />
          </button>
        )}
        <VDiv mx={onMenuOpen ? 12 : 0} />
        <GmtLogo />
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, letterSpacing: '0.18em', color: '#e2e8f0', marginLeft: 8 }}>
          GMT
        </span>
        <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10, color: '#334155', marginLeft: 6, letterSpacing: '0.06em' }}>
          GLOBAL MARKETS
        </span>
        <VDiv />
        <MarketStatusPill selected={selectedMarketId} setSelected={setSelectedMarketId} />
      </div>

      {/* CENTER — mode indicator */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <ModeBadge />
      </div>

      {/* RIGHT */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <div style={{ minWidth: 110 }}>
          <LiveClock tz={selectedMarket.tz} tzLabel={selectedMarket.tzLabel} />
        </div>
        <VDiv mx={16} />
        <div style={{ position: 'relative' }}>
          {user && (
            <button className="gmt-user-btn" onClick={() => setDropOpen(o => !o)}>
              <div style={{
                width: 24, height: 24, borderRadius: 4,
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, fontWeight: 700, color: '#93c5fd', flexShrink: 0,
              }}>
                {getInitials(user)}
              </div>
              <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </span>
              {user.role === 'admin' && (
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '1px 4px', borderRadius: 2 }}>
                  ADMIN
                </span>
              )}
              <span style={{ color: '#334155', fontSize: 10 }}>▾</span>
            </button>
          )}
          {dropOpen && user && (
            <UserDropdown user={user} onNav={onNav} onLogout={onLogout} onClose={() => setDropOpen(false)} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── NAV config ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Terminal' },
  { id: 'catalog',   label: 'Catalog'  },
  { id: 'news',      label: 'News'     },
];

const ADMIN_NAV_ITEMS = [
  { id: 'taxonomy', label: 'Taxonomy' },
  { id: 'users',    label: 'Users'    },
];

// ─── GMTHeader (authenticated) ────────────────────────────────────────────────
export default function GMTHeader({
  activePage        = 'dashboard',
  user,
  onMenuOpen,
  onNav,
  onLogout,
  onAssetClick,
  showTicker        = true,
  tickerItems       = [],
  adminNav,                   // { activeTab, onTabChange } — admin mode
  watchlistEnabled  = false,  // show Watchlist tab when user is authenticated
}) {
  const [selectedMarketId, setSelectedMarketId] = useState('nyse');
  const { globalTaxonomy, brazilTaxonomy } = useTaxonomy();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const isBrasilMode = pathname.startsWith('/app/brasil');
  const isTerminalPage = pathname.startsWith('/app/global') || pathname.startsWith('/app/brasil');

  // Derive active page from pathname for nav bar highlighting
  const derivedActivePage = useMemo(() => {
    if (pathname.startsWith('/app/global') || pathname.startsWith('/app/brasil')) return 'terminal';
    if (pathname.startsWith('/markets/')) return 'markets';
    if (pathname.startsWith('/app/catalog')) return 'catalog';
    if (pathname.startsWith('/app/news')) return 'news';
    if (pathname.startsWith('/app/watchlist')) return 'watchlist';
    if (pathname.startsWith('/clube')) return 'clube';
    return activePage;
  }, [pathname, activePage]);

  // Scoped counts based on terminal mode
  const scopedStats = useMemo(() => {
    if (isBrasilMode) {
      const brGroups = brazilTaxonomy || [];
      const brSubgroups = brGroups.flatMap(g => g.subgroups || []);
      const brAssets = brSubgroups.flatMap(s => s.assets || []);
      return {
        assets: brAssets.length, groups: brGroups.length, subgroups: brSubgroups.length,
        label: 'ATIVOS', groupLabel: 'GRUPOS', subgroupLabel: 'SUBGRUPOS',
      };
    }
    const glGroups = globalTaxonomy || [];
    const glSubgroups = glGroups.flatMap(g => g.subgroups || []);
    const glAssets = glSubgroups.flatMap(s => s.assets || []);
    return {
      assets: glAssets.length, groups: glGroups.length, subgroups: glSubgroups.length,
      label: 'ASSETS', groupLabel: 'GROUPS', subgroupLabel: 'SUBGROUPS',
    };
  }, [globalTaxonomy, brazilTaxonomy, isBrasilMode]);

  useEffect(() => { injectStyles(); }, []);

  const navBar2 = adminNav ? (
    <div style={{
      height: 38,
      background: 'rgba(10,17,30,0.6)',
      borderBottom: '1px solid rgba(30,41,59,0.6)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 28,
    }}>
      {ADMIN_NAV_ITEMS.map(item => (
        <button
          key={item.id}
          className={`gmt-admin-tab${adminNav.activeTab === item.id ? ' active' : ''}`}
          onClick={() => adminNav.onTabChange(item.id)}
        >
          {item.label}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#f59e0b' }}>
        ADMIN PANEL
      </span>
    </div>
  ) : (
    <div style={{
      height: 38,
      background: 'rgba(10,17,30,0.6)',
      borderBottom: '1px solid rgba(30,41,59,0.6)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 28,
    }}>
      {/* Terminal */}
      <button
        className={`gmt-nav-item${derivedActivePage === 'terminal' ? ' active' : ''}`}
        onClick={() => onNav && onNav('dashboard')}
      >
        Terminal
      </button>

      {/* Markets dropdown — between Terminal and Heatmap */}
      <MarketsDropdown />

      {/* Catalog · News (+ optional Watchlist) */}
      {[
        { id: 'catalog',   label: 'Catalog'  },
        { id: 'news',      label: 'News'     },
        ...(watchlistEnabled ? [{ id: 'watchlist', label: 'Watchlist' }] : []),
      ].map(item => (
        <button
          key={item.id}
          className={`gmt-nav-item${derivedActivePage === item.id ? ' active' : ''}`}
          onClick={() => onNav && onNav(item.id)}
        >
          {item.label}
        </button>
      ))}
      <button
        className={`gmt-nav-item${derivedActivePage === 'clube' ? ' active' : ''}`}
        onClick={() => navigate('/clube')}
      >
        Clube
      </button>
      <div style={{ flex: 1 }} />
      {isTerminalPage && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 5px #22c55e' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#334155', letterSpacing: '0.08em' }}>
              LIVE · 30s REFRESH
            </span>
          </div>
          <div style={{ width: 1, height: 14, background: 'rgba(51,65,85,0.5)', margin: '0 12px' }} />
        </>
      )}
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#334155', letterSpacing: '0.06em' }}>
        {scopedStats.assets} {scopedStats.label} · {scopedStats.groups} {scopedStats.groupLabel} · {scopedStats.subgroups} {scopedStats.subgroupLabel}
      </span>
    </div>
  );

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: '#080f1a',
      borderBottom: '1px solid rgba(51,65,85,0.5)',
    }}>
      <TopBar
        user={user}
        onMenuOpen={onMenuOpen}
        onNav={onNav}
        onLogout={onLogout}
        selectedMarketId={selectedMarketId}
        setSelectedMarketId={setSelectedMarketId}
      />
      {navBar2}
      {!adminNav && showTicker && tickerItems.length > 0 && (
        <div style={{ background: 'rgba(8,15,26,0.95)', padding: '4px 0', borderBottom: '1px solid rgba(15,23,42,0.9)' }}>
          <div style={{ height: 20, overflow: 'hidden' }}>
            <TickerStrip items={tickerItems}                    direction={1}  speed={32} onAssetClick={onAssetClick} />
          </div>
          <div style={{ height: 20, overflow: 'hidden', marginTop: 2 }}>
            <TickerStrip items={[...tickerItems].reverse()} direction={-1} speed={28} onAssetClick={onAssetClick} />
          </div>
        </div>
      )}
    </header>
  );
}

// ─── GMTPublicHeader (landing page, unauthenticated) ──────────────────────────
export function GMTPublicHeader({ onSignIn, onSignUp }) {
  const [selectedMarketId, setSelectedMarketId] = useState('nyse');

  useEffect(() => { injectStyles(); }, []);

  const selectedMarket = MARKETS.find(m => m.id === selectedMarketId) || MARKETS[0];

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: '#080f1a',
      borderBottom: '1px solid rgba(51,65,85,0.5)',
    }}>
      <div style={{
        height: 48,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 20px',
      }}>
        {/* LEFT */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <VDiv mx={0} />
          <GmtLogo />
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, letterSpacing: '0.18em', color: '#e2e8f0', marginLeft: 8 }}>
            GMT
          </span>
          <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10, color: '#334155', marginLeft: 6, letterSpacing: '0.06em' }}>
            GLOBAL MARKETS
          </span>
          <VDiv />
          <MarketStatusPill selected={selectedMarketId} setSelected={setSelectedMarketId} />
        </div>

        {/* CENTER */}
        <div />

        {/* RIGHT */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0 }}>
          <div style={{ minWidth: 110 }}>
            <LiveClock tz={selectedMarket.tz} tzLabel={selectedMarket.tzLabel} />
          </div>
          <VDiv mx={16} />
          {onSignIn && (
            <button
              onClick={onSignIn}
              style={{
                background: 'transparent',
                border: '1px solid rgba(51,65,85,0.7)',
                borderRadius: 4,
                color: '#64748b',
                cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12, fontWeight: 500,
                padding: '6px 16px',
                transition: 'color 0.15s, border-color 0.15s',
                marginRight: 8,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.borderColor = 'rgba(100,116,139,0.7)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(51,65,85,0.7)'; }}
            >
              Sign In
            </button>
          )}
          {onSignUp && (
            <button
              onClick={onSignUp}
              style={{
                background: '#1d4ed8',
                border: '1px solid #1d4ed8',
                borderRadius: 4,
                color: '#fff',
                cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12, fontWeight: 500,
                padding: '6px 16px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2563eb'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#1d4ed8'; }}
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
