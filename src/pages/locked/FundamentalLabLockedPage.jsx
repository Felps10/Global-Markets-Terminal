import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
export default function FundamentalLabLockedPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, openAuthPanel } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/markets/fundamentals', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  function handleUnlock() {
    openAuthPanel('fundamental_lab');
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080f1a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>📊</div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: '4px 12px',
          marginBottom: 20,
        }}>
          <span style={{ fontSize: 10 }}>🔒</span>
          <span style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {t('locked.badge')}
          </span>
        </div>
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 28,
          fontWeight: 800,
          color: '#e2e8f0',
          marginBottom: 12,
          lineHeight: 1.2,
        }}>
          {t('locked.fundamental_lab_title')}
        </h1>
        <p style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.6,
          marginBottom: 32,
        }}>
          {t('locked.fundamental_lab_desc')}
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: '16px 20px',
          marginBottom: 28,
          textAlign: 'left',
        }}>
          <div style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            {t('locked.unlock_label')}
          </div>
          {[
            'Comparação de até 5 ativos simultaneamente',
            'Métricas normalizadas por setor',
            'Tabelas exportáveis de valuation',
            'Histórico de métricas fundamentalistas',
          ].map((f, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.8,
            }}>
              <span style={{ color: '#4ade80', fontSize: 10 }}>✓</span>
              {f}
            </div>
          ))}
        </div>
        <button
          onClick={handleUnlock}
          style={{
            width: '100%',
            background: '#fff',
            border: 'none',
            borderRadius: 8,
            color: '#080f1a',
            cursor: 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            padding: '12px 24px',
            marginBottom: 12,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          {t('locked.cta')}
        </button>
        <button
          onClick={() => navigate('/app')}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 12,
            color: 'rgba(255,255,255,0.3)',
            padding: '4px 0',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
        >
          {t('locked.back')}
        </button>
      </div>
    </div>
  );
}
