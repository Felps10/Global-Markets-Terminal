import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.js';
import { useSnapshot } from '../hooks/useSnapshot.js';
import { ROUTES } from '../lib/routes.js';
import { TOTAL_ASSETS, GROUP_COUNT, SUBGROUP_COUNT, SOURCE_COUNT, countByGroup } from '../lib/publicStats.js';

function getRedirectForRole(role) {
  if (role === 'admin') return ROUTES.admin;
  return ROUTES.terminal.global;
}

const DISPLAY_NAMES = {
  '^GSPC': 'S&P 500', '^DJI': 'Dow Jones', '^IXIC': 'NASDAQ',
  'EURUSD=X': 'EUR/USD', 'GBPUSD=X': 'GBP/USD', 'USDJPY=X': 'USD/JPY',
  'USDCAD=X': 'USD/CAD', 'AUDUSD=X': 'AUD/USD',
  '^FTSE': 'FTSE 100', '^N225': 'Nikkei 225',
};

function fmtPrice(p) {
  if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 100)   return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

const TICKER_SYMBOLS = [
  '^GSPC', '^DJI', '^IXIC', 'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META',
  'EURUSD=X', 'GBPUSD=X', 'USDJPY=X',
  'JPM', 'GS', 'XOM', 'CVX', 'LLY', 'UNH', 'TSM', 'AVGO',
  '^FTSE', '^N225', 'USDCAD=X', 'AUDUSD=X',
  'BTC', 'ETH', 'SOL',
];

function buildTickerItems(assets) {
  return TICKER_SYMBOLS
    .filter(sym => assets[sym])
    .map(sym => {
      const a = assets[sym];
      return {
        sym:   DISPLAY_NAMES[sym] || sym,
        price: fmtPrice(a.price),
        chg:   `${a.changePct >= 0 ? '+' : ''}${a.changePct.toFixed(2)}%`,
        pos:   a.changePct >= 0,
      };
    });
}

// Copy lives in public/locales/{en,pt}/translation.json (landing.*) — these
// builders run inside the component so the arrays re-resolve on language change.
const buildCoverageStats = (t) => [
  { num: String(countByGroup('equities')), label: t('landing.tile_equities') },
  { num: String(countByGroup('br-mercado')), label: t('landing.tile_b3') },
  { num: String(countByGroup('currencies')), label: t('landing.tile_fx') },
  { num: String(countByGroup('indices')), label: t('landing.tile_indices') },
  { num: String(countByGroup('commodities')), label: t('landing.tile_commodities') },
  { num: String(countByGroup('digital-assets')), label: t('landing.tile_crypto') },
];

const buildFeatureTags = (t) => [1, 2, 3, 4, 5, 6].map((i) => ({
  tag: t(`landing.feat_tag_${i}`),
  name: t(`landing.feat_name_${i}`),
}));

const buildWhyPills = (t) => [1, 2, 3, 4, 5, 6, 7].map((i) => t(`landing.why_pill_${i}`));

const buildWhyCells = (t) => [1, 2, 3, 4, 5, 6].map((i) => ({
  title: t(`landing.why_${i}_title`, { sources: SOURCE_COUNT }),
  body: t(`landing.why_${i}_body`, { assets: TOTAL_ASSETS }),
}));

