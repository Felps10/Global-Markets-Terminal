/**
 * gmtHeaderShared.js — Shared utilities for GMT header components.
 * Used by GMTHeader, GMTPublicHeader, and GMTHomepageHeader.
 */

// ─── Inject nav + dropdown styles ─────────────────────────────────────────────
const STYLE_ID = 'gmt-header-nav-styles';

export function injectStyles() {
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
      background: var(--c-accent);
      border-radius: 2px 2px 0 0;
    }
    .gmt-nav-item:focus-visible { outline: 2px solid var(--c-accent); outline-offset: 2px; }
    .gmt-nav-item.active.gmt-nav-brazil::after { background: var(--c-accent-br); }
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
export function GmtLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0 }}>
      <rect width="22" height="22" rx="4" fill="rgba(59,130,246,0.15)" />
      <rect x="3"  y="14" width="3" height="5"  rx="1" fill="var(--c-accent)" />
      <rect x="7"  y="10" width="3" height="9"  rx="1" fill="var(--c-accent)" opacity="0.85" />
      <rect x="11" y="6"  width="3" height="13" rx="1" fill="var(--c-accent)" opacity="0.7" />
      <rect x="15" y="3"  width="3" height="16" rx="1" fill="var(--c-accent)" opacity="0.55" />
    </svg>
  );
}

// ─── Products dropdown items ──────────────────────────────────────────────────
export const PRODUCTS_ITEMS = [
  {
    name: 'GMT Mini',
    desc: 'Mercado ao vivo · gratuito · sem cadastro',
    href: '/mini',
  },
  {
    name: 'GMT Pro',
    desc: 'Terminal completo · research · sinais · watchlist',
    href: '/terminal',
  },
];
