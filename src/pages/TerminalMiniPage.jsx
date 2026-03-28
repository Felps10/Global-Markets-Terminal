import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MiniHeader from '../components/MiniHeader.jsx';
import { fetchMiniPrices } from '../dataServices.js';
import { MINI_GLOBAL_ASSETS, MINI_BRASIL_ASSETS } from '../data/miniAssets.js';
import { trackEvent } from '../services/analytics.js';

// ─── Price formatting ────────────────────────────────────────────────────────
const BRL_SYMBOLS = new Set(['PETR4', 'ACWI11', 'ALZR11']);

function formatPrice(price, symbol) {
  if (BRL_SYMBOLS.has(symbol)) {
    return `R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (price > 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  if (price < 10) {
    return price.toFixed(4);
  }
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Skeleton card ───────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '0.5px solid rgba(255,255,255,0.07)',
      borderRadius: 8,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      animation: 'miniPulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ width: 48, height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
      <div style={{ width: 80, height: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
      <div style={{ width: 60, height: 14, background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginTop: 4 }} />
      <div style={{ width: 40, height: 11, background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
    </div>
  );
}

// ─── Asset card ──────────────────────────────────────────────────────────────
function MiniAssetCard({ symbol, data }) {
  const price     = data?.price;
  const changePct = data?.changePct;
  const isUp      = changePct != null && changePct >= 0;
  const isDown    = changePct != null && changePct < 0;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '0.5px solid rgba(255,255,255,0.07)',
      borderRadius: 8,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        fontWeight: 500,
        color: '#e2e8f0',
      }}>
        {symbol}
      </div>
      <div style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 10,
        color: 'rgba(255,255,255,0.35)',
        marginBottom: 6,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {data?.name ?? '—'}
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14,
        fontWeight: 500,
        color: '#e2e8f0',
      }}>
        {price != null ? formatPrice(price, symbol) : '—'}
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: isUp ? '#4ade80' : isDown ? '#f87171' : 'rgba(255,255,255,0.35)',
      }}>
        {changePct != null
          ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
          : '—'}
      </div>
    </div>
  );
}

// ─── Inject pulse animation ──────────────────────────────────────────────────
const STYLE_ID = 'mini-pulse-styles';
function injectMiniStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes miniPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  document.head.appendChild(el);
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function TerminalMiniPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [mode, setMode]               = useState('global');
  const [prices, setPrices]           = useState({});
  const [loading, setLoading]         = useState(true);
  const [lang, setLang]               = useState(i18n.language?.startsWith('en') ? 'en' : 'pt');
  const [lastUpdated, setLastUpdated] = useState(null);

  function handleLangChange(newLang) {
    setLang(newLang);
    i18n.changeLanguage(newLang);
  }

  useEffect(() => { injectMiniStyles(); }, []);

  // Analytics
  useEffect(() => {
    trackEvent('guest_terminal_entry', { surface: 'mini' });
  }, []);

  // Fetch prices
  const fetchPrices = useCallback(async () => {
    try {
      const data = await fetchMiniPrices();
      setPrices(data);
      setLastUpdated(new Date());
    } catch (e) {
      console.warn('[TerminalMini] fetch failed:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30_000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const assets = mode === 'brasil' ? MINI_BRASIL_ASSETS : MINI_GLOBAL_ASSETS;

  return (
    <div style={{ minHeight: '100vh', background: '#080f1a', color: '#e2e8f0', display: 'flex', flexDirection: 'column' }}>
      <MiniHeader lang={lang} onLangChange={handleLangChange} />

      {/* Mode toggle */}
      <div style={{ textAlign: 'center', padding: '20px 24px 16px' }}>
        <div style={{
          display: 'inline-flex',
          border: '0.5px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          {['global', 'brasil'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '7px 20px',
                background: mode === m ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: 'none',
                color: mode === m ? '#fff' : 'rgba(255,255,255,0.4)',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12,
                fontWeight: mode === m ? 500 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
                borderRight: m === 'global' ? '0.5px solid rgba(255,255,255,0.12)' : 'none',
              }}
            >
              {m === 'global' ? t('mini.toggle_global') : t('mini.toggle_brasil')}
            </button>
          ))}
        </div>
      </div>

      {/* Asset grid */}
      <div style={{
        flex: 1,
        padding: '0 24px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 10,
        alignContent: 'start',
      }}>
        {loading
          ? [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
          : assets.map(asset => (
              <MiniAssetCard
                key={asset.symbol}
                symbol={asset.symbol}
                data={prices[asset.symbol]}
              />
            ))
        }
      </div>

      {/* Upgrade CTA strip */}
      <div style={{
        borderTop: '0.5px solid rgba(255,255,255,0.06)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', marginBottom: 2, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {t('mini.upgrade_title')}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {t('mini.upgrade_desc')}
          </div>
        </div>
        <button
          onClick={() => navigate('/terminal')}
          style={{
            background: '#fff',
            border: 'none',
            borderRadius: 7,
            color: '#080f1a',
            cursor: 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 12,
            fontWeight: 500,
            padding: '8px 18px',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          {t('mini.upgrade_cta')}
        </button>
      </div>

      {/* Attribution strip */}
      <div style={{
        borderTop: '0.5px solid rgba(255,255,255,0.06)',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>
          GMT · Terminal Mini
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>
          {lastUpdated
            ? `${t('mini.updated')} ${lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
            : t('mini.loading')}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>
          {t('mini.data_sources')}
        </span>
      </div>
    </div>
  );
}
