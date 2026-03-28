/**
 * ContatoPage.jsx
 * Contact page for Clube GMT.
 * Explains the onboarding process and provides
 * a clear path to get in touch.
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
    label: 'CONTATO',
    headline: 'Vamos criar seu clube juntos.',
    subline: 'Seja para criar um novo clube ou migrar um existente, estamos aqui para ajudar.',
  },
  en: {
    label: 'CONTACT',
    headline: 'Let\'s build your club together.',
    subline: 'Whether you\'re creating a new club or migrating an existing one, we\'re here to help.',
  },
};

const CONTACT_CARDS = {
  pt: [
    {
      icon: '✉️',
      title: 'Email',
      desc: 'Escreva para nós diretamente. Respondemos em até 48 horas úteis.',
      action: 'contato@gmt.app',
      href: 'mailto:contato@gmt.app',
      btnLabel: 'Enviar email',
      external: false,
    },
    {
      icon: '💬',
      title: 'WhatsApp',
      desc: 'Prefere uma conversa mais rápida? Fale com a equipe pelo WhatsApp.',
      action: '+55 (11) 99999-9999',
      href: 'https://wa.me/5511999999999',
      btnLabel: 'Abrir WhatsApp',
      external: true,
    },
  ],
  en: [
    {
      icon: '✉️',
      title: 'Email',
      desc: 'Write to us directly. We respond within 48 business hours.',
      action: 'contato@gmt.app',
      href: 'mailto:contato@gmt.app',
      btnLabel: 'Send email',
      external: false,
    },
    {
      icon: '💬',
      title: 'WhatsApp',
      desc: 'Prefer a quicker conversation? Talk to the team on WhatsApp.',
      action: '+55 (11) 99999-9999',
      href: 'https://wa.me/5511999999999',
      btnLabel: 'Open WhatsApp',
      external: true,
    },
  ],
};

const PROCESS = {
  pt: {
    label: 'COMO FUNCIONA O ONBOARDING',
    headline: 'Do contato à primeira cotização.',
    steps: [
      {
        number: '01',
        title: 'Você entra em contato',
        desc: 'Envie um email ou mensagem explicando sua situação — clube existente ou novo, número de cotistas, patrimônio aproximado.',
      },
      {
        number: '02',
        title: 'Conversa inicial',
        desc: 'Nossa equipe agenda uma conversa de 30 minutos para entender o clube e explicar como o Clube GMT funciona na prática.',
      },
      {
        number: '03',
        title: 'Configuração da plataforma',
        desc: 'Configuramos o clube juntos: cadastro dos cotistas, benchmark, histórico de NAV se disponível, e documentos iniciais.',
      },
      {
        number: '04',
        title: 'Primeira cotização',
        desc: 'Com tudo configurado, você registra o primeiro NAV e o sistema começa a calcular cotas e performance automaticamente.',
      },
    ],
  },
  en: {
    label: 'HOW ONBOARDING WORKS',
    headline: 'From first contact to first quota.',
    steps: [
      {
        number: '01',
        title: 'You get in touch',
        desc: 'Send an email or message explaining your situation — existing or new club, number of members, approximate assets under management.',
      },
      {
        number: '02',
        title: 'Initial conversation',
        desc: 'Our team schedules a 30-minute call to understand the club and explain how Clube GMT works in practice.',
      },
      {
        number: '03',
        title: 'Platform setup',
        desc: 'We set up the club together: member registration, benchmark selection, NAV history if available, and initial documents.',
      },
      {
        number: '04',
        title: 'First quota recording',
        desc: 'With everything configured, you record the first NAV and the system starts calculating quotas and performance automatically.',
      },
    ],
  },
};

const FAQ = {
  pt: {
    label: 'PERGUNTAS FREQUENTES',
    items: [
      {
        q: 'O Clube GMT é para qualquer tipo de clube?',
        a: 'Sim. O Clube GMT foi desenvolvido para clubes de investimento regulados pela CVM sob a Instrução 494/11, independentemente do tamanho ou estratégia de investimento.',
      },
      {
        q: 'Já tenho um clube ativo. Posso migrar?',
        a: 'Sim. Importamos o histórico de NAV e cotistas do seu clube existente. A migração é feita em conjunto com nossa equipe.',
      },
      {
        q: 'Qual é o custo do Clube GMT?',
        a: 'Entre em contato para conhecer os planos disponíveis. O modelo de precificação é baseado no número de cotistas e funcionalidades utilizadas.',
      },
      {
        q: 'O Clube GMT administra os recursos do clube?',
        a: 'Não. O Clube GMT é uma plataforma de gestão e compliance. A administração dos recursos é responsabilidade do gestor e dos cotistas do clube.',
      },
    ],
  },
  en: {
    label: 'FREQUENTLY ASKED QUESTIONS',
    items: [
      {
        q: 'Is Clube GMT for any type of club?',
        a: 'Yes. Clube GMT was developed for investment clubs regulated by the CVM under Instruction 494/11, regardless of size or investment strategy.',
      },
      {
        q: 'I already have an active club. Can I migrate?',
        a: 'Yes. We import the NAV history and member list from your existing club. Migration is done together with our team.',
      },
      {
        q: 'What is the cost of Clube GMT?',
        a: 'Get in touch to learn about available plans. Pricing is based on the number of members and features used.',
      },
      {
        q: 'Does Clube GMT manage the club\'s assets?',
        a: 'No. Clube GMT is a management and compliance platform. Asset management is the responsibility of the club manager and members.',
      },
    ],
  },
};

const FINAL_CTA = {
  pt: {
    headline: 'Ainda tem dúvidas?',
    sub: 'Nossa equipe responde todas as suas perguntas.',
    btn: 'Enviar email',
  },
  en: {
    headline: 'Still have questions?',
    sub: 'Our team will answer all your questions.',
    btn: 'Send email',
  },
};

// ─── Component ──────────────────────────────────────────────────────────────────

export default function ContatoPage() {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language?.startsWith('en') ? 'en' : 'pt');
  const handleLangChange = (newLang) => {
    setLang(newLang);
    i18n.changeLanguage(newLang);
  };
  const navigate = useNavigate();

  const hero = HERO[lang] || HERO.pt;
  const contactCards = CONTACT_CARDS[lang] || CONTACT_CARDS.pt;
  const process = PROCESS[lang] || PROCESS.pt;
  const faq = FAQ[lang] || FAQ.pt;
  const finalCta = FINAL_CTA[lang] || FINAL_CTA.pt;

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

        {/* ── Section 1: Contact cards ──────────────────────────────────── */}
        <section style={{
          padding: '0 40px 64px',
          maxWidth: 720,
          margin: '0 auto',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {contactCards.map((card, i) => (
              <div key={i} style={{
                background: CLUBE_COLORS.bgSurface,
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '32px 28px',
              }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{card.icon}</div>
                <div style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'white',
                  marginBottom: 8,
                }}>
                  {card.title}
                </div>
                <div style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.5)',
                  lineHeight: 1.7,
                  marginBottom: 20,
                }}>
                  {card.desc}
                </div>
                <div style={{
                  fontSize: 13,
                  fontFamily: CLUBE_FONTS.mono,
                  color: CLUBE_COLORS.accent,
                  marginBottom: 16,
                }}>
                  {card.action}
                </div>
                <a
                  href={card.href}
                  target={card.external ? '_blank' : undefined}
                  rel={card.external ? 'noopener noreferrer' : undefined}
                  style={{
                    display: 'block',
                    width: '100%',
                    background: CLUBE_COLORS.ctaBg,
                    color: CLUBE_COLORS.ctaText,
                    border: 'none',
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: CLUBE_FONTS.sans,
                    textAlign: 'center',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = CLUBE_COLORS.ctaHover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = CLUBE_COLORS.ctaBg; }}
                >
                  {card.btnLabel}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 2: Onboarding process ────────────────────────────── */}
        <section style={{
          padding: '0 40px 64px',
          maxWidth: 680,
          margin: '0 auto',
        }}>
          <div style={{
            fontSize: 10,
            fontFamily: CLUBE_FONTS.mono,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: CLUBE_COLORS.accent,
            marginBottom: 12,
            textAlign: 'center',
          }}>
            {process.label}
          </div>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 24,
            fontWeight: 700,
            color: 'white',
            margin: '0 0 32px',
            textAlign: 'center',
          }}>
            {process.headline}
          </h2>

          {process.steps.map((step, i) => (
            <div
              key={step.number}
              style={{
                display: 'flex',
                gap: 24,
                padding: '24px 0',
                borderBottom: i < process.steps.length - 1
                  ? '1px solid rgba(255,255,255,0.04)'
                  : 'none',
                position: 'relative',
              }}
            >
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
                {i < process.steps.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    top: 40,
                    bottom: -24,
                    width: 2,
                    background: 'rgba(249,195,0,0.15)',
                  }} />
                )}
              </div>
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

        {/* ── Section 3: FAQ ───────────────────────────────────────────── */}
        <section style={{
          padding: '0 40px 64px',
          maxWidth: 680,
          margin: '0 auto',
        }}>
          <div style={{
            fontSize: 10,
            fontFamily: CLUBE_FONTS.mono,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: CLUBE_COLORS.accent,
            marginBottom: 32,
            textAlign: 'center',
          }}>
            {faq.label}
          </div>

          {faq.items.map((item, i) => (
            <div key={i} style={{
              borderBottom: i < faq.items.length - 1
                ? '1px solid rgba(255,255,255,0.06)'
                : 'none',
            }}>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'white',
                padding: '20px 0 8px',
              }}>
                {item.q}
              </div>
              <div style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.7,
                paddingBottom: 20,
              }}>
                {item.a}
              </div>
            </div>
          ))}
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────── */}
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
            {finalCta.headline}
          </h2>
          <p style={{
            fontSize: 14,
            fontWeight: 300,
            color: 'rgba(255,255,255,0.4)',
            maxWidth: 480,
            margin: '0 auto 32px',
            lineHeight: 1.6,
          }}>
            {finalCta.sub}
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
            }}
            onMouseEnter={e => { e.currentTarget.style.background = CLUBE_COLORS.ctaHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = CLUBE_COLORS.ctaBg; }}
          >
            {finalCta.btn}
          </button>
        </section>

      </main>

      <ClubeFooter lang={lang} />
    </div>
  );
}
