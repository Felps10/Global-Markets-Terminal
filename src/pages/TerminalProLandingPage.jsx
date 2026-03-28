import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.js';
import { GMTHomepageHeader } from '../components/GMTHeader.jsx';
import styled, { keyframes } from 'styled-components';

// ─── Decorative elements ─────────────────────────────────────────────────────
const orbFloat = keyframes`
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  33%      { transform: translate(calc(-50% + 30px), calc(-50% - 20px)) scale(1.05); }
  66%      { transform: translate(calc(-50% - 20px), calc(-50% + 15px)) scale(0.97); }
`;

const GridOverlay = styled.div`
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
`;

const GradientOrb = styled.div`
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: ${orbFloat} 14s ease-in-out infinite;
  pointer-events: none;
`;

// ─── Mock terminal card ──────────────────────────────────────────────────────
const MOCK_ASSETS = [
  { sym: 'AAPL', name: 'Apple', price: '$189.84', change: '+0.82%', up: true },
  { sym: 'NVDA', name: 'NVIDIA', price: '$131.28', change: '+3.12%', up: true },
  { sym: 'PETR4', name: 'Petrobras', price: 'R$ 38.42', change: '+1.83%', up: true },
  { sym: 'BTC', name: 'Bitcoin', price: '$67,432', change: '+2.14%', up: true },
  { sym: 'VALE3', name: 'Vale', price: 'R$ 58.91', change: '-0.41%', up: false },
  { sym: 'JPM', name: 'JPMorgan', price: '$198.72', change: '+0.67%', up: true },
];

