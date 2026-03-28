/**
 * ComoFuncionaPage.jsx
 * "How It Works" — explains the investment club lifecycle.
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
    label: 'COMO FUNCIONA',
    headline: 'Do primeiro aporte ao relatório mensal.',
    subline: 'Entenda o ciclo completo de um clube de investimento gerido pelo Clube GMT.',
  },
  en: {
    label: 'HOW IT WORKS',
    headline: 'From the first contribution to the monthly report.',
    subline: 'Understand the complete lifecycle of an investment club managed by Clube GMT.',
  },
};

const STEPS = {
  pt: [
    {
      number: '01',
      title: 'Formação do clube',
      desc: 'O gestor reúne os cotistas fundadores (mínimo 3, máximo 50) e registra o clube sob a Instrução CVM 494/11. O Clube GMT guia o processo com um checklist de setup.',
    },
    {
      number: '02',
      title: 'Configuração no Clube GMT',
      desc: 'O gestor cria o clube na plataforma, adiciona os cotistas, define o benchmark (CDI ou IBOV) e faz o aporte inicial de cada membro.',
    },
    {
      number: '03',
      title: 'Gestão da carteira',
      desc: 'O gestor opera a carteira respeitando o enquadramento CVM: mínimo 67% em renda variável. O Clube GMT monitora o compliance em tempo real.',
    },
    {
      number: '04',
      title: 'Cotização semanal',
      desc: 'A cada semana, o gestor registra o NAV (patrimônio líquido) e o sistema calcula automaticamente o valor da cota e a performance de cada cotista.',
    },
    {
      number: '05',
      title: 'Relatório mensal AI',
      desc: 'O Clube GMT gera automaticamente um relatório mensal em português com análise de performance, comparação com benchmark e comentário de mercado.',
    },
    {
      number: '06',
      title: 'Assembleias e governança',
      desc: 'O gestor convoca assembleias, registra votos e mantém o histórico de decisões. Toda a documentação fica centralizada na plataforma.',
    },
  ],
  en: [
    {
      number: '01',
      title: 'Club formation',
      desc: 'The manager gathers founding members (minimum 3, maximum 50) and registers the club under CVM Instruction 494/11. Clube GMT guides the process with a setup checklist.',
    },
    {
      number: '02',
      title: 'Setup on Clube GMT',
      desc: 'The manager creates the club on the platform, adds members, sets the benchmark (CDI or IBOV), and records the initial contribution from each member.',
    },
    {
      number: '03',
      title: 'Portfolio management',
      desc: 'The manager operates the portfolio respecting CVM compliance: minimum 67% in variable income. Clube GMT monitors compliance in real time.',
    },
    {
      number: '04',
      title: 'Weekly quota recording',
      desc: 'Each week, the manager records the NAV (net asset value) and the system automatically calculates the quota value and each member\'s performance.',
    },
    {
      number: '05',
      title: 'Monthly AI report',
      desc: 'Clube GMT automatically generates a monthly report in Portuguese with performance analysis, benchmark comparison, and market commentary.',
    },
    {
      number: '06',
      title: 'Assemblies and governance',
      desc: 'The manager calls assemblies, records votes, and maintains a decision history. All documentation is centralised on the platform.',
    },
  ],
};

const COMPLIANCE = {
  pt: {
    label: 'REGULAÇÃO',
    headline: 'Compliance automático com a CVM.',
    points: [
      'Monitoramento do enquadramento 67% renda variável',
      'Alertas de desenquadramento em tempo real',
      'Histórico de reenquadramento documentado',
      'Relatórios prontos para a assembleia',
    ],
  },
  en: {
    label: 'REGULATION',
    headline: 'Automatic CVM compliance.',
    points: [
      'Monitoring of 67% variable income requirement',
      'Real-time non-compliance alerts',
      'Documented rebalancing history',
      'Reports ready for assembly',
    ],
  },
};

const CTA = {
  pt: {
    headline: 'Pronto para começar?',
    sub: 'Entre em contato e criamos seu clube juntos.',
    btn: 'Falar com a equipe',
    link: 'Ver para gestores →',
  },
  en: {
    headline: 'Ready to get started?',
    sub: 'Get in touch and we\'ll create your club together.',
    btn: 'Talk to the team',
    link: 'See for managers →',
  },
};

// ─── Component ──────────────────────────────────────────────────────────────────

export default function ComoFuncionaPage() {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language?.startsWith('en') ? 'en' : 'pt');
  const handleLangChange = (newLang) => {
    setLang(newLang);
    i18n.changeLanguage(newLang);
  };
  const navigate = useNavigate();

  const hero = HERO[lang] || HERO.pt;
  const steps = STEPS[lang] || STEPS.pt;
  const compliance = COMPLIANCE[lang] || COMPLIANCE.pt;
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

      {/* Spacer for fixed header */}
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

        {/* ── Section 1: 6-step lifecycle ──────────────────────────────── */}
        <section style={{
          padding: '48px 40px 64px',
          maxWidth: 720,
          margin: '0 auto',
        }}>
          {steps.map((step, i) => (
            <div
              key={step.number}
              style={{
                display: 'flex',
                gap: 24,
                padding: '24px 0',
                borderBottom: i < steps.length - 1
                  ? '1px solid rgba(255,255,255,0.04)'
                  : 'none',
                position: 'relative',
              }}
            >
              {/* Number column with connector line */}
              <div style={{
                width: 60,
                flexShrink: 0,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}>
                <span style={{
                  fontFamily: CLUBE_FONTS.mono,
                  fontSize: 32,
                  fontWeight: 800,
                  color: CLUBE_COLORS.accent,
                  lineHeight: 1,
                }}>
                  {step.number}
                </span>
                {i < steps.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    top: 40,
                    bottom: -24,
                    width: 2,
                    background: 'rgba(249,195,0,0.15)',
                  }} />
                )}
              </div>

              {/* Content column */}
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'white',
                  marginBottom: 8,
                }}>
                  {step.title}
                </div>
                <div style={{
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.55)',
                  lineHeight: 1.7,
                }}>
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* ── Section 2: CVM compliance callout ────────────────────────── */}
        <section style={{
          padding: '0 40px 64px',
          maxWidth: 720,
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
              {compliance.label}
            </div>
            <h2 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              color: 'white',
              margin: '0 0 24px',
            }}>
              {compliance.headline}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {compliance.points.map((point, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.6)',
                  lineHeight: 1.5,
                }}>
                  <span style={{
                    color: CLUBE_COLORS.accent,
                    fontSize: 8,
                    flexShrink: 0,
                    marginTop: 2,
                  }}>
                    •
                  </span>
                  {point}
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
              onClick={() => navigate('/clube/para-gestores')}
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
