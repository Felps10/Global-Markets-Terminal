import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { CLUBE_COLORS, CLUBE_FONTS } from '../clube/styles/index.js';
import { calculateNAVFromHistory } from '../services/portfolioEngine.js';
import { signColor, fmtDate } from '../clube/utils/formatters.js';

const C    = CLUBE_COLORS;
const MONO = CLUBE_FONTS.mono;

export default function ClubeCotistaApp({ clube, navHistory, posicoes, cotistaData }) {
  const { user } = useAuth();
  const displayName = (user?.name || user?.email?.split('@')[0] || '').toUpperCase();

  const minhaPosicao = cotistaData.minhaPosicao;

  const navAnalytics = useMemo(
    () => (clube && navHistory?.length > 0
      ? calculateNAVFromHistory(navHistory, clube)
      : null),
    [navHistory, clube],
  );

  const lastNavDate = navHistory?.[navHistory.length - 1]?.data ?? null;

  // ── Card styles ─────────────────────────────────────────────────────────────

  const cardStyle = {
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: 16,
  };

  const topLabel = {
    fontFamily: MONO,
    fontSize: 10,
    color: C.textDim,
    letterSpacing: '0.1em',
    marginBottom: 8,
  };

  const mainValue = {
    fontFamily: MONO,
    fontSize: 24,
    fontWeight: 600,
    color: C.textPrimary,
  };

  const subLine = {
    fontFamily: MONO,
    fontSize: 10,
    color: C.textDim,
    marginTop: 6,
  };

  // ── Format helpers ──────────────────────────────────────────────────────────

  function formatBRL6(value) {
    if (value == null) return '—';
    return Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    });
  }

  // ── Loading state ───────────────────────────────────────────────────────────

  if (cotistaData.loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: MONO,
        fontSize: 11,
        color: C.textDim,
        letterSpacing: '0.1em',
      }}>
        CARREGANDO...
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: C.bg,
      fontFamily: MONO,
    }}>

      {/* ── Top bar (48px) ── */}
      <div style={{
        flexShrink: 0,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: C.bgHead,
        borderBottom: `1px solid ${C.borderSubtle}`,
      }}>
        <Link
          to="/app/global"
          style={{
            fontFamily: MONO,
            fontSize: 10,
            color: C.textSecondary,
            textDecoration: 'none',
            letterSpacing: '0.06em',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = C.textPrimary; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.textSecondary; }}
        >
          ← Terminal
        </Link>

        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: C.textPrimary,
          letterSpacing: '0.1em',
        }}>
          {clube?.nome ?? 'CLUBE GMT'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {displayName && (
            <span style={{
              fontSize: 10,
              color: C.textSecondary,
              maxWidth: 140,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {displayName}
            </span>
          )}
          <span style={{
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '2px 7px',
            borderRadius: 3,
            background: C.accentFaint,
            color: C.accent,
            border: `1px solid ${C.accentBorder}`,
          }}>
            COTISTA
          </span>
        </div>
      </div>

      {/* ── Content area — no tab bar ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        minHeight: 0,
        padding: 24,
      }}>
        {/* ── KPI card grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
          maxWidth: 600,
        }}>

          {/* Card 1 — VALOR DA COTA */}
          <div style={cardStyle}>
            <div style={topLabel}>VALOR DA COTA</div>
            <div style={mainValue}>
              {formatBRL6(navAnalytics?.currentNAV)}
            </div>
            <div style={subLine}>
              {lastNavDate
                ? `atualizado em ${fmtDate(lastNavDate)}`
                : 'sem dados de NAV'}
            </div>
          </div>

          {/* Card 2 — RETORNO */}
          {minhaPosicao?.retorno_pct != null ? (
            <div style={cardStyle}>
              <div style={topLabel}>MEU RETORNO</div>
              <div style={{
                ...mainValue,
                color: signColor(minhaPosicao.retorno_pct),
              }}>
                {minhaPosicao.retorno_pct > 0 ? '+' : ''}
                {minhaPosicao.retorno_pct.toFixed(2)}%
              </div>
              <div style={subLine}>
                desde {fmtDate(minhaPosicao.data_entrada)}
              </div>
            </div>
          ) : (
            <div style={cardStyle}>
              <div style={topLabel}>RETORNO DO CLUBE</div>
              <div style={{
                ...mainValue,
                color: signColor(navAnalytics?.totalReturnPct ?? 0),
              }}>
                {navAnalytics?.totalReturnPct != null
                  ? `${navAnalytics.totalReturnPct > 0 ? '+' : ''}${navAnalytics.totalReturnPct.toFixed(2)}%`
                  : '—'}
              </div>
              <div style={subLine}>desde o início</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
