import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FEATURES_FULL = [
  {
    tag: 'REAL-TIME',
    title: 'Live Dashboard',
    headline: 'The full market picture, refreshed every 30 seconds.',
    body: '269 assets across 9 groups and 36 subgroups. Color-coded gain/loss indicators, collapsible group views, card and list layouts. Sort by ticker or daily return. Market status pill shows NYSE/LSE/B3 session state in real time.',
    detail: '269 assets · 30s refresh · card + list views',
  },
  {
    tag: 'VISUALIZATION',
    title: 'Market Heatmap',
    headline: 'See the entire market in one view.',
    body: 'Volume-weighted treemap visualization of the full asset universe. Larger tiles represent larger market-cap assets. Color intensity maps to daily price change — green for gains, red for losses. Identify sector rotation and market breadth at a glance.',
    detail: 'Treemap · volume-weighted · daily performance',
  },
  {
    tag: 'BRAZIL',
    title: 'Brazil Terminal',
    headline: 'The only terminal with B3 and BCB in one place.',
    body: 'Dedicated Brazil mode with full B3 equities, Renda Fixa rates (SELIC, CDI, DI curve), and BCB macro indicators. Live prices via BRAPI for active stocks. FX pairs including USD/BRL via AwesomeAPI. Gold accent theme distinct from the global terminal.',
    detail: 'B3 equities · BCB macro · Renda Fixa · FX',
  },
  {
    tag: 'STRUCTURE',
    title: '3-Tier Taxonomy',
    headline: 'Organized the way institutional investors think.',
    body: 'Group → Subgroup → Asset hierarchy mirrors MSCI GICS standards. 9 groups, 36 subgroups, 269 assets — all editable by admins at runtime via the taxonomy manager. No code changes needed to restructure the terminal.',
    detail: '9 groups · 36 subgroups · GICS-aligned',
  },
  {
    tag: 'RESEARCH',
    title: 'Analyst Ratings & News',
    headline: 'Stay ahead without leaving the terminal.',
    body: 'Live Finnhub news feed per ticker. Analyst recommendation changes with upgrade/downgrade tracking. Company profiles and sector classification via Financial Modeling Prep. All surfaced in the asset detail panel — no tab-switching required.',
    detail: 'Finnhub news · analyst ratings · FMP profiles',
  },
  {
    tag: 'FUNDAMENTALS',
    title: 'Fundamentals Lab',
    headline: 'Institutional-grade data without the Bloomberg bill.',
    body: 'P/E ratios, EPS, revenue TTM, and key metrics via Financial Modeling Prep for all covered equities. DCF valuations and peer comparison. Data normalized across sectors so you can compare a REIT against a tech stock on consistent terms.',
    detail: 'P/E · EPS · TTM ratios · DCF · peer comparison',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Sign up free',
    body: 'Create your account in under a minute. No credit card, no Bloomberg subscription required.',
  },
  {
    num: '02',
    title: 'Launch the terminal',
    body: 'Access live prices, heatmaps, Brazil mode, and fundamentals immediately. Everything loads from day one.',
  },
  {
    num: '03',
    title: 'Trade with clarity',
    body: 'Make better decisions faster. All your markets — global equities, B3, crypto, FX, macro — in one structured view.',
  },
];

