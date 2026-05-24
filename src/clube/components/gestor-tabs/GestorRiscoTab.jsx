import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasRole } from '../../../lib/roles.js';
import {
  calculateNAVFromHistory,
  calculateDrawdown,
  calculateVolatility,
  calculateRVCompliance,
  formatPct,
} from '../../../services/portfolioEngine.js';
import { severityColor, severityLabel, signColor, fmtDate }
  from '../../utils/formatters.js';

import { CLUBE_COLORS, CLUBE_FONTS } from '../../styles/index.js';

const C = CLUBE_COLORS;
const MONO = CLUBE_FONTS.mono;
const API      = import.meta.env.VITE_API_URL || '';

// ── DrawdownChart ─────────────────────────────────────────────────────────────
function DrawdownChart({ drawdownSeries }) {
  if (!drawdownSeries || drawdownSeries.length < 2) {
    return (
      <div style={{
        height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontFamily: MONO, fontSize: 12, color: C.textDim }}>
          Histórico insuficiente para exibir drawdown.
        </div>
      </div>
    );
  }

  const W = 800, H = 140;
  const PAD = { t: 10, r: 20, b: 10, l: 20 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const N  = drawdownSeries.length;

  const minDD = Math.min(...drawdownSeries.map(d => d.drawdown));
  const range = minDD < 0 ? minDD : -0.001;

  const toX = (i) => PAD.l + (i / Math.max(N - 1, 1)) * cW;
  const toY = (v) => PAD.t + (v / range) * cH;

  const yZero = PAD.t;
  const linePoints = drawdownSeries.map((d, i) =>
    `${toX(i).toFixed(1)},${toY(d.drawdown).toFixed(1)}`
  ).join(' ');
  const fillPoints = `${PAD.l},${yZero} ${linePoints} ${toX(N - 1).toFixed(1)},${yZero}`;

  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      {/* Zero baseline */}
      <line
        x1={PAD.l} y1={yZero} x2={W - PAD.r} y2={yZero}
        stroke={C.textDim} strokeWidth={1} strokeDasharray="4,3"
      />
      {/* Fill area */}
      <polygon points={fillPoints} fill="rgba(255,82,82,0.15)" />
      {/* Stroke line */}
      <polyline points={linePoints} fill="none" stroke={C.red} strokeWidth={1} />
    </svg>
  );
}