// Provider names are brands; only the descriptions translate.
const buildDataSources = (t) => [
  { name: 'FMP Premium', desc: t('landing.source_fmp_desc') },
  { name: 'EODHD All-World', desc: t('landing.source_eodhd_desc') },
  { name: 'BRAPI Pro + BCB', desc: t('landing.source_brapi_desc') },
  { name: 'CoinGecko + FRED + Finnhub', desc: t('landing.source_cgfred_desc') },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const COVERAGE_STATS = buildCoverageStats(t);
  const FEATURE_TAGS = buildFeatureTags(t);
  const WHY_GMT_PILLS = buildWhyPills(t);
  const WHY_GMT_CELLS = buildWhyCells(t);
  const DATA_SOURCES = buildDataSources(t);
  const { isAuthenticated, user } = useAuth();
  const { assets: tickerAssets, snapshotLabel } = useSnapshot();
  const TICKER_ITEMS = buildTickerItems(tickerAssets);
  const [tickerPaused, setTickerPaused] = useState(false);
  const [primaryHover, setPrimaryHover] = useState(false);
  const [secondaryHover, setSecondaryHover] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);
  const [signInLinkHover, setSignInLinkHover] = useState(false);
  const [coverageLinkHover, setCoverageLinkHover] = useState(false);
  const [featuresLinkHover, setFeaturesLinkHover] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(getRedirectForRole(user?.role), { replace: true });
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.gmt-section-reveal')
      .forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const goLogin    = () => navigate('/login');
  const goRegister = () => navigate('/register');

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%,100% { opacity: 1; } 50% { opacity: 0.2; }
        }
        @keyframes tickerScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes nodePulse {
          0%,100% { opacity: 0.6; } 50% { opacity: 1; }
        }
        .hero-text { animation: fadeInUp 0.8s ease both; }
        .hero-sub  { animation: fadeInUp 0.8s 0.15s ease both; }
        .hero-cta  { animation: fadeInUp 0.8s 0.3s ease both; }
        .gmt-node  { animation: nodePulse 3s ease-in-out infinite; }
        .gmt-blink { animation: blink 1.5s ease-in-out infinite; }
        .gmt-section-reveal {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 500ms ease, transform 500ms ease;
        }
        .gmt-section-reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-text, .hero-sub, .hero-cta { animation: none !important; opacity: 1 !important; }
          .gmt-node  { animation: none !important; opacity: 0.6 !important; }
          .gmt-blink { animation: none !important; opacity: 1 !important; }
          .gmt-section-reveal { transition: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
      <div style={{
        background: '#080f1a',
        color: 'rgba(255,255,255,0.92)',
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}>

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          minHeight: '100vh',
          alignItems: 'center',
          padding: '160px 80px 80px',
          gap: 60,
        }}>
          {/* LEFT — Globe SVG */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg
              viewBox="0 0 400 400"
              style={{
                width: '100%',
                maxWidth: 420,
                filter: 'drop-shadow(0 0 40px var(--c-accent-dim))',
              }}
            >
              {/* Outer circle */}
              <circle cx={200} cy={200} r={160} stroke="var(--c-accent)" strokeWidth={1} fill="none" opacity={0.6} />

              {/* Latitude ellipses */}
              <ellipse cx={200} cy={110} rx={160} ry={40} fill="none" stroke="var(--c-accent)" strokeWidth={0.6} opacity={0.3} />
              <ellipse cx={200} cy={145} rx={160} ry={90} fill="none" stroke="var(--c-accent)" strokeWidth={0.6} opacity={0.3} />
              <ellipse cx={200} cy={200} rx={160} ry={160} fill="none" stroke="var(--c-accent)" strokeWidth={0.6} opacity={0.3} />
              <ellipse cx={200} cy={255} rx={160} ry={90} fill="none" stroke="var(--c-accent)" strokeWidth={0.6} opacity={0.3} />
              <ellipse cx={200} cy={290} rx={160} ry={40} fill="none" stroke="var(--c-accent)" strokeWidth={0.6} opacity={0.3} />

              {/* Longitude lines */}
              {[0, 30, 60, 90, 120, 150].map(deg => (
                <ellipse
                  key={deg}
                  cx={200} cy={200} rx={160} ry={160}
                  fill="none" stroke="var(--c-accent)" strokeWidth={0.5} opacity={0.2}
                  transform={`rotate(${deg}, 200, 200)`}
                />
              ))}

              {/* Pulsing nodes */}
              {[
                { cx: 200, cy: 40,  delay: '0s' },
                { cx: 200, cy: 360, delay: '0.4s' },
                { cx: 40,  cy: 200, delay: '0.8s' },
                { cx: 360, cy: 200, delay: '1.2s' },
                { cx: 130, cy: 115, delay: '1.6s' },
                { cx: 270, cy: 115, delay: '2.0s' },
              ].map((node, i) => (
                <circle
                  key={i}
                  cx={node.cx} cy={node.cy} r={3.5}
                  fill="var(--c-accent)"
                  className="gmt-node"
                  style={{ animationDelay: node.delay }}
                />
              ))}
            </svg>
          </div>

          {/* RIGHT — Text content */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.2em',
              color: 'var(--c-accent)',
              marginBottom: 24,
              textTransform: 'uppercase',
            }}>
              {t('landing.eyebrow')}
            </div>

            <h1 className="hero-text" style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 'clamp(48px, 6vw, 80px)',
              lineHeight: 1.05,
              whiteSpace: 'pre-line',
              marginBottom: 24,
              marginTop: 0,
            }}>
              {t('landing.title')}
            </h1>

            <p className="hero-sub" style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 16,
              fontWeight: 300,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.65,
              maxWidth: 440,
              marginBottom: 44,
              marginTop: 0,
            }}>
              {t('landing.subline', { sources: SOURCE_COUNT })}
            </p>

            <div className="hero-cta" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <button
                onClick={goLogin}
                onMouseEnter={() => setPrimaryHover(true)}
                onMouseLeave={() => setPrimaryHover(false)}
                style={{
                  background: primaryHover ? 'var(--c-accent-hover)' : 'var(--c-accent)',
                  color: '#080f1a',
                  border: 'none',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  padding: '14px 32px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {t('landing.cta_launch')}
              </button>
              <button
                onClick={goRegister}
                onMouseEnter={() => setSecondaryHover(true)}
                onMouseLeave={() => setSecondaryHover(false)}
                style={{
                  background: 'transparent',
                  border: secondaryHover
                    ? '1px solid rgba(59,130,246,0.7)'
                    : '1px solid rgba(59,130,246,0.3)',
                  color: secondaryHover
                    ? 'rgba(255,255,255,0.9)'
                    : 'rgba(255,255,255,0.6)',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  padding: '14px 32px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
              >
                {t('common.create_free_account')}
              </button>
            </div>

            <div style={{
              marginTop: 24,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.08em',
            }}>
              {t('landing.stat_line', { assets: TOTAL_ASSETS, groups: GROUP_COUNT, subgroups: SUBGROUP_COUNT })}
            </div>

            {/* Live hero prices */}
            {(() => {
              const heroSymbols = ['^GSPC', '^DJI', '^IXIC', 'BTC', 'EURUSD=X'];
              const heroItems = heroSymbols
                .filter(sym => tickerAssets[sym])
                .map(sym => {
                  const a = tickerAssets[sym];
                  return {
                    sym: DISPLAY_NAMES[sym] || sym,
                    price: fmtPrice(a.price),
                    chg: `${a.changePct >= 0 ? '+' : ''}${a.changePct.toFixed(2)}%`,
                    pos: a.changePct >= 0,
                  };
                });
              if (!heroItems.length) return null;
              return (
                <div style={{
                  display: 'flex',
                  gap: 20,
                  marginTop: 20,
                  flexWrap: 'wrap',
                }}>
                  {heroItems.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 6,
                    }}>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.35)',
                        letterSpacing: '0.05em',
                      }}>{item.sym}</span>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'var(--c-accent-data)',
                      }}>{item.price}</span>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        color: item.pos ? '#00E676' : 'var(--c-error)',
                      }}>{item.chg}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </section>

        {/* Bottom separator */}
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.3) 30%, rgba(59,130,246,0.3) 70%, transparent)',
        }} />

        {/* ── TICKER STRIP ──────────────────────────────────────────────── */}
        <div style={{
          background: '#040810',
          borderTop: '1px solid var(--c-accent-muted)',
          borderBottom: '1px solid var(--c-accent-muted)',
          height: 48,
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}>
          {/* LIVE label */}
          <div style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 20px',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div
              className="gmt-blink"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--c-accent)',
              }}
            />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              letterSpacing: '0.2em',
              color: 'var(--c-accent)',
              fontWeight: 600,
            }}>
              {t('landing.live_badge')}
            </span>
          </div>

          {/* Scrolling area */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div
              onMouseEnter={() => setTickerPaused(true)}
              onMouseLeave={() => setTickerPaused(false)}
              style={{
                display: 'flex',
                width: 'max-content',
                animationName: 'tickerScroll',
                animationDuration: '45s',
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                animationPlayState: tickerPaused ? 'paused' : 'running',
              }}
            >
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <div key={i} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0 24px',
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                  whiteSpace: 'nowrap',
                }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.65)',
                  }}>{item.sym}</span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.35)',
                  }}>{item.price}</span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: item.pos ? '#00E676' : '#f87171',
                  }}>{item.chg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{
          textAlign: 'center',
          fontSize: 10,
          color: '#2D3748',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.5px',
          paddingBottom: 8,
        }}>
          {snapshotLabel} · {t('common.snapshot_note')}
        </div>

        {/* ── THE PLATFORM ──────────────────────────────────────────────── */}
        <section className="gmt-section-reveal" style={{ background: '#080f1a', padding: '120px 80px' }}>
          <div style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '2fr 3fr',
            gap: 80,
            alignItems: 'start',
          }}>
            {/* LEFT COLUMN */}
            <div>
              <div style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.25em',
                color: 'var(--c-accent)',
                marginBottom: 16,
                textTransform: 'uppercase',
              }}>
                {t('landing.platform_eyebrow')}
              </div>

              <h2 style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(28px, 3.5vw, 44px)',
                color: 'rgba(255,255,255,0.92)',
                lineHeight: 1.1,
                whiteSpace: 'pre-line',
                marginBottom: 24,
                marginTop: 0,
              }}>
                {t('landing.platform_title')}
              </h2>

              <p style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 14,
                fontWeight: 300,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.7,
                marginBottom: 40,
                marginTop: 0,
              }}>
                {t('landing.platform_body')}
              </p>

              {/* Accent divider */}
              <div style={{
                width: 32,
                height: 1,
                background: 'var(--c-accent)',
                opacity: 0.4,
                marginBottom: 40,
              }} />

              <div style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.25em',
                color: 'var(--c-accent)',
                marginBottom: 16,
                textTransform: 'uppercase',
              }}>
                {t('landing.philosophy_eyebrow')}
              </div>

              <p style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 14,
                fontWeight: 300,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.7,
                marginTop: 0,
              }}>
                {t('landing.philosophy_body')}
              </p>
            </div>

            {/* RIGHT COLUMN */}
            <div>
              <div style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.25em',
                color: 'var(--c-accent)',
                marginBottom: 20,
                textTransform: 'uppercase',
              }}>
                {t('landing.sources_eyebrow')}
              </div>

              <p style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 14,
                fontWeight: 300,
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.6,
                marginBottom: 28,
                marginTop: 0,
              }}>
                {t('landing.sources_intro', { sources: SOURCE_COUNT })}
              </p>

              <div style={{
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                {DATA_SOURCES.map((src, i) => (
                  <div key={i} style={{
                    padding: '18px 24px',
                    borderBottom: i < DATA_SOURCES.length - 1
                      ? '1px solid rgba(255,255,255,0.04)'
                      : 'none',
                  }}>
                    <div style={{
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.8)',
                      marginBottom: 4,
                    }}>
                      {src.name}
                    </div>
                    <div style={{
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontSize: 12,
                      fontWeight: 300,
                      color: 'rgba(255,255,255,0.4)',
                      lineHeight: 1.5,
                    }}>
                      {src.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── WHY GMT ─────────────────────────────────────────────────── */}
        <section className="gmt-section-reveal" style={{ background: '#080f1a', padding: '100px 80px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            {/* Section header */}
            <div style={{ marginBottom: 48 }}>
              <div style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.25em',
                color: 'var(--c-accent)',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}>
                {t('landing.why_eyebrow')}
              </div>
              <h2 style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(28px, 3.5vw, 44px)',
                color: 'rgba(255,255,255,0.92)',
                marginBottom: 0,
                marginTop: 0,
              }}>
                {t('landing.why_title')}
              </h2>
            </div>

            {/* Feature pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 56 }}>
              {WHY_GMT_PILLS.map((pill, i) => (
                <span key={i} style={{
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 2,
                  padding: '8px 18px',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.55)',
                  background: 'rgba(59,130,246,0.04)',
                }}>
                  {pill}
                </span>
              ))}
            </div>

            {/* Description grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth < 600 ? '1fr' : 'repeat(3, 1fr)',
              gap: 0,
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              {WHY_GMT_CELLS.map((cell, index) => (
                <div key={index} style={{
                  padding: '28px 28px',
                  borderRight: [0, 1, 3, 4].includes(index)
                    ? '1px solid rgba(255,255,255,0.06)'
                    : 'none',
                  borderBottom: index < 3
                    ? '1px solid rgba(255,255,255,0.06)'
                    : 'none',
                }}>
                  <div style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.75)',
                    marginBottom: 8,
                  }}>
                    {cell.title}
                  </div>
                  <div style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 300,
                    color: 'rgba(255,255,255,0.38)',
                    lineHeight: 1.6,
                  }}>
                    {cell.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── COVERAGE TEASER ─────────────────────────────────────────── */}
        <section className="gmt-section-reveal" style={{
          background: '#040810',
          padding: '80px 80px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr',
            gap: 64,
            alignItems: 'center',
          }}>
            {/* Left — text */}
            <div>
              <div style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.25em',
                color: 'var(--c-accent)',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}>
                {t('landing.cov_eyebrow')}
              </div>
              <h2 style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(28px, 3.5vw, 44px)',
                whiteSpace: 'pre-line',
                color: 'rgba(255,255,255,0.92)',
                marginBottom: 16,
                marginTop: 0,
              }}>
                {t('landing.cov_title', { assets: TOTAL_ASSETS })}
              </h2>
              <p style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 15,
                fontWeight: 300,
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.7,
                marginBottom: 32,
                marginTop: 0,
              }}>
                {t('landing.cov_body')}
              </p>
              <button
                onClick={() => navigate('/coverage')}
                onMouseEnter={() => setCoverageLinkHover(true)}
                onMouseLeave={() => setCoverageLinkHover(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: coverageLinkHover ? 'var(--c-accent-hover)' : 'var(--c-accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'color 150ms',
                }}
              >
                {t('landing.cov_link')}
                <span style={{
                  display: 'inline-block',
                  transform: coverageLinkHover ? 'translateX(3px)' : 'translateX(0)',
                  transition: 'transform 150ms ease',
                }}>→</span>
              </button>
            </div>

            {/* Right — stats grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              background: 'rgba(59,130,246,0.07)',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              {COVERAGE_STATS.map((s, i) => (
                <div key={i} style={{
                  background: '#040810',
                  padding: '20px 16px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 20,
                    fontWeight: 600,
                    color: 'var(--c-accent)',
                    marginBottom: 4,
                  }}>
                    {s.num}
                  </div>
                  <div style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.3)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES TEASER ─────────────────────────────────────────── */}
        <section className="gmt-section-reveal" style={{
          background: '#080f1a',
          padding: '80px 80px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr',
            gap: 64,
            alignItems: 'center',
          }}>
            {/* Left — feature tags grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1px',
              background: 'rgba(59,130,246,0.06)',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              {FEATURE_TAGS.map((f, i) => (
                <div key={i} style={{
                  background: '#080f1a',
                  padding: '18px 20px',
                }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.2em',
                    color: 'rgba(59,130,246,0.5)',
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}>
                    {f.tag}
                  </div>
                  <div style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.65)',
                  }}>
                    {f.name}
                  </div>
                </div>
              ))}
            </div>

            {/* Right — text */}
            <div>
              <div style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.25em',
                color: 'var(--c-accent)',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}>
                {t('landing.feat_eyebrow')}
              </div>
              <h2 style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(28px, 3.5vw, 44px)',
                whiteSpace: 'pre-line',
                color: 'rgba(255,255,255,0.92)',
                marginBottom: 16,
                marginTop: 0,
              }}>
                {t('landing.feat_title')}
              </h2>
              <p style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 15,
                fontWeight: 300,
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.7,
                marginBottom: 32,
                marginTop: 0,
              }}>
                {t('landing.feat_body')}
              </p>
              <button
                onClick={() => navigate(ROUTES.public.terminal)}
                onMouseEnter={() => setFeaturesLinkHover(true)}
                onMouseLeave={() => setFeaturesLinkHover(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: featuresLinkHover ? 'var(--c-accent-hover)' : 'var(--c-accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'color 150ms',
                }}
              >
                {t('landing.feat_link')}
                <span style={{
                  display: 'inline-block',
                  transform: featuresLinkHover ? 'translateX(3px)' : 'translateX(0)',
                  transition: 'transform 150ms ease',
                }}>→</span>
              </button>
            </div>
          </div>
        </section>


        {/* ── FINAL CTA ───────────────────────────────────────────────── */}
        <section className="gmt-section-reveal" style={{
          background: 'linear-gradient(180deg, #080f1a 0%, #04080f 100%)',
          padding: '160px 80px',
          textAlign: 'center',
          borderTop: '1px solid rgba(59,130,246,0.15)',
        }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.25em',
              color: 'var(--c-accent)',
              textTransform: 'uppercase',
              marginBottom: 24,
            }}>
              {t('landing.final_eyebrow')}
            </div>

            <h2 style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 'clamp(36px, 5vw, 64px)',
              color: 'rgba(255,255,255,0.95)',
              lineHeight: 1.1,
              whiteSpace: 'pre-line',
              marginBottom: 20,
              marginTop: 0,
            }}>
              {t('landing.final_title')}
            </h2>

            <p style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 15,
              fontWeight: 300,
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 48,
              marginTop: 0,
            }}>
              {t('landing.final_sub')}
            </p>

            <button
              onClick={goRegister}
              onMouseEnter={() => setCtaHovered(true)}
              onMouseLeave={() => setCtaHovered(false)}
              style={{
                background: ctaHovered ? 'var(--c-accent-hover)' : 'var(--c-accent)',
                color: '#080f1a',
                border: 'none',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '0.1em',
                padding: '16px 48px',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {t('common.create_free_account')}
            </button>

            <button
              onClick={goLogin}
              onMouseEnter={() => setSignInLinkHover(true)}
              onMouseLeave={() => setSignInLinkHover(false)}
              style={{
                display: 'block',
                marginTop: 20,
                marginLeft: 'auto',
                marginRight: 'auto',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12,
                color: signInLinkHover ? 'var(--c-accent)' : 'rgba(255,255,255,0.3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
            >
              {t('common.already_have_account')} {t('common.sign_in_arrow')}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
