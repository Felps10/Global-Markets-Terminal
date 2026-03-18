import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import {
  buildPortfolioSnapshot,
  calculatePortfolioDailyReturn,
  calculateNAVFromHistory,
  calculateDrawdown,
  calculateVolatility,
  calculateRVCompliance,
  formatCurrency,
  formatPct,
} from '../services/portfolioEngine.js';
import { ASSETS as STATIC_ASSETS_MAP } from '../data/assets.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ── Colors ────────────────────────────────────────────────────────────────────
const BG_PAGE  = '#080f1a';
const BG_HEAD  = '#0a1628';
const BG_CARD  = '#0d1824';
const BG_CARD2 = '#0f1f2e';
const BORDER   = 'rgba(30,41,59,0.8)';
const BORDER2  = 'rgba(51,65,85,0.5)';
const TXT_1    = '#e2e8f0';
const TXT_2    = '#94a3b8';
const TXT_3    = '#475569';
const ACCENT   = '#3b82f6';
const GREEN    = '#00E676';
const RED      = '#FF5252';
const AMBER    = '#fbbf24';
const GOLD     = '#FFD700';

const MONO = "'JetBrains Mono', monospace";

// ── Module-level cache ────────────────────────────────────────────────────────
let _clubeCache         = null;
let _clubeCacheTs       = 0;
let _navAutoCloseTimer  = null;
const CLUBE_TTL_MS = 5 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return dateStr.split('-').reverse().join('/');
}

function signColor(v) {
  if (v == null || (typeof v === 'number' && isNaN(v))) return TXT_1;
  if (v > 0) return GREEN;
  if (v < 0) return RED;
  return TXT_1;
}

