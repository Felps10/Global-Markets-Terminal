import { useAlerts } from '../context/AlertsContext.jsx';

export default function AlertsPage() {
  const { alerts, loading, toggleAlert, deleteAlert } = useAlerts();

  const active    = alerts.filter(a => a.active);
  const triggered = alerts.filter(a => !a.active);

  return (
    <div style={{ padding: '24px 20px', maxWidth: 700 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.15em',
        color: 'var(--c-text-3)',
        textTransform: 'uppercase',
        marginBottom: 20,
      }}>
        PRICE ALERTS
      </div>

      {loading && (
        <div style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 13,
          color: 'var(--c-text-3)',
        }}>
          Loading…
        </div>
      )}

      {!loading && alerts.length === 0 && (
        <div style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 13,
          color: 'var(--c-text-3)',
          lineHeight: 1.6,
          padding: '40px 0',
        }}>
          No alerts set — open any asset and set a price trigger.
        </div>
      )}

      {/* Active alerts */}
      {active.length > 0 && (
        <>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.12em',
            color: 'var(--c-accent-data)',
            marginBottom: 10,
            textTransform: 'uppercase',
          }}>
            ACTIVE ({active.length})
          </div>
          {active.map(alert => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onToggle={() => toggleAlert(alert.id)}
              onDelete={() => deleteAlert(alert.id)}
            />
          ))}
        </>
      )}

      {/* Triggered alerts */}
      {triggered.length > 0 && (
        <>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.12em',
            color: 'var(--c-text-3)',
            marginTop: 24,
            marginBottom: 10,
            textTransform: 'uppercase',
          }}>
            TRIGGERED ({triggered.length})
          </div>
          {triggered.map(alert => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onToggle={() => toggleAlert(alert.id)}
              onDelete={() => deleteAlert(alert.id)}
              dimmed
            />
          ))}
        </>
      )}
    </div>
  );
}

function AlertRow({ alert, onToggle, onDelete, dimmed }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 12px',
      borderBottom: '1px solid var(--c-border)',
      opacity: dimmed ? 0.5 : 1,
      background: dimmed ? 'var(--c-error-dim)' : 'transparent',
    }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--c-text)',
        minWidth: 80,
      }}>
        {alert.symbol}
      </span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        color: 'var(--c-text-2)',
        minWidth: 100,
      }}>
        {alert.condition === 'above' ? '↑ Above' : '↓ Below'} {Number(alert.threshold).toFixed(2)}
      </span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        color: alert.active ? 'var(--c-accent-data)' : 'var(--c-text-3)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        minWidth: 60,
      }}>
        {alert.active ? 'Active' : 'Triggered'}
      </span>
      <div style={{ flex: 1 }} />
      <button
        onClick={onToggle}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 3,
          color: 'var(--c-text-2)',
          cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          padding: '3px 10px',
          letterSpacing: '0.06em',
        }}
      >
        {alert.active ? 'Pause' : 'Re-arm'}
      </button>
      <button
        onClick={onDelete}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--c-text-3)',
          cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14,
          padding: '2px 6px',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--c-error)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--c-text-3)'}
      >
        ×
      </button>
    </div>
  );
}