// ─── Main component ──────────────────────────────────────────────────────────
export default function TerminalProLandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language?.startsWith('en') ? 'en' : 'pt');

  function handleLangChange(newLang) {
    setLang(newLang);
    i18n.changeLanguage(newLang);
  }

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const features = [
    { name: t('terminal_pro.f_global'), desc: t('terminal_pro.f_global_desc') },
    { name: t('terminal_pro.f_brasil'), desc: t('terminal_pro.f_brasil_desc') },
    { name: t('terminal_pro.f_research'), desc: t('terminal_pro.f_research_desc') },
    { name: t('terminal_pro.f_signals'), desc: t('terminal_pro.f_signals_desc') },
    { name: t('terminal_pro.f_charts'), desc: t('terminal_pro.f_charts_desc') },
    { name: t('terminal_pro.f_watchlist'), desc: t('terminal_pro.f_watchlist_desc') },
  ];

  const compareRows = [
    { feature: t('terminal_pro.comparison_access'), mini: t('terminal_pro.free'), pro: t('terminal_pro.subscription'), proCheck: false },
    { feature: t('terminal_pro.comparison_signup'), mini: t('terminal_pro.no'), pro: t('terminal_pro.yes'), proCheck: false },
    { feature: t('terminal_pro.comparison_assets'), mini: '~25', pro: '269', proCheck: false },
    { feature: t('terminal_pro.comparison_research'), mini: null, pro: null, proCheck: true },
    { feature: t('terminal_pro.comparison_signals'), mini: null, pro: null, proCheck: true },
    { feature: t('terminal_pro.comparison_watchlist'), mini: null, pro: null, proCheck: true },
    { feature: t('terminal_pro.comparison_charts'), mini: null, pro: null, proCheck: true },
    { feature: t('terminal_pro.comparison_coverage'), mini: null, pro: null, proCheck: true, miniCheck: true },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#080f1a', color: '#e2e8f0', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <GMTHomepageHeader
        lang={lang}
        onLangChange={handleLangChange}
        onSignIn={() => navigate('/login')}
        onSignUp={() => navigate('/register')}
      />

      {/* ── Section 1: Hero ──────────────────────────────────────────── */}
      <section style={{ padding: '80px 40px 64px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        <GridOverlay />
        <GradientOrb />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(59,130,246,0.1)',
            border: '0.5px solid rgba(59,130,246,0.3)',
            borderRadius: 20,
            padding: '4px 14px',
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            color: '#60a5fa',
            letterSpacing: '0.06em',
            marginBottom: 24,
          }}>
            {t('terminal_pro.badge')}
          </div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 800,
            lineHeight: 1.15,
            color: 'white',
            margin: '0 0 20px',
            whiteSpace: 'pre-line',
          }}>
            {t('terminal_pro.hero_headline_1') + '\n' + t('terminal_pro.hero_headline_2')}
          </h1>
          <p style={{ fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.45)', maxWidth: 540, margin: '0 auto 36px', lineHeight: 1.65 }}>
            {t('terminal_pro.hero_subline')}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/register')}
              style={{
                background: 'white', color: '#080f1a', border: 'none', borderRadius: 8,
                padding: '11px 28px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif", transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {t('terminal_pro.cta_register')}
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'transparent', color: 'rgba(255,255,255,0.35)', border: 'none',
                fontSize: 13, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                transition: 'color 0.15s', padding: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
            >
              {t('terminal_pro.cta_login')}
            </button>
          </div>
        </div>
      </section>

      {/* ── Section 2: What's included ───────────────────────────────── */}
      <section style={{ padding: '64px 40px', maxWidth: 1080, margin: '0 auto' }}>
        <div style={{
          fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.2em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 32, textAlign: 'center',
        }}>
          {t('terminal_pro.included_label')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>
          {/* Features list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ color: '#4ade80', fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', marginBottom: 2 }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Terminal mockup */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '8px 12px',
              borderBottom: '0.5px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff5f57', opacity: 0.6 }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffbd2e', opacity: 0.6 }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#28c840', opacity: 0.6 }} />
              <div style={{
                marginLeft: 12, display: 'flex', gap: 0,
              }}>
                {['Global', 'Brasil', 'Research 🔒'].map((tab, i) => (
                  <span key={tab} style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                    padding: '4px 10px', borderRadius: 4,
                    background: i === 0 ? 'rgba(255,255,255,0.06)' : 'transparent',
                    color: i === 0 ? 'white' : 'rgba(255,255,255,0.3)',
                  }}>{tab}</span>
                ))}
              </div>
            </div>
            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {MOCK_ASSETS.map(a => (
                <div key={a.sym} style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.07)',
                  borderRadius: 6,
                  padding: 8,
                }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'white', fontWeight: 500 }}>{a.sym}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{a.name}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>{a.price}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 2, color: a.up ? '#4ade80' : '#f87171' }}>{a.change}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Comparison table ──────────────────────────────── */}
      <section style={{ padding: '64px 40px', maxWidth: 720, margin: '0 auto' }}>
        <div style={{
          fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.2em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 32, textAlign: 'center',
        }}>
          {t('terminal_pro.comparison_label')}
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
            padding: '12px 20px',
            borderBottom: '0.5px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>{t('terminal_pro.comparison_feature')}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono', monospace", textAlign: 'center' }}>{t('terminal_pro.mini_col')}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono', monospace", textAlign: 'center' }}>{t('terminal_pro.pro_col')}</span>
          </div>
          {compareRows.map((row, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
              padding: '10px 20px',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              borderBottom: i < compareRows.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{row.feature}</span>
              <span style={{ fontSize: 12, textAlign: 'center', color: row.miniCheck ? '#4ade80' : row.mini ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)' }}>
                {row.miniCheck ? '✓' : row.mini ?? '—'}
              </span>
              <span style={{ fontSize: 12, textAlign: 'center', fontWeight: 500, color: row.proCheck ? '#4ade80' : '#e2e8f0' }}>
                {row.proCheck ? '✓' : row.pro}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 4: Final CTA ─────────────────────────────────────── */}
      <section style={{ padding: '64px 40px', textAlign: 'center' }}>
        <h2 style={{
          fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700,
          color: 'rgba(255,255,255,0.92)', margin: '0 0 12px',
        }}>
          {t('terminal_pro.final_title')}
        </h2>
        <p style={{ fontSize: 14, fontWeight: 300, color: 'rgba(255,255,255,0.4)', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.6 }}>
          {t('terminal_pro.final_sub')}
        </p>
        <button
          onClick={() => navigate('/register')}
          style={{
            background: 'white', color: '#080f1a', border: 'none', borderRadius: 8,
            padding: '11px 28px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif", transition: 'opacity 0.15s',
            marginBottom: 16,
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {t('terminal_pro.final_cta')}
        </button>
        <div>
          <button
            onClick={() => navigate('/mini')}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 12, color: 'rgba(255,255,255,0.3)',
              fontFamily: "'IBM Plex Sans', sans-serif", transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
          >
            {t('terminal_pro.final_link')}
          </button>
        </div>
      </section>

      {/* ── Footer strip ─────────────────────────────────────────────── */}
      <div style={{
        borderTop: '0.5px solid rgba(255,255,255,0.06)',
        padding: '12px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>
          {t('terminal_pro.copyright')}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>
          {t('terminal_pro.disclaimer')}
        </span>
      </div>
    </div>
  );
}