// ── NavChart ──────────────────────────────────────────────────────────────────
function NavChart({ navSeries, ibovSeries, cdiSeries, inceptionNAV }) {
  if (!navSeries || navSeries.length < 2) {
    return (
      <div style={{
        height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 8,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 12, color: TXT_3, textAlign: 'center', lineHeight: 1.8 }}>
          Histórico insuficiente para exibir gráfico.<br />
          Registre entradas de NAV diárias para visualizar a evolução.
        </div>
      </div>
    );
  }

  const W = 800, H = 180;
  const PAD = { t: 12, r: 20, b: 12, l: 20 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const N  = navSeries.length;

  const allVals = [
    ...navSeries.map(p => p.nav),
    ...ibovSeries.map(p => p.nav),
    ...cdiSeries.map(p => p.nav),
  ];
  const minV  = Math.min(...allVals);
  const maxV  = Math.max(...allVals);
  const range = maxV - minV || 1;

  const toX = (i) => PAD.l + (i / Math.max(N - 1, 1)) * cW;
  const toY = (v) => PAD.t + cH - ((v - minV) / range) * cH;

  const pts = (series) =>
    series.map((p, i) => `${toX(i).toFixed(1)},${toY(p.nav).toFixed(1)}`).join(' ');

  const baseY = toY(inceptionNAV).toFixed(1);

  return (
    <div>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        {/* Inception baseline */}
        <line
          x1={PAD.l} y1={baseY} x2={W - PAD.r} y2={baseY}
          stroke={TXT_3} strokeWidth={1} strokeDasharray="4,3"
        />
        {/* CDI */}
        <polyline points={pts(cdiSeries)}  fill="none" stroke={GREEN} strokeWidth={1.5} />
        {/* IBOV */}
        <polyline points={pts(ibovSeries)} fill="none" stroke={AMBER} strokeWidth={1.5} />
        {/* Portfolio NAV */}
        <polyline points={pts(navSeries)}  fill="none" stroke={ACCENT} strokeWidth={1.5} />
      </svg>
      {/* Legend */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 16,
        padding: '6px 20px 0',
      }}>
        {[['Portfolio', ACCENT], ['IBOV', AMBER], ['CDI', GREEN]].map(([label, color]) => (
          <span key={label} style={{ fontFamily: MONO, fontSize: 10, color: TXT_2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── DrawdownChart ─────────────────────────────────────────────────────────────
function DrawdownChart({ drawdownSeries }) {
  if (!drawdownSeries || drawdownSeries.length < 2) {
    return (
      <div style={{
        height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontFamily: MONO, fontSize: 12, color: TXT_3 }}>
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
        stroke={TXT_3} strokeWidth={1} strokeDasharray="4,3"
      />
      {/* Fill area */}
      <polygon points={fillPoints} fill="rgba(255,82,82,0.15)" />
      {/* Stroke line */}
      <polyline points={linePoints} fill="none" stroke={RED} strokeWidth={1} />
    </svg>
  );
}

// ── NavRecordModal ────────────────────────────────────────────────────────────
function NavRecordModal({ open, data, onDataChange, onSubmit, onClose,
                          submitting, submitError, submitOk }) {
  if (!open || !data) return null;

  const today          = new Date().toISOString().split('T')[0];
  const todayFormatted = today.split('-').reverse().join('/');

  const retornoDiarioColor = data.retorno_diario > 0
    ? GREEN : data.retorno_diario < 0 ? RED : TXT_2;

  const LABEL_STYLE = {
    display: 'block', color: TXT_3, fontSize: 10,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    fontFamily: MONO, marginBottom: 2,
  };
  const INPUT_BASE = {
    width: '100%', boxSizing: 'border-box',
    background: BG_CARD2, border: `1px solid ${BORDER2}`,
    borderRadius: 3, color: TXT_1,
    fontFamily: MONO, fontSize: 12,
    padding: '8px 10px', outline: 'none', marginTop: 4,
  };
  const INPUT_AUTO = { ...INPUT_BASE, background: 'rgba(59,130,246,0.05)' };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 480, background: BG_CARD,
          border: `1px solid ${BORDER2}`, borderRadius: 6,
          padding: 28, fontFamily: MONO, position: 'relative',
        }}
      >
        {/* Modal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 13, color: TXT_1, letterSpacing: '0.1em' }}>REGISTRAR NAV</div>
            <div style={{ fontSize: 11, color: TXT_3, marginTop: 4 }}>{todayFormatted}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: TXT_2,
              fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px',
              fontFamily: MONO,
            }}
          >×</button>
        </div>

        {/* Success state */}
        {submitOk ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '40px 0', gap: 12,
          }}>
            <div style={{ fontSize: 32, color: GREEN }}>✓</div>
            <div style={{ fontSize: 13, color: TXT_1 }}>NAV registrado com sucesso</div>
            <div style={{ fontSize: 11, color: TXT_3 }}>Fechando...</div>
          </div>
        ) : (
          <>
            {/* Field 1 — DATA */}
            <div style={{ marginTop: 14 }}>
              <label style={LABEL_STYLE}>DATA</label>
              <input
                type="date"
                value={data.data}
                onChange={e => onDataChange('data', e.target.value)}
                style={INPUT_BASE}
              />
            </div>

            {/* Field 2 — VALOR DA COTA */}
            <div style={{ marginTop: 14 }}>
              <label style={LABEL_STYLE}>VALOR DA COTA (R$)</label>
              <div style={{ fontSize: 10, color: TXT_3, marginTop: 2 }}>
                calculado pelo sistema — edite se necessário
              </div>
              <input
                type="number"
                step="0.000001"
                value={data.valor_cota}
                onChange={e => onDataChange('valor_cota', parseFloat(e.target.value))}
                style={INPUT_AUTO}
              />
            </div>

            {/* Field 3 — RETORNO IBOV */}
            <div style={{ marginTop: 14 }}>
              <label style={LABEL_STYLE}>RETORNO IBOV</label>
              <div style={{ fontSize: 10, color: TXT_3, marginTop: 2 }}>
                ex: 0.0123 para +1.23% | fonte: GMT preços
              </div>
              <input
                type="number"
                step="0.00001"
                value={data.retorno_ibov ?? ''}
                placeholder="ex: 0.0123"
                onChange={e => onDataChange('retorno_ibov',
                  e.target.value === '' ? null : parseFloat(e.target.value))}
                style={data.retorno_ibov !== null ? INPUT_AUTO : INPUT_BASE}
              />
            </div>

            {/* Field 4 — RETORNO CDI */}
            <div style={{ marginTop: 14 }}>
              <label style={LABEL_STYLE}>RETORNO CDI</label>
              <div style={{ fontSize: 10, color: TXT_3, marginTop: 2 }}>
                ex: 0.000433 para CDI diário | fonte: BCB SGS 4389
              </div>
              <input
                type="number"
                step="0.0000001"
                value={data.retorno_cdi ?? ''}
                placeholder="ex: 0.000433"
                onChange={e => onDataChange('retorno_cdi',
                  e.target.value === '' ? null : parseFloat(e.target.value))}
                style={data.retorno_cdi !== null ? INPUT_AUTO : INPUT_BASE}
              />
            </div>

            {/* Field 5 — PATRIMÔNIO ESTIMADO (read-only) */}
            <div style={{ marginTop: 14 }}>
              <label style={LABEL_STYLE}>PATRIMÔNIO ESTIMADO</label>
              <div style={{
                background: BG_CARD2, padding: 8, borderRadius: 3,
                marginTop: 4, border: `1px solid ${BORDER2}`,
              }}>
                <div style={{ fontSize: 14, color: TXT_1, fontFamily: MONO }}>
                  {formatCurrency(data.cotas_emitidas * data.valor_cota)}
                </div>
                <div style={{ fontSize: 10, color: TXT_3, marginTop: 3 }}>
                  {data.cotas_emitidas} cotas × {formatCurrency(data.valor_cota)}
                </div>
              </div>
            </div>

            {/* Field 6 — RETORNO CARTEIRA (read-only) */}
            <div style={{ marginTop: 14 }}>
              <label style={LABEL_STYLE}>RETORNO CARTEIRA</label>
              <div style={{
                background: BG_CARD2, padding: 8, borderRadius: 3,
                marginTop: 4, border: `1px solid ${BORDER2}`,
              }}>
                <div style={{ fontSize: 14, fontFamily: MONO, color: retornoDiarioColor }}>
                  {formatPct(data.retorno_diario * 100, { showSign: true })}
                </div>
                <div style={{ fontSize: 10, color: TXT_3, marginTop: 3 }}>
                  calculado pelo portfolioEngine
                </div>
              </div>
            </div>

            {/* Error message */}
            {submitError && (
              <div style={{
                background: 'rgba(255,82,82,0.1)', border: `1px solid ${RED}`,
                borderRadius: 3, padding: 8, marginTop: 12,
              }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: RED }}>{submitError}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={() => onSubmit(data)}
              disabled={submitting || submitOk}
              style={{
                width: '100%', padding: '10px', borderRadius: 3,
                border: 'none', fontFamily: MONO, fontSize: 11,
                letterSpacing: '0.1em',
                cursor: submitting || submitOk ? 'not-allowed' : 'pointer',
                background: submitting || submitOk ? TXT_3 : ACCENT,
                color: '#fff', marginTop: 20,
              }}
            >
              {submitting ? 'REGISTRANDO...' : 'CONFIRMAR REGISTRO'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ClubePage() {
  const navigate            = useNavigate();
  const { getToken, user }  = useAuth();

  const [clube,      setClube]      = useState(null);
  const [posicoes,   setPosicoes]   = useState([]);
  const [cotistas,   setCotistas]   = useState(null);
  const [navHistory, setNavHistory] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [marketData, setMarketData] = useState({});
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [activeTab,  setActiveTab]  = useState('visao-geral');

  const [navModalOpen,   setNavModalOpen]   = useState(false);
  const [navModalData,   setNavModalData]   = useState(null);
  const [navSubmitting,  setNavSubmitting]  = useState(false);
  const [navSubmitError, setNavSubmitError] = useState(null);
  const [navSubmitOk,    setNavSubmitOk]    = useState(false);

  // ── Price fetch ─────────────────────────────────────────────────────────────
  const fetchPositionPrices = useCallback(async (positions) => {
    if (!positions || positions.length === 0) return;

    const BRAPI_TOKEN = import.meta.env.VITE_BRAPI_TOKEN || '';

    // Split positions into B3 (BRAPI) vs non-B3 (Yahoo)
    const b3Syms    = [];
    const yahooSyms = [];
    for (const pos of positions) {
      const symbol = pos.asset?.symbol;
      if (!symbol) continue;
      const assetMeta = STATIC_ASSETS_MAP.find(a => a.id === pos.asset_id) ?? pos.asset;
      const isB3 = assetMeta?.meta?.isB3 === true || assetMeta?.exchange === 'B3';
      if (isB3) b3Syms.push(symbol);
      else       yahooSyms.push(symbol);
    }

    // ── Yahoo: batch request for non-B3 symbols ──────────────────────────────
    const yahooResults = {};
    if (yahooSyms.length > 0) {
      try {
        const symbolsStr = yahooSyms.join(',');
        const res = await fetch(
          `${API_BASE}/proxy/yahoo/v7/finance/quote?symbols=${encodeURIComponent(symbolsStr)}`,
          { signal: AbortSignal.timeout(12000) }
        );
        if (res.ok) {
          const json    = await res.json();
          const results = json?.quoteResponse?.result ?? [];
          for (const q of results) {
            if (!q?.symbol) continue;
            yahooResults[q.symbol.toUpperCase()] = {
              price:     q.regularMarketPrice,
              change:    q.regularMarketChange,
              changePct: q.regularMarketChangePercent,
              high:      q.regularMarketDayHigh,
              low:       q.regularMarketDayLow,
              volume:    q.regularMarketVolume,
              marketCap: q.marketCap || null,
            };
          }
        }
      } catch (err) {
        console.warn('[ClubePrices] Yahoo fetch failed —', err?.message);
      }
    }

    // ── BRAPI: sequential requests for B3 symbols ────────────────────────────
    const b3Results = {};
    if (b3Syms.length > 0 && BRAPI_TOKEN) {
      for (const symbol of b3Syms) {
        try {
          const res = await fetch(
            `${API_BASE}/proxy/brapi/quote/${encodeURIComponent(symbol)}?token=${BRAPI_TOKEN}`,
            { signal: AbortSignal.timeout(12000) }
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          const q    = json?.results?.[0];
          if (q?.symbol) {
            b3Results[q.symbol.toUpperCase()] = {
              price:     q.regularMarketPrice,
              change:    q.regularMarketChange,
              changePct: q.regularMarketChangePercent,
              high:      q.regularMarketDayHigh,
              low:       q.regularMarketDayLow,
              volume:    q.regularMarketVolume,
              marketCap: q.marketCap || null,
            };
          }
        } catch (err) {
          console.warn(`[ClubePrices] fetch failed: ${symbol} — ${err?.message}`);
        }
      }
    } else if (b3Syms.length > 0) {
      console.warn('[ClubePrices] No BRAPI_TOKEN — B3 prices unavailable');
    }

    setMarketData({ ...yahooResults, ...b3Results });
  }, []);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Cache hit
    if (_clubeCache && Date.now() - _clubeCacheTs < CLUBE_TTL_MS) {
      setClube(_clubeCache.clube);
      setPosicoes(_clubeCache.posicoes);
      setCotistas(_clubeCache.cotistas);
      setNavHistory(_clubeCache.navHistory);
      setCompliance(_clubeCache.compliance);
      fetchPositionPrices(_clubeCache.posicoes);
      setLoading(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');

      const headers = { Authorization: `Bearer ${token}` };

      // Step 1: list clubes
      const clubesRes = await fetch('/api/v1/clubes', { headers });
      if (!clubesRes.ok) throw new Error(`Erro ao carregar clubes (${clubesRes.status})`);
      const clubesList = await clubesRes.json();

      if (!clubesList || clubesList.length === 0) {
        setClube(null);
        setLoading(false);
        return;
      }

      const c = clubesList[0];
      setClube(c);

      // Step 2: parallel detail fetches
      const [posRes, cotRes, navRes, compRes] = await Promise.allSettled([
        fetch(`/api/v1/clubes/${c.id}/posicoes`,   { headers }),
        fetch(`/api/v1/clubes/${c.id}/cotistas`,   { headers }),
        fetch(`/api/v1/clubes/${c.id}/nav`,        { headers }),
        fetch(`/api/v1/clubes/${c.id}/compliance`, { headers }),
      ]);

      const posicoesData = posRes.status === 'fulfilled' && posRes.value.ok
        ? await posRes.value.json() : [];

      let cotistasData = null;
      if (cotRes.status === 'fulfilled' && cotRes.value.ok) {
        const raw = await cotRes.value.json();
        cotistasData = { data: raw.cotistas, summary: raw.summary };
      }

      const navData = navRes.status === 'fulfilled' && navRes.value.ok
        ? await navRes.value.json() : [];

      const compData = compRes.status === 'fulfilled' && compRes.value.ok
        ? await compRes.value.json() : null;

      setPosicoes(posicoesData);
      fetchPositionPrices(posicoesData);
      setCotistas(cotistasData);
      setNavHistory(navData);
      setCompliance(compData);

      _clubeCache   = { clube: c, posicoes: posicoesData, cotistas: cotistasData, navHistory: navData, compliance: compData };
      _clubeCacheTs = Date.now();

    } catch (err) {
      setError(err.message ?? 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── 30-second price refresh ──────────────────────────────────────────────────
  useEffect(() => {
    if (posicoes.length === 0) return;
    const interval = setInterval(() => {
      fetchPositionPrices(posicoes);
    }, 30000);
    return () => clearInterval(interval);
  }, [posicoes, fetchPositionPrices]);

  // ── Cleanup nav auto-close timer on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      if (_navAutoCloseTimer) {
        clearTimeout(_navAutoCloseTimer);
        _navAutoCloseTimer = null;
      }
    };
  }, []);

  // ── Computed values ─────────────────────────────────────────────────────────
  const snapshot = useMemo(() =>
    buildPortfolioSnapshot(posicoes, marketData), [posicoes, marketData]);

  const dailyReturn = useMemo(() =>
    calculatePortfolioDailyReturn(snapshot), [snapshot]);

  const navAnalytics = useMemo(() =>
    clube ? calculateNAVFromHistory(navHistory, clube) : null,
    [navHistory, clube]);

  const drawdown = useMemo(() =>
    navAnalytics ? calculateDrawdown(navAnalytics.navSeries) : null,
    [navAnalytics]);

  const volatility30d = useMemo(() =>
    calculateVolatility(navHistory, 30), [navHistory]);

  const rvCompliance = useMemo(() =>
    calculateRVCompliance(posicoes), [posicoes]);

  // ── Build NAV modal pre-filled defaults ──────────────────────────────────────
  const buildNavModalDefaults = useCallback(async () => {
    const today      = new Date().toISOString().split('T')[0];
    const prevCota   = navAnalytics?.currentNAV ?? clube?.valor_cota_inicial ?? 1000;
    const estimatedCota = Math.round(
      prevCota * (1 + (dailyReturn?.dailyReturn ?? 0)) * 1000000
    ) / 1000000;

    const ibovChangePct = marketData['^BVSP']?.changePct ?? null;
    const retornoIbov   = ibovChangePct !== null ? ibovChangePct / 100 : null;

    let retornoCdi = null;
    try {
      const bcbRes = await fetch(
        `${API_BASE}/proxy/bcb/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (bcbRes.ok) {
        const bcbJson = await bcbRes.json();
        const annual  = parseFloat(bcbJson[0]?.valor);
        if (!isNaN(annual)) {
          retornoCdi = Math.round((annual / 100 / 252) * 1e8) / 1e8;
        }
      }
    } catch (_) {
      // BCB unavailable — retornoCdi stays null
    }

    const totalCotas         = cotistas?.summary?.total_cotas ?? 0;
    const estimatedPatrimonio = Math.round(totalCotas * estimatedCota * 100) / 100;
    const percentualRv       = rvCompliance?.percentualRV ?? 0;

    setNavModalData({
      data:              today,
      valor_cota:        estimatedCota,
      patrimonio_total:  estimatedPatrimonio,
      cotas_emitidas:    totalCotas,
      retorno_diario:    dailyReturn?.dailyReturn ?? 0,
      retorno_acumulado: null,
      retorno_ibov:      retornoIbov,
      retorno_cdi:       retornoCdi,
      percentual_rv:     percentualRv,
    });
    setNavSubmitError(null);
    setNavSubmitOk(false);
    setNavModalOpen(true);
  }, [navAnalytics, dailyReturn, marketData, cotistas, rvCompliance, clube]);

  // ── Submit NAV entry ─────────────────────────────────────────────────────────
  const submitNav = useCallback(async (formValues) => {
    try {
      const inceptionNAV     = clube?.valor_cota_inicial ?? 1000;
      const retornoAcumulado = Math.round(
        ((formValues.valor_cota / inceptionNAV) - 1) * 1e8
      ) / 1e8;

      const payload = {
        data:              formValues.data,
        valor_cota:        Number(formValues.valor_cota),
        patrimonio_total:  Number(formValues.patrimonio_total),
        cotas_emitidas:    Number(formValues.cotas_emitidas),
        retorno_diario:    Number(formValues.retorno_diario),
        retorno_acumulado: retornoAcumulado,
        retorno_ibov:      formValues.retorno_ibov !== null
                             ? Number(formValues.retorno_ibov) : null,
        retorno_cdi:       formValues.retorno_cdi !== null
                             ? Number(formValues.retorno_cdi) : null,
        percentual_rv:     Number(formValues.percentual_rv),
      };

      setNavSubmitting(true);
      setNavSubmitError(null);

      const token = await getToken();
      const res   = await fetch(`/api/v1/clubes/${clube.id}/nav`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newEntry = await res.json();
        setNavHistory(prev =>
          [...prev, newEntry].sort((a, b) => a.data.localeCompare(b.data))
        );
        setNavSubmitOk(true);
        setNavSubmitting(false);
        _clubeCache   = null;
        _clubeCacheTs = 0;
        if (_navAutoCloseTimer) clearTimeout(_navAutoCloseTimer);
        _navAutoCloseTimer = setTimeout(() => {
          setNavModalOpen(false);
          _navAutoCloseTimer = null;
        }, 1500);
      } else {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        setNavSubmitError(err.message || 'Erro ao registrar NAV');
        setNavSubmitting(false);
      }
    } catch (e) {
      setNavSubmitError(e.message);
      setNavSubmitting(false);
    }
  }, [clube, getToken, navAnalytics]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: BG_PAGE, fontFamily: MONO, gap: 12,
      }}>
        <div style={{ fontSize: 11, color: ACCENT, letterSpacing: '0.2em' }}>CLUBE</div>
        <div style={{ fontSize: 12, color: TXT_2 }}>Carregando dados...</div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: BG_PAGE, fontFamily: MONO, gap: 12,
      }}>
        <div style={{ fontSize: 11, color: RED, letterSpacing: '0.1em' }}>ERRO</div>
        <div style={{ fontSize: 12, color: TXT_2, maxWidth: 400, textAlign: 'center' }}>{error}</div>
        <button
          onClick={fetchData}
          style={{
            marginTop: 8, padding: '8px 20px', background: 'rgba(59,130,246,0.1)',
            border: `1px solid ${ACCENT}`, borderRadius: 4, color: ACCENT,
            fontFamily: MONO, fontSize: 11, cursor: 'pointer',
          }}
        >Tentar novamente</button>
      </div>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────────
  if (!clube) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: BG_PAGE, fontFamily: MONO, gap: 12,
      }}>
        <div style={{ fontSize: 12, color: TXT_2 }}>Nenhum clube encontrado.</div>
        <button
          onClick={() => navigate('/app')}
          style={{
            marginTop: 8, padding: '8px 20px', background: 'transparent',
            border: `1px solid ${BORDER2}`, borderRadius: 4, color: TXT_2,
            fontFamily: MONO, fontSize: 11, cursor: 'pointer',
          }}
        >← Voltar</button>
      </div>
    );
  }

  // ── Derived display values ──────────────────────────────────────────────────
  const rvPct       = ((rvCompliance?.percentualRV ?? 0) * 100).toFixed(1);
  const rvStatus    = rvCompliance?.status ?? 'NO_POSITIONS';
  const compColor   = rvStatus === 'OK' ? GREEN : rvStatus === 'WARNING' ? AMBER : RED;

  const compBannerBg = rvStatus === 'OK'
    ? 'rgba(0,230,118,0.08)'
    : rvStatus === 'WARNING'
    ? 'rgba(251,191,36,0.08)'
    : 'rgba(255,82,82,0.08)';

  const compBannerText = rvStatus === 'OK'
    ? `✓ Carteira em conformidade — ${rvPct}% em renda variável (mín. 67%)`
    : rvStatus === 'WARNING'
    ? `⚠ Atenção — ${rvPct}% em renda variável. Risco de desenquadramento.`
    : `✗ Desenquadrada — ${rvPct}% em renda variável. Abaixo do mínimo legal.`;

  const TABS = [
    { id: 'visao-geral', label: 'VISÃO GERAL' },
    { id: 'carteira',    label: 'CARTEIRA'    },
    { id: 'cotistas',    label: 'COTISTAS'    },
    { id: 'risco',       label: 'RISCO'       },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      overflow: 'hidden', background: BG_PAGE, fontFamily: MONO,
    }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        height: 56, flexShrink: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 20px',
        background: BG_HEAD, borderBottom: `1px solid ${BORDER}`, zIndex: 10,
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <button
            onClick={() => navigate('/app')}
            style={{
              background: BG_HEAD, border: 'none', cursor: 'pointer',
              color: TXT_2, fontSize: 18, padding: '8px 12px',
              fontFamily: MONO, lineHeight: 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = TXT_1; }}
            onMouseLeave={e => { e.currentTarget.style.color = TXT_2; }}
          >←</button>
          <span style={{ fontSize: 11, color: ACCENT, letterSpacing: '0.2em' }}>GMT</span>
          <span style={{ fontSize: 11, color: TXT_3, margin: '0 6px' }}>/</span>
          <span style={{ fontSize: 11, color: TXT_1, letterSpacing: '0.2em' }}>CLUBE</span>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: TXT_1 }}>{clube?.nome}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, padding: '2px 8px', borderRadius: 3,
            background: clube?.status === 'ativo'
              ? 'rgba(0,230,118,0.08)' : 'rgba(251,191,36,0.08)',
            border: `1px solid ${clube?.status === 'ativo' ? 'rgba(0,230,118,0.3)' : 'rgba(251,191,36,0.3)'}`,
            color: clube?.status === 'ativo' ? GREEN : AMBER,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: clube?.status === 'ativo' ? GREEN : AMBER,
            }} />
            {clube?.status === 'ativo' ? 'ATIVO' : 'ENCERRADO'}
          </span>
          <button
            onClick={() => navigate('/clube/report')}
            style={{
              background: 'transparent',
              border: `1px solid ${TXT_3}`,
              color: TXT_3,
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: '0.1em',
              padding: '6px 12px',
              cursor: 'pointer',
              borderRadius: 3,
              marginLeft: 8,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = TXT_2; e.currentTarget.style.color = TXT_2; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = TXT_3; e.currentTarget.style.color = TXT_3; }}
          >
            RELATÓRIO
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={buildNavModalDefaults}
              style={{
                background: 'transparent',
                border: `1px solid ${ACCENT}`,
                color: ACCENT,
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: '0.1em',
                padding: '6px 12px',
                cursor: 'pointer',
                borderRadius: 3,
                marginLeft: 12,
              }}
            >REGISTRAR NAV</button>
          )}
        </div>
      </div>

      {/* ── Tab nav ─────────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'flex-end',
        background: BG_HEAD, borderBottom: `1px solid ${BORDER2}`,
        padding: '0 20px',
      }}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              display: 'inline-block', padding: '12px 20px',
              fontSize: 11, letterSpacing: '0.1em',
              borderBottom: `2px solid ${activeTab === id ? ACCENT : 'transparent'}`,
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              background: 'transparent', cursor: 'pointer',
              color: activeTab === id ? TXT_1 : TXT_3,
              fontFamily: MONO, transition: 'color 0.15s',
            }}
            onMouseEnter={e => { if (activeTab !== id) e.currentTarget.style.color = TXT_2; }}
            onMouseLeave={e => { if (activeTab !== id) e.currentTarget.style.color = TXT_3; }}
          >{label}</button>
        ))}
      </div>

      {/* ── Scrollable content ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* TAB 1 — VISÃO GERAL                                             */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'visao-geral' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* KPI cards */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
              }}>

                {/* 1 — COTA ATUAL */}
                <div style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`,
                  borderRadius: 6, padding: 16, fontFamily: MONO,
                }}>
                  <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    COTA ATUAL
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: TXT_1, marginBottom: 6 }}>
                    {formatCurrency(navAnalytics?.currentNAV)}
                  </div>
                  <div style={{ fontSize: 10, color: TXT_2 }}>valor da cota</div>
                </div>

                {/* 2 — RETORNO TOTAL */}
                <div style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`,
                  borderRadius: 6, padding: 16, fontFamily: MONO,
                }}>
                  <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    RETORNO TOTAL
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: signColor(navAnalytics?.totalReturnPct), marginBottom: 6 }}>
                    {formatPct(navAnalytics?.totalReturnPct)}
                  </div>
                  <div style={{ fontSize: 10, color: TXT_2 }}>desde o início</div>
                </div>

                {/* 3 — RETORNO YTD */}
                <div style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`,
                  borderRadius: 6, padding: 16, fontFamily: MONO,
                }}>
                  <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    RETORNO YTD
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: signColor(navAnalytics?.ytdReturnPct), marginBottom: 6 }}>
                    {formatPct(navAnalytics?.ytdReturnPct)}
                  </div>
                  <div style={{ fontSize: 10, color: TXT_2 }}>ano corrente</div>
                </div>

                {/* 4 — PATRIMÔNIO */}
                <div style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`,
                  borderRadius: 6, padding: 16, fontFamily: MONO,
                }}>
                  <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    PATRIMÔNIO
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: TXT_1, marginBottom: 6 }}>
                    {formatCurrency(cotistas?.summary?.patrimonio_total, { compact: true })}
                  </div>
                  <div style={{ fontSize: 10, color: TXT_2 }}>
                    {formatCurrency(cotistas?.summary?.valor_cota_atual)} / cota
                  </div>
                </div>

                {/* 5 — COMPLIANCE RV */}
                <div style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`,
                  borderBottom: `2px solid ${compColor}`,
                  borderRadius: 6, padding: 16, fontFamily: MONO,
                }}>
                  <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    COMPLIANCE RV
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: compColor, marginBottom: 6 }}>
                    {formatPct((rvCompliance?.percentualRV ?? 0) * 100, { showSign: false })}
                  </div>
                  <div style={{ fontSize: 10, color: TXT_2 }}>mín. 67% renda variável</div>
                </div>

                {/* 6 — RETORNO DIA */}
                <div style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`,
                  borderRadius: 6, padding: 16, fontFamily: MONO,
                }}>
                  <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    RETORNO DIA
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: signColor(dailyReturn?.dailyReturnPct), marginBottom: 6 }}>
                    {formatPct(dailyReturn?.dailyReturnPct, { showSign: true })}
                  </div>
                  <div style={{ fontSize: 10, color: TXT_2 }}>
                    {dailyReturn?.isPartial
                      ? `parcial — ${(dailyReturn.coveredWeight * 100) | 0}% coberto`
                      : 'carteira completa'}
                  </div>
                </div>
              </div>

              {/* NAV chart card */}
              <div style={{
                background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16,
              }}>
                <div style={{
                  fontSize: 10, color: TXT_3, letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: 16,
                }}>EVOLUÇÃO DA COTA</div>
                <NavChart
                  navSeries={navAnalytics?.navSeries ?? []}
                  ibovSeries={navAnalytics?.ibovSeries ?? []}
                  cdiSeries={navAnalytics?.cdiSeries ?? []}
                  inceptionNAV={clube?.valor_cota_inicial ?? 1000}
                />
              </div>

              {/* Benchmark comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                {/* vs IBOV */}
                <div style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16,
                }}>
                  <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
                    CARTEIRA vs IBOV
                  </div>
                  {[
                    ['Carteira', navAnalytics?.totalReturnPct, false],
                    ['IBOV',     navAnalytics?.ibovReturnPct,  false],
                    ['Alpha',
                      (navAnalytics?.totalReturnPct ?? 0) - (navAnalytics?.ibovReturnPct ?? 0),
                      true],
                  ].map(([label, val, isAlpha]) => (
                    <div key={label} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: `1px solid ${BORDER}`,
                    }}>
                      <span style={{ fontSize: 11, color: TXT_2 }}>{label}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: isAlpha ? signColor(val) : TXT_1,
                      }}>
                        {formatPct(val)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* vs CDI */}
                <div style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16,
                }}>
                  <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
                    CARTEIRA vs CDI
                  </div>
                  {[
                    ['Carteira', navAnalytics?.totalReturnPct, false],
                    ['CDI',      navAnalytics?.cdiReturnPct,   false],
                    ['Alpha',
                      (navAnalytics?.totalReturnPct ?? 0) - (navAnalytics?.cdiReturnPct ?? 0),
                      true],
                  ].map(([label, val, isAlpha]) => (
                    <div key={label} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: `1px solid ${BORDER}`,
                    }}>
                      <span style={{ fontSize: 11, color: TXT_2 }}>{label}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: isAlpha ? signColor(val) : TXT_1,
                      }}>
                        {formatPct(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* TAB 2 — CARTEIRA                                                */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'carteira' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Compliance banner */}
              <div style={{
                padding: '14px 18px', borderRadius: 6,
                background: compBannerBg,
                border: `1px solid ${compColor}`,
                fontFamily: MONO, fontSize: 12, color: compColor,
              }}>
                {compBannerText}
              </div>

              {/* Position table */}
              <div style={{
                background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden',
              }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    POSIÇÕES ATUAIS
                  </span>
                </div>

                {/* Header row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 100px 80px 70px 90px 90px',
                  gap: 8, padding: '8px 16px',
                  borderBottom: `1px solid ${BORDER}`,
                }}>
                  {['ATIVO', 'NOME', 'GRUPO', 'BOLSA', 'PESO', 'PREÇO', 'CONTRIB.'].map(h => (
                    <div key={h} style={{
                      fontSize: 10, color: TXT_3, letterSpacing: '0.08em',
                      textTransform: 'uppercase', fontFamily: MONO,
                    }}>{h}</div>
                  ))}
                </div>

                {/* Data rows */}
                {snapshot.map((item, i) => {
                  const assetMeta  = STATIC_ASSETS_MAP.find(a => a.id === item.asset_id);
                  const exchange   = assetMeta?.exchange
                    ?? posicoes.find(p => p.asset_id === item.asset_id)?.asset?.exchange;
                  const isIndex    = item.group_id === 'indices';
                  const isB3Local  = !isIndex && exchange === 'B3';

                  let priceDisplay = '—';
                  if (item.hasPrice) {
                    if (isIndex) {
                      priceDisplay = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(item.price);
                    } else if (isB3Local) {
                      priceDisplay = formatCurrency(item.price);
                    } else {
                      priceDisplay = '$' + item.price.toFixed(2);
                    }
                  }

                  const contribColor = !item.hasPrice
                    ? TXT_3
                    : item.contribution > 0
                    ? GREEN
                    : item.contribution < 0
                    ? RED
                    : TXT_3;

                  return (
                    <div
                      key={item.asset_id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '80px 1fr 100px 80px 70px 90px 90px',
                        gap: 8, padding: '10px 16px',
                        background: i % 2 === 0 ? BG_CARD : BG_CARD2,
                        borderBottom: `1px solid ${BORDER}`,
                        fontFamily: MONO, fontSize: 12,
                      }}
                    >
                      <div style={{ color: TXT_1, fontWeight: 600 }}>{item.symbol}</div>
                      <div style={{ color: TXT_2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </div>
                      <div style={{ color: TXT_2 }}>{item.group_id}</div>
                      <div style={{ color: TXT_2 }}>{exchange ?? '—'}</div>
                      <div style={{ color: TXT_2 }}>
                        {formatPct(item.peso_alvo * 100, { showSign: false })}
                      </div>
                      <div style={{ color: item.hasPrice ? TXT_1 : TXT_3 }}>{priceDisplay}</div>
                      <div style={{ color: contribColor }}>
                        {item.hasPrice
                          ? formatPct(item.contribution * 100, { showSign: true, decimals: 3 })
                          : '—'}
                      </div>
                    </div>
                  );
                })}

                {/* Summary row */}
                <div style={{
                  padding: '10px 16px',
                  borderTop: `1px solid ${BORDER2}`,
                  fontFamily: MONO, fontSize: 11, color: TXT_2,
                  display: 'flex', gap: 16, flexWrap: 'wrap',
                }}>
                  <span>Total: {posicoes.length} ativos</span>
                  <span>|</span>
                  <span>
                    Peso total:{' '}
                    {formatPct(
                      snapshot.reduce((s, p) => s + p.peso_alvo, 0) * 100,
                      { showSign: false }
                    )}
                  </span>
                  <span>|</span>
                  <span>
                    RV:{' '}
                    <span style={{ color: compColor }}>
                      {formatPct((rvCompliance?.percentualRV ?? 0) * 100, { showSign: false })}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* TAB 3 — COTISTAS                                                */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'cotistas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Summary bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  ['COTISTAS ATIVOS',  cotistas?.summary?.total_cotistas ?? '—', null],
                  ['COTAS EMITIDAS',   cotistas?.summary?.total_cotas ?? '—', null],
                  ['PATRIMÔNIO TOTAL',
                    formatCurrency(cotistas?.summary?.patrimonio_total, { compact: true }),
                    null],
                ].map(([label, value]) => (
                  <div key={label} style={{
                    background: BG_CARD, border: `1px solid ${BORDER}`,
                    borderRadius: 6, padding: 16, fontFamily: MONO,
                  }}>
                    <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: TXT_1 }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Cotistas table */}
              <div style={{
                background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden',
              }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    COTISTAS
                  </span>
                </div>

                {/* Header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 100px 110px 130px',
                  gap: 8, padding: '8px 16px', borderBottom: `1px solid ${BORDER}`,
                }}>
                  {['NOME', 'COTAS', 'ENTRADA', 'VALOR ATUAL'].map(h => (
                    <div key={h} style={{
                      fontSize: 10, color: TXT_3, letterSpacing: '0.08em',
                      textTransform: 'uppercase', fontFamily: MONO,
                    }}>{h}</div>
                  ))}
                </div>

                {/* Rows */}
                {(cotistas?.data ?? []).map((c, i) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 100px 110px 130px',
                      gap: 8, padding: '10px 16px',
                      background: i % 2 === 0 ? BG_CARD : BG_CARD2,
                      borderBottom: `1px solid ${BORDER}`,
                      fontFamily: MONO, fontSize: 12,
                    }}
                  >
                    <div style={{ color: TXT_1 }}>{c.nome}</div>
                    <div style={{ color: TXT_2 }}>
                      {Number(c.cotas_detidas).toFixed(0)}
                    </div>
                    <div style={{ color: TXT_2 }}>{fmtDate(c.data_entrada)}</div>
                    <div style={{ color: c.valor_atual != null ? GOLD : TXT_3 }}>
                      {c.valor_atual != null ? formatCurrency(c.valor_atual) : '—'}
                    </div>
                  </div>
                ))}

                {/* Footer totals */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 100px 110px 130px',
                  gap: 8, padding: '10px 16px',
                  borderTop: `1px solid ${BORDER2}`,
                  fontFamily: MONO, fontSize: 12, fontWeight: 600,
                }}>
                  <div style={{ color: TXT_1 }}>Total</div>
                  <div style={{ color: TXT_1 }}>
                    {Number(cotistas?.summary?.total_cotas ?? 0).toFixed(0)}
                  </div>
                  <div style={{ color: TXT_3 }}>—</div>
                  <div style={{ color: GOLD }}>
                    {formatCurrency(cotistas?.summary?.patrimonio_total)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* TAB 4 — RISCO                                                   */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'risco' && (() => {
            const curDD     = (drawdown?.currentDrawdown ?? 0) * 100;
            const curDDColor = curDD < -1 ? RED : curDD < 0 ? AMBER : GREEN;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Risk KPI cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>

                  {/* 1 — Drawdown Atual */}
                  <div style={{
                    background: BG_CARD, border: `1px solid ${BORDER}`,
                    borderRadius: 6, padding: 16, fontFamily: MONO,
                  }}>
                    <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                      DRAWDOWN ATUAL
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: curDDColor, marginBottom: 6 }}>
                      {formatPct(drawdown?.currentDrawdown * 100, { showSign: false })}
                    </div>
                    <div style={{ fontSize: 10, color: TXT_2 }}>vs pico histórico</div>
                  </div>

                  {/* 2 — Max Drawdown */}
                  <div style={{
                    background: BG_CARD, border: `1px solid ${BORDER}`,
                    borderRadius: 6, padding: 16, fontFamily: MONO,
                  }}>
                    <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                      MAX DRAWDOWN
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: RED, marginBottom: 6 }}>
                      {formatPct(drawdown?.maxDrawdownPct, { showSign: false })}
                    </div>
                    <div style={{ fontSize: 10, color: TXT_2 }}>
                      {fmtDate(drawdown?.troughDate)}
                    </div>
                  </div>

                  {/* 3 — Volatilidade 30d */}
                  <div style={{
                    background: BG_CARD, border: `1px solid ${BORDER}`,
                    borderRadius: 6, padding: 16, fontFamily: MONO,
                  }}>
                    <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                      VOLATILIDADE 30D
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: TXT_1, marginBottom: 6 }}>
                      {formatPct(volatility30d?.annualizedVolPct, { showSign: false })}
                    </div>
                    <div style={{ fontSize: 10, color: TXT_2 }}>
                      {volatility30d?.sampleSize} observações
                    </div>
                  </div>

                  {/* 4 — Maior Posição */}
                  <div style={{
                    background: BG_CARD, border: `1px solid ${BORDER}`,
                    borderRadius: 6, padding: 16, fontFamily: MONO,
                  }}>
                    <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                      MAIOR POSIÇÃO
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: TXT_1, marginBottom: 6 }}>
                      {snapshot[0]?.symbol ?? '—'}
                    </div>
                    <div style={{ fontSize: 10, color: TXT_2 }}>
                      {snapshot[0]
                        ? formatPct(snapshot[0].peso_alvo * 100, { showSign: false })
                        : '—'}
                    </div>
                  </div>
                </div>

                {/* Drawdown chart */}
                <div style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16,
                }}>
                  <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
                    DRAWDOWN HISTÓRICO
                  </div>
                  <DrawdownChart drawdownSeries={drawdown?.drawdownSeries ?? []} />
                </div>

                {/* Compliance detail */}
                <div style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16,
                }}>
                  <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
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
                          background: GREEN, height: '100%', transition: 'width 0.3s',
                          minWidth: (rvCompliance?.percentualRV ?? 0) > 0 ? 2 : 0,
                        }} />
                        <div style={{
                          width: `${(rvCompliance?.percentualOutras ?? 0) * 100}%`,
                          background: TXT_3, height: '100%',
                          minWidth: (rvCompliance?.percentualOutras ?? 0) > 0 ? 2 : 0,
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: GREEN }}>
                          RV {((rvCompliance?.percentualRV ?? 0) * 100).toFixed(1)}%
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: TXT_3 }}>
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
                      {(compliance?.positions_detail ?? snapshot.map(s => ({
                        asset_id: s.asset_id, symbol: s.symbol, name: s.name,
                        group_id: s.group_id, peso_alvo: s.peso_alvo,
                        is_rv: s.group_id === 'equities',
                      }))).map((pos) => (
                        <div key={pos.asset_id} style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', padding: '5px 0',
                          borderBottom: `1px solid ${BORDER}`,
                          fontFamily: MONO, fontSize: 11,
                        }}>
                          <span style={{ color: TXT_1, width: 60 }}>{pos.symbol}</span>
                          <span style={{ color: TXT_2 }}>
                            {formatPct((pos.peso_alvo ?? 0) * 100, { showSign: false })}
                          </span>
                          <span style={{
                            fontSize: 9, padding: '2px 6px', borderRadius: 3,
                            background: pos.is_rv ? 'rgba(0,230,118,0.1)' : 'rgba(71,85,105,0.2)',
                            border: `1px solid ${pos.is_rv ? 'rgba(0,230,118,0.3)' : BORDER2}`,
                            color: pos.is_rv ? GREEN : TXT_3,
                          }}>
                            {pos.is_rv ? 'RV' : 'OUTRAS'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </div>

      <NavRecordModal
        open={navModalOpen}
        data={navModalData}
        onDataChange={(field, value) =>
          setNavModalData(prev => ({ ...prev, [field]: value }))}
        onSubmit={submitNav}
        onClose={() => {
          if (_navAutoCloseTimer) {
            clearTimeout(_navAutoCloseTimer);
            _navAutoCloseTimer = null;
          }
          setNavModalOpen(false);
        }}
        submitting={navSubmitting}
        submitError={navSubmitError}
        submitOk={navSubmitOk}
      />
    </div>
  );
}
