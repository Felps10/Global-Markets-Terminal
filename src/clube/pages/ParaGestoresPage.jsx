/**
 * ParaGestoresPage.jsx
 * "For Managers" — features and workflow for club managers.
 * Public page, no auth required.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ClubeHeader from '../components/ClubeHeader.jsx';
import ClubeFooter from '../components/ClubeFooter.jsx';
import { CLUBE_COLORS, CLUBE_FONTS } from '../styles/index.js';

// ─── Bilingual content ──────────────────────────────────────────────────────────

const HERO = {
  pt: {
    label: 'PARA GESTORES',
    headline: 'Tudo que você precisa para gerir seu clube.',
    subline: 'Do registro de NAV ao relatório AI — uma plataforma completa para o gestor de clube de investimento.',
  },
  en: {
    label: 'FOR MANAGERS',
    headline: 'Everything you need to manage your club.',
    subline: 'From NAV recording to AI reports — a complete platform for the investment club manager.',
  },
};

const FEATURES = {
  pt: [
    {
      icon: '📊',
      title: 'Registro de NAV',
      desc: 'Registre o patrimônio líquido semanalmente. O sistema calcula automaticamente o valor da cota e a rentabilidade de cada cotista.',
    },
    {
      icon: '👥',
      title: 'Gestão de cotistas',
      desc: 'Adicione, remova e atualize cotistas. Controle aportes, resgates e o histórico de movimentações de cada membro.',
    },
    {
      icon: '🤖',
      title: 'Relatório AI em português',
      desc: 'Gere relatórios mensais com análise de performance, comparação com CDI/IBOV e comentário de mercado — tudo em português.',
    },
    {
      icon: '⚖️',
      title: 'Compliance CVM automático',
      desc: 'Monitoramento em tempo real do enquadramento CVM. Alertas de desenquadramento e histórico de reenquadramento documentado.',
    },
    {
      icon: '📋',
      title: 'Gestão de documentos',
      desc: 'Estatuto, atas de assembleia, extratos e documentos regulatórios centralizados e organizados na plataforma.',
    },
    {
      icon: '🗳️',
      title: 'Assembleias digitais',
      desc: 'Convoque assembleias, registre votos e mantenha o histórico de decisões do clube. Governança transparente e documentada.',
    },
  ],
  en: [
    {
      icon: '📊',
      title: 'NAV recording',
      desc: 'Record net asset value weekly. The system automatically calculates quota value and each member\'s returns.',
    },
    {
      icon: '👥',
      title: 'Member management',
      desc: 'Add, remove, and update members. Track contributions, redemptions, and the transaction history of each member.',
    },
    {
      icon: '🤖',
      title: 'AI report in Portuguese',
      desc: 'Generate monthly reports with performance analysis, CDI/IBOV comparison, and market commentary — all in Portuguese.',
    },
    {
      icon: '⚖️',
      title: 'Automatic CVM compliance',
      desc: 'Real-time CVM compliance monitoring. Non-compliance alerts and documented rebalancing history.',
    },
    {
      icon: '📋',
      title: 'Document management',
      desc: 'Bylaws, assembly minutes, statements, and regulatory documents centralised and organised on the platform.',
    },
    {
      icon: '🗳️',
      title: 'Digital assemblies',
      desc: 'Call assemblies, record votes, and maintain the club\'s decision history. Transparent and documented governance.',
    },
  ],
};

const WORKFLOW = {
  pt: {
    label: 'ROTINA DO GESTOR',
    headline: 'Uma rotina simples. Resultados profissionais.',
    steps: [
      { freq: 'Semanal', action: 'Registrar NAV e cotização' },
      { freq: 'Mensal',  action: 'Gerar relatório AI para os cotistas' },
      { freq: 'Mensal',  action: 'Revisar compliance e enquadramento CVM' },
      { freq: 'Mensal',  action: 'Atualizar documentos e movimentações' },
      { freq: 'Anual',   action: 'Convocar assembleia geral ordinária' },
    ],
  },
  en: {
    label: 'MANAGER ROUTINE',
    headline: 'A simple routine. Professional results.',
    steps: [
      { freq: 'Weekly',  action: 'Record NAV and quota value' },
      { freq: 'Monthly', action: 'Generate AI report for members' },
      { freq: 'Monthly', action: 'Review CVM compliance and rebalancing' },
      { freq: 'Monthly', action: 'Update documents and transactions' },
      { freq: 'Annually',action: 'Call the annual general assembly' },
    ],
  },
};

const CTA = {
  pt: {
    headline: 'Pronto para simplificar a gestão do seu clube?',
    sub: 'Entre em contato. Configuramos tudo juntos.',
    btn: 'Falar com a equipe',
    link: 'Como funciona →',
  },
  en: {
    headline: 'Ready to simplify your club management?',
    sub: 'Get in touch. We\'ll set everything up together.',
    btn: 'Talk to the team',
    link: 'How it works →',
  },
};

// ─── Component ──────────────────────────────────────────────────────────────────

export default function ParaGestoresPage() {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language?.startsWith('en') ? 'en' : 'pt');
  const handleLangChange = (newLang) => {
    setLang(newLang);
    i18n.changeLanguage(newLang);
  };
  const navigate = useNavigate();

  const hero = HERO[lang] || HERO.pt;
  const features = FEATURES[lang] || FEATURES.pt;
  const workflow = WORKFLOW[lang] || WORKFLOW.pt;
  const cta = CTA[lang] || CTA.pt;

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

      <div style={{ height: 56 }} />

      <main style={{ flex: 1 }}>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section style={{
          padding: '64px 40px 48px',
          textAlign: 'center',
          maxWidth: 760,
          margin: '0 auto',
        }}>
          <div style={{
            fontSize: 11,
            fontFamily: CLUBE_FONTS.mono,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: CLUBE_COLORS.accent,
            marginBottom: 16,
          }}>
            {hero.label}
          </div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 'clamp(28px, 4.5vw, 40px)',
            fontWeight: 800,
            lineHeight: 1.15,
            color: 'white',
            margin: '0 0 20px',
          }}>
            {hero.headline}
          </h1>
          <p style={{
            fontSize: 18,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.6,
            maxWidth: 600,
            margin: '0 auto',
          }}>
            {hero.subline}
          </p>
        </section>

        {/* ── Section 1: Core features ─────────────────────────────────── */}
        <section style={{
          padding: '48px 40px 64px',
          maxWidth: 1080,
          margin: '0 auto',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {features.map((f, i) => (
              <div
                key={i}
                style={{
                  background: CLUBE_COLORS.bgSurface,
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  padding: '28px 24px',
                  transition: 'border-color 200ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = CLUBE_COLORS.borderGold; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
                <div style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'white',
                  marginBottom: 10,
                }}>
                  {f.title}
                </div>
                <div style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.5)',
                  lineHeight: 1.7,
                }}>
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 2: Manager workflow callout ──────────────────────── */}
        <section style={{
          padding: '0 40px 64px',
          maxWidth: 680,
          margin: '0 auto',
        }}>
          <div style={{
            border: `1px solid ${CLUBE_COLORS.borderGold}`,
            borderRadius: 12,
            padding: 40,
            background: CLUBE_COLORS.bgSurface,
          }}>
            <div style={{
              fontSize: 10,
              fontFamily: CLUBE_FONTS.mono,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: CLUBE_COLORS.accent,
              marginBottom: 12,
            }}>
              {workflow.label}
            </div>
            <h2 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              color: 'white',
              margin: '0 0 28px',
            }}>
              {workflow.headline}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {workflow.steps.map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '14px 0',
                    borderBottom: i < workflow.steps.length - 1
                      ? '1px solid rgba(255,255,255,0.04)'
                      : 'none',
                  }}
                >
                  <span style={{
                    background: CLUBE_COLORS.accentFaint,
                    border: `1px solid ${CLUBE_COLORS.accentBorder}`,
                    color: CLUBE_COLORS.accent,
                    fontFamily: CLUBE_FONTS.mono,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '3px 10px',
                    borderRadius: 4,
                    minWidth: 70,
                    textAlign: 'center',
                    flexShrink: 0,
                  }}>
                    {step.freq}
                  </span>
                  <span style={{
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.7)',
                  }}>
                    {step.action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 3: Final CTA ─────────────────────────────────────── */}
        <section style={{
          padding: '64px 40px',
          textAlign: 'center',
        }}>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 28,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.92)',
            margin: '0 0 12px',
          }}>
            {cta.headline}
          </h2>
          <p style={{
            fontSize: 14,
            fontWeight: 300,
            color: 'rgba(255,255,255,0.4)',
            maxWidth: 480,
            margin: '0 auto 32px',
            lineHeight: 1.6,
          }}>
            {cta.sub}
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
            {cta.btn}
          </button>
          <div>
            <button
              onClick={() => navigate('/clube/como-funciona')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                color: CLUBE_COLORS.accentDim,
                fontFamily: CLUBE_FONTS.sans,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = CLUBE_COLORS.accent; }}
              onMouseLeave={e => { e.currentTarget.style.color = CLUBE_COLORS.accentDim; }}
            >
              {cta.link}
            </button>
          </div>
        </section>

      </main>

      <ClubeFooter lang={lang} />
    </div>
  );
}
