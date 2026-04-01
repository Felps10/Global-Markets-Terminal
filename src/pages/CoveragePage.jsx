import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GLOBAL_COVERAGE = [
  {
    number: '01',
    name: 'US Equities',
    count: '89 ASSETS',
    groups: '9 SECTORS',
    description: 'Technology, Semiconductors, Financials, Healthcare, Consumer, Real Estate, Energy, Aerospace & Defense, Clean Energy. Mapped to GICS sectors.',
    source: 'Yahoo Finance · Finnhub · FMP',
    subgroups: [
      'Technology', 'Semiconductors', 'Financials', 'Health Care',
      'Consumer', 'Real Estate', 'Oil & Gas', 'Aerospace & Defense',
      'Clean Energy',
    ],
  },
  {
    number: '02',
    name: 'Global Indices',
    count: '8 ASSETS',
    groups: '1 GROUP',
    description: 'S&P 500, NASDAQ, DAX, Nikkei 225, FTSE 100, Hang Seng, IBOVESPA, Emerging Markets. The benchmarks that define global markets.',
    source: 'Yahoo Finance',
    subgroups: ['Global Indices'],
  },
  {
    number: '03',
    name: 'Foreign Exchange',
    count: '8 PAIRS',
    groups: '1 GROUP',
    description: 'USD/BRL, EUR/USD, GBP/USD, JPY/USD, AUD/USD, USD/CAD, USD/CHF, USD/MXN. Major pairs including EM currencies.',
    source: 'Yahoo Finance · AwesomeAPI',
    subgroups: ['Foreign Exchange'],
  },
  {
    number: '04',
    name: 'Digital Assets',
    count: '3 ASSETS',
    groups: '1 GROUP',
    description: 'Bitcoin, Ethereum, and Solana. Live spot prices with 30-second refresh cycles via CoinGecko public API.',
    source: 'CoinGecko',
    subgroups: ['Crypto'],
  },
  {
    number: '05',
    name: 'Commodities',
    count: '15 ASSETS',
    groups: '3 SUBGROUPS',
    description: 'Precious metals (gold, silver, platinum), energy (crude oil WTI, natural gas), and agriculture (corn, wheat, soybean) via ETFs and futures.',
    source: 'Yahoo Finance',
    subgroups: ['Precious Metals', 'Energy Commodities', 'Agriculture'],
  },
  {
    number: '06',
    name: 'Fixed Income',
    count: '12 ASSETS',
    groups: '3 SUBGROUPS',
    description: 'US Treasuries across the full maturity spectrum (SHY, IEF, TLT), investment-grade and high-yield corporate bonds, dividend income ETFs.',
    source: 'Yahoo Finance',
    subgroups: ['Treasuries', 'Bonds', 'Dividend Income'],
  },
];

const BRAZIL_COVERAGE = [
  {
    number: '01',
    name: 'B3 Equities',
    count: '96 ASSETS',
    groups: '12 SUBGROUPS',
    description: 'Full coverage of the major B3 equities organized by sector: Banks, Oil & Gas, Mining, Agriculture, Retail, Utilities, Transport, Industry, Healthcare, Tech & Telecom, Real Estate, and others.',
    source: 'BRAPI',
    subgroups: [
      'Bancos', 'Petróleo & Gás', 'Mineração', 'Agronegócio',
      'Varejo & Consumo', 'Utilities', 'Transporte', 'Indústria',
      'Saúde', 'Tecnologia & Telecom', 'Construção Civil', 'Outros',
    ],
  },
  {
    number: '02',
    name: 'Renda Fixa',
    count: 'RATES + CURVES',
    groups: '3 SUBGROUPS',
    description: 'SELIC, CDI, DI curve, Tesouro Direto instruments (LFT, NTN-B, LTN), and corporate credit spreads. Data sourced directly from BCB SGS series.',
    source: 'BCB SGS',
    subgroups: ['Juros', 'Títulos Públicos', 'Crédito'],
  },
  {
    number: '03',
    name: 'Macro Brasil',
    count: 'INDICATORS',
    groups: '2 SUBGROUPS',
    description: 'IPCA inflation, GDP growth, unemployment, industrial production, USD/BRL, EUR/BRL, and liquidity indicators. All from Banco Central do Brasil — no third-party dependency.',
    source: 'BCB SGS · AwesomeAPI',
    subgroups: ['Macro Indicators', 'FX & Liquidity'],
  },
];

const HERO_STATS = [
  { num: '269', label: 'Total Assets' },
  { num: '9', label: 'Groups' },
  { num: '36', label: 'Subgroups' },
  { num: '8', label: 'Data Sources' },
];

