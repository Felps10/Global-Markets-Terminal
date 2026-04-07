import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { hasRole } from '../lib/roles.js';
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
import ClubeShell from '../components/clube/ClubeShell.jsx';
import NavChart from '../components/clube/NavChart.jsx';
import NavRecordModal from '../components/clube/NavRecordModal.jsx';

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
const ACCENT   = 'var(--c-accent)';
const GREEN    = '#00E676';
const RED      = 'var(--c-error)';
const AMBER    = '#fbbf24';
const GOLD     = '#FFD700';

const MONO = "'JetBrains Mono', monospace";

// ── Module-level cache ────────────────────────────────────────────────────────
const _clubeCache       = {};
const _clubeCacheTs     = {};
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

// ── Operacional helpers ──────────────────────────────────────────────────────

/**
 * Returns the display color for a severity level.
 * Matches the severity values returned by classifyOperacionalSeverity in quotizacaoEngine.js
 */
function severityColor(severity) {
  if (severity === 'CRITICAL') return 'var(--c-error)';
  if (severity === 'WARNING')  return '#F9C300';
  return '#475569'; // INFO — matches TXT_3
}

/**
 * Returns the Portuguese label for a severity level.
 */
function severityLabel(severity) {
  if (severity === 'CRITICAL') return 'CRÍTICO';
  if (severity === 'WARNING')  return 'ATENÇÃO';
  return 'INFO';
}

