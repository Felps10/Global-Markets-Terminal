import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const STYLE_ID = 'gmt-markets-dropdown-styles';

function injectDropdownStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes marketsDropIn {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .markets-dropdown-panel {
      animation: marketsDropIn 0.15s ease;
    }
    .markets-dropdown-item:hover {
      background: rgba(255,255,255,0.04) !important;
    }
    .markets-dropdown-item.item-active {
      background: rgba(59,130,246,0.06) !important;
      border-left: 3px solid var(--c-accent);
    }
  `;
  document.head.appendChild(el);
}

const MARKETS_ITEMS = [
  {
    icon: '📈',
    label: 'Chart Center',
    description: 'Interactive price charts & comparisons',
    route: '/markets/chart',
    requiresAuth: true,
  },
  {
    icon: '🔬',
    label: 'Research Terminal',
    description: 'Deep-dive asset research workspace',
    route: '/markets/research',
    requiresAuth: true,
  },
  {
    icon: '📊',
    label: 'Fundamental Lab',
    description: 'Multi-asset valuation & metric comparison',
    route: '/markets/fundamentals',
    requiresAuth: true,
  },
  {
    icon: '🌐',
    label: 'Macro Hub',
    description: 'Global macro dashboards & economic calendar',
    route: '/markets/macro',
    requiresAuth: true,
  },
  {
    icon: '⚡',
    label: 'Signal Engine',
    description: 'RSI, MACD & technical signal scanner',
    route: '/markets/signals',
    requiresAuth: true,
  },
];

export default function MarketsDropdown({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname.startsWith('/markets/');

  useEffect(() => { injectDropdownStyles(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      ref={ref}
      style={{ position: 'relative', height: 38, display: 'flex', alignItems: 'center' }}
    >
      <button
        className={`gmt-nav-item${isActive ? ' active' : ''}`}
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
      >
        Markets
        <span style={{ fontSize: 9, color: isActive ? '#e2e8f0' : 'inherit', lineHeight: 1 }}>
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div
          className="markets-dropdown-panel"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            minWidth: 280,
            background: '#0d1824',
            border: '1px solid rgba(51,65,85,0.85)',
            borderRadius: 6,
            zIndex: 200,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {MARKETS_ITEMS.map((item, i) => (
            <div key={item.route}>
              {i > 0 && (
                <div style={{ height: 1, background: 'rgba(30,41,59,0.8)' }} />
              )}
              {(() => {
                const itemActive = location.pathname.startsWith(item.route);
                return (
                  <button
                    className={`markets-dropdown-item${itemActive ? ' item-active' : ''}`}
                    onClick={() => { navigate(item.route); setOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      width: '100%',
                      padding: '12px 16px',
                      background: 'transparent',
                      border: 'none',
                      borderLeft: itemActive ? '3px solid var(--c-accent)' : '3px solid transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                    <div>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                        fontWeight: itemActive ? 600 : 500,
                        color: itemActive ? 'var(--c-accent)' : '#e2e8f0',
                        letterSpacing: '0.02em',
                      }}>
                        {item.label}
                        {item.requiresAuth && !user && (
                          <span style={{ marginLeft: 5, fontSize: 9, color: '#475569', verticalAlign: 'middle' }}>
                            🔒
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        fontSize: 11,
                        color: '#475569',
                        marginTop: 3,
                      }}>
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