// ── RenquadramentoSummary ─────────────────────────────────────────────────────
function RenquadramentoSummary({ clubeId, getToken, navigate }) {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!clubeId) return;
    setLoading(true);
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(
          `${API}/api/v1/clubes/${clubeId}/reenquadramento`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setEvents(data.filter(e => e.status !== 'resolvido'));
        }
      } catch (err) {
        setError(err.message || 'Erro desconhecido');
      }
      finally { setLoading(false); }
    }
    load();
  }, [clubeId, getToken]);

  if (loading || (!error && events.length === 0)) return null;

  if (error) {
    return (
      <div style={{
        padding: '16px',
        fontFamily: MONO,
        fontSize: 11,
        color: '#FF5252',
      }}>
        Erro ao carregar enquadramento: {error}
      </div>
    );
  }

  return (
    <div>
      <div style={{
        fontSize: 10, color: C.textDim, letterSpacing: '0.12em',
        textTransform: 'uppercase', marginBottom: 8,
      }}>
        REENQUADRAMENTO ({events.length} aberto{events.length !== 1 ? 's' : ''})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {events.map(ev => {
          const statusColor = ev.status === 'em_correcao' ? C.amber : C.red;
          return (
            <div
              key={ev.id}
              onClick={() => navigate(`/clube/reenquadramento/${ev.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 4, cursor: 'pointer',
                background: `${statusColor}08`,
                border: `1px solid ${statusColor}30`,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `${statusColor}60`}
              onMouseLeave={e => e.currentTarget.style.borderColor = `${statusColor}30`}
            >
              <span style={{
                fontFamily: MONO, fontSize: 9, fontWeight: 700,
                padding: '2px 7px', borderRadius: 3, flexShrink: 0,
                background: `${statusColor}20`,
                border: `1px solid ${statusColor}50`,
                color: statusColor, letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                {ev.status === 'em_correcao' ? 'EM CORREÇÃO' : 'ABERTO'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: MONO, fontSize: 11, color: C.textPrimary, fontWeight: 600 }}>
                  {ev.tipo_violacao.replace(/_/g, ' ').toUpperCase()}
                </div>
                <div style={{
                  fontFamily: MONO, fontSize: 10, color: C.textMain,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {ev.descricao}
                </div>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: C.textDim, flexShrink: 0 }}>
                {ev.diasAberto}d
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: C.textDim, flexShrink: 0 }}>→</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── GestorRiscoTab ────────────────────────────────────────────────────────────
export default function GestorRiscoTab({ clube, navHistory, gestorData, getToken, user }) {
  const navigate = useNavigate();

  // ── State ─────────────────────────────────────────────────────────────────
  const [posicoes,   setPosicoes]   = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!clube?.id) return;

    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Sessão expirada. Faça login novamente.');
        const headers = { Authorization: `Bearer ${token}` };

        const [posRes, compRes] = await Promise.allSettled([
          fetch(`${API}/api/v1/clubes/${clube.id}/posicoes`,  { headers }),
          fetch(`${API}/api/v1/clubes/${clube.id}/compliance`, { headers }),
        ]);

        const posData = posRes.status === 'fulfilled' && posRes.value.ok
          ? await posRes.value.json() : [];
        const compData = compRes.status === 'fulfilled' && compRes.value.ok
          ? await compRes.value.json() : null;

        setPosicoes(posData);
        setCompliance(compData);
      } catch (err) {
        setError(err.message ?? 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [clube?.id, getToken]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const navAnalytics = useMemo(() =>
    clube ? calculateNAVFromHistory(navHistory, clube) : null,
    [navHistory, clube]);

  const drawdown = useMemo(() =>
    navAnalytics ? calculateDrawdown(navAnalytics.navSeries) : null,
    [navAnalytics]);

  const volatility30d = useMemo(() =>
    calculateVolatility(navHistory, 30),
    [navHistory]);

  const rvCompliance = useMemo(() =>
    calculateRVCompliance(posicoes),
    [posicoes]);

  const sortedPosicoes = useMemo(() =>
    [...posicoes].sort((a, b) => (b.peso_alvo ?? 0) - (a.peso_alvo ?? 0)),
    [posicoes]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        padding: 24, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', minHeight: 200,
        fontFamily: MONO, gap: 12,
      }}>
        <div style={{ fontSize: 11, color: C.accent, letterSpacing: '0.2em' }}>RISCO</div>
        <div style={{ fontSize: 12, color: C.textMain }}>Carregando dados...</div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        padding: 24, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', minHeight: 200,
        fontFamily: MONO, gap: 12,
      }}>
        <div style={{ fontSize: 11, color: C.red, letterSpacing: '0.1em' }}>ERRO</div>
        <div style={{ fontSize: 12, color: C.textMain, maxWidth: 400, textAlign: 'center' }}>{error}</div>
      </div>
    );
  }

  // ── Derived display values ────────────────────────────────────────────────
  const operacional = gestorData?.operacional;

  const curDD      = (drawdown?.currentDrawdown ?? 0) * 100;
  const curDDColor = curDD < -1 ? C.red : curDD < 0 ? C.amber : C.green;

  const rvPct          = ((rvCompliance?.percentualRV ?? 0) * 100).toFixed(1);
  const rvStatus       = rvCompliance?.status ?? 'NO_POSITIONS';
  const compColor      = rvStatus === 'OK' ? C.green : rvStatus === 'WARNING' ? C.amber : C.red;
  const compBannerText = rvStatus === 'OK'
    ? `✓ Carteira em conformidade — ${rvPct}% em renda variável (mín. 67%)`
    : rvStatus === 'WARNING'
    ? `⚠ Atenção — ${rvPct}% em renda variável. Risco de desenquadramento.`
    : `✗ Desenquadrada — ${rvPct}% em renda variável. Abaixo do mínimo legal.`;

  // ── Registrar reenquadramento ─────────────────────────────────────────────
  async function handleRegistrarReenquadramento(alertItem) {
    if (!clube?.id) return;
    try {
      const token = await getToken();
      const res = await fetch(
        `${API}/api/v1/clubes/${clube.id}/reenquadramento`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            tipo_violacao: alertItem.tipo ?? 'compliance_breach',
            descricao:     alertItem.descricao ?? alertItem.titulo,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        window.alert(`Erro ao registrar: ${err.message ?? res.status}`);
        return;
      }
      const created = await res.json();
      navigate(`/clube/reenquadramento/${created.id}`);
    } catch (e) {
      console.error('[reenquadramento]', e.message);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Alertas ────────────────────────────────────────────────────────── */}
      {operacional && (() => {
        const overdueItems = (operacional.pendentes ?? [])
          .filter(p => p.isOverdue)
          .map(p => ({
            severity: 'CRITICAL',
            titulo: `${p.tipo === 'aporte' ? 'Aporte' : 'Resgate'} Vencido`,
            descricao: `${p.cotista_nome} — R$ ${Number(p.valor_brl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} — ${p.diasPendente} dia(s) em atraso`,
            tipo: 'overdue_payment',
          }));
        const allAlerts = [...overdueItems, ...(operacional.alertas_compliance ?? [])];
        const order = { CRITICAL: 0, WARNING: 1, INFO: 2 };
        allAlerts.sort((a, b) => (order[a.severity] ?? 2) - (order[b.severity] ?? 2));

        if (allAlerts.length === 0) {
          return (
            <div style={{
              padding: '14px 18px', borderRadius: 6,
              background: 'rgba(0,230,118,0.06)',
              border: '1px solid rgba(0,230,118,0.25)',
              fontFamily: MONO, fontSize: 12, color: C.green,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>✓</span>
              <span>Sem alertas ativos — clube em conformidade</span>
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{
              fontSize: 10, color: C.textDim, letterSpacing: '0.12em',
              textTransform: 'uppercase', marginBottom: 2,
            }}>
              ALERTAS
            </div>
            {allAlerts.map((alert, i) => {
              const color = severityColor(alert.severity);
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 4,
                  background: `${color}10`,
                  border: `1px solid ${color}40`,
                }}>
                  {/* Severity pill */}
                  <span style={{
                    flexShrink: 0,
                    fontFamily: MONO, fontSize: 9, fontWeight: 700,
                    letterSpacing: '0.12em',
                    padding: '2px 7px', borderRadius: 3,
                    background: `${color}20`,
                    border: `1px solid ${color}60`,
                    color,
                  }}>
                    {severityLabel(alert.severity)}
                  </span>
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.textPrimary, fontWeight: 600 }}>
                      {alert.titulo}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: C.textMain, marginTop: 2 }}>
                      {alert.descricao}
                    </div>
                  </div>
                  {alert.severity === 'CRITICAL' && alert.tipo === 'compliance_breach' && hasRole(user?.role, 'club_manager') && (
                    <button
                      onClick={() => handleRegistrarReenquadramento(alert)}
                      style={{
                        flexShrink: 0, padding: '3px 8px',
                        fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em',
                        background: 'transparent',
                        border: '1px solid rgba(255,82,82,0.4)',
                        color: C.red, borderRadius: 3, cursor: 'pointer',
                      }}
                    >REGISTRAR</button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Risk KPI cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>

        {/* 1 — Drawdown Atual */}
        <div style={{
          background: C.bgCard, border: `1px solid ${C.borderSubtle}`,
          borderRadius: 6, padding: 16, fontFamily: MONO,
        }}>
          <div style={{ fontSize: 10, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            DRAWDOWN ATUAL
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: curDDColor, marginBottom: 6 }}>
            {formatPct(drawdown?.currentDrawdown * 100, { showSign: false })}
          </div>
          <div style={{ fontSize: 10, color: C.textMain }}>vs pico histórico</div>
        </div>

        {/* 2 — Max Drawdown */}
        <div style={{
          background: C.bgCard, border: `1px solid ${C.borderSubtle}`,
          borderRadius: 6, padding: 16, fontFamily: MONO,
        }}>
          <div style={{ fontSize: 10, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            MAX DRAWDOWN
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.red, marginBottom: 6 }}>
            {formatPct(drawdown?.maxDrawdownPct, { showSign: false })}
          </div>
          <div style={{ fontSize: 10, color: C.textMain }}>
            {fmtDate(drawdown?.troughDate)}
          </div>
        </div>

        {/* 3 — Volatilidade 30d */}
        <div style={{
          background: C.bgCard, border: `1px solid ${C.borderSubtle}`,
          borderRadius: 6, padding: 16, fontFamily: MONO,
        }}>
          <div style={{ fontSize: 10, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            VOLATILIDADE 30D
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.textPrimary, marginBottom: 6 }}>
            {formatPct(volatility30d?.annualizedVolPct, { showSign: false })}
          </div>
          <div style={{ fontSize: 10, color: C.textMain }}>
            {volatility30d?.sampleSize} observações
          </div>
        </div>

        {/* 4 — Maior Posição */}
        <div style={{
          background: C.bgCard, border: `1px solid ${C.borderSubtle}`,
          borderRadius: 6, padding: 16, fontFamily: MONO,
        }}>
          <div style={{ fontSize: 10, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            MAIOR POSIÇÃO
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.textPrimary, marginBottom: 6 }}>
            {sortedPosicoes[0]?.asset?.symbol ?? sortedPosicoes[0]?.symbol ?? '—'}
          </div>
          <div style={{ fontSize: 10, color: C.textMain }}>
            {sortedPosicoes[0]
              ? formatPct((sortedPosicoes[0].peso_alvo ?? 0) * 100, { showSign: false })
              : '—'}
          </div>
        </div>
      </div>

      {/* ── Drawdown chart ──────────────────────────────────────────────────── */}
      <div style={{
        background: C.bgCard, border: `1px solid ${C.borderSubtle}`, borderRadius: 6, padding: 16,
      }}>
        <div style={{ fontSize: 10, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
          DRAWDOWN HISTÓRICO
        </div>
        <DrawdownChart drawdownSeries={drawdown?.drawdownSeries ?? []} />
      </div>

      {/* ── Enquadramento CVM ───────────────────────────────────────────────── */}
      <div style={{
        background: C.bgCard, border: `1px solid ${C.borderSubtle}`, borderRadius: 6, padding: 16,
      }}>
        <div style={{ fontSize: 10, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
          ENQUADRAMENTO CVM — RENDA VARIÁVEL
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Left: bar chart */}
          <div>
            <div style={{
              width: '100%', height: 20, display: 'flex',
              borderRadius: 3, overflow: 'hidden', marginBottom: 8,
            }}>
              <div style={{
                width: `${(rvCompliance?.percentualRV ?? 0) * 100}%`,
                background: C.green, height: '100%', transition: 'width 0.3s',
                minWidth: (rvCompliance?.percentualRV ?? 0) > 0 ? 2 : 0,
              }} />
              <div style={{
                width: `${(rvCompliance?.percentualOutras ?? 0) * 100}%`,
                background: C.textDim, height: '100%',
                minWidth: (rvCompliance?.percentualOutras ?? 0) > 0 ? 2 : 0,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.green }}>
                RV {((rvCompliance?.percentualRV ?? 0) * 100).toFixed(1)}%
              </span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.textDim }}>
                Outras {((rvCompliance?.percentualOutras ?? 0) * 100).toFixed(1)}%
              </span>
            </div>
            <div style={{
              marginTop: 12, padding: '10px 12px',
              background: `${compColor}10`,
              border: `1px solid ${compColor}40`,
              borderRadius: 4,
              fontFamily: MONO, fontSize: 11, color: compColor, lineHeight: 1.5,
            }}>
              {compBannerText}
            </div>
          </div>

          {/* Right: position list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(compliance?.positions_detail ?? sortedPosicoes.map(s => ({
              asset_id: s.asset_id,
              symbol:   s.asset?.symbol ?? s.symbol,
              name:     s.asset?.name   ?? s.name,
              group_id: s.asset?.group_id ?? s.group_id,
              peso_alvo: s.peso_alvo,
              is_rv:    (s.asset?.group_id ?? s.group_id) === 'equities',
            }))).map((pos, idx) => (
              <div key={pos.asset_id ?? idx} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '5px 0',
                borderBottom: `1px solid ${C.borderSubtle}`,
                fontFamily: MONO, fontSize: 11,
              }}>
                <span style={{ color: C.textPrimary, width: 60 }}>{pos.symbol}</span>
                <span style={{ color: C.textMain }}>
                  {formatPct((pos.peso_alvo ?? 0) * 100, { showSign: false })}
                </span>
                <span style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 3,
                  background: pos.is_rv ? 'rgba(0,230,118,0.1)' : 'rgba(71,85,105,0.2)',
                  border: `1px solid ${pos.is_rv ? 'rgba(0,230,118,0.3)' : C.borderFaint}`,
                  color: pos.is_rv ? C.green : C.textDim,
                }}>
                  {pos.is_rv ? 'RV' : 'OUTRAS'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Open reenquadramento events ────────────────────────────────────── */}
      <RenquadramentoSummary
        clubeId={clube?.id}
        getToken={getToken}
        navigate={navigate}
      />

    </div>
  );
}
