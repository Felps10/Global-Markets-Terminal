import { useState, useEffect } from 'react';

export default function AlertToast({ alerts, onDismiss }) {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    if (!alerts || alerts.length === 0) return;
    setVisible(prev => [...prev, ...alerts]);
  }, [alerts]);

  // Auto-dismiss each toast after 5 seconds
  useEffect(() => {
    if (visible.length === 0) return;
    const timer = setTimeout(() => {
      setVisible(prev => prev.slice(1));
      onDismiss?.();
    }, 5000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (visible.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {visible.map((a, i) => (
        <div key={a.id || i} style={{
          background: '#0e1016',
          border: '1px solid rgba(255,255,255,0.08)',
          borderLeft: '3px solid var(--c-error)',
          borderRadius: 4,
          padding: '12px 16px',
          minWidth: 260,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--c-error)',
              marginBottom: 4,
            }}>
              ALERT TRIGGERED
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: 'rgba(255,255,255,0.9)',
            }}>
              {a.symbol} crossed {a.condition === 'above' ? '↑' : '↓'} {Number(a.threshold).toFixed(2)}
            </div>
          </div>
          <button
            onClick={() => setVisible(prev => prev.filter((_, idx) => idx !== i))}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
