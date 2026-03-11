import { useState, useEffect } from 'react';

const STYLE_ID = 'gmt-ticker-strip-styles';

function injectStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes tickerScrollLeft  { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
    @keyframes tickerScrollRight { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
  `;
  document.head.appendChild(el);
}

function fmtPrice(price, ticker) {
  if (price == null) return '—';
  if (ticker && ticker.includes('/')) return price.toFixed(4);
  if (price > 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toFixed(2);
}

function fmtChange(change) {
  if (change == null || change === 0) return null;
  return (change > 0 ? '▲' : '▼') + ' ' + Math.abs(change).toFixed(2) + '%';
}

export default function TickerStrip({
  items       = [],
  direction   = 1,
  speed       = 32,
  onAssetClick,
}) {
  const [paused, setPaused] = useState(false);

  useEffect(() => { injectStyles(); }, []);

  if (!items.length) return null;

  const doubled   = [...items, ...items];
  const duration  = (items.length * 120) / speed;
  const animation = direction >= 0
    ? `tickerScrollLeft  ${duration}s linear infinite`
    : `tickerScrollRight ${duration}s linear infinite`;

  return (
    <div
      style={{ overflow: 'hidden', width: '100%' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div style={{
        display: 'inline-flex',
        animation,
        animationPlayState: paused ? 'paused' : 'running',
        willChange: 'transform',
      }}>
        {doubled.map((item, i) => {
          const chg   = item.change ?? 0;
          const chgUp = chg > 0;
          const chgDn = chg < 0;
          const chgColor = chgUp ? '#4ade80' : chgDn ? '#f87171' : '#64748b';
          const chgStr   = fmtChange(chg);
          const origItem = items[i % items.length];

          return (
            <button
              key={i}
              onClick={() => onAssetClick && onAssetClick(origItem)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 14px',
                height: '100%',
                background: 'transparent',
                border: 'none',
                borderRight: '1px solid rgba(51,65,85,0.6)',
                cursor: onAssetClick ? 'pointer' : 'default',
                whiteSpace: 'nowrap',
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                if (onAssetClick) {
                  e.currentTarget.querySelector('.tk-sym').style.color = '#93c5fd';
                }
              }}
              onMouseLeave={(e) => {
                if (onAssetClick) {
                  e.currentTarget.querySelector('.tk-sym').style.color = '#94a3b8';
                }
              }}
            >
              <span className="tk-sym" style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, fontWeight: 700,
                color: '#94a3b8', letterSpacing: '0.1em',
                transition: 'color 0.12s',
              }}>
                {item.ticker}
              </span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, color: '#e2e8f0',
              }}>
                {fmtPrice(item.price, item.ticker)}
              </span>
              {chgStr && (
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, color: chgColor,
                }}>
                  {chgStr}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
