/**
 * ClubeHeader.jsx
 * Public header for the Clube GMT brand ecosystem.
 *
 * Used by all public /clube/* pages.
 * NOT used by authenticated clube app pages (those use ClubeShell).
 *
 * Props:
 *   lang          — 'pt' | 'en' (controlled by parent)
 *   onLangChange  — (lang: string) => void
 *   onSignIn      — () => void (optional, defaults to /login)
 *   onSignUp      — () => void (optional, defaults to /register)
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { CLUBE_NAV, CLUBE_COLORS, CLUBE_FONTS } from '../styles/index.js';

// ─── Inject scoped styles ──────────────────────────────────────────────────────
let stylesInjected = false;
function injectClubeStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .clube-nav-item {
      position: relative;
      background: none;
      border: none;
      cursor: pointer;
      font-family: 'IBM Plex Sans', sans-serif;
      font-size: 13px;
      font-weight: 500;
      padding: 0 14px;
      height: 100%;
      display: flex;
      align-items: center;
      transition: color 150ms;
    }
    .clube-nav-item:hover { color: rgba(255,255,255,0.9) !important; }
    @media (max-width: 768px) {
      .clube-nav-item { display: none !important; }
      .clube-hamburger { display: flex !important; }
      .clube-desktop-right { display: none !important; }
    }
    @media (min-width: 769px) {
      .clube-hamburger { display: none !important; }
    }
  `;
  document.head.appendChild(style);
}

// ─── Active state helper ───────────────────────────────────────────────────────
function isNavActive(pathname, itemPath) {
  if (itemPath === '/clube') return pathname === '/clube';
  return pathname === itemPath || pathname.startsWith(itemPath + '/');
}

// ─── PT/EN toggle pill ─────────────────────────────────────────────────────────
function LangToggle({ lang, onLangChange }) {
  return (
    <div style={{
      display: 'flex',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 6,
      overflow: 'hidden',
    }}>
      {['pt', 'en'].map(l => (
        <button
          key={l}
          onClick={() => onLangChange(l)}
          style={{
            background: lang === l ? 'rgba(255,255,255,0.12)' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: CLUBE_FONTS.sans,
            fontSize: 11,
            fontWeight: lang === l ? 500 : 400,
            color: lang === l ? '#fff' : 'rgba(255,255,255,0.4)',
            padding: '4px 10px',
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// ─── Auth buttons (shared between desktop + mobile) ─────────────────────────
function AuthButtons({ lang, onSignIn, onSignUp, user, isAuthenticated, style }) {
  const navigate = useNavigate();
  const isClubRole = isAuthenticated && (user?.role === 'club_member' || user?.role === 'club_manager' || user?.role === 'admin');
  const isPlainUser = isAuthenticated && !isClubRole;

  if (isClubRole) {
    return (
      <button
        onClick={() => navigate('/clubes')}
        style={{
          background: CLUBE_COLORS.ctaBg,
          color: CLUBE_COLORS.ctaText,
          border: 'none',
          padding: '7px 18px',
          borderRadius: 6,
          fontFamily: CLUBE_FONTS.sans,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 150ms',
          ...style,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = CLUBE_COLORS.ctaHover; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = CLUBE_COLORS.ctaBg; }}
      >
        {lang === 'pt' ? 'Acessar clube' : 'Access club'}
      </button>
    );
  }

  return (
    <>
      {/* Entrar — only for unauthenticated */}
      {!isAuthenticated && (
        <button
          onClick={onSignIn}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.7)',
            padding: '7px 16px',
            borderRadius: 6,
            fontFamily: CLUBE_FONTS.sans,
            fontSize: 13,
            fontWeight: 400,
            cursor: 'pointer',
            transition: 'border-color 150ms',
            ...style,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
        >
          {lang === 'pt' ? 'Entrar' : 'Sign in'}
        </button>
      )}

      {/* Solicitar acesso — for unauthenticated AND plain user */}
      <button
        onClick={isPlainUser ? onSignUp : onSignUp}
        style={{
          background: CLUBE_COLORS.ctaBg,
          color: CLUBE_COLORS.ctaText,
          border: 'none',
          padding: '7px 18px',
          borderRadius: 6,
          fontFamily: CLUBE_FONTS.sans,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 150ms',
          ...style,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = CLUBE_COLORS.ctaHover; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = CLUBE_COLORS.ctaBg; }}
      >
        {lang === 'pt' ? 'Solicitar acesso' : 'Request access'}
      </button>
    </>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────
