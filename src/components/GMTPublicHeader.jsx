/**
 * GMTPublicHeader.jsx — Unauthenticated landing-page header
 *
 * Full navigation with Products dropdown, mobile hamburger menu,
 * and sign-in/sign-up buttons.
 *
 * Extracted from GMTHeader.jsx for file-size reduction.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CLUBE_COLORS } from '../clube/styles/index.js';
import { ROUTES } from '../lib/routes.js';
import { injectStyles, GmtLogo, PRODUCTS_ITEMS } from './gmtHeaderShared.js';

const PUBLIC_NAV_BEFORE_PRODUCTS = [
  { label: 'About', path: '/about' },
];

const PUBLIC_NAV_AFTER_PRODUCTS = [
  { label: 'Features',  path: '/features'  },
  { label: 'Coverage',  path: '/coverage'  },
  { label: 'Pricing',   path: '/pricing'   },
  { label: 'Community', path: '/community' },
];

export default function GMTPublicHeader({ onSignIn, onSignUp, isHome = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const productsRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { injectStyles(); }, []);

  useEffect(() => {
    function handleClick(e) {
      if (productsRef.current && !productsRef.current.contains(e.target)) {
        setProductsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
  const handleSignIn = onSignIn || (() => navigate(ROUTES.auth.login));
  const handleSignUp = onSignUp || (() => navigate(ROUTES.auth.register));

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
            {/* About — before Products */}
            {PUBLIC_NAV_BEFORE_PRODUCTS.map(item => (
              <button
                key={item.path}
                className="gmt-pub-nav-item"
                onClick={() => navigate(item.path)}
                style={{
                  color: isActive(item.path) ? 'var(--c-accent)' : 'rgba(255,255,255,0.5)',
                }}
              >
                {item.label}
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

            {/* Products dropdown */}
            <div ref={productsRef} style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => setProductsOpen(o => !o)}
                className="gmt-pub-nav-item"
                style={{
                  color: productsOpen ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { if (!productsOpen) e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
              >
                Products
                <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.6 }}>
                  {productsOpen ? '▲' : '▼'}
                </span>
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
                    <button
                      key={item.name}
                      onClick={() => { navigate(item.href); setProductsOpen(false); }}
                      className="gmt-homepage-dropdown-item"
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderBottom: i < PRODUCTS_ITEMS.length - 1
                          ? '0.5px solid rgba(255,255,255,0.06)'
                          : 'none',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', marginBottom: 3 }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                        {item.desc}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Features, Coverage, Pricing, Community — after Products */}
            {PUBLIC_NAV_AFTER_PRODUCTS.map(item => (
              <button
                key={item.path}
                className="gmt-pub-nav-item"
                onClick={() => navigate(item.path)}
                style={{
                  color: isActive(item.path) ? 'var(--c-accent)' : 'rgba(255,255,255,0.5)',
                }}
              >
                {item.label}
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

            {/* Clube — separate product, gold accent */}
            <button
              onClick={() => navigate('/clube')}
              style={{
                position: 'relative',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                padding: '0 16px',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                color: location.pathname.startsWith('/clube')
                  ? CLUBE_COLORS.accent
                  : 'rgba(249,195,0,0.55)',
                transition: 'color 150ms',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = CLUBE_COLORS.accent; }}
              onMouseLeave={(e) => {
                if (!location.pathname.startsWith('/clube')) {
                  e.currentTarget.style.color = 'rgba(249,195,0,0.55)';
                }
              }}
            >
              Clube
              <span style={{
                marginLeft: 5,
                fontSize: 9,
                color: 'rgba(249,195,0,0.4)',
                fontWeight: 400,
                letterSpacing: '0.05em',
              }}>
                →
              </span>
            </button>
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
          {PUBLIC_NAV_BEFORE_PRODUCTS.map(item => (
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
              {item.label}
            </button>
          ))}

          <div style={{ width: '100%', maxWidth: 280 }}>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
              marginBottom: 12, paddingLeft: 4,
            }}>
              Products
            </div>
            {PRODUCTS_ITEMS.map(item => (
              <button
                key={item.name}
                onClick={() => { setMobileOpen(false); navigate(item.href); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 4px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                  {item.desc}
                </div>
              </button>
            ))}
          </div>

          {PUBLIC_NAV_AFTER_PRODUCTS.map(item => (
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
              {item.label}
            </button>
          ))}

          <div style={{
            width: '100%',
            height: '0.5px',
            background: 'rgba(249,195,0,0.15)',
            margin: '8px 0',
          }} />
          <button
            onClick={() => { setMobileOpen(false); navigate('/clube'); }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 18,
              fontWeight: 600,
              color: CLUBE_COLORS.accent,
              letterSpacing: '0.01em',
              padding: '4px 0',
            }}
          >
            Clube →
          </button>

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
            Create Account
          </button>
        </div>
      )}
    </>
  );
}