export default function FeaturesPage() {
  const navigate = useNavigate();
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [ctaHover, setCtaHover] = useState(false);
  const [signInHover, setSignInHover] = useState(false);

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

  const w = typeof window !== 'undefined' ? window.innerWidth : 1200;

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .gmt-page-enter { animation: fadeInUp 280ms ease both; }
        .gmt-section-reveal {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 500ms ease, transform 500ms ease;
        }
        .gmt-section-reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
      <div className="gmt-page-enter" style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        color: 'rgba(255,255,255,0.92)',
      }}>

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section style={{
          background: '#040810',
          padding: '80px 80px 64px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          {/* Breadcrumb */}
          <div style={{ marginBottom: 32 }}>
            <button
              onClick={() => navigate('/')}
              style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12,
                color: 'rgba(255,255,255,0.25)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'color 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--c-accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
            >
              Home
            </button>
            <span style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 12,
              color: 'rgba(255,255,255,0.15)',
              margin: '0 8px',
            }}>
              /
            </span>
            <span style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 12,
              color: 'rgba(255,255,255,0.25)',
            }}>
              Features
            </span>
          </div>

          <div style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.25em',
            color: 'var(--c-accent)',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            PLATFORM FEATURES
          </div>

          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(36px, 5vw, 60px)',
            whiteSpace: 'pre-line',
            lineHeight: 1.05,
            color: 'rgba(255,255,255,0.92)',
            marginBottom: 20,
            marginTop: 0,
          }}>
            {'Everything you need.\nNothing you don\'t.'}
          </h1>

          <p style={{
            fontSize: 16,
            fontWeight: 300,
            color: 'rgba(255,255,255,0.45)',
            marginTop: 0,
            marginBottom: 0,
          }}>
            Six core capabilities. Eight data sources. One terminal.
          </p>
        </section>

        {/* ── FEATURES GRID ─────────────────────────────────────────────── */}
        <section style={{ background: '#080f1a', padding: '80px 80px' }}>
          <div className="gmt-section-reveal" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: w < 600 ? '1fr' : w < 900 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              gap: '1px',
              background: 'rgba(59,130,246,0.07)',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              {FEATURES_FULL.map((feat, index) => (
                <div
                  key={index}
                  onMouseEnter={() => setHoveredFeature(index)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  style={{
                    background: '#080f1a',
                    padding: '40px 32px',
                    borderLeft: hoveredFeature === index
                      ? '2px solid var(--c-accent)'
                      : '2px solid transparent',
                    transition: 'border-left 0.15s',
                  }}
                >
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.2em',
                    color: 'var(--c-accent)',
                    textTransform: 'uppercase',
                    marginBottom: 14,
                  }}>
                    {feat.tag}
                  </div>
                  <div style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: 20,
                    color: 'rgba(255,255,255,0.9)',
                    marginBottom: 10,
                  }}>
                    {feat.title}
                  </div>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.65)',
                    marginBottom: 12,
                    lineHeight: 1.4,
                  }}>
                    {feat.headline}
                  </div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 300,
                    color: 'rgba(255,255,255,0.38)',
                    lineHeight: 1.65,
                    marginBottom: 20,
                  }}>
                    {feat.body}
                  </div>
                  <span style={{
                    display: 'inline-block',
                    background: 'rgba(59,130,246,0.06)',
                    border: '1px solid rgba(59,130,246,0.15)',
                    borderRadius: 2,
                    padding: '5px 10px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: 'rgba(59,130,246,0.6)',
                    letterSpacing: '0.08em',
                  }}>
                    {feat.detail}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
        <section className="gmt-section-reveal" style={{
          background: '#040810',
          padding: '80px 80px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.25em',
                color: 'var(--c-accent)',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}>
                HOW IT WORKS
              </div>
              <h2 style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(28px, 3.5vw, 44px)',
                whiteSpace: 'pre-line',
                color: 'rgba(255,255,255,0.92)',
                textAlign: 'center',
                marginTop: 0,
                marginBottom: 0,
              }}>
                {'From data to decision\nin one place.'}
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: w < 600 ? '1fr' : 'repeat(5, auto)',
              gap: w < 600 ? 40 : 0,
              alignItems: 'start',
              justifyContent: 'center',
            }}>
              {STEPS.map((step, i) => (
                <div key={i} style={{ display: 'contents' }}>
                  <div style={{
                    textAlign: 'center',
                    padding: '0 16px',
                    maxWidth: 280,
                  }}>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 48,
                      fontWeight: 600,
                      color: 'var(--c-accent-dim)',
                      lineHeight: 1,
                      marginBottom: 16,
                    }}>
                      {step.num}
                    </div>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.8)',
                      marginBottom: 10,
                    }}>
                      {step.title}
                    </div>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 300,
                      color: 'rgba(255,255,255,0.38)',
                      lineHeight: 1.6,
                    }}>
                      {step.body}
                    </div>
                  </div>
                  {i < 2 && w >= 600 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(59,130,246,0.2)',
                      fontSize: 24,
                      paddingTop: 20,
                    }}>
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────────── */}
        <section className="gmt-section-reveal" style={{
          background: 'linear-gradient(180deg, #080f1a 0%, #04080f 100%)',
          padding: '100px 80px',
          textAlign: 'center',
          borderTop: '1px solid rgba(59,130,246,0.1)',
        }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <h2 style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 'clamp(28px, 4vw, 48px)',
              color: 'rgba(255,255,255,0.92)',
              marginBottom: 16,
              marginTop: 0,
            }}>
              Ready to see the full terminal?
            </h2>
            <p style={{
              fontSize: 15,
              fontWeight: 300,
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 40,
              marginTop: 0,
            }}>
              Free account. Instant access. No credit card.
            </p>
            <button
              onClick={() => navigate('/register')}
              onMouseEnter={() => setCtaHover(true)}
              onMouseLeave={() => setCtaHover(false)}
              style={{
                background: ctaHover ? 'var(--c-accent-hover)' : 'var(--c-accent)',
                color: '#080f1a',
                border: 'none',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '0.1em',
                padding: '16px 48px',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'background 150ms',
              }}
            >
              Create Free Account
            </button>
            <button
              onClick={() => navigate('/login')}
              onMouseEnter={() => setSignInHover(true)}
              onMouseLeave={() => setSignInHover(false)}
              style={{
                display: 'block',
                margin: '20px auto 0',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12,
                color: signInHover ? 'var(--c-accent)' : 'rgba(255,255,255,0.3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 150ms',
              }}
            >
              Already have an account? Sign in →
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
