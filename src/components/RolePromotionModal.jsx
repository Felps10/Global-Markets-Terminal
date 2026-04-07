import { ROLE_LABEL } from '../lib/roles.js';

export default function RolePromotionModal({ role, onDismiss }) {
  const roleName = ROLE_LABEL[role] || role;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
    }}>
      <div style={{
        background: '#0e1016',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: '32px 36px',
        maxWidth: 380,
        width: '90%',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: '0.15em',
          color: 'var(--c-accent)',
          marginBottom: 16,
          textTransform: 'uppercase',
        }}>
          ACCESS UPDATED
        </div>
        <div style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 16,
          fontWeight: 500,
          color: 'rgba(255,255,255,0.9)',
          marginBottom: 8,
          lineHeight: 1.5,
        }}>
          Your access level has been updated.
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          color: 'var(--c-accent)',
          marginBottom: 24,
        }}>
          {roleName}
        </div>
        <button
          onClick={onDismiss}
          style={{
            background: 'var(--c-accent)',
            color: '#080f1a',
            border: 'none',
            borderRadius: 4,
            padding: '10px 32px',
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.06em',
            cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
