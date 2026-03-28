/**
 * ClubeLandingPage.jsx (new — Clube brand)
 * Public marketing page for Clube GMT.
 * Uses ClubeHeader + ClubeFooter instead of GMTHomepageHeader.
 * No styled-components — inline styles only.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.js';
import ClubeHeader from '../components/ClubeHeader.jsx';
import ClubeFooter from '../components/ClubeFooter.jsx';
import { CLUBE_COLORS, CLUBE_FONTS } from '../styles/index.js';

// ─── Data arrays ────────────────────────────────────────────────────────────────

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

const WHAT_IS = {
  pt: {
    label: 'O QUE É',
    headline: 'Um clube de investimento é uma comunidade que investe junto.',
    body: 'Regulado pela CVM sob a Instrução 494/11, um clube de investimento permite que um grupo de pessoas físicas reúna recursos para investir coletivamente em renda variável. Com gestão profissional, compliance automatizado e relatórios em português, o Clube GMT torna essa jornada simples.',
    items: [
      'Mínimo 3, máximo 50 cotistas',
      'Obrigatório 67% em renda variável',
      'Regulado pela CVM — Instrução 494/11',
      'Gerido por um administrador eleito',
    ],
  },
  en: {
    label: 'WHAT IS IT',
    headline: 'An investment club is a community that invests together.',
    body: 'Regulated by the CVM under Instruction 494/11, an investment club allows a group of individuals to pool resources for collective investment in variable income assets. With professional management, automated compliance, and reports in Portuguese, Clube GMT makes this journey simple.',
    items: [
      'Minimum 3, maximum 50 members',
      'Required 67% in variable income',
      'Regulated by CVM — Instruction 494/11',
      'Managed by an elected administrator',
    ],
  },
};

const ACCESS_CARDS = {
  pt: [
    {
      role: 'Gestor',
      can: [
        'Registrar NAV e cotização',
        'Gerenciar cotistas',
        'Gerar relatório AI',
        'Acessar compliance',
        'Gerenciar documentos',
      ],
    },
    {
      role: 'Cotista',
      can: [
        'Ver dashboard do clube',
        'Acompanhar performance',
        'Acessar relatórios',
        'Participar de assembleias',
        'Consultar documentos legais',
      ],
    },
  ],
  en: [
    {
      role: 'Manager',
      can: [
        'Record NAV and quota',
        'Manage members',
        'Generate AI report',
        'Access compliance',
        'Manage documents',
      ],
    },
    {
      role: 'Member',
      can: [
        'View club dashboard',
        'Track performance',
        'Access reports',
        'Participate in assemblies',
        'View legal documents',
      ],
    },
  ],
};

const GET_IN_TOUCH = {
  pt: {
    label: 'QUER PARTICIPAR?',
    headline: 'Fale com a gente.',
    body: 'Se você quer criar um clube de investimento ou já tem um clube e quer migrar para o Clube GMT, entre em contato. Respondemos em até 48 horas.',
    cta: 'Enviar mensagem',
    sub: 'Ou escreva para contato@gmt.app',
  },
  en: {
    label: 'WANT TO JOIN?',
    headline: 'Get in touch.',
    body: 'If you want to create an investment club or already have one and want to migrate to Clube GMT, reach out. We respond within 48 hours.',
    cta: 'Send a message',
    sub: 'Or write to contato@gmt.app',
  },
};

// ─── Shared styles ──────────────────────────────────────────────────────────────

const sectionLabelStyle = {
  fontSize: 10,
  fontFamily: CLUBE_FONTS.mono,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)',
  marginBottom: 12,
  textAlign: 'center',
};

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: 24,
};

// ─── Component ──────────────────────────────────────────────────────────────────

export default function ClubeLandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, loading } = useAuth();
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language?.startsWith('en') ? 'en' : 'pt');

  const handleLangChange = (newLang) => {
    setLang(newLang);
    i18n.changeLanguage(newLang);
  };

  // Auth redirect — club roles go to /clubes
  useEffect(() => {
    if (loading) return;
    const role = user?.role;
    if (role === 'club_member' || role === 'club_manager' || role === 'admin') {
      navigate('/clubes', { replace: true });
    }
  }, [loading, user, navigate]);

  const whatIs = WHAT_IS[lang] || WHAT_IS.pt;
  const accessCards = ACCESS_CARDS[lang] || ACCESS_CARDS.pt;
  const getInTouch = GET_IN_TOUCH[lang] || GET_IN_TOUCH.pt;

  return (
    <div style={{
      minHeight: '100vh',
      background: CLUBE_COLORS.bg,
      color: CLUBE_COLORS.textPrimary,
      fontFamily: CLUBE_FONTS.sans,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <ClubeHeader
        lang={lang}
        onLangChange={handleLangChange}
        onSignIn={() => navigate('/login')}
        onSignUp={() => navigate('/register')}
      />

      {/* Spacer for fixed header */}
      <div style={{ height: 56 }} />

      <main style={{ flex: 1 }}>

        {/* ── Section 1: Hero ──────────────────────────────────────────── */}
        <section style={{
          padding: '80px 40px 64px',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
        }}>
          {/* Grid overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            pointerEvents: 'none',
          }} />
          {/* Gradient orb */}
          <div style={{
            position: 'absolute',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${CLUBE_COLORS.accentFaint} 0%, transparent 70%)`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto' }}>
            <div style={{
              display: 'inline-block',
              background: CLUBE_COLORS.accentFaint,
              border: `0.5px solid ${CLUBE_COLORS.accentBorder}`,
              borderRadius: 20,
              padding: '4px 14px',
              fontSize: 11,
              fontFamily: CLUBE_FONTS.mono,
              color: CLUBE_COLORS.accent,
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
            <p style={{
              fontSize: 15,
              fontWeight: 300,
              color: 'rgba(255,255,255,0.45)',
              maxWidth: 540,
              margin: '0 auto 36px',
              lineHeight: 1.65,
            }}>
              {t('clube.hero_subline')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              <button
                onClick={() => { window.location.href = 'mailto:contato@gmt.app'; }}
                style={{
                  background: CLUBE_COLORS.ctaBg,
                  color: CLUBE_COLORS.ctaText,
                  border: 'none',
                  borderRadius: 8,
                  padding: '11px 28px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: CLUBE_FONTS.sans,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = CLUBE_COLORS.ctaHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = CLUBE_COLORS.ctaBg; }}
              >
                {t('clube.cta_request')}
              </button>
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.35)',
                  border: 'none',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: CLUBE_FONTS.sans,
                  transition: 'color 0.15s',
                  padding: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
              >
                {t('clube.cta_member')}
              </button>
            </div>
          </div>
        </section>

        {/* ── Section 2: O que é um Clube de Investimento ──────────────── */}
        <section style={{ padding: '64px 40px', maxWidth: 800, margin: '0 auto' }}>
          <div style={sectionLabelStyle}>{whatIs.label}</div>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 28,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.92)',
            textAlign: 'center',
            margin: '0 0 20px',
          }}>
            {whatIs.headline}
          </h2>
          <p style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.8,
            textAlign: 'center',
            maxWidth: 680,
            margin: '0 auto 32px',
          }}>
            {whatIs.body}
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 12,
          }}>
            {whatIs.items.map((item, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.02)',
                borderLeft: `3px solid ${CLUBE_COLORS.accent}`,
                borderRadius: 8,
                padding: 16,
                fontSize: 13,
                color: CLUBE_COLORS.textPrimary,
                lineHeight: 1.5,
              }}>
                {item}
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 3: Who it's for ──────────────────────────────────── */}
        <section style={{ padding: '64px 40px', maxWidth: 1080, margin: '0 auto' }}>
          <div style={sectionLabelStyle}>{t('clube.for_whom_label')}</div>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 28,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.92)',
            textAlign: 'center',
            margin: '0 0 40px',
          }}>
            {t('clube.for_whom_title')}
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {PERSONAS.map((p, i) => (
              <div key={i} style={{
                ...cardStyle,
                transition: 'border-color 200ms',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = CLUBE_COLORS.accentBorder; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                <div style={{ fontSize: 24, marginBottom: 12 }}>{p.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: CLUBE_COLORS.textPrimary, marginBottom: 8 }}>
                  {t(p.titleKey)}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  {t(p.descKey)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 4: Features ──────────────────────────────────────── */}
        <section style={{ padding: '64px 40px', maxWidth: 720, margin: '0 auto' }}>
          <div style={sectionLabelStyle}>{t('clube.features_label')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {FEATURES_LIST.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: CLUBE_COLORS.textPrimary, marginBottom: 4 }}>
                    {t(f.nameKey)}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                    {t(f.descKey)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 5: Access model ──────────────────────────────────── */}
        <section style={{ padding: '64px 40px', maxWidth: 720, margin: '0 auto' }}>
          <div style={sectionLabelStyle}>
            {lang === 'pt' ? 'MODELO DE ACESSO' : 'ACCESS MODEL'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {accessCards.map((card, i) => (
              <div key={i} style={cardStyle}>
                <div style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: CLUBE_COLORS.textPrimary,
                  marginBottom: 16,
                }}>
                  {card.role}
                </div>
                <div style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}>
                  {lang === 'pt' ? 'PODE' : 'CAN'}
                </div>
                <div>
                  {card.can.map((c, j) => (
                    <div key={j} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.55)',
                      lineHeight: 1.8,
                    }}>
                      <span style={{ color: CLUBE_COLORS.accent, fontSize: 10 }}>✓</span>
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 6: Get in touch ──────────────────────────────────── */}
        <section style={{ padding: '64px 40px', textAlign: 'center' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={sectionLabelStyle}>{getInTouch.label}</div>
            <h2 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 28,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.92)',
              margin: '0 0 16px',
            }}>
              {getInTouch.headline}
            </h2>
            <p style={{
              fontSize: 14,
              fontWeight: 300,
              color: 'rgba(255,255,255,0.4)',
              maxWidth: 480,
              margin: '0 auto 32px',
              lineHeight: 1.6,
            }}>
              {getInTouch.body}
            </p>
            <button
              onClick={() => { window.location.href = 'mailto:contato@gmt.app'; }}
              style={{
                background: CLUBE_COLORS.ctaBg,
                color: CLUBE_COLORS.ctaText,
                border: 'none',
                borderRadius: 8,
                padding: '11px 28px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: CLUBE_FONTS.sans,
                transition: 'background 0.15s',
                marginBottom: 12,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = CLUBE_COLORS.ctaHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = CLUBE_COLORS.ctaBg; }}
            >
              {getInTouch.cta}
            </button>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              {getInTouch.sub.replace('contato@gmt.app', '')}{' '}
              <a
                href="mailto:contato@gmt.app"
                style={{ color: CLUBE_COLORS.accentDim, textDecoration: 'none' }}
              >
                contato@gmt.app
              </a>
            </div>
          </div>
        </section>

        {/* ── Section 7: Final CTA ─────────────────────────────────────── */}
        <section style={{ padding: '64px 40px', textAlign: 'center' }}>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 24,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.92)',
            margin: '0 0 12px',
          }}>
            {t('clube.final_title')}
          </h2>
          <p style={{
            fontSize: 14,
            fontWeight: 300,
            color: 'rgba(255,255,255,0.4)',
            maxWidth: 480,
            margin: '0 auto 32px',
            lineHeight: 1.6,
          }}>
            {t('clube.final_sub')}
          </p>
          <button
            onClick={() => { window.location.href = 'mailto:contato@gmt.app'; }}
            style={{
              background: CLUBE_COLORS.ctaBg,
              color: CLUBE_COLORS.ctaText,
              border: 'none',
              borderRadius: 8,
              padding: '11px 28px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: CLUBE_FONTS.sans,
              transition: 'background 0.15s',
              marginBottom: 16,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = CLUBE_COLORS.ctaHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = CLUBE_COLORS.ctaBg; }}
          >
            {t('clube.final_cta')}
          </button>
          <div>
            <button
              onClick={() => navigate('/terminal')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                color: 'rgba(255,255,255,0.3)',
                fontFamily: CLUBE_FONTS.sans,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
            >
              {t('clube.final_link')}
            </button>
          </div>
        </section>

      </main>

      <ClubeFooter lang={lang} />
    </div>
  );
}