export default function CoveragePage() {
  const navigate = useNavigate();
  const [hoveredGlobal, setHoveredGlobal] = useState(null);
  const [hoveredBrazil, setHoveredBrazil] = useState(null);
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

  // Shared card renderer
  function renderCard(item, index, hovered, setHovered, accentColor, bgColor) {
    return (
      <div
        key={index}
        onMouseEnter={() => setHovered(index)}
        onMouseLeave={() => setHovered(null)}
        style={{
          background: bgColor,
          padding: '36px 32px',
          borderLeft: hovered === index
            ? `2px solid ${accentColor}`
            : '2px solid transparent',
          transition: 'border-left 0.15s',
        }}
      >
        {/* Header row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
        }}>
          <div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: accentColor === '#F9C300'
                ? 'rgba(249,195,0,0.4)'
                : 'rgba(59,130,246,0.4)',
              letterSpacing: '0.15em',
              marginBottom: 8,
            }}>
              {item.number}
            </div>
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: 'rgba(255,255,255,0.9)',
            }}>
              {item.name}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              fontWeight: 600,
              color: accentColor,
            }}>
              {item.count}
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'rgba(255,255,255,0.25)',
              marginTop: 4,
              letterSpacing: '0.1em',
            }}>
              {item.groups}
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 13,
          fontWeight: 300,
          color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.65,
          marginBottom: 20,
        }}>
          {item.description}
        </div>

        {/* Subgroup tags */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: 16,
        }}>
          {item.subgroups.map((sg, i) => (
            <span key={i} style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 10,
              color: 'rgba(255,255,255,0.35)',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 2,
              padding: '3px 8px',
            }}>
              {sg}
            </span>
          ))}
        </div>

        {/* Source */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          paddingTop: 16,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: 'rgba(255,255,255,0.2)',
          letterSpacing: '0.08em',
        }}>
          DATA SOURCE: {item.source}
        </div>
      </div>
    );
  }

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
              fontSize: 12,
              color: 'rgba(255,255,255,0.15)',
              margin: '0 8px',
            }}>
              /
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
              Coverage
            </span>
          </div>

          <div style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.25em',
            color: 'var(--c-accent)',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            ASSET COVERAGE
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
            {'Every market that matters.\nAll in one place.'}
          </h1>

          <p style={{
            fontSize: 16,
            fontWeight: 300,
            color: 'rgba(255,255,255,0.45)',
            marginTop: 0,
            marginBottom: 0,
          }}>
            269 assets across 9 groups — global equities, Brazil, crypto, FX, commodities, and fixed income.
          </p>

          {/* Stats row */}
          <div style={{
            marginTop: 40,
            display: 'flex',
            gap: 48,
            flexWrap: 'wrap',
          }}>
            {HERO_STATS.map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 28,
                  fontWeight: 600,
                  color: 'var(--c-accent)',
                }}>{s.num}</span>
                <span style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}>{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── GLOBAL TERMINAL COVERAGE ──────────────────────────────────── */}
        <section className="gmt-section-reveal" style={{
          background: '#080f1a',
          padding: '80px 80px',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ marginBottom: 48 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.25em',
                color: 'var(--c-accent)',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}>
                GLOBAL TERMINAL
              </div>
              <h2 style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(28px, 3.5vw, 44px)',
                color: 'rgba(255,255,255,0.92)',
                marginTop: 0,
                marginBottom: 0,
              }}>
                Six asset classes.
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: w < 768 ? '1fr' : 'repeat(2, 1fr)',
              gap: '1px',
              background: 'rgba(59,130,246,0.07)',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              {GLOBAL_COVERAGE.map((item, i) =>
                renderCard(item, i, hoveredGlobal, setHoveredGlobal, 'var(--c-accent)', '#080f1a')
              )}
            </div>
          </div>
        </section>

        {/* ── BRAZIL TERMINAL COVERAGE ──────────────────────────────────── */}
        <section className="gmt-section-reveal" style={{
          background: '#040810',
          padding: '80px 80px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ marginBottom: 48 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.25em',
                color: '#F9C300',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}>
                BRAZIL TERMINAL
              </div>
              <h2 style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(28px, 3.5vw, 44px)',
                color: 'rgba(255,255,255,0.92)',
                whiteSpace: 'pre-line',
                marginTop: 0,
                marginBottom: 0,
              }}>
                {'Three pillars of\nBrazilian markets.'}
              </h2>
              <p style={{
                fontSize: 13,
                fontWeight: 300,
                color: 'rgba(255,255,255,0.35)',
                marginTop: 12,
                marginBottom: 0,
              }}>
                Powered by BRAPI for B3 equities and BCB SGS for macro data —
                direct from Banco Central do Brasil, no intermediary.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: w < 768 ? '1fr' : 'repeat(3, 1fr)',
              gap: '1px',
              background: 'rgba(249,195,0,0.06)',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              {BRAZIL_COVERAGE.map((item, i) =>
                renderCard(item, i, hoveredBrazil, setHoveredBrazil, '#F9C300', '#040810')
              )}
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
              Ready to explore the full coverage?
            </h2>
            <p style={{
              fontSize: 15,
              fontWeight: 300,
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 40,
              marginTop: 0,
            }}>
              Free account. Instant access. All 269 assets from day one.
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
