import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../lib/routes.js';
import { CLUBE_COLORS } from '../lib/tokens.js';
import {
  TOTAL_ASSETS, GROUP_COUNT, SUBGROUP_COUNT, SOURCE_COUNT,
  countByGroup, subgroupNamesByGroup,
} from '../lib/publicStats.js';
import { SECTOR_ORDER } from '../data/b3Sectors.js';

// Counts and subgroup tags come from publicStats (computed from the taxonomy
// bootstrap) so this page can't drift from the data. Copy lives in
// public/locales/{en,pt}/translation.json (coverage_page.*); source
// attributions must match server/lib/providerRouting.js. Builders run inside
// the component so everything re-resolves on language change.
const globalCard = (t, number, groupId, nameKey, descKey, source, overrides = {}) => {
  const subgroups = subgroupNamesByGroup(groupId);
  return {
    number,
    name: t(`coverage_page.${nameKey}`),
    count: `${countByGroup(groupId)} ${t(overrides.unitKey || 'coverage_page.unit_assets')}`,
    groups: subgroups.length === 1
      ? `1 ${t('coverage_page.unit_group')}`
      : `${subgroups.length} ${t('coverage_page.unit_subgroups')}`,
    description: t(`coverage_page.${descKey}`),
    source,
    subgroups: overrides.subgroups || subgroups,
  };
};

const buildGlobalCoverage = (t) => [
  globalCard(t, '01', 'equities', 'eq_name', 'eq_desc', 'FMP · EODHD'),
  globalCard(t, '02', 'indices', 'idx_name', 'idx_desc', 'EODHD · FMP'),
  globalCard(t, '03', 'currencies', 'fx_name', 'fx_desc', 'FMP · EODHD', { unitKey: 'coverage_page.unit_pairs' }),
  globalCard(t, '04', 'digital-assets', 'crypto_name', 'crypto_desc', 'CoinGecko'),
  globalCard(t, '05', 'commodities', 'comm_name', 'comm_desc', 'FMP'),
  globalCard(t, '06', 'fixed-income', 'fi_name', 'fi_desc', 'FMP · EODHD'),
];

const buildBrazilCoverage = (t) => [
  {
    number: '01',
    name: t('coverage_page.b3_name'),
    count: `${countByGroup('br-mercado')} ${t('coverage_page.unit_assets')}`,
    groups: `${SECTOR_ORDER.length} ${t('coverage_page.unit_sectors')}`,
    description: t('coverage_page.b3_desc'),
    source: 'BRAPI',
    subgroups: [...SECTOR_ORDER],
  },
  {
    number: '02',
    name: t('coverage_page.rf_name'),
    count: t('coverage_page.rf_count'),
    groups: `3 ${t('coverage_page.unit_subgroups')}`,
    description: t('coverage_page.rf_desc'),
    source: 'BCB SGS',
    subgroups: ['Juros', 'Títulos Públicos', 'Crédito'],
  },
  {
    number: '03',
    name: t('coverage_page.macro_name'),
    count: t('coverage_page.macro_count'),
    groups: `2 ${t('coverage_page.unit_subgroups')}`,
    description: t('coverage_page.macro_desc'),
    source: 'BCB SGS · BRAPI',
    subgroups: ['Macro Indicators', 'FX & Liquidity'],
  },
];

const buildHeroStats = (t) => [
  { num: String(TOTAL_ASSETS), label: t('coverage_page.stat_assets') },
  { num: String(GROUP_COUNT), label: t('coverage_page.stat_groups') },
  { num: String(SUBGROUP_COUNT), label: t('coverage_page.stat_subgroups') },
  { num: String(SOURCE_COUNT), label: t('coverage_page.stat_sources') },
];

export default function CoveragePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const GLOBAL_COVERAGE = buildGlobalCoverage(t);
  const BRAZIL_COVERAGE = buildBrazilCoverage(t);
  const HERO_STATS = buildHeroStats(t);
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
              color: accentColor === CLUBE_COLORS.accent
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
          {t('coverage_page.source_label')} {item.source}
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
              {t('coverage_page.breadcrumb_home')}
            </button>
            <span style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.15)',
              margin: '0 8px',
            }}>
              /
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
              {t('coverage_page.breadcrumb')}
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
            {t('coverage_page.eyebrow')}
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
            {t('coverage_page.title')}
          </h1>

          <p style={{
            fontSize: 16,
            fontWeight: 300,
            color: 'rgba(255,255,255,0.45)',
            marginTop: 0,
            marginBottom: 0,
          }}>
            {t('coverage_page.subline', { assets: TOTAL_ASSETS, groups: GROUP_COUNT })}
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
                {t('coverage_page.global_eyebrow')}
              </div>
              <h2 style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(28px, 3.5vw, 44px)',
                color: 'rgba(255,255,255,0.92)',
                marginTop: 0,
                marginBottom: 0,
              }}>
                {t('coverage_page.global_title')}
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
                color: CLUBE_COLORS.accent,
                textTransform: 'uppercase',
                marginBottom: 16,
              }}>
                {t('coverage_page.brazil_eyebrow')}
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
                {t('coverage_page.brazil_title')}
              </h2>
              <p style={{
                fontSize: 13,
                fontWeight: 300,
                color: 'rgba(255,255,255,0.35)',
                marginTop: 12,
                marginBottom: 0,
              }}>
                {t('coverage_page.brazil_sub')}
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
                renderCard(item, i, hoveredBrazil, setHoveredBrazil, CLUBE_COLORS.accent, '#040810')
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
              {t('coverage_page.final_title')}
            </h2>
            <p style={{
              fontSize: 15,
              fontWeight: 300,
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 40,
              marginTop: 0,
            }}>
              {t('coverage_page.final_sub', { assets: TOTAL_ASSETS })}
            </p>
            <button
              onClick={() => navigate(ROUTES.auth.register)}
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
              {t('common.create_free_account')}
            </button>
            <button
              onClick={() => navigate(ROUTES.auth.login)}
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
              {t('common.already_have_account')} {t('common.sign_in_arrow')}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
