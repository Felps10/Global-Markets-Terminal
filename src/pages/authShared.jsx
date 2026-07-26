/**
 * authShared.jsx — everything LoginPage and RegisterPage used to duplicate
 * (2026-07 public-area redesign, PR 5): the decorative left panel, the
 * post-auth redirect logic (including return-to-origin), shared field
 * styles, the eye toggle, and the scoped styles (form animation + the
 * mobile stack for the 2-col grid).
 */

import { useTranslation } from 'react-i18next';
import { ROUTES } from '../lib/routes.js';
import { TOTAL_ASSETS, GROUP_COUNT, SOURCE_COUNT } from '../lib/publicStats.js';

export function getRedirectForRole(role) {
  if (role === 'admin') return ROUTES.admin;
  return ROUTES.terminal.global;
}

/**
 * Where to land after successful auth: the location the visitor was
 * originally headed to (set by ProtectedRoute via state.from — query and
 * hash preserved, so ?symbol= deep links survive), else the role default.
 */
export function resolvePostAuthTarget(from, role) {
  if (from?.pathname) {
    return `${from.pathname}${from.search || ''}${from.hash || ''}`;
  }
  return getRedirectForRole(role);
}

export const inputBase = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 4,
  color: 'rgba(255,255,255,0.85)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 13,
  padding: '11px 14px',
  outline: 'none',
  transition: 'border-color 150ms',
};

export const labelBase = {
  display: 'block',
  fontFamily: "'IBM Plex Sans', sans-serif",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.12em',
  color: 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase',
  marginBottom: 8,
};

export function EyeIcon({ open }) {
  return open
    ? <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    : <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}

// Scoped styles both pages need: the form-panel entrance animation and the
// mobile stack — below 860px the decorative panel hides and the form takes
// the full width (inline styles can't express media queries).
export function AuthStyles() {
  return (
    <style>{`
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .gmt-form-panel { animation: fadeInUp 280ms ease both; }
      @media (prefers-reduced-motion: reduce) {
        .gmt-form-panel { animation: none; }
      }
      @media (max-width: 860px) {
        .gmt-auth-grid { grid-template-columns: 1fr !important; }
        .gmt-auth-left { display: none !important; }
      }
    `}</style>
  );
}

function MiniGlobe() {
  return (
    <svg viewBox="0 0 200 200" width={160} height={160} style={{ opacity: 0.35 }}>
      <circle cx={100} cy={100} r={80} stroke="var(--c-accent)" strokeWidth={1} fill="none" opacity={0.6} />
      <ellipse cx={100} cy={55}  rx={80} ry={20} fill="none" stroke="var(--c-accent)" strokeWidth={0.6} opacity={0.3} />
      <ellipse cx={100} cy={72}  rx={80} ry={45} fill="none" stroke="var(--c-accent)" strokeWidth={0.6} opacity={0.3} />
      <ellipse cx={100} cy={100} rx={80} ry={80} fill="none" stroke="var(--c-accent)" strokeWidth={0.6} opacity={0.3} />
      <ellipse cx={100} cy={128} rx={80} ry={45} fill="none" stroke="var(--c-accent)" strokeWidth={0.6} opacity={0.3} />
      <ellipse cx={100} cy={145} rx={80} ry={20} fill="none" stroke="var(--c-accent)" strokeWidth={0.6} opacity={0.3} />
      {[0, 30, 60, 90, 120, 150].map(deg => (
        <ellipse key={deg} cx={100} cy={100} rx={80} ry={80}
          fill="none" stroke="var(--c-accent)" strokeWidth={0.5} opacity={0.2}
          transform={`rotate(${deg}, 100, 100)`} />
      ))}
      {[
        [100, 20], [100, 180], [20, 100], [180, 100], [65, 57], [135, 57],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2} fill="var(--c-accent)" opacity={0.5} />
      ))}
    </svg>
  );
}

// The decorative half both auth pages share — globe, wordmark, tagline
// (i18n key differs per page), and the live stat trio.
export function AuthLeftPanel({ taglineKey }) {
  const { t } = useTranslation();
  return (
    <div className="gmt-auth-left" style={{
      background: '#040810',
      borderRight: '1px solid rgba(255,255,255,0.04)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 48px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <MiniGlobe />
      <div style={{
        fontFamily: "'Syne', sans-serif",
        fontWeight: 800,
        fontSize: 18,
        letterSpacing: '0.2em',
        color: 'rgba(255,255,255,0.25)',
        marginTop: 24,
        textAlign: 'center',
      }}>
        GMT
      </div>
      <div style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 13,
        fontWeight: 300,
        color: 'rgba(255,255,255,0.2)',
        textAlign: 'center',
        lineHeight: 1.6,
        whiteSpace: 'pre-line',
        marginTop: 8,
      }}>
        {t(taglineKey)}
      </div>
      <div style={{
        position: 'absolute',
        bottom: 40,
        display: 'flex',
        gap: 24,
      }}>
        {[
          { num: String(TOTAL_ASSETS), label: t('auth.stat_assets') },
          { num: String(GROUP_COUNT), label: t('auth.stat_groups') },
          { num: String(SOURCE_COUNT), label: t('auth.stat_sources') },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              fontWeight: 600,
              color: 'rgba(59,130,246,0.5)',
            }}>{s.num}</span>
            <span style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 9,
              color: 'rgba(255,255,255,0.2)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginTop: 4,
            }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
