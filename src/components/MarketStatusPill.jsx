import { useState, useEffect, useRef } from 'react';

export const MARKETS = [
  { id: "nyse",     tzLabel: "ET",  label: "NYSE",     flag: "🇺🇸", tz: "America/New_York",  openUTC: 14*60+30, closeUTC: 21*60,    weekend: true  },
  { id: "b3",       tzLabel: "BRT", label: "B3",       flag: "🇧🇷", tz: "America/Sao_Paulo", openUTC: 13*60,    closeUTC: 21*60+55, weekend: true  },
  { id: "lse",      tzLabel: "GMT", label: "LSE",      flag: "🇬🇧", tz: "Europe/London",     openUTC: 8*60,     closeUTC: 16*60+30, weekend: true  },
  { id: "euronext", tzLabel: "CET", label: "EURONEXT", flag: "🇪🇺", tz: "Europe/Paris",      openUTC: 8*60,     closeUTC: 16*60+30, weekend: true  },
  { id: "tse",      tzLabel: "JST", label: "TSE",      flag: "🇯🇵", tz: "Asia/Tokyo",        openUTC: 0,        closeUTC: 6*60,     weekend: true  },
  { id: "crypto",   tzLabel: "UTC", label: "CRYPTO",   flag: "🪙",  tz: "UTC",               openUTC: 0,        closeUTC: 24*60,    weekend: false },
];

function isMarketOpen(market) {
  if (market.id === 'crypto') return true;
  const now = new Date();
  const dow = now.getUTCDay();
  if (market.weekend && (dow === 0 || dow === 6)) return false;
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  return mins >= market.openUTC && mins < market.closeUTC;
}

const STYLE_ID = 'gmt-market-pill-styles';

function injectPillStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes mktPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.35; transform: scale(0.7); }
    }
  `;
  document.head.appendChild(el);
}

export default function MarketStatusPill({ selected, setSelected }) {
  const [open,    setOpen]    = useState(false);
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(MARKETS.map(m => [m.id, isMarketOpen(m)]))
  );
  const ref = useRef(null);

  useEffect(() => { injectPillStyles(); }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setStatuses(Object.fromEntries(MARKETS.map(m => [m.id, isMarketOpen(m)])));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const market   = MARKETS.find(m => m.id === selected) || MARKETS[0];
  const isOpen   = statuses[selected];
  const dotColor = isOpen ? '#4ade80' : '#64748b';

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'transparent',
          border: '1px solid rgba(51,65,85,0.6)',
          borderRadius: 4,
          padding: '3px 8px',
          cursor: 'pointer',
          color: isOpen ? '#4ade80' : '#64748b',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: '0.08em',
          whiteSpace: 'nowrap',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(100,116,139,0.8)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(51,65,85,0.6)'; }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: dotColor,
          boxShadow: isOpen ? '0 0 6px #4ade80' : 'none',
          animation: isOpen ? 'mktPulse 2s ease-in-out infinite' : 'none',
          display: 'inline-block',
          flexShrink: 0,
        }} />
        <span>{market.flag}</span>
        <span style={{ fontWeight: 700 }}>{market.label}</span>
        <span style={{ color: '#334155', margin: '0 2px' }}>|</span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em' }}>
          {isOpen ? 'OPEN' : 'CLOSED'}
        </span>
        <span style={{ color: '#334155', fontSize: 9, marginLeft: 2 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          zIndex: 200,
          background: '#0b1220',
          border: '1px solid rgba(51,65,85,0.85)',
          borderRadius: 6,
          overflow: 'hidden',
          minWidth: 200,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {MARKETS.map(m => {
            const mOpen  = statuses[m.id];
            const isActive = m.id === selected;
            return (
              <button
                key={m.id}
                onClick={() => { setSelected(m.id); setOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 14px',
                  background: isActive ? 'rgba(59,130,246,0.1)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#cbd5e1',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: mOpen ? '#4ade80' : '#334155',
                  boxShadow: mOpen ? '0 0 4px #4ade80' : 'none',
                  flexShrink: 0,
                }} />
                <span>{m.flag}</span>
                <span style={{ flex: 1, fontWeight: isActive ? 700 : 400 }}>{m.label}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                  color: mOpen ? '#4ade80' : '#475569',
                }}>
                  {mOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
