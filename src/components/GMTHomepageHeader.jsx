/**
 * GMTHomepageHeader.jsx — Homepage product-aware navigation header
 *
 * Sticky header with About, Products dropdown, Pricing, PT/EN toggle,
 * and sign-in/sign-up buttons.
 *
 * Extracted from GMTHeader.jsx for file-size reduction.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { injectStyles, GmtLogo, PRODUCTS_ITEMS } from './gmtHeaderShared.js';

export default function GMTHomepageHeader({ onSignIn, onSignUp, lang, onLangChange }) {
  const navigate = useNavigate();
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
          <button
            onClick={() => navigate('/about')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13,
              fontWeight: 400, color: 'rgba(255,255,255,0.45)',
              textDecoration: 'none', transition: 'color 0.15s',
              padding: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
          >
            About
          </button>
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
                      borderBottom: i < PRODUCTS_ITEMS.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
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
          <button
            onClick={() => navigate('/pricing')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13,
              fontWeight: 400, color: 'rgba(255,255,255,0.45)',
              textDecoration: 'none', transition: 'color 0.15s',
              padding: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
          >
            Pricing
          </button>
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
