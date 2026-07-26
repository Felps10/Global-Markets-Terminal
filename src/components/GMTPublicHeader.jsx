/**
 * GMTPublicHeader.jsx — Unauthenticated landing-page header
 *
 * Full navigation with Products dropdown, mobile hamburger menu,
 * and sign-in/sign-up buttons.
 *
 * Extracted from GMTHeader.jsx for file-size reduction.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../lib/routes.js';
import { injectStyles, GmtLogo } from './gmtHeaderShared.jsx';

// Flat nav — two products don't need a dropdown (2026-07 consolidation).
// About/Features/Community were retired; their routes redirect in App.jsx.
const PUBLIC_NAV = [
  { key: 'common.nav_terminal_pro', path: ROUTES.public.terminal },
  { key: 'common.nav_live_demo',    path: ROUTES.public.mini },
  { key: 'common.nav_coverage',     path: ROUTES.public.coverage },
  { key: 'common.nav_pricing',      path: ROUTES.public.pricing },
];

// PT/EN segment toggle. i18next persists the choice to localStorage
// ('gmt-lang' via the language detector), so it sticks across visits.
// Only /terminal and /mini render translated copy today — the remaining
// public pages are keyed out in the i18n pass (PR 4 of the redesign).
function LangToggle({ compact = false }) {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('pt') ? 'pt' : 'en';

  return (
    <div style={{
      display: 'inline-flex',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 6,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {['pt', 'en'].map((lng) => (
        <button
          key={lng}
          onClick={() => i18n.changeLanguage(lng)}
          style={{
            padding: compact ? '8px 16px' : '5px 9px',
            background: current === lng ? 'rgba(255,255,255,0.1)' : 'transparent',
            border: 'none',
            color: current === lng ? '#fff' : 'rgba(255,255,255,0.35)',
            cursor: 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: compact ? 13 : 11,
            fontWeight: current === lng ? 600 : 400,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            transition: 'all 0.15s',
          }}
        >
          {lng}
        </button>
      ))}
    </div>
  );
}

export default function GMTPublicHeader({ isHome = false }) {
  const { t } = useTranslation();
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
  const handleSignIn = () => navigate(ROUTES.auth.login);
  const handleSignUp = () => navigate(ROUTES.auth.register);

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
                  color: isActive(item.path) ? 'var(--c-accent)' : 'rgba(255,255,255,0.5)',
                }}
              >
                {t(item.key)}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 16,
                  right: 16,
                  height: 2,
                  background: 'var(--c-accent)',
                  opacity: isActive(item.path) ? 1 : 0,
                  transition: 'opacity 200ms ease',
                }} />
              </button>
            ))}

          </nav>

          <div style={{ flex: 1 }} />

          {/* RIGHT — Desktop language toggle + auth buttons */}
          <div className="gmt-pub-right" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <LangToggle />
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
              {t('common.sign_in')}
            </button>
            <button
              onClick={handleSignUp}
              style={{
                background: 'var(--c-accent)',
                border: '1px solid var(--c-accent)',
                borderRadius: 6,
                color: '#080f1a',
                cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12, fontWeight: 600,
                padding: '6px 16px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-accent-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--c-accent)'; }}
            >
              {t('common.create_account')}
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
            // flex-start + scroll, not center: centered flex clips the top
            // item when the menu is taller than the viewport
            justifyContent: 'flex-start',
            overflowY: 'auto',
            padding: '76px 0 40px',
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
                color: isActive(item.path) ? 'var(--c-accent)' : 'rgba(255,255,255,0.85)',
                padding: '12px 0',
                width: 240,
                textAlign: 'center',
              }}
            >
              {t(item.key)}
            </button>
          ))}

          <div style={{ height: 8 }} />
          <LangToggle compact />
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
            {t('common.sign_in')}
          </button>
          <button
            onClick={() => { setMobileOpen(false); handleSignUp(); }}
            style={{
              background: 'var(--c-accent)',
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
            {t('common.create_account')}
          </button>
        </div>
      )}
    </>
  );
}
