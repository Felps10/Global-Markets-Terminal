import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../lib/routes.js';

/**
 * /pricing — deliberate placeholder (2026-07 public-area truth pass).
 *
 * The previous version sold a fictional $499/mo Pro tier and Free-tier limits
 * (50 assets, 60s refresh, 2 sources) that no code enforces — there is no
 * billing system in this repo. Until real pricing is defined by the owner,
 * this page holds the route with no invented numbers, tiers, or limits.
 */
export default function PricingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div style={{
      fontFamily: "'IBM Plex Sans', sans-serif",
      color: 'rgba(255,255,255,0.92)',
      background: '#040810',
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '120px 40px 80px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 640 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.25em',
          color: 'var(--c-accent)', textTransform: 'uppercase', marginBottom: 16,
        }}>{t('pricing.eyebrow')}</div>

        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: 'clamp(32px, 4.5vw, 52px)', lineHeight: 1.1,
          color: 'rgba(255,255,255,0.92)', marginTop: 0, marginBottom: 20,
        }}>
          {t('pricing.title')}
        </h1>

        <p style={{
          fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.7, marginTop: 0, marginBottom: 40,
        }}>
          {t('pricing.body')}
        </p>

        <button
          onClick={() => navigate(ROUTES.auth.register)}
          style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 14, fontWeight: 600,
            background: 'var(--c-accent)', color: '#080f1a',
            border: 'none', borderRadius: 4, padding: '14px 32px',
            cursor: 'pointer', transition: 'background 150ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-accent-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--c-accent)'; }}
        >
          {t('common.create_free_account')}
        </button>
      </div>
    </div>
  );
}
