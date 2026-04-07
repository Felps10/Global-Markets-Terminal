import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MONTHLY_PRO = 499;
const ANNUAL_PRO  = Math.round(MONTHLY_PRO * 0.8);

const FEATURES_TABLE = [
  ['Live market dashboard',          true,              true,              true],
  ['Asset coverage',                 '50 assets',       '269 assets',      '269 assets'],
  ['Refresh rate',                   '60s',             '30s',             '30s'],
  ['Card and list view',             true,              true,              true],
  ['Sort + filter',                  true,              true,              true],
  ['Market Heatmap',                 false,             true,              true],
  ['Brazil Terminal',                false,             true,              true],
  ['Chart Center',                   false,             true,              true],
  ['Research Terminal',              false,             true,              true],
  ['Fundamentals Lab',               false,             true,              true],
  ['Macro Hub',                      false,             true,              true],
  ['Signal Engine',                  false,             true,              true],
  ['Data sources',                   '2 sources',       'All 8 sources',   'All 8 sources'],
  ['Analyst ratings & news',         false,             true,              true],
  ['Fundamentals (P/E, EPS, TTM)',   false,             true,              true],
  ['BCB macro data (Brazil)',        false,             true,              true],
  ['Clube de Investimento access',   false,             false,             true],
  ['NAV history & AI reports',       false,             false,             true],
  ['Portfolio compliance tracking',  false,             false,             true],
  ['CVM regulatory tools',           false,             false,             true],
];

const GROUP_BREAKS = [
  { at: 0,  label: 'Terminal' },
  { at: 5,  label: 'Features' },
  { at: 12, label: 'Data' },
  { at: 16, label: 'Clube' },
];

