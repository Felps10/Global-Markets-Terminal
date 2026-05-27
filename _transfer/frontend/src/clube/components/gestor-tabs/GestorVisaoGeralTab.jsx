import { useState, useEffect } from 'react';
import { CLUBE_COLORS, CLUBE_FONTS, CLUBE_RADIUS } from '../../styles/index.js';
import { formatCurrency, formatPct } from '../../../services/portfolioEngine.js';
import NavChart from '../../../components/clube/NavChart.jsx';
import { severityColor, severityLabel, signColor }
  from '../../utils/formatters.js';

const C = CLUBE_COLORS;
const MONO = CLUBE_FONTS.mono;

function complianceColor(status) {
  if (status === 'OK')      return C.green;
  if (status === 'WARNING') return C.amber;
  if (status === 'BREACH')  return C.red;
  return C.textDim;
}

export default function GestorVisaoGeralTab({ dashboard, clube, navAnalytics, gestorData }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!clube?.id) return;
    try {
      if (localStorage.getItem(`gmt_setup_dismissed_${clube.id}`) === 'true') {
        setDismissed(true);
      }
    } catch (_) {}
  }, [clube?.id]);

  if (!dashboard) return null;

  const clubeId = clube?.id;

  const cardStyle = {
    flex: 1,
    background: CLUBE_COLORS.bgSurface,
    border: `1px solid ${CLUBE_COLORS.border}`,
    borderRadius: CLUBE_RADIUS.md,
    padding: '16px 20px',
    minWidth: 0,
  };
  const valueStyle = {
    fontFamily: MONO, fontSize: 22, color: C.textPrimary,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  };
  const labelStyle = {
    fontFamily: MONO, fontSize: 9, color: C.textDim,
    letterSpacing: '0.1em', marginTop: 4,
  };

  const rvPct = dashboard.percentual_rv != null
    ? (dashboard.percentual_rv * 100).toFixed(1) + '%' : '—';

  // ── Health Strip ────────────────────────────────────────────────────────
  const healthStrip = (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={cardStyle}>
        <div style={valueStyle}>
          {dashboard.nav_latest?.valor_cota != null ? formatCurrency(dashboard.nav_latest.valor_cota) : '—'}
        </div>
        <div style={labelStyle}>VALOR DA COTA</div>
      </div>
      <div style={cardStyle}>
        <div style={valueStyle}>
          {dashboard.patrimonio_total != null ? formatCurrency(dashboard.patrimonio_total, { compact: true }) : '—'}
        </div>
        <div style={labelStyle}>PATRIMÔNIO</div>
      </div>
      <div style={cardStyle}>
        <div style={{ ...valueStyle, color: complianceColor(dashboard.compliance_status) }}>{rvPct}</div>
        <div style={labelStyle}>ENQUADRAMENTO CVM</div>
      </div>
      <div style={cardStyle}>
        <div style={valueStyle}>{dashboard.cotistas_count != null ? dashboard.cotistas_count : '—'}</div>
        <div style={labelStyle}>COTISTAS ATIVOS</div>
      </div>
    </div>
  );

  // ── Alert Feed ──────────────────────────────────────────────────────────
  const hasAlerts = (dashboard.alertas_top3?.length ?? 0) > 0;
  const hasPending = (dashboard.pending_count ?? 0) > 0;
  const isEmpty = !hasAlerts && !hasPending;

  const alertFeed = (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: C.textDim, letterSpacing: '0.12em', marginBottom: 12 }}>
        AÇÕES PENDENTES
      </div>
      {isEmpty ? (
        <div style={{ textAlign: 'center', padding: 20, fontFamily: MONO, fontSize: 11, color: C.green }}>
          Clube em dia ✓
        </div>
      ) : (
        <>
          {(dashboard.alertas_top3 ?? []).map((alert, i) => {
            const color = severityColor(alert.severity);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 0', borderBottom: `1px solid ${CLUBE_COLORS.border}`,
              }}>
                <span style={{
                  flexShrink: 0, fontFamily: MONO, fontSize: 8, fontWeight: 700,
                  letterSpacing: '0.12em', padding: '2px 6px', borderRadius: CLUBE_RADIUS.xs,
                  background: `${color}15`, color,
                }}>
                  {severityLabel(alert.severity)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: C.textPrimary, fontWeight: 600 }}>{alert.titulo}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: C.textDim, marginTop: 2 }}>{alert.descricao}</div>
                </div>
              </div>
            );
          })}
          {hasPending && (
            <div style={{ display: 'block', marginTop: 8, fontFamily: MONO, fontSize: 10, color: CLUBE_COLORS.accent }}>
              → {dashboard.pending_count} operaç{dashboard.pending_count === 1 ? 'ão' : 'ões'} aguardando conversão
            </div>
          )}
        </>
      )}
    </div>
  );

  // ── Setup Banner ────────────────────────────────────────────────────────
  const showSetupBanner = dashboard.setup_checklist_pct < 100 && !dismissed;
  const setupBanner = showSetupBanner ? (
    <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: CLUBE_RADIUS.md, padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: C.amber }}>
          ⚠ Configuração do clube: {dashboard.setup_checklist_pct}% completo
        </span>
        <button
          onClick={() => {
            try { localStorage.setItem(`gmt_setup_dismissed_${clubeId}`, 'true'); } catch (_) {}
            setDismissed(true);
          }}
          style={{ background: 'transparent', border: 'none', fontFamily: MONO, fontSize: 9, color: C.textDim, cursor: 'pointer', padding: '2px 6px' }}
        >
          Dispensar
        </button>
      </div>
      <div style={{ height: 3, background: CLUBE_COLORS.border, borderRadius: CLUBE_RADIUS.xxs, overflow: 'hidden' }}>
        <div style={{ width: `${dashboard.setup_checklist_pct}%`, height: '100%', background: C.amber, borderRadius: CLUBE_RADIUS.xxs }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: C.textDim, marginTop: 6 }}>
        Complete a configuração para habilitar todas as funcionalidades do clube.
      </div>
    </div>
  ) : null;

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 28 }}>
      {healthStrip}
      {alertFeed}
      {setupBanner}

      {/* ── DESEMPENHO ──────────────────────────────────────────────────── */}
      {navAnalytics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: C.textDim, letterSpacing: '0.12em' }}>DESEMPENHO</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={cardStyle}>
              <div style={valueStyle}>{formatCurrency(navAnalytics.currentNAV)}</div>
              <div style={labelStyle}>COTA ATUAL</div>
            </div>
            <div style={cardStyle}>
              <div style={{ ...valueStyle, color: signColor(navAnalytics.totalReturnPct) }}>{formatPct(navAnalytics.totalReturnPct)}</div>
              <div style={labelStyle}>RETORNO TOTAL</div>
            </div>
            <div style={cardStyle}>
              <div style={{ ...valueStyle, color: signColor(navAnalytics.ytdReturnPct) }}>{formatPct(navAnalytics.ytdReturnPct)}</div>
              <div style={labelStyle}>RETORNO YTD</div>
            </div>
            <div style={cardStyle}>
              <div style={{ ...valueStyle, color: C.accent }}>
                {dashboard.patrimonio_total != null ? formatCurrency(dashboard.patrimonio_total, { compact: true }) : '—'}
              </div>
              <div style={labelStyle}>PATRIMÔNIO</div>
            </div>
            <div style={cardStyle}>
              <div style={{ ...valueStyle, color: complianceColor(dashboard.compliance_status) }}>
                {dashboard.percentual_rv != null ? (dashboard.percentual_rv * 100).toFixed(1) + '%' : '—'}
              </div>
              <div style={labelStyle}>COMPLIANCE RV</div>
            </div>
            <div style={cardStyle}>
              <div style={{ ...valueStyle, color: C.textDim }}>—</div>
              <div style={labelStyle}>RETORNO DIA</div>
            </div>
          </div>

          <div style={{ background: C.bgCard, border: `1px solid ${C.borderSubtle}`, borderRadius: CLUBE_RADIUS.md, padding: 16 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.textMain, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16, borderLeft: `3px solid ${C.accent}`, paddingLeft: 8 }}>
              EVOLUÇÃO DA COTA
            </div>
            <NavChart
              navSeries={navAnalytics.navSeries ?? []}
              ibovSeries={navAnalytics.ibovSeries ?? []}
              cdiSeries={navAnalytics.cdiSeries ?? []}
              inceptionNAV={clube?.valor_cota_inicial ?? 1000}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { title: 'CARTEIRA vs IBOV', benchKey: 'ibovReturnPct', benchLabel: 'IBOV' },
              { title: 'CARTEIRA vs CDI',  benchKey: 'cdiReturnPct',  benchLabel: 'CDI'  },
            ].map(({ title, benchKey, benchLabel }) => {
              const alpha = (navAnalytics.totalReturnPct ?? 0) - (navAnalytics[benchKey] ?? 0);
              return (
                <div key={title} style={{ background: C.bgCard, border: `1px solid ${C.borderSubtle}`, borderRadius: CLUBE_RADIUS.md, padding: 16 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>{title}</div>
                  {[
                    ['Carteira', navAnalytics.totalReturnPct, false],
                    [benchLabel, navAnalytics[benchKey], false],
                    ['Alpha', alpha, true],
                  ].map(([label, val, isAlpha]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: label !== 'Alpha' ? `1px solid ${C.borderSubtle}` : 'none' }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: C.textMain }}>{label}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: isAlpha ? signColor(val) : C.textPrimary }}>{formatPct(val)}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PRÓXIMOS PRAZOS ─────────────────────────────────────────────── */}
      {gestorData?.operacional && (
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: C.textDim, letterSpacing: '0.12em', marginBottom: 12 }}>PRÓXIMOS PRAZOS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(gestorData.operacional.proximos_prazos ?? []).map((prazo, i) => {
              const color = severityColor(prazo.severity);
              return (
                <div key={i} style={{ background: C.bgCard, border: `1px solid ${color}30`, borderRadius: CLUBE_RADIUS.md, padding: '12px 14px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 10, right: 10, width: 6, height: 6, borderRadius: CLUBE_RADIUS.full, background: color }} />
                  <div style={{ fontFamily: MONO, fontSize: 10, color: C.textPrimary, fontWeight: 600, marginBottom: 4, paddingRight: 16 }}>{prazo.titulo}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: C.textMain }}>{prazo.descricao}</div>
                  {prazo.diasParaPrazo != null && (
                    <div style={{ fontFamily: MONO, fontSize: 10, color: prazo.diasParaPrazo < 0 ? C.red : prazo.diasParaPrazo <= 7 ? C.accent : C.textDim, marginTop: 6 }}>
                      {prazo.diasParaPrazo < 0 ? `${Math.abs(prazo.diasParaPrazo)}d em atraso` : prazo.diasParaPrazo === 0 ? 'Hoje' : `${prazo.diasParaPrazo}d restantes`}
                    </div>
                  )}
                </div>
              );
            })}
            {(gestorData.operacional.proximos_prazos ?? []).length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '20px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: C.textDim }}>
                Nenhum prazo próximo.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CAIXA ───────────────────────────────────────────────────────── */}
      {gestorData?.operacional?.caixa && (
        <div style={{ background: C.bgCard, border: `1px solid ${C.borderSubtle}`, borderRadius: CLUBE_RADIUS.md, padding: 16, maxWidth: 320 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16, borderLeft: `3px solid ${C.accent}`, paddingLeft: 8 }}>
            CAIXA
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>SALDO ATUAL</div>
          <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: (gestorData.operacional.caixa.current_balance ?? 0) >= 0 ? C.textPrimary : C.red, marginBottom: 12 }}>
            {Number(gestorData.operacional.caixa.current_balance ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          {gestorData.operacional.caixa.last_entry ? (
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.textDim, borderTop: `1px solid ${C.borderFaint}`, paddingTop: 10 }}>
              <div style={{ color: C.textMain, marginBottom: 3 }}>ÚLTIMO LANÇAMENTO</div>
              <div>
                <span style={{ color: gestorData.operacional.caixa.last_entry.valor_brl > 0 ? C.green : C.red }}>
                  {Number(gestorData.operacional.caixa.last_entry.valor_brl).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                {' · '}
                <span style={{ color: C.textDim }}>{gestorData.operacional.caixa.last_entry.tipo}</span>
              </div>
            </div>
          ) : (
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.textDim, borderTop: `1px solid ${C.borderFaint}`, paddingTop: 10 }}>
              Nenhum lançamento registrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