// ── RenquadramentoSummary (module-level) ─────────────────────────────────────
function RenquadramentoSummary({ clubeId, getToken, navigate }) {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clubeId) return;
    setLoading(true);
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(
          `${API_BASE}/api/v1/clubes/${clubeId}/reenquadramento`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setEvents(data.filter(e => e.status !== 'resolvido'));
        }
      } catch (_) {}
      finally { setLoading(false); }
    }
    load();
  }, [clubeId, getToken]);

  if (loading || events.length === 0) return null;

  return (
    <div>
      <div style={{
        fontSize: 10, color: TXT_3, letterSpacing: '0.12em',
        textTransform: 'uppercase', marginBottom: 8,
      }}>
        REENQUADRAMENTO ({events.length} aberto{events.length !== 1 ? 's' : ''})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {events.map(ev => {
          const statusColor = ev.status === 'em_correcao' ? AMBER : RED;
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
                <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_1, fontWeight: 600 }}>
                  {ev.tipo_violacao.replace(/_/g, ' ').toUpperCase()}
                </div>
                <div style={{
                  fontFamily: MONO, fontSize: 10, color: TXT_2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {ev.descricao}
                </div>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, flexShrink: 0 }}>
                {ev.diasAberto}d
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, flexShrink: 0 }}>→</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Welcome banner (club_member only, dismissable) ───────────────────────────
function WelcomeBanner({ userId }) {
  const welcomeKey = `gmt_clube_welcomed_${userId}`;
  const [visible, setVisible] = useState(
    !localStorage.getItem(welcomeKey)
  );
  if (!visible) return null;
  return (
    <div style={{
      marginBottom: 20,
      padding: '12px 16px',
      background: 'var(--c-accent-muted)',
      border: '1px solid rgba(59,130,246,0.25)',
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      <span style={{
        fontFamily: MONO,
        fontSize: 12,
        color: TXT_2,
        lineHeight: 1.5,
      }}>
        Bem-vindo ao clube. Aqui você acompanha o desempenho,
        os relatórios e a composição da carteira.
      </span>
      <button
        onClick={() => {
          localStorage.setItem(welcomeKey, '1');
          setVisible(false);
        }}
        style={{
          background: 'transparent', border: 'none',
          color: TXT_3, cursor: 'pointer',
          fontSize: 16, padding: '0 4px', flexShrink: 0,
        }}
      >×</button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ClubePage() {
  const navigate            = useNavigate();
  const { id: clubeIdParam } = useParams();
  const [searchParams]      = useSearchParams();
  const { getToken, user }  = useAuth();
  const isManager = hasRole(user?.role, 'club_manager');
  const isMember  = hasRole(user?.role, 'club_member');

  const [clube,      setClube]      = useState(null);
  const [posicoes,   setPosicoes]   = useState([]);
  const [cotistas,   setCotistas]   = useState(null);
  const [navHistory, setNavHistory] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [operacional,        setOperacional]        = useState(null);
  const [operacionalLoading, setOperacionalLoading] = useState(false);
  const [operacionalError,   setOperacionalError]   = useState(null);

  // Statute state
  const [estatuto,        setEstatuto]        = useState(null);
  const [estatutoHistory, setEstatutoHistory] = useState([]);
  const [estatutoLoading, setEstatutoLoading] = useState(false);
  const [showNewStatuteForm, setShowNewStatuteForm] = useState(false);
  const [newStatuteValues,   setNewStatuteValues]   = useState({});
  const [statuteSubmitting,  setStatuteSubmitting]  = useState(false);
  const [statuteError,       setStatuteError]       = useState(null);

  // Audit log state
  const [auditLog,        setAuditLog]        = useState([]);
  const [auditLoading,    setAuditLoading]    = useState(false);
  const [auditFilter,     setAuditFilter]     = useState('');

  // Setup checklist state
  const [setupChecklist, setSetupChecklist] = useState(null);

  // Annual close state
  const [annualClose,        setAnnualClose]        = useState(null);
  const [annualCloseLoading, setAnnualCloseLoading] = useState(false);

  // Role state
  const [meuRole, setMeuRole] = useState('admin');  // fallback: admin during transition

  // CSV import state
  const [csvImporting,   setCsvImporting]   = useState(false);
  const [csvError,       setCsvError]       = useState(null);
  const [csvPreview,     setCsvPreview]     = useState(null);
  const [csvConfirming,  setCsvConfirming]  = useState(false);

  const [marketData, setMarketData] = useState({});
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [activeTab,  setActiveTab]  = useState('visao-geral');

  const [navModalOpen,   setNavModalOpen]   = useState(false);
  const [navModalData,   setNavModalData]   = useState(null);
  const [navSubmitting,  setNavSubmitting]  = useState(false);
  const [navSubmitError, setNavSubmitError] = useState(null);
  const [navSubmitOk,    setNavSubmitOk]    = useState(false);


  // Guard: redirect club_members away from manager-only tabs if they somehow land there
  useEffect(() => {
    if (user?.role === 'club_member' && !['visao-geral', 'carteira'].includes(activeTab)) {
      setActiveTab('visao-geral');
    }
  }, [user?.role, activeTab]);

  // Read ?tab= param once on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (!tabParam) return;
    const ALL_TAB_IDS = new Set(['visao-geral', 'fila-operacoes', 'carteira', 'risco', 'estatuto']);
    if (!ALL_TAB_IDS.has(tabParam)) return;
    const memberOnly = new Set(['visao-geral', 'carteira']);
    if (user?.role === 'club_member' && !memberOnly.has(tabParam)) return;
    setActiveTab(tabParam);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


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

  // ── Operacional fetch ──────────────────────────────────────────────────────
  const fetchOperacional = useCallback(async (clubeId) => {
    if (!clubeId) return;
    setOperacionalLoading(true);
    setOperacionalError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(
        `${API_BASE}/api/v1/clubes/${clubeId}/operacional`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Erro ao carregar operacional (${res.status})`);
      const data = await res.json();
      setOperacional(data);
    } catch (err) {
      setOperacionalError(err.message ?? 'Erro desconhecido');
    } finally {
      setOperacionalLoading(false);
    }
  }, [getToken]);

  // ── Estatuto fetch ────────────────────────────────────────────────────────
  const fetchEstatuto = useCallback(async (clubeId) => {
    if (!clubeId) return;
    setEstatutoLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const [activeRes, histRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/clubes/${clubeId}/estatuto/active`, { headers }),
        fetch(`${API_BASE}/api/v1/clubes/${clubeId}/estatuto/history`, { headers }),
      ]);
      const activeData = activeRes.ok ? await activeRes.json() : null;
      const histData   = histRes.ok  ? await histRes.json()   : [];
      setEstatuto(activeData);
      setEstatutoHistory(Array.isArray(histData) ? histData : []);
      if (activeData) {
        setNewStatuteValues({
          prazo_conversao_dias: activeData.prazo_conversao_dias,
          prazo_pagamento_dias: activeData.prazo_pagamento_dias,
          carencia_dias:        activeData.carencia_dias,
          taxa_administracao:   (activeData.taxa_administracao * 100).toFixed(4),
          taxa_performance:     (activeData.taxa_performance * 100).toFixed(4),
          benchmark_performance: activeData.benchmark_performance ?? '',
          permite_derivativos:  activeData.permite_derivativos,
          irrf_rate:            (activeData.irrf_rate * 100).toFixed(2),
          regime_tributario:    activeData.regime_tributario ?? 'fia',
          politica_investimento: activeData.politica_investimento ?? '',
          versao_nota:          '',
          valid_from:           '',
        });
      }
    } catch (err) {
      console.error('[fetchEstatuto]', err.message);
    } finally {
      setEstatutoLoading(false);
    }
  }, [getToken]);

  // ── Setup checklist fetch ─────────────────────────────────────────────────
  const fetchSetupChecklist = useCallback(async (clubeId) => {
    if (!clubeId) return;
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/v1/clubes/${clubeId}/setup-checklist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSetupChecklist(await res.json());
    } catch (err) {
      console.error('[fetchSetupChecklist]', err.message);
    }
  }, [getToken]);

  // ── Annual close fetch ────────────────────────────────────────────────────
  const fetchAnnualClose = useCallback(async (clubeId) => {
    const month = new Date().getMonth();
    if (month !== 0) return; // Only in January
    const year = new Date().getFullYear() - 1;
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(
        `${API_BASE}/api/v1/clubes/${clubeId}/annual-close/${year}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) setAnnualClose(await res.json());
    } catch (err) {
      console.warn('[annualClose]', err.message);
    }
  }, [getToken]);

  // ── Submit new statute ────────────────────────────────────────────────────
  const submitNewStatute = useCallback(async () => {
    if (!clube?.id) return;
    setStatuteSubmitting(true);
    setStatuteError(null);
    try {
      const token = await getToken();
      const payload = {
        valid_from:            newStatuteValues.valid_from,
        prazo_conversao_dias:  Number(newStatuteValues.prazo_conversao_dias),
        prazo_pagamento_dias:  Number(newStatuteValues.prazo_pagamento_dias),
        carencia_dias:         Number(newStatuteValues.carencia_dias),
        taxa_administracao:    parseFloat(newStatuteValues.taxa_administracao) / 100,
        taxa_performance:      parseFloat(newStatuteValues.taxa_performance) / 100,
        benchmark_performance: newStatuteValues.benchmark_performance || null,
        permite_derivativos:   Boolean(newStatuteValues.permite_derivativos),
        irrf_rate:             parseFloat(newStatuteValues.irrf_rate) / 100,
        regime_tributario:     newStatuteValues.regime_tributario || 'fia',
        politica_investimento: newStatuteValues.politica_investimento || null,
        versao_nota:           newStatuteValues.versao_nota || null,
      };
      const res = await fetch(`${API_BASE}/api/v1/clubes/${clube.id}/estatuto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Erro ${res.status}`);
      }
      setShowNewStatuteForm(false);
      setStatuteError(null);
      await fetchEstatuto(clube.id);
      await fetchSetupChecklist(clube.id);
    } catch (err) {
      setStatuteError(err.message);
    } finally {
      setStatuteSubmitting(false);
    }
  }, [clube?.id, getToken, newStatuteValues, fetchEstatuto, fetchSetupChecklist]);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Cache hit
    if (_clubeCache[clubeIdParam] && Date.now() - (_clubeCacheTs[clubeIdParam] ?? 0) < CLUBE_TTL_MS) {
      const cached = _clubeCache[clubeIdParam];
      setClube(cached.clube);
      setPosicoes(cached.posicoes);
      setCotistas(cached.cotistas);
      setNavHistory(cached.navHistory);
      setCompliance(cached.compliance);
      fetchPositionPrices(cached.posicoes);
      fetchOperacional(cached.clube.id);
      fetchEstatuto(cached.clube.id);
      fetchSetupChecklist(cached.clube.id);
      fetchAnnualClose(cached.clube.id);
      setLoading(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');

      const headers = { Authorization: `Bearer ${token}` };

      // Fetch specific clube by ID from URL param
      const clubeRes = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/v1/clubes/${clubeIdParam}`,
        { headers }
      );
      if (!clubeRes.ok) {
        if (clubeRes.status === 404) { setClube(null); setLoading(false); return; }
        throw new Error(`Erro ao carregar clube (${clubeRes.status})`);
      }
      const c = await clubeRes.json();
      setClube(c);

      // Step 2: parallel detail fetches
      const [posRes, cotRes, navRes, compRes] = await Promise.allSettled([
        fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/clubes/${c.id}/posicoes`,   { headers }),
        fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/clubes/${c.id}/cotistas`,   { headers }),
        fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/clubes/${c.id}/nav`,        { headers }),
        fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/clubes/${c.id}/compliance`, { headers }),
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

      // Fetch operacional dashboard data
      fetchOperacional(c.id);
      fetchEstatuto(c.id);
      fetchSetupChecklist(c.id);
      fetchAnnualClose(c.id);

      _clubeCache[clubeIdParam]   = { clube: c, posicoes: posicoesData, cotistas: cotistasData, navHistory: navData, compliance: compData };
      _clubeCacheTs[clubeIdParam] = Date.now();

    } catch (err) {
      setError(err.message ?? 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [getToken, clubeIdParam, fetchOperacional, fetchEstatuto, fetchSetupChecklist, fetchAnnualClose]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Fetch audit log when ESTATUTO tab is active ──────────────────────────────
  useEffect(() => {
    if (activeTab !== 'estatuto' || !clube?.id) return;
    setAuditLoading(true);
    async function loadAudit() {
      try {
        const token = await getToken();
        const res = await fetch(
          `${API_BASE}/api/v1/clubes/${clube.id}/audit-log?limit=50`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) setAuditLog(await res.json());
      } catch (_) {}
      finally { setAuditLoading(false); }
    }
    loadAudit();
  }, [activeTab, clube?.id, getToken]);

  // ── Fetch meu-role ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchMeuRole() {
      if (!clube?.id) return;
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/v1/clubes/${clube.id}/meu-role`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMeuRole(data.role ?? 'admin');
        }
      } catch (err) {
        console.warn('[meuRole]', err.message);
      }
    }
    fetchMeuRole();
  }, [clube?.id, getToken]);

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

  // ── ClubeShell props ──────────────────────────────────────────────────────────
  const shellPendingCount = useMemo(() => {
    if (!operacional) return 0;
    return (operacional.pendentes ?? []).length;
  }, [operacional]);

  const shellPatrimonio = useMemo(() => {
    const totalCotas = cotistas?.data?.reduce((s, c) => s + parseFloat(c.cotas_detidas ?? 0), 0) ?? 0;
    const cota = navAnalytics?.currentNAV ?? clube?.valor_cota_inicial ?? null;
    return cota != null ? totalCotas * cota : null;
  }, [cotistas, navAnalytics, clube]);

  const shellValorCota = navAnalytics?.currentNAV ?? clube?.valor_cota_inicial ?? null;

  const shellCotasEmitidas = clube?.cotas_emitidas_total
    ?? cotistas?.data?.reduce((s, c) => s + parseFloat(c.cotas_detidas ?? 0), 0)
    ?? null;

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
      const res   = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/clubes/${clube.id}/nav`, {
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
        _clubeCache[clubeIdParam]   = null;
        _clubeCacheTs[clubeIdParam] = 0;
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

  // ── Reenquadramento ───────────────────────────────────────────────────────
  const handleRegistrarReenquadramento = useCallback(async (alertItem) => {
    if (!clube?.id) return;
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE}/api/v1/clubes/${clube.id}/reenquadramento`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            tipo_violacao: alertItem.tipo ?? 'compliance_breach',
            descricao: alertItem.descricao ?? alertItem.titulo,
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
  }, [clube?.id, getToken, navigate]);

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

  const MEMBER_TAB_IDS = new Set(['visao-geral', 'carteira']);

  const ALL_TABS = [
    { id: 'visao-geral',    label: 'VISÃO GERAL' },
    { id: 'fila-operacoes', label: 'FILA DE OPERAÇÕES' },
    { id: 'carteira',       label: 'CARTEIRA'    },
    { id: 'risco',          label: 'RISCO'       },
    ...(isManager ? [{ id: 'estatuto', label: 'ESTATUTO' }] : []),
  ];

  const TABS = user?.role === 'club_member'
    ? ALL_TABS.filter(t => MEMBER_TAB_IDS.has(t.id))
    : ALL_TABS;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <ClubeShell
      activePage="painel"
      clubeId={clubeIdParam}
      clubeNome={clube?.nome}
      clubeStatus={clube?.status}
      patrimonio={shellPatrimonio}
      valorCota={shellValorCota}
      cotasEmitidas={shellCotasEmitidas}
      pendingCount={shellPendingCount}
      activeTabLabel={TABS.find(t => t.id === activeTab)?.label ?? ''}
      lastNavDate={navHistory?.[navHistory.length - 1]?.data ?? null}
      headerRight={
        <>
          {(activeTab === 'fila-operacoes' || activeTab === 'visao-geral') && (
            <button
              onClick={() => fetchOperacional(clube?.id)}
              disabled={operacionalLoading}
              style={{
                background: 'transparent',
                border: `1px solid ${TXT_3}`,
                color: operacionalLoading ? TXT_3 : TXT_2,
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: '0.1em',
                padding: '6px 12px',
                cursor: operacionalLoading ? 'not-allowed' : 'pointer',
                borderRadius: 3,
                marginLeft: 8,
              }}
              onMouseEnter={e => { if (!operacionalLoading) e.currentTarget.style.borderColor = TXT_2; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = TXT_3; }}
            >
              {operacionalLoading ? 'ATUALIZANDO...' : '↻ ATUALIZAR'}
            </button>
          )}
          {isManager && (
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
        </>
      }
    >
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
              fontSize: 12, letterSpacing: '0.1em',
              borderBottom: `2px solid ${activeTab === id ? ACCENT : 'transparent'}`,
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              background: 'transparent', cursor: 'pointer',
              color: activeTab === id ? TXT_1 : TXT_2,
              fontFamily: MONO, transition: 'color 0.15s',
            }}
            onMouseEnter={e => { if (activeTab !== id) e.currentTarget.style.color = TXT_1; }}
            onMouseLeave={e => { if (activeTab !== id) e.currentTarget.style.color = TXT_2; }}
          >{label}</button>
        ))}
      </div>

      {/* ── Scrollable content ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

        {/* ── Setup Checklist Banner ──────────────────────────────────────────── */}
        {setupChecklist && Array.isArray(setupChecklist) && setupChecklist.some(s => !s.done) && (
          <div style={{
            flexShrink: 0, marginBottom: 16,
            background: BG_CARD,
            borderLeft: `4px solid ${ACCENT}`,
            padding: '10px 20px',
            display: 'flex', alignItems: 'center', gap: 20,
            flexWrap: 'wrap', borderRadius: 4,
          }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', flexShrink: 0 }}>
              CONFIGURAÇÃO INICIAL · {setupChecklist.filter(s => s.done).length}/{setupChecklist.length} completos
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
              {setupChecklist.map((step) => (
                <div key={step.step} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 3,
                  border: `1px solid ${step.done ? 'rgba(0,230,118,0.3)' : BORDER2}`,
                  background: step.done ? 'rgba(0,230,118,0.06)' : BG_CARD2,
                  cursor: step.done ? 'default' : 'pointer',
                  opacity: step.done ? 0.7 : 1,
                }}
                  onClick={() => {
                    if (!step.done) {
                      if (step.step === 'cotistas') navigate('/clube/membros');
                      else if (step.step === 'nav') buildNavModalDefaults();
                      else if (step.step === 'estatuto') setActiveTab('estatuto');
                      else if (step.step === 'posicoes') setActiveTab('carteira');
                    }
                  }}
                >
                  <span style={{ fontFamily: MONO, fontSize: 9, color: step.done ? GREEN : TXT_3 }}>
                    {step.done ? '✓' : '○'}
                  </span>
                  <span style={{
                    fontFamily: MONO, fontSize: 10,
                    color: step.done ? TXT_3 : TXT_2,
                    textDecoration: step.done ? 'line-through' : 'none',
                  }}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Annual Close Banner ──────────────────────────────────────────── */}
        {annualClose && !annualClose.complete && (
          <div style={{
            flexShrink: 0, marginBottom: 16,
            background: BG_CARD,
            borderLeft: `4px solid ${GOLD}`,
            padding: '10px 20px',
            display: 'flex', alignItems: 'center', gap: 20,
            flexWrap: 'wrap', borderRadius: 4,
          }}>
            <div style={{
              fontFamily: MONO, fontSize: 10, color: GOLD,
              letterSpacing: '0.12em', textTransform: 'uppercase', flexShrink: 0,
            }}>
              FECHAMENTO {annualClose.year} · {annualClose.completedCount}/5 completos
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
              {annualClose.steps.map((step) => (
                <div key={step.key} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 3,
                  border: `1px solid ${step.done ? 'rgba(0,230,118,0.3)' : 'rgba(255,215,0,0.25)'}`,
                  background: step.done ? 'rgba(0,230,118,0.06)' : 'rgba(255,215,0,0.04)',
                  cursor: step.done ? 'default' : 'pointer',
                  opacity: step.done ? 0.7 : 1,
                }}
                  onClick={() => {
                    if (!step.done && step.ctaPath) {
                      if (step.ctaPath === '/clube' && step.ctaTab) {
                        setActiveTab(step.ctaTab);
                      } else {
                        navigate(step.ctaPath);
                      }
                    }
                  }}
                >
                  <span style={{ fontFamily: MONO, fontSize: 9, color: step.done ? GREEN : GOLD }}>
                    {step.done ? '✓' : '○'}
                  </span>
                  <span style={{
                    fontFamily: MONO, fontSize: 10,
                    color: step.done ? TXT_3 : TXT_2,
                    textDecoration: step.done ? 'line-through' : 'none',
                  }}>
                    {step.label}
                  </span>
                  {step.detail && (
                    <span style={{ fontFamily: MONO, fontSize: 9, color: RED }}>({step.detail})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {isMember && !isManager && (
            <WelcomeBanner userId={user?.id} />
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* TAB 1 — VISÃO GERAL                                             */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'visao-geral' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ── Admin/Gestor view: full dashboard ── */}
              {meuRole !== 'cotista' && (
              <>
              {/* KPI cards */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
              }}>

                {/* 1 — COTA ATUAL */}
                <div style={{
                  background: BG_CARD2, border: `1px solid ${BORDER2}`,
                  borderRadius: 6, padding: 16, fontFamily: MONO,
                }}>
                  <div style={{ fontSize: 10, color: TXT_2, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    COTA ATUAL
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 600, color: TXT_1, marginBottom: 6 }}>
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
                  <div style={{ fontSize: 20, fontWeight: 600, color: signColor(navAnalytics?.totalReturnPct), marginBottom: 6 }}>
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
                  <div style={{ fontSize: 20, fontWeight: 600, color: signColor(navAnalytics?.ytdReturnPct), marginBottom: 6 }}>
                    {formatPct(navAnalytics?.ytdReturnPct)}
                  </div>
                  <div style={{ fontSize: 10, color: TXT_2 }}>ano corrente</div>
                </div>

                {/* 4 — PATRIMÔNIO */}
                <div style={{
                  background: BG_CARD2, border: `1px solid ${BORDER2}`,
                  borderRadius: 6, padding: 16, fontFamily: MONO,
                }}>
                  <div style={{ fontSize: 10, color: TXT_2, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    PATRIMÔNIO
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 600, color: GOLD, marginBottom: 6 }}>
                    {formatCurrency(cotistas?.summary?.patrimonio_total, { compact: true })}
                  </div>
                  <div style={{ fontSize: 10, color: TXT_2 }}>
                    {formatCurrency(cotistas?.summary?.valor_cota_atual)} / cota
                  </div>
                </div>

                {/* 5 — COMPLIANCE RV */}
                <div style={{
                  background: rvStatus === 'OK' ? BG_CARD : rvStatus === 'WARNING' ? 'rgba(251,191,36,0.04)' : 'rgba(255,82,82,0.04)',
                  border: `1px solid ${BORDER}`,
                  borderBottom: `3px solid ${compColor}`,
                  borderRadius: 6, padding: 16, fontFamily: MONO,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      COMPLIANCE RV
                    </span>
                    {rvStatus !== 'OK' && rvStatus !== 'NO_POSITIONS' && (
                      <span style={{
                        fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                        padding: '1px 5px', borderRadius: 3,
                        color: compColor, background: `${compColor}18`,
                        border: `1px solid ${compColor}40`,
                      }}>
                        {rvStatus === 'WARNING' ? '⚠ ATENÇÃO' : '✗ BREACH'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: compColor, marginBottom: 6 }}>
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
                  <div style={{ fontSize: 20, fontWeight: 600, color: signColor(dailyReturn?.dailyReturnPct), marginBottom: 6 }}>
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
                  fontSize: 11, color: TXT_2, letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: 16,
                  borderLeft: '3px solid var(--c-accent)', paddingLeft: 8,
                }}>EVOLUÇÃO DA COTA</div>
                <NavChart
                  navSeries={navAnalytics?.navSeries ?? []}
                  ibovSeries={navAnalytics?.ibovSeries ?? []}
                  cdiSeries={navAnalytics?.cdiSeries ?? []}
                  inceptionNAV={clube?.valor_cota_inicial ?? 1000}
                />
              </div>

              {/* Benchmark comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

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
                  ].map(([label, val, isAlpha], idx, arr) => (
                    <div key={label} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
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
                  ].map(([label, val, isAlpha], idx, arr) => (
                    <div key={label} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
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

              {/* Próximos Prazos + Caixa */}
              {operacional && !operacionalLoading && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>

                  {/* Próximos Prazos */}
                  <div style={{
                    background: BG_CARD, border: `1px solid ${BORDER}`,
                    borderRadius: 6, padding: 16,
                  }}>
                    <div style={{
                      fontSize: 10, color: TXT_3, letterSpacing: '0.1em',
                      textTransform: 'uppercase', marginBottom: 16,
                      borderLeft: '3px solid var(--c-accent)', paddingLeft: 8,
                    }}>
                      PRÓXIMOS PRAZOS
                    </div>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                    }}>
                      {(operacional.proximos_prazos ?? []).map((prazo, i) => {
                        const color = severityColor(prazo.severity);
                        return (
                          <div key={i} style={{
                            background: BG_CARD,
                            border: `1px solid ${color}30`,
                            borderRadius: 6, padding: '12px 14px',
                            position: 'relative',
                          }}>
                            {/* Severity dot top-right */}
                            <div style={{
                              position: 'absolute', top: 10, right: 10,
                              width: 6, height: 6, borderRadius: '50%',
                              background: color,
                            }} />
                            <div style={{
                              fontFamily: MONO, fontSize: 10, color: TXT_1,
                              fontWeight: 600, marginBottom: 4, paddingRight: 16,
                            }}>
                              {prazo.titulo}
                            </div>
                            <div style={{
                              fontFamily: MONO, fontSize: 10, color: TXT_2,
                            }}>
                              {prazo.descricao}
                            </div>
                            {prazo.diasParaPrazo != null && (
                              <div style={{
                                fontFamily: MONO, fontSize: 10,
                                color: prazo.diasParaPrazo < 0 ? RED : prazo.diasParaPrazo <= 7 ? GOLD : TXT_3,
                                marginTop: 6,
                              }}>
                                {prazo.diasParaPrazo < 0
                                  ? `${Math.abs(prazo.diasParaPrazo)}d em atraso`
                                  : prazo.diasParaPrazo === 0
                                  ? 'Hoje'
                                  : `${prazo.diasParaPrazo}d restantes`}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {(operacional.proximos_prazos ?? []).length === 0 && (
                        <div style={{
                          gridColumn: '1 / -1', padding: '20px 0',
                          textAlign: 'center', fontFamily: MONO,
                          fontSize: 11, color: TXT_3,
                        }}>
                          Nenhum prazo próximo.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Caixa */}
                  <div style={{
                    background: BG_CARD, border: `1px solid ${BORDER}`,
                    borderRadius: 6, padding: 16,
                  }}>
                    <div style={{
                      fontSize: 10, color: TXT_3, letterSpacing: '0.1em',
                      textTransform: 'uppercase', marginBottom: 16,
                      borderLeft: '3px solid var(--c-accent)', paddingLeft: 8,
                    }}>
                      CAIXA
                    </div>
                    <div style={{
                      fontFamily: MONO, fontSize: 10, color: TXT_3,
                      letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
                    }}>
                      SALDO ATUAL
                    </div>
                    <div style={{
                      fontFamily: MONO, fontSize: 20, fontWeight: 600,
                      color: (operacional.caixa?.current_balance ?? 0) >= 0 ? TXT_1 : RED,
                      marginBottom: 12,
                    }}>
                      {Number(operacional.caixa?.current_balance ?? 0).toLocaleString('pt-BR', {
                        style: 'currency', currency: 'BRL',
                      })}
                    </div>
                    {operacional.caixa?.last_entry ? (
                      <div style={{
                        fontFamily: MONO, fontSize: 10, color: TXT_3,
                        borderTop: `1px solid ${BORDER2}`, paddingTop: 10,
                      }}>
                        <div style={{ color: TXT_2, marginBottom: 3 }}>ÚLTIMO LANÇAMENTO</div>
                        <div>
                          <span style={{
                            color: operacional.caixa.last_entry.valor_brl > 0 ? GREEN : RED,
                          }}>
                            {Number(operacional.caixa.last_entry.valor_brl).toLocaleString('pt-BR', {
                              style: 'currency', currency: 'BRL',
                            })}
                          </span>
                          {' · '}
                          <span style={{ color: TXT_3 }}>
                            {operacional.caixa.last_entry.tipo}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        fontFamily: MONO, fontSize: 10, color: TXT_3,
                        borderTop: `1px solid ${BORDER2}`, paddingTop: 10,
                      }}>
                        Nenhum lançamento registrado.
                      </div>
                    )}
                  </div>
                </div>
              )}
              </>
              )}

              {/* ── Cotista view: personal investor portal ── */}
              {meuRole === 'cotista' && (() => {
                const valorCotaAtual = navAnalytics?.currentNAV ?? clube?.valor_cota_inicial ?? 1000;
                const totalCotasCotista = cotistas?.data?.reduce((s, c) => s + parseFloat(c.cotas_detidas ?? 0), 0) ?? 0;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{
                      padding: '10px 14px', borderRadius: 4,
                      background: 'var(--c-accent-muted)',
                      border: '1px solid rgba(59,130,246,0.25)',
                      fontFamily: MONO, fontSize: 11, color: ACCENT,
                    }}>
                      Visão do cotista — dados consolidados do clube
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
                      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16 }}>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                          VALOR DA COTA
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: TXT_1 }}>
                          {valorCotaAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 6 })}
                        </div>
                      </div>

                      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16 }}>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                          RETORNO TOTAL
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: signColor(navAnalytics?.totalReturnPct ?? 0) }}>
                          {navAnalytics?.totalReturnPct != null
                            ? `${navAnalytics.totalReturnPct > 0 ? '+' : ''}${navAnalytics.totalReturnPct.toFixed(2)}%`
                            : '—'}
                        </div>
                      </div>

                      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16 }}>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                          PATRIMÔNIO TOTAL
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: GOLD }}>
                          {(valorCotaAtual * totalCotasCotista).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </div>

                      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16 }}>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                          ENQUADRAMENTO
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: compColor }}>
                          {rvStatus === 'OK' ? '✓ CONFORME' : rvStatus === 'WARNING' ? '⚠ ATENÇÃO' : '✗ BREACH'}
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, marginTop: 4 }}>
                          RV: {((rvCompliance?.percentualRV ?? 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16 }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
                        EVOLUÇÃO DA COTA
                      </div>
                      <NavChart
                        navSeries={navAnalytics?.navSeries ?? []}
                        ibovSeries={navAnalytics?.ibovSeries ?? []}
                        cdiSeries={navAnalytics?.cdiSeries ?? []}
                        inceptionNAV={clube?.valor_cota_inicial ?? 1000}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* TAB — FILA DE OPERAÇÕES                                         */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'fila-operacoes' && isManager && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Loading state */}
              {operacionalLoading && (
                <div style={{
                  padding: '40px 0', textAlign: 'center',
                  fontFamily: MONO, fontSize: 11, color: TXT_3, letterSpacing: '0.1em',
                }}>
                  CARREGANDO OPERACIONAL...
                </div>
              )}

              {/* Error state */}
              {operacionalError && (
                <div style={{
                  padding: '12px 16px', borderRadius: 4,
                  background: 'rgba(255,82,82,0.08)',
                  border: '1px solid rgba(255,82,82,0.3)',
                  fontFamily: MONO, fontSize: 11, color: RED,
                }}>
                  {operacionalError}
                </div>
              )}

              {operacional && !operacionalLoading && (
                <div>
                  <div style={{
                    fontSize: 10, color: TXT_3, letterSpacing: '0.12em',
                    textTransform: 'uppercase', marginBottom: 8,
                  }}>
                    FILA DE OPERAÇÕES
                  </div>

                  {(operacional.pendentes ?? []).length === 0 ? (
                    <div style={{
                      padding: '24px 0', textAlign: 'center',
                      fontFamily: MONO, fontSize: 11, color: TXT_3,
                    }}>
                      Nenhuma operação pendente.
                    </div>
                  ) : (
                    <div style={{
                      background: BG_CARD, border: `1px solid ${BORDER}`,
                      borderRadius: 6, overflow: 'hidden',
                    }}>
                      {/* Table header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 80px 110px 110px 160px 160px',
                        gap: 8, padding: '8px 16px',
                        borderBottom: `1px solid ${BORDER}`,
                      }}>
                        {['COTISTA', 'TIPO', 'VALOR', 'SOLICITADO', 'STATUS', 'AÇÃO'].map(h => (
                          <div key={h} style={{
                            fontFamily: MONO, fontSize: 10, color: TXT_3,
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                          }}>{h}</div>
                        ))}
                      </div>

                      {/* Table rows */}
                      {(operacional.pendentes ?? []).map((p) => {
                        const rowColor = p.isOverdue ? RED : TXT_1;

                        // Status badge config
                        const statusConfig = {
                          aguardando_recursos:   { label: 'AGUARD. RECURSOS', bg: 'rgba(71,85,105,0.25)',  color: TXT_2  },
                          recursos_confirmados:  { label: 'RECURSOS CONF.',   bg: 'rgba(249,195,0,0.12)',  color: GOLD   },
                          convertido:            { label: 'CONVERTIDO',        bg: 'var(--c-accent-dim)', color: ACCENT },
                        };
                        const badge = statusConfig[p.status] ?? { label: p.status.toUpperCase(), bg: 'transparent', color: TXT_3 };

                        // Determine which action buttons to show
                        const showConfirmar  = p.status === 'aguardando_recursos';
                        const showConverter  = p.status === 'recursos_confirmados';
                        const showPago       = p.status === 'convertido' && p.tipo === 'resgate';
                        const showCancelar   = true; // always show cancel

                        const patchStatus = async (newStatus) => {
                          if (newStatus === 'cancelado') {
                            const ok = window.confirm(
                              `Confirmar cancelamento da ${p.tipo === 'aporte' ? 'aporte' : 'resgate'} de ${p.cotista_nome}?\n` +
                              `Esta ação não pode ser desfeita.`
                            );
                            if (!ok) return;
                          }
                          try {
                            const token = await getToken();
                            const res = await fetch(
                              `${API_BASE}/api/v1/clubes/${clube.id}/movimentacoes/${p.movimentacao_id}/status`,
                              {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ status: newStatus }),
                              }
                            );
                            if (!res.ok) {
                              const err = await res.json().catch(() => ({}));
                              alert(err.message ?? `Erro ao atualizar status (${res.status})`);
                              return;
                            }
                            // Refresh operacional data without full page reload
                            fetchOperacional(clube.id);
                          } catch (e) {
                            alert(e.message ?? 'Erro de conexão');
                          }
                        };

                        return (
                          <div key={p.movimentacao_id} style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 80px 110px 110px 160px 160px',
                            gap: 8, padding: '10px 16px',
                            borderBottom: `1px solid ${BORDER2}`,
                            background: p.isOverdue ? 'rgba(255,82,82,0.04)' : 'transparent',
                            alignItems: 'center',
                          }}>
                            {/* Cotista */}
                            <div style={{ fontFamily: MONO, fontSize: 11, color: rowColor }}>
                              {p.cotista_nome}
                            </div>
                            {/* Tipo */}
                            <div style={{
                              fontFamily: MONO, fontSize: 10,
                              color: p.tipo === 'aporte' ? GREEN : AMBER,
                              textTransform: 'uppercase',
                            }}>
                              {p.tipo}
                            </div>
                            {/* Valor */}
                            <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_1 }}>
                              {Number(p.valor_brl).toLocaleString('pt-BR', {
                                style: 'currency', currency: 'BRL',
                              })}
                            </div>
                            {/* Data */}
                            <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2 }}>
                              {p.data_solicitacao
                                ? p.data_solicitacao.split('-').reverse().join('/')
                                : '—'}
                            </div>
                            {/* Status badge */}
                            <div style={{
                              display: 'inline-flex', alignItems: 'center',
                              fontFamily: MONO, fontSize: 9, fontWeight: 600,
                              letterSpacing: '0.08em', padding: '3px 8px',
                              borderRadius: 3, background: badge.bg, color: badge.color,
                              width: 'fit-content',
                            }}>
                              {badge.label}
                            </div>
                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {hasRole(user?.role, 'club_manager') && showConfirmar && (
                                <button
                                  onClick={() => patchStatus('recursos_confirmados')}
                                  style={{
                                    padding: '3px 8px', fontFamily: MONO, fontSize: 9,
                                    background: 'transparent',
                                    border: `1px solid ${GREEN}60`, color: GREEN,
                                    borderRadius: 3, cursor: 'pointer', letterSpacing: '0.06em',
                                  }}
                                >
                                  CONFIRMAR
                                </button>
                              )}
                              {hasRole(user?.role, 'club_manager') && showConverter && (
                                <button
                                  onClick={() => patchStatus('convertido')}
                                  style={{
                                    padding: '3px 8px', fontFamily: MONO, fontSize: 9,
                                    background: 'transparent',
                                    border: `1px solid ${ACCENT}60`, color: ACCENT,
                                    borderRadius: 3, cursor: 'pointer', letterSpacing: '0.06em',
                                  }}
                                >
                                  CONVERTER
                                </button>
                              )}
                              {hasRole(user?.role, 'club_manager') && showPago && (
                                <button
                                  onClick={() => patchStatus('pago')}
                                  style={{
                                    padding: '3px 8px', fontFamily: MONO, fontSize: 9,
                                    background: 'transparent',
                                    border: `1px solid ${GOLD}60`, color: GOLD,
                                    borderRadius: 3, cursor: 'pointer', letterSpacing: '0.06em',
                                  }}
                                >
                                  MARCAR PAGO
                                </button>
                              )}
                              {hasRole(user?.role, 'club_manager') && (
                                <button
                                  onClick={() => patchStatus('cancelado')}
                                  style={{
                                    padding: '3px 8px', fontFamily: MONO, fontSize: 9,
                                    background: 'transparent',
                                    border: `1px solid ${TXT_3}60`, color: TXT_3,
                                    borderRadius: 3, cursor: 'pointer', letterSpacing: '0.06em',
                                  }}
                                >
                                  CANCELAR
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
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

              {/* ── CSV Position Import ────────────────────────────────────────── */}
              {hasRole(user?.role, 'club_manager') && (
                <div style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`,
                  borderRadius: 6, padding: 16,
                }}>
                  <div style={{
                    fontSize: 10, color: TXT_3, letterSpacing: '0.12em',
                    textTransform: 'uppercase', marginBottom: 12,
                  }}>
                    IMPORTAR POSIÇÕES (CSV)
                  </div>

                  <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2, marginBottom: 12, lineHeight: 1.6 }}>
                    Formato: <span style={{ color: TXT_1 }}>asset_id,peso_alvo</span> (uma linha por ativo, sem cabeçalho)
                    <br />
                    Exemplo: <span style={{ color: TXT_1 }}>petr4,0.25</span> — peso como fração (0.25 = 25%)
                    <br />
                    <span style={{ color: AMBER }}>⚠ Esta operação substitui todas as posições atuais.</span>
                  </div>

                  {!csvPreview && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label style={{
                        padding: '6px 14px', fontFamily: MONO, fontSize: 10,
                        background: 'transparent', border: `1px solid ${TXT_3}`,
                        color: TXT_2, borderRadius: 3, cursor: 'pointer',
                        letterSpacing: '0.08em',
                      }}>
                        ESCOLHER ARQUIVO
                        <input
                          type="file"
                          accept=".csv,.txt"
                          style={{ display: 'none' }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setCsvError(null);
                            setCsvPreview(null);
                            try {
                              const text = await file.text();
                              const lines = text.trim().split('\n').filter(l => l.trim());
                              const rows = [];
                              for (const line of lines) {
                                const parts = line.split(',').map(p => p.trim());
                                if (parts.length < 2) throw new Error(`Linha inválida: "${line}" — esperado formato asset_id,peso_alvo`);
                                const asset_id = parts[0];
                                const peso_alvo = parseFloat(parts[1]);
                                if (!asset_id) throw new Error(`asset_id vazio na linha: "${line}"`);
                                if (isNaN(peso_alvo) || peso_alvo <= 0 || peso_alvo > 1) throw new Error(`peso_alvo inválido em "${line}" — deve ser > 0 e <= 1`);
                                rows.push({ asset_id, peso_alvo });
                              }
                              if (rows.length === 0) throw new Error('Arquivo vazio ou sem posições válidas.');
                              const total = rows.reduce((s, r) => s + r.peso_alvo, 0);
                              if (Math.abs(total - 1.0) > 0.005) throw new Error(`Pesos somam ${(total * 100).toFixed(2)}% — devem somar 100% (tolerância ±0.5%)`);
                              setCsvPreview(rows);
                            } catch (err) {
                              setCsvError(err.message);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {csvError && (
                        <span style={{ fontFamily: MONO, fontSize: 10, color: RED }}>{csvError}</span>
                      )}
                    </div>
                  )}

                  {csvPreview && (
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2, marginBottom: 8 }}>
                        {csvPreview.length} posições detectadas — verifique antes de confirmar:
                      </div>
                      <div style={{
                        background: BG_CARD2, border: `1px solid ${BORDER2}`,
                        borderRadius: 4, maxHeight: 200, overflowY: 'auto', marginBottom: 12,
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8, padding: '6px 12px', borderBottom: `1px solid ${BORDER2}` }}>
                          {['ASSET ID', 'PESO'].map(h => (
                            <div key={h} style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</div>
                          ))}
                        </div>
                        {csvPreview.map((row, i) => (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8, padding: '5px 12px', borderBottom: `1px solid ${BORDER2}` }}>
                            <div style={{ fontFamily: MONO, fontSize: 11, color: ACCENT }}>{row.asset_id}</div>
                            <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_1 }}>{(row.peso_alvo * 100).toFixed(2)}%</div>
                          </div>
                        ))}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8, padding: '6px 12px' }}>
                          <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3 }}>TOTAL</div>
                          <div style={{ fontFamily: MONO, fontSize: 11, color: GREEN, fontWeight: 600 }}>
                            {(csvPreview.reduce((s, r) => s + r.peso_alvo, 0) * 100).toFixed(2)}%
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { setCsvPreview(null); setCsvError(null); }}
                          style={{
                            padding: '6px 16px', fontFamily: MONO, fontSize: 10,
                            background: 'transparent', border: `1px solid ${TXT_3}`,
                            color: TXT_3, borderRadius: 3, cursor: 'pointer', letterSpacing: '0.08em',
                          }}
                        >CANCELAR</button>
                        <button
                          disabled={csvImporting}
                          onClick={async () => {
                            setCsvImporting(true);
                            setCsvError(null);
                            try {
                              const token = await getToken();
                              const today = new Date().toISOString().split('T')[0];
                              const res = await fetch(`${API_BASE}/api/v1/clubes/${clube.id}/posicoes`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ posicoes: csvPreview, data_referencia: today }),
                              });
                              if (!res.ok) {
                                const err = await res.json().catch(() => ({}));
                                throw new Error(err.message ?? `Erro ${res.status}`);
                              }
                              const updatedPositions = await res.json();
                              setPosicoes(updatedPositions);
                              fetchPositionPrices(updatedPositions);
                              setCsvPreview(null);
                              setCsvError(null);
                              fetchSetupChecklist(clube.id);
                              _clubeCache[clubeIdParam] = null;
                              _clubeCacheTs[clubeIdParam] = 0;
                            } catch (err) {
                              setCsvError(err.message);
                            } finally {
                              setCsvImporting(false);
                            }
                          }}
                          style={{
                            padding: '6px 16px', fontFamily: MONO, fontSize: 10,
                            background: csvImporting ? TXT_3 : ACCENT,
                            border: 'none', color: '#fff', borderRadius: 3,
                            cursor: csvImporting ? 'not-allowed' : 'pointer',
                            letterSpacing: '0.08em',
                          }}
                        >{csvImporting ? 'IMPORTANDO...' : 'CONFIRMAR IMPORTAÇÃO'}</button>
                      </div>
                      {csvError && (
                        <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 10, color: RED }}>{csvError}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* TAB 3 — RISCO                                                   */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'risco' && isManager && (() => {
            const curDD     = (drawdown?.currentDrawdown ?? 0) * 100;
            const curDDColor = curDD < -1 ? RED : curDD < 0 ? AMBER : GREEN;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* ── Alertas ──────────────────────────────────────────────── */}
                {operacional && !operacionalLoading && (() => {
                  // Merge compliance alerts + overdue pendentes into one sorted list
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
                        fontFamily: MONO, fontSize: 12, color: GREEN,
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
                        fontSize: 10, color: TXT_3, letterSpacing: '0.12em',
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
                              <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_1, fontWeight: 600 }}>
                                {alert.titulo}
                              </div>
                              <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2, marginTop: 2 }}>
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
                                  color: RED, borderRadius: 3, cursor: 'pointer',
                                }}
                              >REGISTRAR</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

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

                {/* ── Open reenquadramento events ──────────────────────── */}
                <RenquadramentoSummary
                  clubeId={clube?.id}
                  getToken={getToken}
                  navigate={navigate}
                />
              </div>
            );
          })()}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* TAB — ESTATUTO                                                  */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'estatuto' && isManager && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {estatutoLoading && (
                <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: TXT_3, letterSpacing: '0.1em' }}>
                  CARREGANDO ESTATUTO...
                </div>
              )}

              {/* Active statute card */}
              {estatuto && !estatutoLoading && (
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                        VERSÃO ATIVA
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_2 }}>
                        Vigente desde {estatuto.valid_from?.split('-').reverse().join('/')}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowNewStatuteForm(v => !v)}
                      style={{
                        padding: '6px 14px', fontFamily: MONO, fontSize: 10,
                        background: 'transparent', border: `1px solid ${ACCENT}`,
                        color: ACCENT, borderRadius: 3, cursor: 'pointer', letterSpacing: '0.08em',
                      }}
                    >
                      {showNewStatuteForm ? '× FECHAR' : '+ NOVA VERSÃO'}
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      ['Prazo de Conversão',    `${estatuto.prazo_conversao_dias} dia(s)`],
                      ['Prazo de Pagamento',    `${estatuto.prazo_pagamento_dias} dia(s)`],
                      ['Carência',              `${estatuto.carencia_dias} dia(s)`],
                      ['Taxa de Administração', `${(estatuto.taxa_administracao * 100).toFixed(4)}% a.a.`],
                      ['Taxa de Performance',   estatuto.taxa_performance > 0 ? `${(estatuto.taxa_performance * 100).toFixed(4)}% sobre ${estatuto.benchmark_performance ?? '—'}` : 'Sem taxa'],
                      ['IRRF',                  `${(estatuto.irrf_rate * 100).toFixed(2)}%`],
                      ['Regime Tributário',     (estatuto.regime_tributario ?? '—').toUpperCase()],
                      ['Derivativos',           estatuto.permite_derivativos ? 'Permitidos (exchange-traded)' : 'Não permitidos'],
                    ].map(([label, value]) => (
                      <div key={label} style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '8px 0', borderBottom: `1px solid ${BORDER2}`,
                      }}>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: TXT_3 }}>{label}</span>
                        <span style={{ fontFamily: MONO, fontSize: 11, color: TXT_1 }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {estatuto.politica_investimento && (
                    <div style={{ marginTop: 16, padding: '12px 14px', background: BG_CARD2, borderRadius: 4 }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, marginBottom: 6 }}>POLÍTICA DE INVESTIMENTO</div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_2, lineHeight: 1.6 }}>
                        {estatuto.politica_investimento}
                      </div>
                    </div>
                  )}

                  {estatuto.versao_nota && (
                    <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 10, color: TXT_3 }}>
                      Nota: {estatuto.versao_nota}
                    </div>
                  )}
                </div>
              )}

              {/* No statute yet */}
              {!estatuto && !estatutoLoading && (
                <div style={{
                  padding: '32px 0', textAlign: 'center',
                  fontFamily: MONO, fontSize: 11, color: TXT_3, lineHeight: 1.8,
                }}>
                  Nenhum estatuto configurado.<br />
                  <button
                    onClick={() => setShowNewStatuteForm(true)}
                    style={{
                      marginTop: 12, padding: '8px 20px', fontFamily: MONO, fontSize: 10,
                      background: 'transparent', border: `1px solid ${ACCENT}`,
                      color: ACCENT, borderRadius: 3, cursor: 'pointer',
                    }}
                  >
                    + CRIAR ESTATUTO INICIAL
                  </button>
                </div>
              )}

              {/* New statute form */}
              {showNewStatuteForm && (
                <div style={{
                  background: BG_CARD2, border: `1px solid ${ACCENT}40`,
                  borderRadius: 6, padding: 20,
                }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: ACCENT, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
                    NOVA VERSÃO DO ESTATUTO
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {[
                      { key: 'valid_from',           label: 'Data de Vigência *', type: 'date'   },
                      { key: 'prazo_conversao_dias', label: 'Prazo Conversão (dias)', type: 'number' },
                      { key: 'prazo_pagamento_dias', label: 'Prazo Pagamento (dias)', type: 'number' },
                      { key: 'carencia_dias',        label: 'Carência (dias)',    type: 'number' },
                      { key: 'taxa_administracao',   label: 'Taxa Admin (% a.a.)', type: 'number' },
                      { key: 'taxa_performance',     label: 'Taxa Performance (%)', type: 'number' },
                      { key: 'irrf_rate',            label: 'IRRF (%)',           type: 'number' },
                    ].map(({ key, label, type }) => (
                      <div key={key}>
                        <label style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                          {label}
                        </label>
                        <input
                          type={type}
                          value={newStatuteValues[key] ?? ''}
                          onChange={e => setNewStatuteValues(prev => ({ ...prev, [key]: e.target.value }))}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            background: BG_CARD, border: `1px solid ${BORDER2}`,
                            borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 11,
                            padding: '7px 10px', outline: 'none',
                          }}
                        />
                      </div>
                    ))}

                    <div>
                      <label style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                        Benchmark Performance
                      </label>
                      <select
                        value={newStatuteValues.benchmark_performance ?? ''}
                        onChange={e => setNewStatuteValues(prev => ({ ...prev, benchmark_performance: e.target.value }))}
                        style={{
                          width: '100%', background: BG_CARD, border: `1px solid ${BORDER2}`,
                          borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 11,
                          padding: '7px 10px', outline: 'none',
                        }}
                      >
                        <option value="">Nenhum</option>
                        <option value="ibov">IBOV</option>
                        <option value="cdi">CDI</option>
                        <option value="ipca">IPCA</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                        Regime Tributário
                      </label>
                      <select
                        value={newStatuteValues.regime_tributario ?? 'fia'}
                        onChange={e => setNewStatuteValues(prev => ({ ...prev, regime_tributario: e.target.value }))}
                        style={{
                          width: '100%', background: BG_CARD, border: `1px solid ${BORDER2}`,
                          borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 11,
                          padding: '7px 10px', outline: 'none',
                        }}
                      >
                        <option value="fia">FIA</option>
                        <option value="geral">Geral</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <label style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      Permite Derivativos
                    </label>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {[['Não', false], ['Sim (exchange-traded only)', true]].map(([label, val]) => (
                        <label key={String(val)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: MONO, fontSize: 11, color: TXT_2 }}>
                          <input
                            type="radio"
                            name="permite_derivativos"
                            checked={newStatuteValues.permite_derivativos === val}
                            onChange={() => setNewStatuteValues(prev => ({ ...prev, permite_derivativos: val }))}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <label style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      Política de Investimento
                    </label>
                    <textarea
                      value={newStatuteValues.politica_investimento ?? ''}
                      onChange={e => setNewStatuteValues(prev => ({ ...prev, politica_investimento: e.target.value }))}
                      rows={3}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: BG_CARD, border: `1px solid ${BORDER2}`,
                        borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 11,
                        padding: '8px 10px', outline: 'none', resize: 'vertical',
                      }}
                    />
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <label style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      Nota da Versão
                    </label>
                    <input
                      type="text"
                      value={newStatuteValues.versao_nota ?? ''}
                      onChange={e => setNewStatuteValues(prev => ({ ...prev, versao_nota: e.target.value }))}
                      placeholder="ex: Redução de taxa, adição de carência de 30 dias"
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: BG_CARD, border: `1px solid ${BORDER2}`,
                        borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 11,
                        padding: '7px 10px', outline: 'none',
                      }}
                    />
                  </div>

                  {statuteError && (
                    <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 10, color: RED }}>{statuteError}</div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button
                      onClick={() => { setShowNewStatuteForm(false); setStatuteError(null); }}
                      style={{
                        padding: '7px 18px', fontFamily: MONO, fontSize: 10,
                        background: 'transparent', border: `1px solid ${TXT_3}`,
                        color: TXT_3, borderRadius: 3, cursor: 'pointer', letterSpacing: '0.08em',
                      }}
                    >CANCELAR</button>
                    <button
                      disabled={!newStatuteValues.valid_from || statuteSubmitting}
                      onClick={submitNewStatute}
                      style={{
                        padding: '7px 18px', fontFamily: MONO, fontSize: 10,
                        background: (!newStatuteValues.valid_from || statuteSubmitting) ? TXT_3 : ACCENT,
                        border: 'none', color: '#fff', borderRadius: 3,
                        cursor: (!newStatuteValues.valid_from || statuteSubmitting) ? 'not-allowed' : 'pointer',
                        letterSpacing: '0.08em',
                      }}
                    >{statuteSubmitting ? 'SALVANDO...' : 'SALVAR NOVA VERSÃO'}</button>
                  </div>
                </div>
              )}

              {/* Version history */}
              {estatutoHistory.length > 0 && (
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
                    HISTÓRICO DE VERSÕES ({estatutoHistory.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {estatutoHistory.map((ev, i) => (
                      <div key={ev.id} style={{
                        background: BG_CARD, border: `1px solid ${i === 0 ? ACCENT + '40' : BORDER2}`,
                        borderRadius: 4, padding: '10px 14px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <span style={{ fontFamily: MONO, fontSize: 11, color: i === 0 ? ACCENT : TXT_2 }}>
                            {ev.valid_from?.split('-').reverse().join('/')}
                            {ev.valid_until ? ` → ${ev.valid_until.split('-').reverse().join('/')}` : ' → atual'}
                          </span>
                          {ev.versao_nota && (
                            <span style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, marginLeft: 12 }}>
                              {ev.versao_nota}
                            </span>
                          )}
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3 }}>
                          {(ev.taxa_administracao * 100).toFixed(4)}% a.a.
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Audit log ──────────────────────────────────────────────── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: MONO, marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    LOG DE AUDITORIA
                  </div>
                  <input
                    type="text" placeholder="Filtrar por ação ou tabela..."
                    value={auditFilter} onChange={e => setAuditFilter(e.target.value)}
                    style={{ flex: 1, background: BG_CARD, border: `1px solid ${BORDER2}`, borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 10, padding: '4px 10px', outline: 'none' }}
                  />
                </div>

                {auditLoading && (
                  <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_3, padding: '8px 0' }}>CARREGANDO...</div>
                )}

                {!auditLoading && (() => {
                  const filtered = auditLog.filter(entry => {
                    if (!auditFilter) return true;
                    const q = auditFilter.toLowerCase();
                    return (entry.action ?? '').toLowerCase().includes(q) || (entry.table_name ?? '').toLowerCase().includes(q);
                  });

                  if (filtered.length === 0) {
                    return (
                      <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_3, padding: '8px 0' }}>
                        {auditLog.length === 0 ? 'Nenhum evento registrado.' : 'Nenhum resultado para o filtro.'}
                      </div>
                    );
                  }

                  return (
                    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 80px 120px 1fr', gap: 8, padding: '6px 14px', borderBottom: `1px solid ${BORDER2}`, fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {['DATA/HORA', 'AÇÃO', 'TABELA', 'DETALHE'].map(h => <div key={h}>{h}</div>)}
                      </div>
                      {filtered.slice(0, 20).map((entry, i) => {
                        const ac = { create: GREEN, update: ACCENT, delete: RED }[entry.action] ?? TXT_3;
                        return (
                          <div key={entry.id ?? i} style={{ display: 'grid', gridTemplateColumns: '120px 80px 120px 1fr', gap: 8, padding: '7px 14px', borderBottom: i < Math.min(filtered.length, 20) - 1 ? `1px solid ${BORDER2}` : 'none', fontFamily: MONO, fontSize: 10, alignItems: 'center' }}>
                            <div style={{ color: TXT_3, fontSize: 9 }}>{entry.created_at ? new Date(entry.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                            <div style={{ color: ac, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>{entry.action ?? '—'}</div>
                            <div style={{ color: TXT_2, fontSize: 9 }}>{entry.table_name ?? '—'}</div>
                            <div style={{ color: TXT_3, fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {entry.record_id ? `ID: ${entry.record_id}` : ''}
                            </div>
                          </div>
                        );
                      })}
                      {filtered.length > 20 && (
                        <div style={{ padding: '6px 14px', borderTop: `1px solid ${BORDER2}`, fontFamily: MONO, fontSize: 9, color: TXT_3, textAlign: 'center' }}>
                          Mostrando 20 de {filtered.length} eventos
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

            </div>
          )}

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
    </ClubeShell>
  );
}