export default function ClubeHeader({ lang = 'pt', onLangChange, onSignIn, onSignUp }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignIn = onSignIn || (() => navigate('/login'));
  const handleSignUp = onSignUp || (() => navigate('/register'));

  useEffect(() => { injectClubeStyles(); }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const navItems = CLUBE_NAV[lang] || CLUBE_NAV.pt;

  return (
    <>
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        zIndex: 100,
        background: 'rgba(8,15,26,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(249,195,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
      }}>
        {/* ── LEFT — Brand mark ── */}
        <div
          onClick={() => navigate('/clube')}
          style={{
            width: 140,
            flexShrink: 0,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{
            fontFamily: CLUBE_FONTS.sans,
            fontSize: 18,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.1,
          }}>
            Clube
          </div>
          <div style={{
            fontFamily: CLUBE_FONTS.sans,
            fontSize: 10,
            fontWeight: 400,
            color: 'rgba(249,195,0,0.5)',
            letterSpacing: '0.08em',
            lineHeight: 1.2,
          }}>
            by GMT
          </div>
        </div>

        {/* ── CENTER — Nav items (desktop) ── */}
        <nav style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        }}>
          {navItems.map(item => {
            const active = isNavActive(location.pathname, item.path);
            return (
              <button
                key={item.path}
                className="clube-nav-item"
                onClick={() => navigate(item.path)}
                style={{
                  color: active ? CLUBE_COLORS.accent : 'rgba(255,255,255,0.5)',
                }}
              >
                {item.label}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 14,
                  right: 14,
                  height: 2,
                  background: CLUBE_COLORS.accent,
                  opacity: active ? 1 : 0,
                  transition: 'opacity 200ms ease',
                }} />
              </button>
            );
          })}
        </nav>

        {/* ── RIGHT — Lang toggle + auth buttons (desktop) ── */}
        <div className="clube-desktop-right" style={{
          width: 280,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
        }}>
          {/* Show lang toggle when NOT a club member (club members just see "Acessar clube") */}
          {!(isAuthenticated && (user?.role === 'club_member' || user?.role === 'club_manager' || user?.role === 'admin')) && (
            <LangToggle lang={lang} onLangChange={onLangChange} />
          )}
          <AuthButtons
            lang={lang}
            onSignIn={handleSignIn}
            onSignUp={handleSignUp}
            user={user}
            isAuthenticated={isAuthenticated}
          />
        </div>

        {/* ── HAMBURGER (mobile) ── */}
        <button
          className="clube-hamburger"
          onClick={() => setMobileOpen(o => !o)}
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginLeft: 'auto',
            position: 'relative',
          }}
        >
          <div style={{
            width: 18,
            height: 2,
            background: '#e2e8f0',
            borderRadius: 1,
            transition: 'transform 200ms, opacity 200ms',
            position: 'absolute',
            transform: mobileOpen ? 'rotate(45deg)' : 'translateY(-5px)',
          }} />
          <div style={{
            width: 18,
            height: 2,
            background: '#e2e8f0',
            borderRadius: 1,
            transition: 'opacity 200ms',
            position: 'absolute',
            opacity: mobileOpen ? 0 : 1,
          }} />
          <div style={{
            width: 18,
            height: 2,
            background: '#e2e8f0',
            borderRadius: 1,
            transition: 'transform 200ms, opacity 200ms',
            position: 'absolute',
            transform: mobileOpen ? 'rotate(-45deg)' : 'translateY(5px)',
          }} />
        </button>
      </header>

      {/* ── MOBILE OVERLAY ── */}
      {mobileOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          top: 56,
          zIndex: 99,
          background: 'rgba(8,15,26,0.97)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          {navItems.map(item => {
            const active = isNavActive(location.pathname, item.path);
            return (
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
                  color: active ? CLUBE_COLORS.accent : 'rgba(255,255,255,0.85)',
                  padding: '12px 0',
                  width: 240,
                  textAlign: 'center',
                }}
              >
                {item.label}
              </button>
            );
          })}

          <div style={{ height: 16 }} />

          <LangToggle lang={lang} onLangChange={onLangChange} />

          <div style={{ height: 8 }} />

          <AuthButtons
            lang={lang}
            onSignIn={() => { setMobileOpen(false); handleSignIn(); }}
            onSignUp={() => { setMobileOpen(false); handleSignUp(); }}
            user={user}
            isAuthenticated={isAuthenticated}
            style={{ width: 240, textAlign: 'center' }}
          />
        </div>
      )}
    </>
  );
}
