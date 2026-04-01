/**
 * MiniHeader — header for Terminal Mini only
 * Separate from GMTHeader (terminal) and GMTHomepageHeader (marketing)
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function MiniHeader({ lang, onLangChange }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header style={{
      height: 48,
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: '#080f1a',
      borderBottom: '0.5px solid rgba(255,255,255,0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
          <rect width="22" height="22" rx="4" fill="rgba(59,130,246,0.15)" />
          <rect x="3" y="14" width="3" height="5" rx="1" fill="var(--c-accent)" />
          <rect x="7" y="10" width="3" height="9" rx="1" fill="var(--c-accent)" opacity="0.85" />
          <rect x="11" y="6" width="3" height="13" rx="1" fill="var(--c-accent)" opacity="0.7" />
          <rect x="15" y="3" width="3" height="16" rx="1" fill="var(--c-accent)" opacity="0.55" />
        </svg>
        <span style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 13,
          fontWeight: 500,
          color: '#e2e8f0',
          marginLeft: 8,
        }}>
          {t('mini.header_label')}
        </span>
        <div style={{
          width: 1,
          height: 16,
          background: 'rgba(255,255,255,0.08)',
          margin: '0 16px',
        }} />
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#4ade80',
          boxShadow: '0 0 4px rgba(74,222,128,0.5)',
        }} />
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* PT/EN toggle */}
        <div style={{
          display: 'flex',
          border: '0.5px solid rgba(255,255,255,0.12)',
          borderRadius: 6,
          overflow: 'hidden',
        }}>
          {['pt', 'en'].map(l => (
            <button
              key={l}
              onClick={() => onLangChange(l)}
              style={{
                background: lang === l ? 'rgba(255,255,255,0.12)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 11,
                color: lang === l ? '#fff' : 'rgba(255,255,255,0.3)',
                padding: '4px 10px',
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{
          width: 1,
          height: 16,
          background: 'rgba(255,255,255,0.08)',
          margin: '0 16px',
        }} />

        {/* Terminal Pro link */}
        <button
          onClick={() => navigate('/terminal')}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 12,
            color: 'rgba(255,255,255,0.35)',
            padding: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
        >
          {t('mini.upgrade_link')}
        </button>
      </div>
    </header>
  );
}