const FAQS = [
  {
    q: 'What does the Free tier include?',
    a: 'Free gives you live dashboard access to 50 assets with a 60-second refresh rate and the standard card/list view. It\'s enough to follow the markets — but Pro unlocks the full 269-asset universe, 30s refresh, heatmap, Brazil terminal, and all research tools.',
  },
  {
    q: 'What is the Clube de Investimento?',
    a: 'The Clube is a Brazilian investment club (CVM Instrução 494/11) built into GMT. Club Member tier gives access to NAV tracking, cotista management, portfolio compliance monitoring, and AI-generated reports. Access is by invitation from a club manager.',
  },
  {
    q: 'Is the $499/month price correct?',
    a: 'Yes. GMT Pro is priced as institutional-grade market intelligence. It consolidates data from Bloomberg-grade sources — Yahoo Finance, Finnhub, FMP, BRAPI, BCB, CoinGecko, FRED, and AwesomeAPI — into one structured terminal. The annual plan brings it to $399/month.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Monthly plans can be cancelled at any time with no penalties. Annual plans are billed upfront — contact us if you need to discuss early cancellation.',
  },
  {
    q: 'How do I get Club Member access?',
    a: 'Club Member access is by invitation only. A club manager must first invite you to their clube. Once invited, you\'ll receive instructions to link your GMT account. Contact us if you\'re interested in setting up a new clube.',
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [proCTAHovered, setProCTAHovered] = useState(false);
  const [freeCTAHovered, setFreeCTAHovered] = useState(false);
  const [clubCTAHovered, setClubCTAHovered] = useState(false);
  const [ctaHover, setCtaHover] = useState(false);
  const [secHover, setSecHover] = useState(false);

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

  function renderCell(value, tier) {
    if (value === true) return <span style={{ color: tier === 'free' ? '#00E676' : 'var(--c-accent)' }}>✓</span>;
    if (value === false) return <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>;
    return <span style={{
      color: tier === 'free' ? 'rgba(255,255,255,0.5)' : 'rgba(59,130,246,0.7)',
      fontSize: 12,
    }}>{value}</span>;
  }

  const proPrice = isAnnual ? ANNUAL_PRO : MONTHLY_PRO;

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
        @media (prefers-reduced-motion: reduce) {
          .gmt-page-enter  { animation: none !important; opacity: 1 !important; }
          .gmt-section-reveal { transition: none !important; opacity: 1 !important; transform: none !important; }
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
          <div style={{ marginBottom: 32 }}>
            <button
              onClick={() => navigate('/')}
              style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12, color: 'rgba(255,255,255,0.25)',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, transition: 'color 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--c-accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
            >Home</button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)', margin: '0 8px' }}>/</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Pricing</span>
          </div>

          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.25em',
            color: 'var(--c-accent)', textTransform: 'uppercase', marginBottom: 16,
          }}>PRICING</div>

          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 800,
            fontSize: 'clamp(36px, 5vw, 60px)', whiteSpace: 'pre-line',
            lineHeight: 1.05, color: 'rgba(255,255,255,0.92)',
            marginBottom: 20, marginTop: 0,
          }}>{'Institutional intelligence.\nTransparent pricing.'}</h1>

          <p style={{
            fontSize: 16, fontWeight: 300, color: 'rgba(255,255,255,0.45)',
            marginTop: 0, marginBottom: 0,
          }}>Three tiers. One terminal. Start free, upgrade when you're ready.</p>
        </section>

        {/* ── TOGGLE + TIER CARDS ───────────────────────────────────────── */}
        <section className="gmt-section-reveal" style={{ background: '#080f1a', padding: '80px 80px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>

            {/* Toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 12, marginBottom: 56,
            }}>
              <span style={{
                fontSize: 13,
                color: !isAnnual ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                fontWeight: !isAnnual ? 500 : 400,
              }}>Monthly</span>

              <div
                role="switch"
                aria-checked={isAnnual}
                aria-label="Billing period"
                tabIndex={0}
                onClick={() => setIsAnnual(a => !a)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setIsAnnual(a => !a)}
                style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: isAnnual ? 'var(--c-accent)' : 'rgba(255,255,255,0.1)',
                  border: isAnnual ? 'none' : '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer', position: 'relative',
                  transition: 'background 200ms ease',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: isAnnual ? 23 : 3,
                  transition: 'left 200ms ease',
                }} />
              </div>

              <span style={{
                fontSize: 13,
                color: isAnnual ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                fontWeight: isAnnual ? 500 : 400,
              }}>Annual</span>

              {isAnnual && (
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: '#ffffff', background: 'var(--c-accent)',
                  borderRadius: 10, padding: '2px 10px', marginLeft: 4,
                }}>SAVE 20%</span>
              )}
            </div>

            {/* Tier cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)',
              gap: 24,
            }}>

              {/* FREE */}
              <div
                style={{
                  background: '#040810',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 4, padding: '32px 28px',
                }}
              >
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>Free</div>
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 40, color: 'rgba(255,255,255,0.92)' }}>$0</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>/month</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4, marginBottom: 28 }}>Forever free. No credit card.</div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 24 }} />

                {[
                  'Live dashboard — 50 assets',
                  '60s refresh rate',
                  'Card + list view',
                  'Sort and filter',
                  '2 data sources',
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ color: '#00E676', fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
                {[
                  'Heatmap, Brazil Terminal, Markets modules',
                  'Full 269 assets + 30s refresh',
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, flexShrink: 0, marginTop: 1 }}>×</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}

                <button
                  onClick={() => navigate('/register')}
                  onMouseEnter={() => setFreeCTAHovered(true)}
                  onMouseLeave={() => setFreeCTAHovered(false)}
                  style={{
                    width: '100%', marginTop: 28, padding: 13,
                    background: 'transparent',
                    border: freeCTAHovered ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.15)',
                    color: freeCTAHovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
                    borderRadius: 4, cursor: 'pointer',
                    fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 500,
                    transition: 'border-color 150ms, color 150ms',
                  }}
                >Get Started Free</button>
              </div>

              {/* PRO */}
              <div style={{
                background: 'rgba(59,130,246,0.03)',
                border: '1px solid rgba(59,130,246,0.4)',
                borderRadius: 4, padding: '32px 28px',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.15em', color: '#ffffff', background: 'var(--c-accent)',
                  borderRadius: 10, padding: '3px 12px', whiteSpace: 'nowrap',
                }}>MOST POPULAR</div>

                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--c-accent)', marginBottom: 8 }}>Pro</div>
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 40, color: 'rgba(255,255,255,0.92)' }}>${proPrice}</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>/month</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2, marginBottom: 28 }}>
                  {isAnnual ? `Billed annually ($${ANNUAL_PRO * 12}/yr)` : 'Cancel anytime.'}
                </div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 24 }} />

                {[
                  'Full 269-asset universe',
                  '30s refresh rate',
                  'Market Heatmap',
                  'Brazil Terminal + BCB macro',
                  'Chart Center + Research Terminal',
                  'Fundamentals Lab + Macro Hub',
                  'Signal Engine',
                  'All 8 data sources',
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ color: 'var(--c-accent)', fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}

                <button
                  onClick={() => navigate('/register')}
                  onMouseEnter={() => setProCTAHovered(true)}
                  onMouseLeave={() => setProCTAHovered(false)}
                  style={{
                    width: '100%', marginTop: 28, padding: 13,
                    background: proCTAHovered ? 'var(--c-accent-hover)' : 'var(--c-accent)',
                    color: '#080f1a', border: 'none',
                    borderRadius: 4, cursor: 'pointer',
                    fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 600,
                    transition: 'background 150ms',
                  }}
                >Start Pro</button>
              </div>

              {/* CLUB MEMBER */}
              <div style={{
                background: '#040810',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 4, padding: '32px 28px',
              }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>Club Member</div>
                <div>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 40, color: 'rgba(255,255,255,0.92)' }}>Contact</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4, marginBottom: 28 }}>By invitation only. Contact us to discuss.</div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 24 }} />

                {[
                  'Everything in Pro',
                  'Clube de Investimento access',
                  'NAV history + AI commentary',
                  'Portfolio compliance (CVM 494/11)',
                  'Cotista management',
                  'Dedicated support',
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ color: 'var(--c-accent)', fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}

                <button
                  onClick={() => { window.location.href = 'mailto:gmt@globalmarketsterminal.com'; }}
                  onMouseEnter={() => setClubCTAHovered(true)}
                  onMouseLeave={() => setClubCTAHovered(false)}
                  style={{
                    width: '100%', marginTop: 28, padding: 13,
                    background: clubCTAHovered ? 'var(--c-accent-muted)' : 'transparent',
                    border: clubCTAHovered ? '1px solid var(--c-accent)' : '1px solid rgba(59,130,246,0.4)',
                    color: 'var(--c-accent)',
                    borderRadius: 4, cursor: 'pointer',
                    fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 500,
                    transition: 'background 150ms, border-color 150ms',
                  }}
                >Contact Us</button>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURE COMPARISON TABLE ──────────────────────────────────── */}
        <section className="gmt-section-reveal" style={{
          background: '#040810', padding: '80px 80px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.25em',
              color: 'var(--c-accent)', textTransform: 'uppercase', marginBottom: 16,
            }}>FULL COMPARISON</div>
            <h2 style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 800,
              fontSize: 'clamp(24px, 3vw, 36px)',
              color: 'rgba(255,255,255,0.92)', marginTop: 0, marginBottom: 48,
            }}>What's included in each plan.</h2>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['Feature', 'Free', 'Pro', 'Club Member'].map((h, i) => (
                      <th key={i} style={{
                        padding: '12px 20px',
                        fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11,
                        fontWeight: 600, letterSpacing: '0.1em',
                        color: h === 'Pro' ? 'var(--c-accent)'
                          : h === 'Club Member' ? 'rgba(59,130,246,0.6)'
                          : 'rgba(255,255,255,0.35)',
                        textTransform: 'uppercase',
                        textAlign: i === 0 ? 'left' : 'center',
                        background: '#040810',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURES_TABLE.map((row, ri) => {
                    const group = GROUP_BREAKS.find(g => g.at === ri);
                    return (
                      <tr key={ri}>
                        {group && (
                          <td colSpan={4} style={{
                            padding: ri === 0 ? '8px 20px 8px' : '16px 20px 8px',
                            fontSize: 10, fontWeight: 600, letterSpacing: '0.2em',
                            color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase',
                            borderTop: ri > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          }}>{group.label}</td>
                        )}
                        {!group && (
                          <>
                            <td style={{
                              padding: '12px 20px', fontSize: 13,
                              color: 'rgba(255,255,255,0.6)', textAlign: 'left',
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              background: ri % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
                            }}>{row[0]}</td>
                            <td style={{
                              padding: '12px 20px', textAlign: 'center',
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              background: ri % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
                            }}>{renderCell(row[1], 'free')}</td>
                            <td style={{
                              padding: '12px 20px', textAlign: 'center',
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              background: ri % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
                            }}>{renderCell(row[2], 'pro')}</td>
                            <td style={{
                              padding: '12px 20px', textAlign: 'center',
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              background: ri % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
                            }}>{renderCell(row[3], 'club')}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section className="gmt-section-reveal" style={{
          background: '#080f1a', padding: '80px 80px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.25em',
                color: 'var(--c-accent)', textTransform: 'uppercase', marginBottom: 16,
              }}>FAQ</div>
              <h2 style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 800,
                fontSize: 'clamp(24px, 3vw, 36px)',
                color: 'rgba(255,255,255,0.92)', marginTop: 0, marginBottom: 0,
              }}>Common questions.</h2>
            </div>

            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} style={{
                  borderBottom: i < FAQS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    style={{
                      width: '100%', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '20px 0',
                      background: 'none', border: 'none', cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{
                      fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, fontWeight: 500,
                      color: isOpen ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.65)',
                    }}>{faq.q}</span>
                    <span style={{
                      fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 20, fontWeight: 300,
                      color: 'rgba(255,255,255,0.35)', flexShrink: 0, marginLeft: 16,
                    }}>{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div style={{
                      padding: '0 0 20px',
                      fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, fontWeight: 300,
                      color: 'rgba(255,255,255,0.45)', lineHeight: 1.7,
                    }}>{faq.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────────── */}
        <section className="gmt-section-reveal" style={{
          background: 'linear-gradient(180deg, #080f1a 0%, #04080f 100%)',
          padding: '100px 80px', textAlign: 'center',
          borderTop: '1px solid rgba(59,130,246,0.1)',
        }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <h2 style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 800,
              fontSize: 'clamp(28px, 4vw, 48px)', whiteSpace: 'pre-line',
              color: 'rgba(255,255,255,0.92)', marginBottom: 16, marginTop: 0,
            }}>{'Start free.\nUpgrade when you\'re ready.'}</h2>
            <p style={{
              fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.4)',
              marginBottom: 40, marginTop: 0,
            }}>No credit card required. Full terminal access from day one.</p>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/register')}
                onMouseEnter={() => setCtaHover(true)}
                onMouseLeave={() => setCtaHover(false)}
                style={{
                  background: ctaHover ? 'var(--c-accent-hover)' : 'var(--c-accent)',
                  color: '#080f1a', border: 'none',
                  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, fontWeight: 600,
                  letterSpacing: '0.1em', padding: '16px 48px',
                  borderRadius: 2, cursor: 'pointer', transition: 'background 150ms',
                }}
              >Create Free Account</button>
              <button
                onClick={() => navigate('/features')}
                onMouseEnter={() => setSecHover(true)}
                onMouseLeave={() => setSecHover(false)}
                style={{
                  background: 'transparent',
                  border: secHover ? '1px solid rgba(59,130,246,0.7)' : '1px solid rgba(59,130,246,0.3)',
                  color: secHover ? 'var(--c-accent-hover)' : 'var(--c-accent)',
                  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, fontWeight: 600,
                  letterSpacing: '0.1em', padding: '16px 48px',
                  borderRadius: 2, cursor: 'pointer',
                  transition: 'border-color 150ms, color 150ms',
                }}
              >See all features →</button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
