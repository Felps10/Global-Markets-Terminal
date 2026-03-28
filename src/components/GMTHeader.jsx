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
    .gmt-homepage-dropdown-item:hover {
      background: rgba(255,255,255,0.04);
    }
    .gmt-pub-nav-item {
      position: relative;
      background: none;
      border: none;
      cursor: pointer;
      font-family: 'IBM Plex Sans', sans-serif;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0 16px;
      height: 100%;
      display: flex;
      align-items: center;
      transition: color 150ms;
    }
    .gmt-pub-nav-item:hover { color: rgba(255,255,255,0.9); }
    .gmt-pub-mobile-menu { animation: menuFadeIn 250ms ease both; }
    @keyframes menuFadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 768px) {
      .gmt-pub-nav-item { display: none !important; }
      .gmt-pub-hamburger { display: flex !important; }
    }
    @media (min-width: 769px) {
      .gmt-pub-hamburger { display: none !important; }
    }
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
      <button className="gmt-dropdown-item" onClick={() => { onNav?.('/clubes'); onClose(); }}>
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
  const navigate = useNavigate();
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
        {user ? (
          <div style={{ position: 'relative' }}>
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
            {dropOpen && (
              <UserDropdown user={user} onNav={onNav} onLogout={onLogout} onClose={() => setDropOpen(false)} />
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12,
                color: '#64748b',
                padding: '4px 8px',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
            >
              Entrar
            </button>
            <button
              onClick={() => navigate('/register')}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '0.5px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12,
                color: '#e2e8f0',
                padding: '5px 14px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >
              Criar conta
            </button>
          </div>
        )}
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
    if (pathname.startsWith('/clube') || pathname.startsWith('/clubes')) return 'clube';
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
      <MarketsDropdown user={user} />

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
        onClick={() => navigate('/clubes')}
      >
        Clube
        {!user && (
          <span style={{
            marginLeft: 4,
            fontSize: 8,
            color: '#475569',
            verticalAlign: 'middle',
          }}>
            🔒
          </span>
        )}
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
const PUBLIC_NAV = [
  { label: 'Features', path: '/features' },
  { label: 'Coverage', path: '/coverage' },
  { label: 'Pricing',  path: '/pricing'  },
];

export function GMTPublicHeader({ onSignIn, onSignUp, isHome = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { injectStyles(); }, []);

  useEffect(() => {
    if (!isHome) { setScrolled(true); return; }
    const handler = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, [isHome]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isActive = (path) => location.pathname === path;
  const handleSignIn = onSignIn || (() => navigate('/login'));
  const handleSignUp = onSignUp || (() => navigate('/register'));

  return (
    <>
      <header style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 100,
        transition: 'background 300ms ease, border-color 300ms ease, backdrop-filter 300ms ease',
        background: scrolled ? '#080f1a' : 'transparent',
        borderBottom: scrolled
          ? '1px solid rgba(59,130,246,0.15)'
          : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
      }}>
        <div style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          maxWidth: 1200,
          margin: '0 auto',
        }}>
          {/* LEFT — Logo */}
          <div
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <GmtLogo />
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, letterSpacing: '0.18em', color: '#e2e8f0', marginLeft: 8 }}>
              GMT
            </span>
          </div>

          {/* CENTER — Desktop nav links */}
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            marginLeft: 40,
            height: 52,
          }}>
            {PUBLIC_NAV.map(item => (
              <button
                key={item.path}
                className="gmt-pub-nav-item"
                onClick={() => navigate(item.path)}
                style={{
                  color: isActive(item.path) ? '#3b82f6' : 'rgba(255,255,255,0.5)',
                }}
              >
                {item.label}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 16,
                  right: 16,
                  height: 2,
                  background: '#3b82f6',
                  opacity: isActive(item.path) ? 1 : 0,
                  transition: 'opacity 200ms ease',
                }} />
              </button>
            ))}
          </nav>

          <div style={{ flex: 1 }} />

          {/* RIGHT — Desktop auth buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              onClick={handleSignIn}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12, fontWeight: 500,
                padding: '6px 16px',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            >
              Sign In
            </button>
            <button
              onClick={handleSignUp}
              style={{
                background: '#3b82f6',
                border: '1px solid #3b82f6',
                borderRadius: 6,
                color: '#080f1a',
                cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12, fontWeight: 600,
                padding: '6px 16px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2563eb'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#3b82f6'; }}
            >
              Create Account
            </button>
          </div>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              marginLeft: 'auto',
              flexDirection: 'column',
              gap: 5,
            }}
            className="gmt-pub-hamburger"
          >
            <div style={{
              width: 18, height: 1.5, background: 'rgba(255,255,255,0.6)', borderRadius: 1,
              transition: 'transform 200ms ease, opacity 200ms ease',
              transform: mobileOpen ? 'rotate(45deg) translate(4.5px, 4.5px)' : 'none',
            }} />
            <div style={{
              width: 18, height: 1.5, background: 'rgba(255,255,255,0.6)', borderRadius: 1,
              transition: 'opacity 200ms ease',
              opacity: mobileOpen ? 0 : 1,
            }} />
            <div style={{
              width: 18, height: 1.5, background: 'rgba(255,255,255,0.6)', borderRadius: 1,
              transition: 'transform 200ms ease, opacity 200ms ease',
              transform: mobileOpen ? 'rotate(-45deg) translate(4.5px, -4.5px)' : 'none',
            }} />
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div
          className="gmt-pub-mobile-menu"
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 99,
            background: 'rgba(8,15,26,0.98)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 32,
          }}
        >
          {PUBLIC_NAV.map(item => (
            <button
              key={item.path}
              onClick={() => { setMobileOpen(false); navigate(item.path); }}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer',
                fontFamily: "'Syne', sans-serif",
                fontSize: 28,
                fontWeight: 700,
                color: isActive(item.path) ? '#3b82f6' : 'rgba(255,255,255,0.85)',
                padding: '12px 0',
                width: 240,
                textAlign: 'center',
              }}
            >
              {item.label}
            </button>
          ))}
          <div style={{ height: 24 }} />
          <button
            onClick={() => { setMobileOpen(false); handleSignIn(); }}
            style={{
              background: 'transparent',
              border: '1px solid rgba(59,130,246,0.4)',
              borderRadius: 4,
              color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              padding: '14px 0',
              width: 240,
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMobileOpen(false); handleSignUp(); }}
            style={{
              background: '#3b82f6',
              border: 'none',
              borderRadius: 4,
              color: '#080f1a',
              cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              padding: '14px 0',
              width: 240,
            }}
          >
            Create Account
          </button>
        </div>
      )}
    </>
  );
}

// ─── GMTHomepageHeader (homepage, product-aware navigation) ──────────────────
const PRODUCTS_ITEMS = [
  { name: 'Terminal Mini', desc: 'Mercado ao vivo · gratuito · sem cadastro', href: '/mini' },
  { name: 'Terminal Pro', desc: 'Terminal completo · research · sinais · watchlist', href: '/terminal' },
  { name: 'Club Management', desc: 'NAV · cotização · relatório AI para seu clube', href: '/clube' },
];

export function GMTHomepageHeader({ onSignIn, onSignUp, lang, onLangChange }) {
  const [productsOpen, setProductsOpen] = useState(false);
  const productsRef = useRef(null);

  useEffect(() => { injectStyles(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (productsRef.current && !productsRef.current.contains(e.target)) setProductsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: '#080f1a',
      borderBottom: '0.5px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{
        height: 56,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 32px',
      }}>
        {/* LEFT — logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GmtLogo />
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, letterSpacing: '0.12em', color: '#e2e8f0' }}>
            GMT
          </span>
        </div>

        {/* CENTER — navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div ref={productsRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setProductsOpen(o => !o)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 400,
                color: productsOpen ? '#fff' : 'rgba(255,255,255,0.45)',
                transition: 'color 0.15s', padding: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { if (!productsOpen) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
            >
              Products
            </button>
            {productsOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#0c1525',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                width: 280,
                overflow: 'hidden',
                zIndex: 100,
              }}>
                {PRODUCTS_ITEMS.map((item, i) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="gmt-homepage-dropdown-item"
                    style={{
                      display: 'block',
                      padding: '12px 16px',
                      borderBottom: i < PRODUCTS_ITEMS.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', marginBottom: 3 }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                      {item.desc}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
          <a
            href="#sobre"
            style={{
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 400,
              color: 'rgba(255,255,255,0.45)', textDecoration: 'none', transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
          >
            Sobre
          </a>
          <a
            href="#precos"
            style={{
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 400,
              color: 'rgba(255,255,255,0.45)', textDecoration: 'none', transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
          >
            Preços
          </a>
        </div>

        {/* RIGHT — actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
          {/* PT/EN toggle */}
          <div style={{
            display: 'flex',
            border: '0.5px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            overflow: 'hidden',
          }}>
            {['pt', 'en'].map(l => (
              <button
                key={l}
                onClick={() => onLangChange(l)}
                style={{
                  background: lang === l ? 'rgba(255,255,255,0.12)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 11,
                  color: lang === l ? '#fff' : 'rgba(255,255,255,0.3)',
                  padding: '4px 10px',
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Entrar */}
          <button
            onClick={onSignIn}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13,
              color: 'rgba(255,255,255,0.45)', transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
          >
            Entrar
          </button>

          {/* Começar grátis */}
          <button
            onClick={onSignUp}
            style={{
              background: '#fff', color: '#080f1a', borderRadius: 7, border: 'none',
              padding: '6px 16px', cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 500,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
          >
            Começar grátis
          </button>
        </div>
      </div>
    </header>
  );
}
