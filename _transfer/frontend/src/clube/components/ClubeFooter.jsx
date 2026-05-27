/**
 * ClubeFooter.jsx
 * Footer for the Clube GMT brand ecosystem.
 *
 * Used by all public /clube/* pages.
 *
 * Props:
 *   lang — 'pt' | 'en' (controlled by parent page)
 */

import { useNavigate } from 'react-router-dom';
import { CLUBE_NAV, CLUBE_COLORS, CLUBE_FONTS } from '../styles/index.js';

const TEXT = {
  pt: {
    tagline: 'Gestão inteligente para seu clube de investimento.',
    navLabel: 'Navegação',
    legalLabel: 'Aviso Legal',
    legalText:
      'Clube GMT é uma plataforma de gestão para clubes de investimento. Os clubes são entidades independentes reguladas pela CVM sob a Instrução 494/11. O Clube GMT não administra recursos financeiros nem oferece consultoria de investimentos.',
    copyright: '© 2025 Clube GMT. Todos os direitos reservados.',
  },
  en: {
    tagline: 'Intelligent management for your investment club.',
    navLabel: 'Navigation',
    legalLabel: 'Legal Notice',
    legalText:
      'Clube GMT is a management platform for investment clubs. Clubs are independent entities regulated by the CVM under Instruction 494/11. Clube GMT does not manage financial resources or provide investment advice.',
    copyright: '© 2025 Clube GMT. All rights reserved.',
  },
};

const sectionLabelStyle = {
  fontFamily: CLUBE_FONTS.sans,
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'rgba(255,255,255,0.3)',
  marginBottom: 16,
};

const socialIconStyle = {
  color: 'rgba(255,255,255,0.3)',
  cursor: 'pointer',
  transition: 'color 150ms',
};

export default function ClubeFooter({ lang = 'pt' }) {
  const navigate = useNavigate();
  const t = TEXT[lang] || TEXT.pt;
  const navItems = CLUBE_NAV[lang] || CLUBE_NAV.pt;

  return (
    <footer style={{
      background: CLUBE_COLORS.bg,
      borderTop: '1px solid rgba(249,195,0,0.08)',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '48px 40px 32px',
      }}>
        {/* ── Three-column grid ── */}
        <div className="clube-footer-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 40,
        }}>
          {/* Column 1 — Brand */}
          <div className="clube-footer-col">
            <div
              onClick={() => navigate('/clube')}
              style={{ cursor: 'pointer', marginBottom: 12 }}
            >
              <div style={{
                fontFamily: CLUBE_FONTS.sans,
                fontSize: 18,
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1.1,
              }}>
                Clube
              </div>
              <div style={{
                fontFamily: CLUBE_FONTS.sans,
                fontSize: 10,
                fontWeight: 400,
                color: 'rgba(249,195,0,0.5)',
                letterSpacing: '0.08em',
                lineHeight: 1.2,
              }}>
                by GMT
              </div>
            </div>

            <p style={{
              fontFamily: CLUBE_FONTS.sans,
              fontSize: 13,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.45)',
              margin: '0 0 20px',
              maxWidth: 260,
            }}>
              {t.tagline}
            </p>

            {/* Social links */}
            <div className="clube-footer-socials" style={{ display: 'flex', gap: 14 }}>
              {/* Instagram */}
              <a
                href="#"
                style={socialIconStyle}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                aria-label="Instagram"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
                </svg>
              </a>
              {/* LinkedIn */}
              <a
                href="#"
                style={socialIconStyle}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                aria-label="LinkedIn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2 — Navigation */}
          <div className="clube-footer-col">
            <div style={sectionLabelStyle}>{t.navLabel}</div>
            {navItems.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'block',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: CLUBE_FONTS.sans,
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.5)',
                  padding: '4px 0',
                  textAlign: 'left',
                  transition: 'color 150ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Column 3 — Legal */}
          <div className="clube-footer-col">
            <div style={sectionLabelStyle}>{t.legalLabel}</div>
            <p style={{
              fontFamily: CLUBE_FONTS.sans,
              fontSize: 11,
              lineHeight: 1.7,
              color: 'rgba(255,255,255,0.3)',
              margin: 0,
              maxWidth: 280,
            }}>
              {t.legalText}
            </p>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{
          height: 1,
          background: 'rgba(255,255,255,0.06)',
          margin: '32px 0 24px',
        }} />

        {/* ── Bottom bar ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
        className="clube-footer-bottom">
          <span style={{
            fontFamily: CLUBE_FONTS.sans,
            fontSize: 11,
            color: 'rgba(255,255,255,0.25)',
          }}>
            {t.copyright}
          </span>
          <button
            onClick={() => navigate('/terminal')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: CLUBE_FONTS.sans,
              fontSize: 11,
              color: 'rgba(249,195,0,0.4)',
              padding: 0,
              transition: 'color 150ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(249,195,0,0.8)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(249,195,0,0.4)'; }}
          >
            Powered by GMT Terminal →
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .clube-footer-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          .clube-footer-socials { justify-content: center; }
          .clube-footer-nav-btn { text-align: center !important; }
          .clube-footer-legal { max-width: 100% !important; }
          .clube-footer-bottom {
            flex-direction: column !important;
            align-items: center !important;
          }
        }
      `}</style>
    </footer>
  );
}
