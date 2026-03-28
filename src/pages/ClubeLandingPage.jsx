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

const PERSONAS = [
  { icon: '📊', titleKey: 'clube.persona_gestor', descKey: 'clube.persona_gestor_desc' },
  { icon: '👥', titleKey: 'clube.persona_cotistas', descKey: 'clube.persona_cotistas_desc' },
  { icon: '🤖', titleKey: 'clube.persona_relatorio', descKey: 'clube.persona_relatorio_desc' },
];

const FEATURES_LIST = [
  { icon: '📈', nameKey: 'clube.feat_nav', descKey: 'clube.feat_nav_desc' },
  { icon: '👤', nameKey: 'clube.feat_cotistas', descKey: 'clube.feat_cotistas_desc' },
  { icon: '📄', nameKey: 'clube.feat_relatorio', descKey: 'clube.feat_relatorio_desc' },
  { icon: '🔒', nameKey: 'clube.feat_acesso', descKey: 'clube.feat_acesso_desc' },
];

const ACCESS_CARDS = [
  {
    titleKey: 'clube.access_gestor',
    accessKey: 'clube.access_gestor_by',
    can: ['Registrar NAV', 'Convidar cotistas', 'Gerar relatório'],
    cannotKey: 'clube.access_gestor_cannot',
  },
  {
    titleKey: 'clube.access_cotista',
    accessKey: 'clube.access_cotista_by',
    can: ['Ver NAV', 'Histórico', 'Cotas', 'Relatório'],
    cannotKey: 'clube.access_cotista_cannot',
  },
];

export default function ClubeLandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, loading } = useAuth();
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language?.startsWith('en') ? 'en' : 'pt');

  function handleLangChange(newLang) {
    setLang(newLang);
    i18n.changeLanguage(newLang);
  }

  useEffect(() => {
    if (!loading && isAuthenticated) {
      const clubRoles = ['club_member', 'club_manager', 'admin'];
      if (clubRoles.includes(user?.role)) {
        navigate('/clubes', { replace: true });
      }
    }
  }, [isAuthenticated, user, loading, navigate]);

  const cardStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '0.5px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 24,
  };

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
            background: 'rgba(251,191,36,0.1)',
            border: '0.5px solid rgba(251,191,36,0.3)',
            borderRadius: 20,
            padding: '4px 14px',
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            color: '#fbbf24',
            letterSpacing: '0.06em',
            marginBottom: 24,
          }}>
            {t('clube.badge')}
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
            {t('clube.hero_headline_1') + '\n' + t('clube.hero_headline_2')}
          </h1>
          <p style={{ fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.45)', maxWidth: 540, margin: '0 auto 36px', lineHeight: 1.65 }}>
            {t('clube.hero_subline')}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.href = 'mailto:contato@gmt.app'}
              style={{
                background: 'white', color: '#080f1a', border: 'none', borderRadius: 8,
                padding: '11px 28px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif", transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {t('clube.cta_request')}
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
              {t('clube.cta_member')}
            </button>
          </div>
        </div>
      </section>

      {/* ── Section 2: Who it's for ──────────────────────────────────── */}
      <section style={{ padding: '64px 40px', maxWidth: 1080, margin: '0 auto' }}>
        <div style={{
          fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.2em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 12, textAlign: 'center',
        }}>
          {t('clube.for_whom_label')}
        </div>
        <h2 style={{
          fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700,
          color: 'rgba(255,255,255,0.92)', textAlign: 'center', margin: '0 0 40px',
        }}>
          {t('clube.for_whom_title')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {PERSONAS.map((p, i) => (
            <div key={i} style={cardStyle}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>{p.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>{t(p.titleKey)}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{t(p.descKey)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 3: Features ──────────────────────────────────────── */}
      <section style={{ padding: '64px 40px', maxWidth: 720, margin: '0 auto' }}>
        <div style={{
          fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.2em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 32, textAlign: 'center',
        }}>
          {t('clube.features_label')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {FEATURES_LIST.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', marginBottom: 4 }}>{t(f.nameKey)}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{t(f.descKey)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 4: Access model ──────────────────────────────────── */}
      <section style={{ padding: '64px 40px', maxWidth: 720, margin: '0 auto' }}>
        <div style={{
          fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.2em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 32, textAlign: 'center',
        }}>
          {t('clube.access_label')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {ACCESS_CARDS.map((card, i) => (
            <div key={i} style={cardStyle}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 }}>{t(card.titleKey)}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>{t('clube.access_by')}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 16 }}>{t(card.accessKey)}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>{t('clube.access_can')}</div>
              <div style={{ marginBottom: 16 }}>
                {card.can.map((c, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8 }}>
                    <span style={{ color: '#4ade80', fontSize: 10 }}>✓</span>{c}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>{t('clube.access_cannot')}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{t(card.cannotKey)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 5: Final CTA ─────────────────────────────────────── */}
      <section style={{ padding: '64px 40px', textAlign: 'center' }}>
        <h2 style={{
          fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700,
          color: 'rgba(255,255,255,0.92)', margin: '0 0 12px',
        }}>
          {t('clube.final_title')}
        </h2>
        <p style={{ fontSize: 14, fontWeight: 300, color: 'rgba(255,255,255,0.4)', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.6 }}>
          {t('clube.final_sub')}
        </p>
        <button
          onClick={() => window.location.href = 'mailto:contato@gmt.app'}
          style={{
            background: 'white', color: '#080f1a', border: 'none', borderRadius: 8,
            padding: '11px 28px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif", transition: 'opacity 0.15s',
            marginBottom: 16,
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {t('clube.final_cta')}
        </button>
        <div>
          <button
            onClick={() => navigate('/terminal')}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 12, color: 'rgba(255,255,255,0.3)',
              fontFamily: "'IBM Plex Sans', sans-serif", transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
          >
            {t('clube.final_link')}
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
          {t('clube.copyright')}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>
          {t('clube.disclaimer')}
        </span>
      </div>
    </div>
  );
}
