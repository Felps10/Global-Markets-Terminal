import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { hasRole } from '../lib/roles.js';
import { ASSETS as STATIC_ASSETS_MAP } from '../data/assets.js';
import {
  simulateRebalance,
  simulateMovimentacao,
  simulatePreTrade,
} from '../services/simulatorEngine.js';
import ClubeShell from '../components/clube/ClubeShell.jsx';

const API_BASE = import.meta.env.VITE_API_URL || '';

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
const MONO     = "'JetBrains Mono', monospace";

const INPUT = {
  width: '100%', boxSizing: 'border-box',
  background: BG_CARD2, border: `1px solid ${BORDER2}`,
  borderRadius: 3, color: TXT_1,
  fontFamily: MONO, fontSize: 12,
  padding: '8px 10px', outline: 'none',
};
const LABEL = {
  display: 'block', color: TXT_3, fontSize: 10,
  letterSpacing: '0.08em', textTransform: 'uppercase',
  fontFamily: MONO, marginBottom: 4,
};

function formatBRL(val) {
  if (val == null) return '—';
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDateBR(iso) {
  if (!iso) return '—';
  return iso.split('-').reverse().join('/');
}

const MODES = [
  { id: 'rebalance',    label: 'REBALANCEAR' },
  { id: 'movimentacao', label: 'SIMULAR MOVIMENTAÇÃO' },
  { id: 'pretrade',     label: 'PRÉ-TRADE COMPLIANCE' },
  { id: 'tributacao',   label: 'TRIBUTAÇÃO' },
];

const TRIB_STAGES = [
  { id: 'simular',   label: 'SIMULAR' },
  { id: 'executar',  label: 'EXECUTAR' },
  { id: 'historico', label: 'HISTÓRICO' },
];

const LAYOUT_ICONS = {
  stack: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="2" y1="3" x2="12" y2="3"/><line x1="2" y1="7" x2="12" y2="7"/><line x1="2" y1="11" x2="12" y2="11"/>
    </svg>
  ),
  split: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="2" width="5" height="10" rx="1"/><rect x="8" y="2" width="5" height="10" rx="1"/>
    </svg>
  ),
  focus: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="2" width="8" height="10" rx="1"/>
    </svg>
  ),
};

function defaultDataRef() {
  const now = new Date();
  const year = now.getFullYear();
  const may = new Date(year, 4, 31);
  const nov = new Date(year, 10, 30);
  const next = now <= may ? may : now <= nov ? nov : new Date(year + 1, 4, 31);
  return next.toISOString().split('T')[0];
}

export default function ClubeSimuladorPage() {
  const navigate           = useNavigate();
  const { id: clubeIdParam } = useParams();
  const { getToken, user } = useAuth();

  // Data
  const [clube,      setClube]      = useState(null);
  const [posicoes,   setPosicoes]   = useState([]);
  const [cotistas,   setCotistas]   = useState([]);
  const [navLatest,  setNavLatest]  = useState(null);
  const [estatuto,   setEstatuto]   = useState(null);
  const [marketData, setMarketData] = useState({});

  // UI
  const [loading,    setLoading]    = useState(true);
  const [activeMode, setActiveMode] = useState('rebalance');

  // Mode A — Rebalance
  const [proposedWeights, setProposedWeights] = useState({});
  const [rebalanceResult, setRebalanceResult] = useState(null);
  const [savingPosition,  setSavingPosition]  = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [saveError,       setSaveError]       = useState(null);

  // Mode B — Movimentação
  const [simCotistaId, setSimCotistaId] = useState('');
  const [simTipo,      setSimTipo]      = useState('aporte');
  const [simValor,     setSimValor]     = useState('');
  const [movResult,    setMovResult]    = useState(null);

  // Mode D — Pre-trade
  const [tradeAssetId,   setTradeAssetId]   = useState('');
  const [tradeDirection, setTradeDirection]  = useState('buy');
  const [tradeValor,     setTradeValor]     = useState('');
  const [tradeResult,    setTradeResult]    = useState(null);

  // Mode E — Tributação
  const [tribStage,       setTribStage]       = useState('simular');
  const [tribLayout,      setTribLayout]      = useState(() => localStorage.getItem('clube-tributacao-layout') || 'split');
  const [dataRef,         setDataRef]         = useState(defaultDataRef);
  const [tribSimLoading,  setTribSimLoading]  = useState(false);
  const [tribSimResult,   setTribSimResult]   = useState(null);
  const [tribSimError,    setTribSimError]    = useState(null);
  const [tribExecuting,   setTribExecuting]   = useState(false);
  const [tribExecResult,  setTribExecResult]  = useState(null);
  const [tribExecError,   setTribExecError]   = useState(null);
  const [tribConfirmPhrase, setTribConfirmPhrase] = useState('');
  const [historico,          setHistorico]          = useState([]);
  const [historicoLoading,   setHistoricoLoading]   = useState(false);
  const [historicoError,     setHistoricoError]     = useState(null);
  const historicoFetched = useRef(false);

  const totalCotas = useMemo(
    () => cotistas.reduce((s, c) => s + parseFloat(c.cotas_detidas ?? 0), 0),
    [cotistas],
  );

  const patrimonio = useMemo(() => {
    if (navLatest?.patrimonio_total) return navLatest.patrimonio_total;
    if (navLatest?.valor_cota && totalCotas > 0) return navLatest.valor_cota * totalCotas;
    return 0;
  }, [navLatest, totalCotas]);

  const shellPatrimonio = useMemo(() => {
    if (!navLatest?.valor_cota) return null;
    const tc = cotistas.reduce((s, c) => s + parseFloat(c.cotas_detidas ?? 0), 0);
    return navLatest.patrimonio_total ?? (tc * navLatest.valor_cota);
  }, [cotistas, navLatest]);

  // ── Price fetch (same pattern as ClubePage) ─────────────────────────────
  const fetchPositionPrices = useCallback(async (positions) => {
    if (!positions || positions.length === 0) return;
    const BRAPI_TOKEN = import.meta.env.VITE_BRAPI_TOKEN || '';
    const b3Syms = [], yahooSyms = [];
    for (const pos of positions) {
      const symbol = pos.asset?.symbol;
      if (!symbol) continue;
      const assetMeta = STATIC_ASSETS_MAP.find(a => a.id === pos.asset_id) ?? pos.asset;
      const isB3 = assetMeta?.meta?.isB3 === true || assetMeta?.exchange === 'B3';
      if (isB3) b3Syms.push(symbol); else yahooSyms.push(symbol);
    }
    const results = {};
    if (yahooSyms.length > 0) {
      try {
        const res = await fetch(`${API_BASE}/proxy/yahoo/v7/finance/quote?symbols=${encodeURIComponent(yahooSyms.join(','))}`, { signal: AbortSignal.timeout(12000) });
        if (res.ok) {
          const json = await res.json();
          for (const q of (json?.quoteResponse?.result ?? [])) {
            if (q?.symbol) results[q.symbol.toUpperCase()] = { price: q.regularMarketPrice, changePct: q.regularMarketChangePercent };
          }
        }
      } catch (_) {}
    }
    if (b3Syms.length > 0 && BRAPI_TOKEN) {
      for (const symbol of b3Syms) {
        try {
          const res = await fetch(`${API_BASE}/proxy/brapi/quote/${encodeURIComponent(symbol)}?token=${BRAPI_TOKEN}`, { signal: AbortSignal.timeout(12000) });
          if (res.ok) {
            const json = await res.json();
            const q = json?.results?.[0];
            if (q?.symbol) results[q.symbol.toUpperCase()] = { price: q.regularMarketPrice, changePct: q.regularMarketChangePercent };
          }
        } catch (_) {}
      }
    }
    setMarketData(results);
  }, []);

  // ── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };

        const clubeRes = await fetch(`${API_BASE}/api/v1/clubes/${clubeIdParam}`, { headers });
        if (!clubeRes.ok) { setLoading(false); return; }
        const c = await clubeRes.json();
        if (cancelled) return;
        setClube(c);

        const [posRes, cotRes, navRes, estRes] = await Promise.allSettled([
          fetch(`${API_BASE}/api/v1/clubes/${c.id}/posicoes`, { headers }),
          fetch(`${API_BASE}/api/v1/clubes/${c.id}/cotistas`, { headers }),
          fetch(`${API_BASE}/api/v1/clubes/${c.id}/nav/latest`, { headers }),
          fetch(`${API_BASE}/api/v1/clubes/${c.id}/estatuto/active`, { headers }),
        ]);

        if (cancelled) return;

        let posicoesData = [];
        if (posRes.status === 'fulfilled' && posRes.value.ok) {
          posicoesData = await posRes.value.json();
          setPosicoes(posicoesData);
          const init = {};
          posicoesData.forEach(p => { init[p.asset_id] = (p.peso_alvo * 100).toFixed(2); });
          setProposedWeights(init);
          fetchPositionPrices(posicoesData);
        }

        if (cotRes.status === 'fulfilled' && cotRes.value.ok) {
          const raw = await cotRes.value.json();
          setCotistas(raw.cotistas ?? raw);
        }
        if (navRes.status === 'fulfilled' && navRes.value.ok) {
          setNavLatest(await navRes.value.json());
        }
        if (estRes.status === 'fulfilled' && estRes.value.ok) {
          setEstatuto(await estRes.value.json());
        }
      } catch (_) {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [getToken, fetchPositionPrices]);

  // ── Mode A handlers ─────────────────────────────────────────────────────
  const weightSum = useMemo(() => {
    return Object.values(proposedWeights).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  }, [proposedWeights]);

  const weightValid = Math.abs(weightSum - 100) < 0.5;

  const handleSimulateRebalance = () => {
    const weights = {};
    for (const [aid, pct] of Object.entries(proposedWeights)) {
      weights[aid] = (parseFloat(pct) || 0) / 100;
    }
    setRebalanceResult(simulateRebalance(posicoes, weights, patrimonio, estatuto));
  };

  const handleSavePositions = async () => {
    setSavingPosition(true);
    setSaveError(null);
    try {
      const token = await getToken();
      const payload = {
        posicoes: Object.entries(proposedWeights).map(([asset_id, pct]) => ({
          asset_id,
          peso_alvo: parseFloat(pct) / 100,
        })),
        data_referencia: new Date().toISOString().split('T')[0],
      };
      const res = await fetch(`${API_BASE}/api/v1/clubes/${clube.id}/posicoes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Erro (${res.status})`);
      }
      const newPos = await res.json();
      setPosicoes(newPos);
      setShowSaveConfirm(false);
      setRebalanceResult(null);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSavingPosition(false);
    }
  };

  // ── Mode B handler ──────────────────────────────────────────────────────
  const handleSimulateMovimentacao = () => {
    const est = estatuto ?? { prazo_conversao_dias: 1, prazo_pagamento_dias: 5, carencia_dias: 0 };
    setMovResult(simulateMovimentacao(
      simTipo, parseFloat(simValor), navLatest.valor_cota,
      cotistas, Number(simCotistaId), est,
      new Date().toISOString().split('T')[0],
    ));
  };

  // ── Mode D handler ──────────────────────────────────────────────────────
  const handleVerifyTrade = () => {
    const selectedPos = posicoes.find(p => String(p.asset_id) === String(tradeAssetId));
    setTradeResult(simulatePreTrade(
      {
        asset_id: tradeAssetId,
        symbol: selectedPos?.asset?.symbol,
        direction: tradeDirection,
        valor_brl: parseFloat(tradeValor),
        group_id: selectedPos?.asset?.group_id,
      },
      posicoes, patrimonio, estatuto,
    ));
  };

  // ── Mode E — Tributação ──────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('clube-tributacao-layout', tribLayout);
  }, [tribLayout]);

  const handleTribSimular = useCallback(async () => {
    if (!clube?.id) return;
    setTribSimLoading(true); setTribSimError(null); setTribSimResult(null); setTribExecResult(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/clubes/${clube.id}/tributacao/simular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data_referencia: dataRef }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Erro ${res.status}`);
      }
      const data = await res.json();
      setTribSimResult(data);
      setTribStage('executar');
    } catch (e) {
      setTribSimError(e.message);
    } finally {
      setTribSimLoading(false);
    }
  }, [clube?.id, getToken, dataRef]);

  const fetchHistorico = useCallback(async () => {
    if (!clube?.id) return;
    setHistoricoLoading(true); setHistoricoError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/clubes/${clube.id}/tributacao/historico`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setHistorico(await res.json());
    } catch (e) {
      setHistoricoError(e.message);
    } finally {
      setHistoricoLoading(false);
    }
  }, [clube?.id, getToken]);

  const handleTribExecutar = useCallback(async () => {
    if (!clube?.id) return;
    setTribExecuting(true); setTribExecError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/clubes/${clube.id}/tributacao/executar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data_referencia: dataRef }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Erro ${res.status}`);
      }
      const result = await res.json();
      setTribExecResult(result);
      setTribConfirmPhrase('');
      setTribSimResult(null);
      historicoFetched.current = false;
      setTribStage('historico');
    } catch (e) {
      setTribExecError(e.message);
    } finally {
      setTribExecuting(false);
    }
  }, [clube?.id, getToken, dataRef]);

  useEffect(() => {
    if (activeMode === 'tributacao' && tribStage === 'historico' && !historicoFetched.current) {
      historicoFetched.current = true;
      fetchHistorico();
    }
  }, [activeMode, tribStage, fetchHistorico]);

  const tribRegime = estatuto?.regime_tributario ?? 'fia';
  const tribCanConfirm = tribConfirmPhrase === 'CONFIRMAR TRIBUTAÇÃO';

  // ── Loading / empty ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: BG_PAGE, fontFamily: MONO, gap: 12 }}>
        <div style={{ fontSize: 11, color: ACCENT, letterSpacing: '0.2em' }}>SIMULADOR</div>
        <div style={{ fontSize: 12, color: TXT_2 }}>Carregando dados...</div>
      </div>
    );
  }

  if (!clube) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG_PAGE, fontFamily: MONO }}>
        <div style={{ fontSize: 12, color: TXT_2 }}>Nenhum clube encontrado.</div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <ClubeShell
      clubeId={clubeIdParam}
      activePage="simulador"
      clubeNome={clube?.nome}
      clubeStatus={clube?.status}
      patrimonio={shellPatrimonio}
      valorCota={navLatest?.valor_cota ?? null}
      cotasEmitidas={null}
      pendingCount={0}
      headerLeft={
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: TXT_2 }}>
          <span style={{ color: ACCENT }}>SIMULADOR</span>
          <span style={{ color: TXT_3 }}> · {activeMode === 'rebalance' ? 'Rebalancear' : activeMode === 'movimentacao' ? 'Movimentação' : activeMode === 'tributacao' ? 'Tributação' : 'Pré-Trade'}</span>
        </span>
      }
      headerRight={null}
    >
      {/* Mode tabs */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'flex-end',
        background: BG_HEAD, borderBottom: `1px solid ${BORDER2}`, padding: '0 20px',
      }}>
        {MODES.map(({ id, label }) => (
          <button key={id} onClick={() => setActiveMode(id)} style={{
            display: 'inline-block', padding: '10px 20px', fontSize: 10, letterSpacing: '0.1em',
            borderBottom: `2px solid ${activeMode === id ? ACCENT : 'transparent'}`,
            borderTop: 'none', borderLeft: 'none', borderRight: 'none',
            background: 'transparent', cursor: 'pointer',
            color: activeMode === id ? TXT_1 : TXT_3,
            fontFamily: MONO, transition: 'color 0.15s',
          }}
            onMouseEnter={e => { if (activeMode !== id) e.currentTarget.style.color = TXT_2; }}
            onMouseLeave={e => { if (activeMode !== id) e.currentTarget.style.color = TXT_3; }}
          >{label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          {/* ════════════ MODE A — REBALANCEAR ════════════ */}
          {activeMode === 'rebalance' && (
            <div style={{ display: 'grid', gridTemplateColumns: '40% 1fr', gap: 24 }}>
              {/* Left — weight editor */}
              <div>
                <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
                  ALOCAÇÃO PROPOSTA
                </div>

                {posicoes.map(p => {
                  const isEquity = p.asset?.group_id === 'equities' || p.asset?.group_id === 'br-mercado';
                  return (
                    <div key={p.asset_id} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                      borderBottom: `1px solid ${BORDER2}`,
                    }}>
                      <span style={{ fontSize: 10, fontFamily: MONO, color: ACCENT, fontWeight: 600, width: 70, flexShrink: 0 }}>
                        {p.asset?.symbol ?? '???'}
                      </span>
                      <span style={{ fontSize: 10, color: TXT_2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.asset?.name ?? ''}
                      </span>
                      <span style={{
                        fontSize: 8, padding: '1px 5px', borderRadius: 2,
                        background: isEquity ? `${GREEN}15` : `${TXT_3}15`,
                        color: isEquity ? GREEN : TXT_3, flexShrink: 0,
                      }}>
                        {isEquity ? 'RV' : 'OUTRO'}
                      </span>
                      <input
                        type="number" step="0.01" min="0" max="100"
                        value={proposedWeights[p.asset_id] ?? ''}
                        onChange={e => setProposedWeights(prev => ({ ...prev, [p.asset_id]: e.target.value }))}
                        style={{ ...INPUT, width: 72, textAlign: 'right', padding: '4px 6px', fontSize: 11 }}
                      />
                      <span style={{ fontSize: 10, color: TXT_3, flexShrink: 0 }}>%</span>
                    </div>
                  );
                })}

                {/* Weight sum bar */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: TXT_3 }}>Total</span>
                    <span style={{
                      fontSize: 11, fontFamily: MONO,
                      color: weightValid ? GREEN : Math.abs(weightSum - 100) < 1.5 ? AMBER : RED,
                    }}>
                      {weightSum.toFixed(2)}% {weightValid ? '✓' : '(deve ser 100%)'}
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: BORDER2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${Math.min(weightSum, 100)}%`,
                      background: weightValid ? GREEN : Math.abs(weightSum - 100) < 1.5 ? AMBER : RED,
                      transition: 'width 0.2s',
                    }} />
                  </div>
                </div>

                <button
                  onClick={handleSimulateRebalance}
                  disabled={!weightValid}
                  style={{
                    marginTop: 16, padding: '8px 20px', fontFamily: MONO, fontSize: 10,
                    letterSpacing: '0.1em', borderRadius: 3, cursor: weightValid ? 'pointer' : 'not-allowed',
                    background: weightValid ? ACCENT : TXT_3, border: 'none', color: '#fff',
                  }}
                >SIMULAR</button>
              </div>

              {/* Right — results */}
              <div>
                {!rebalanceResult ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 11, color: TXT_3 }}>
                    Configure os pesos e clique em SIMULAR.
                  </div>
                ) : (
                  <>
                    {/* CVM banner */}
                    {(() => {
                      const c = { ok: GREEN, warning: AMBER, breach: RED }[rebalanceResult.cvmStatus];
                      const icon = { ok: '✓', warning: '⚠', breach: '✗' }[rebalanceResult.cvmStatus];
                      return (
                        <div style={{
                          padding: '12px 16px', borderRadius: 6, marginBottom: 16,
                          background: `${c}10`, border: `1px solid ${c}40`,
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                          <span style={{ fontSize: 16, color: c }}>{icon}</span>
                          <span style={{ fontSize: 11, color: c, fontFamily: MONO }}>
                            RV: {(rebalanceResult.newRVPct * 100).toFixed(1)}% (mínimo 67%)
                          </span>
                          <span style={{ flex: 1 }} />
                          <span style={{ fontSize: 10, color: TXT_2 }}>{rebalanceResult.cvmMessage}</span>
                        </div>
                      );
                    })()}

                    {/* Trades table */}
                    {(() => {
                      const activeTrades = rebalanceResult.trades.filter(t => t.direction !== 'hold');
                      if (activeTrades.length === 0) {
                        return <div style={{ padding: '20px 0', fontSize: 11, color: TXT_3, textAlign: 'center' }}>Nenhuma operação necessária — carteira já está na alocação proposta.</div>;
                      }
                      return (
                        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
                          <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '10px 16px', borderBottom: `1px solid ${BORDER}` }}>
                            OPERAÇÕES NECESSÁRIAS
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '80px 70px 110px 80px 80px', gap: 8, padding: '6px 16px', borderBottom: `1px solid ${BORDER}` }}>
                            {['ATIVO', 'DIREÇÃO', 'BRL', 'ANTES', 'DEPOIS'].map(h => (
                              <div key={h} style={{ fontSize: 9, color: TXT_3, letterSpacing: '0.06em' }}>{h}</div>
                            ))}
                          </div>
                          {activeTrades.map(t => (
                            <div key={t.asset_id} style={{ display: 'grid', gridTemplateColumns: '80px 70px 110px 80px 80px', gap: 8, padding: '8px 16px', borderBottom: `1px solid ${BORDER2}` }}>
                              <div style={{ fontSize: 11, color: TXT_1, fontWeight: 600 }}>{t.symbol}</div>
                              <div style={{ fontSize: 10, color: t.direction === 'buy' ? GREEN : RED, textTransform: 'uppercase' }}>
                                {t.direction === 'buy' ? 'COMPRAR' : 'VENDER'}
                              </div>
                              <div style={{ fontSize: 11, color: TXT_1 }}>{formatBRL(Math.abs(t.brlDelta))}</div>
                              <div style={{ fontSize: 10, color: TXT_2 }}>{(t.weightBefore * 100).toFixed(2)}%</div>
                              <div style={{ fontSize: 10, color: TXT_1 }}>{(t.weightAfter * 100).toFixed(2)}%</div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Cost summary */}
                    <div style={{
                      display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: TXT_2,
                      padding: '10px 0', borderTop: `1px solid ${BORDER2}`, marginBottom: 16,
                    }}>
                      <span>Compras: {formatBRL(rebalanceResult.totalBuys)}</span>
                      <span>Vendas: {formatBRL(rebalanceResult.totalSells)}</span>
                      <span>Custo estimado: {formatBRL(rebalanceResult.estimatedCost)}</span>
                      <span>Impacto no caixa: {formatBRL(rebalanceResult.cashImpact)}</span>
                    </div>

                    {/* Save button */}
                    {hasRole(user?.role, 'club_manager') && rebalanceResult.cvmStatus !== 'breach' && (
                      <button
                        onClick={() => { setShowSaveConfirm(true); setSaveError(null); }}
                        style={{
                          padding: '8px 20px', fontFamily: MONO, fontSize: 10,
                          letterSpacing: '0.1em', borderRadius: 3, cursor: 'pointer',
                          background: 'transparent', border: `1px solid ${ACCENT}`, color: ACCENT,
                        }}
                      >SALVAR COMO POSIÇÃO</button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ════════════ MODE B — SIMULAR MOVIMENTAÇÃO ════════════ */}
          {activeMode === 'movimentacao' && (
            <div style={{ display: 'grid', gridTemplateColumns: '40% 1fr', gap: 24 }}>
              {/* Left — form */}
              <div>
                <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
                  PARÂMETROS DA SIMULAÇÃO
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={LABEL}>COTISTA</label>
                  <select value={simCotistaId} onChange={e => { setSimCotistaId(e.target.value); setMovResult(null); }} style={INPUT}>
                    <option value="">Selecione um cotista</option>
                    {cotistas.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nome} ({totalCotas > 0 ? ((parseFloat(c.cotas_detidas) / totalCotas) * 100).toFixed(1) : 0}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={LABEL}>TIPO</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['aporte', 'resgate'].map(t => (
                      <button key={t} onClick={() => { setSimTipo(t); setMovResult(null); }} style={{
                        padding: '6px 16px', fontFamily: MONO, fontSize: 10, borderRadius: 3, cursor: 'pointer',
                        background: simTipo === t ? `${ACCENT}20` : BG_CARD2,
                        border: `1px solid ${simTipo === t ? ACCENT : BORDER2}`,
                        color: simTipo === t ? TXT_1 : TXT_3,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>{t}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={LABEL}>VALOR (R$)</label>
                  <input type="number" step="0.01" min="0.01" value={simValor}
                    onChange={e => { setSimValor(e.target.value); setMovResult(null); }}
                    placeholder="0.00" style={INPUT}
                  />
                </div>

                <button
                  onClick={handleSimulateMovimentacao}
                  disabled={!simCotistaId || !(parseFloat(simValor) > 0) || !navLatest}
                  style={{
                    padding: '8px 20px', fontFamily: MONO, fontSize: 10,
                    letterSpacing: '0.1em', borderRadius: 3,
                    cursor: simCotistaId && parseFloat(simValor) > 0 && navLatest ? 'pointer' : 'not-allowed',
                    background: simCotistaId && parseFloat(simValor) > 0 && navLatest ? ACCENT : TXT_3,
                    border: 'none', color: '#fff',
                  }}
                >SIMULAR</button>

                <button
                  onClick={() => navigate('/clube')}
                  style={{
                    marginTop: 10, display: 'block', padding: '8px 20px',
                    fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', borderRadius: 3,
                    cursor: 'pointer', background: 'transparent',
                    border: `1px solid ${TXT_3}`, color: TXT_3,
                  }}
                >IR PARA OPERACIONAL</button>
              </div>

              {/* Right — results */}
              <div>
                {!movResult ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 11, color: TXT_3 }}>
                    Configure os parâmetros e clique em SIMULAR.
                  </div>
                ) : (
                  <>
                    {/* Allowed / blocked banner */}
                    {movResult.allowed ? (
                      <div style={{
                        padding: '12px 16px', borderRadius: 6, marginBottom: 16,
                        background: `${GREEN}10`, border: `1px solid ${GREEN}40`,
                        fontFamily: MONO, fontSize: 12, color: GREEN,
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <span>✓</span>
                        <span>Operação permitida — sem violações CVM</span>
                      </div>
                    ) : (
                      <div style={{
                        padding: '12px 16px', borderRadius: 6, marginBottom: 16,
                        background: `${RED}10`, border: `1px solid ${RED}40`,
                        fontFamily: MONO, fontSize: 12, color: RED,
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <span>✗</span>
                        <span>Operação bloqueada</span>
                      </div>
                    )}

                    {/* Violations */}
                    {movResult.violations?.length > 0 && (
                      <div style={{
                        padding: '10px 14px', borderRadius: 4, marginBottom: 12,
                        background: `${RED}08`, border: `1px solid ${RED}30`,
                        fontFamily: MONO, fontSize: 10, color: RED,
                      }}>
                        {movResult.violations.map((v, i) => <div key={i}>⚠ {v}</div>)}
                      </div>
                    )}

                    {/* Warnings */}
                    {movResult.warnings?.length > 0 && (
                      <div style={{
                        padding: '10px 14px', borderRadius: 4, marginBottom: 12,
                        background: `${AMBER}08`, border: `1px solid ${AMBER}30`,
                        fontFamily: MONO, fontSize: 10, color: AMBER,
                      }}>
                        {movResult.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
                      </div>
                    )}

                    {/* Cotas line */}
                    <div style={{ fontSize: 11, color: TXT_2, marginBottom: 16 }}>
                      Esta operação {simTipo === 'aporte' ? 'emitiria' : 'resgataria'}{' '}
                      <span style={{ color: TXT_1 }}>{Math.abs(movResult.cotasDelta).toFixed(6)}</span> cotas ao preço de{' '}
                      <span style={{ color: TXT_1 }}>R$ {navLatest?.valor_cota?.toFixed(6)}</span>/cota
                    </div>

                    {/* Equity table */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
                        IMPACTO NAS PARTICIPAÇÕES
                      </div>
                      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 70px', gap: 8, padding: '6px 16px', borderBottom: `1px solid ${BORDER}` }}>
                          {['COTISTA', 'ANTES', 'DEPOIS', 'VARIAÇÃO'].map(h => (
                            <div key={h} style={{ fontSize: 9, color: TXT_3, letterSpacing: '0.06em' }}>{h}</div>
                          ))}
                        </div>
                        {cotistas.map(c => {
                          const cotasNow = parseFloat(c.cotas_detidas ?? 0);
                          const isTarget = Number(c.id) === Number(simCotistaId);
                          const delta = isTarget
                            ? (simTipo === 'aporte' ? Math.abs(movResult.cotasDelta) : -Math.abs(movResult.cotasDelta))
                            : 0;
                          const cotasAfter = cotasNow + delta;
                          const totalAfter = totalCotas + (simTipo === 'aporte' ? Math.abs(movResult.cotasDelta) : -Math.abs(movResult.cotasDelta));
                          const pctBefore = totalCotas > 0 ? (cotasNow / totalCotas * 100) : 0;
                          const pctAfter = totalAfter > 0 ? (cotasAfter / totalAfter * 100) : 0;
                          const variation = pctAfter - pctBefore;

                          return (
                            <div key={c.id} style={{
                              display: 'grid', gridTemplateColumns: '1fr 70px 70px 70px',
                              gap: 8, padding: '8px 16px', borderBottom: `1px solid ${BORDER2}`,
                              borderLeft: isTarget ? `2px solid ${ACCENT}` : '2px solid transparent',
                            }}>
                              <div style={{ fontSize: 11, color: isTarget ? TXT_1 : TXT_2 }}>{c.nome}</div>
                              <div style={{ fontSize: 10, color: TXT_2 }}>{pctBefore.toFixed(2)}%</div>
                              <div style={{ fontSize: 10, color: isTarget ? TXT_1 : TXT_2 }}>{pctAfter.toFixed(2)}%</div>
                              <div style={{ fontSize: 10, color: variation > 0.01 ? GREEN : variation < -0.01 ? RED : TXT_3 }}>
                                {variation > 0 ? '+' : ''}{variation.toFixed(2)}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* CVM timing */}
                    <div style={{ fontSize: 10, color: TXT_3, marginBottom: 8 }}>
                      Prazo de conversão: {formatDateBR(movResult.dataConversaoMin)}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ════════════ MODE D — PRÉ-TRADE COMPLIANCE ════════════ */}
          {activeMode === 'pretrade' && (
            <div style={{ display: 'grid', gridTemplateColumns: '40% 1fr', gap: 24 }}>
              {/* Left — form */}
              <div>
                <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
                  PARÂMETROS DA OPERAÇÃO
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={LABEL}>ATIVO</label>
                  <select value={tradeAssetId} onChange={e => { setTradeAssetId(e.target.value); setTradeResult(null); }} style={INPUT}>
                    <option value="">Selecione um ativo</option>
                    {posicoes.map(p => (
                      <option key={p.asset_id} value={p.asset_id}>
                        {p.asset?.symbol} — {p.asset?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={LABEL}>DIREÇÃO</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['buy', 'COMPRA'], ['sell', 'VENDA']].map(([val, label]) => (
                      <button key={val} onClick={() => { setTradeDirection(val); setTradeResult(null); }} style={{
                        padding: '6px 16px', fontFamily: MONO, fontSize: 10, borderRadius: 3, cursor: 'pointer',
                        background: tradeDirection === val ? `${ACCENT}20` : BG_CARD2,
                        border: `1px solid ${tradeDirection === val ? ACCENT : BORDER2}`,
                        color: tradeDirection === val ? TXT_1 : TXT_3,
                        letterSpacing: '0.06em',
                      }}>{label}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={LABEL}>VALOR (R$)</label>
                  <input type="number" step="0.01" min="0.01" value={tradeValor}
                    onChange={e => { setTradeValor(e.target.value); setTradeResult(null); }}
                    placeholder="0.00" style={INPUT}
                  />
                </div>

                <button
                  onClick={handleVerifyTrade}
                  disabled={!tradeAssetId || !(parseFloat(tradeValor) > 0) || !navLatest}
                  style={{
                    padding: '8px 20px', fontFamily: MONO, fontSize: 10,
                    letterSpacing: '0.1em', borderRadius: 3,
                    cursor: tradeAssetId && parseFloat(tradeValor) > 0 && navLatest ? 'pointer' : 'not-allowed',
                    background: tradeAssetId && parseFloat(tradeValor) > 0 && navLatest ? ACCENT : TXT_3,
                    border: 'none', color: '#fff',
                  }}
                >VERIFICAR</button>
              </div>

              {/* Right — results */}
              <div>
                {!tradeResult ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 11, color: TXT_3 }}>
                    Selecione um ativo e clique em VERIFICAR.
                  </div>
                ) : (
                  <>
                    {/* Large status badge */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                      <span style={{
                        fontSize: 24, fontFamily: MONO, fontWeight: 700,
                        padding: '16px 32px', borderRadius: 8,
                        background: `${tradeResult.statusColor}15`,
                        border: `2px solid ${tradeResult.statusColor}`,
                        color: tradeResult.statusColor,
                        letterSpacing: '0.15em',
                      }}>
                        {tradeResult.statusLabel}
                      </span>
                    </div>

                    {/* RV bars */}
                    <div style={{ marginBottom: 24 }}>
                      {[
                        { label: 'RV ATUAL', pct: tradeResult.rvPctBefore },
                        { label: 'RV PROJETADO', pct: tradeResult.rvPctAfter },
                      ].map(({ label, pct }) => {
                        const barColor = pct >= 0.67 ? GREEN : pct >= 0.60 ? AMBER : RED;
                        const widthPct = Math.min(Math.max(pct * 100, 0), 100);
                        return (
                          <div key={label} style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.08em' }}>{label}</span>
                              <span style={{ fontSize: 11, color: barColor, fontFamily: MONO }}>{(pct * 100).toFixed(1)}%</span>
                            </div>
                            <div style={{ position: 'relative', height: 10, borderRadius: 3, background: BORDER2 }}>
                              <div style={{
                                height: '100%', borderRadius: 3,
                                width: `${widthPct}%`,
                                background: barColor, transition: 'width 0.3s',
                              }} />
                              {/* 67% threshold marker */}
                              <div style={{
                                position: 'absolute', top: -2, left: '67%',
                                width: 2, height: 14, background: TXT_1, borderRadius: 1,
                              }} />
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ fontSize: 9, color: TXT_3, textAlign: 'right', marginTop: 2 }}>
                        Linha: mínimo 67% CVM
                      </div>
                    </div>

                    {/* Message */}
                    <div style={{ fontSize: 13, color: TXT_1, lineHeight: 1.6, marginBottom: 20 }}>
                      {tradeResult.message}
                    </div>

                    {/* Remediation box (breach only) */}
                    {tradeResult.status === 'breach' && tradeResult.maxSellBrl != null && tradeResult.maxSellBrl > 0 && (
                      <div style={{
                        padding: '12px 16px', borderRadius: 4, marginBottom: 16,
                        background: `${RED}08`, border: `1px solid ${RED}30`,
                        fontFamily: MONO, fontSize: 11, color: RED,
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>CORREÇÃO NECESSÁRIA</div>
                        <div>Para manter conformidade, reduza esta operação para no máximo {formatBRL(tradeResult.maxSellBrl)}.</div>
                      </div>
                    )}

                    {/* Cost estimate */}
                    <div style={{ fontSize: 10, color: TXT_3 }}>
                      Custo estimado (corretagem): {formatBRL(tradeResult.estimatedCost)}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ════════════ MODE E — TRIBUTAÇÃO ════════════ */}
          {activeMode === 'tributacao' && (() => {
            // ── Shared section builders ──────────────────────────────────
            const regimeBanner = (
              <div style={{
                padding: '8px 12px', borderRadius: 4,
                background: tribRegime === 'fia' ? 'rgba(0,230,118,0.06)' : 'rgba(251,191,36,0.06)',
                border: `1px solid ${tribRegime === 'fia' ? 'rgba(0,230,118,0.25)' : 'rgba(251,191,36,0.25)'}`,
                fontFamily: MONO, fontSize: 10,
                color: tribRegime === 'fia' ? GREEN : AMBER,
              }}>
                {tribRegime === 'fia' ? 'Regime FIA — Alíquota flat 15%' : 'Regime Geral — Alíquota regressiva 15–22.5%'}
              </div>
            );

            const dateControl = (
              <div>
                <div style={{ ...LABEL }}>DATA DE REFERÊNCIA</div>
                <input type="date" value={dataRef} onChange={e => setDataRef(e.target.value)} style={{ ...INPUT }} />
                <div style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, marginTop: 4 }}>
                  IRRF periódico: último dia útil de maio e novembro
                </div>
              </div>
            );

            const simularBtn = (
              <button
                onClick={handleTribSimular}
                disabled={tribSimLoading}
                style={{
                  width: '100%', padding: '10px 0', fontFamily: MONO, fontSize: 11,
                  letterSpacing: '0.1em', borderRadius: 3,
                  background: tribSimLoading ? TXT_3 : ACCENT, border: 'none', color: '#fff',
                  cursor: tribSimLoading ? 'not-allowed' : 'pointer',
                }}
              >{tribSimLoading ? 'CALCULANDO...' : 'SIMULAR'}</button>
            );

            const perCotistaTable = tribSimResult && (
              <div>
                <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
                  IMPACTO POR COTISTA
                </div>
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 80px 60px 80px 80px', gap: 6, padding: '8px 14px', borderBottom: `1px solid ${BORDER}` }}>
                    {['COTISTA', 'COTAS', 'CUSTO', 'GANHO', 'ALÍQ.', 'IRRF', 'APÓS'].map(h => (
                      <div key={h} style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.06em' }}>{h}</div>
                    ))}
                  </div>
                  {tribSimResult.perMember.map(m => (
                    <div key={m.cotista_id} style={{
                      display: 'grid', gridTemplateColumns: '1fr 80px 90px 80px 60px 80px 80px',
                      gap: 6, padding: '8px 14px', borderBottom: `1px solid ${BORDER2}`,
                      opacity: m.hasGain ? 1 : 0.5,
                    }}>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_1 }}>{m.cotista_nome}</div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2 }}>{m.cotas_detidas.toFixed(2)}</div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2 }}>{formatBRL(m.costBasis)}</div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: m.hasGain ? GREEN : TXT_3 }}>{m.hasGain ? formatBRL(m.gain) : 'Sem ganho'}</div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2 }}>{(m.irrfRate * 100).toFixed(1)}%</div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: m.hasGain ? RED : TXT_3 }}>{m.hasGain ? formatBRL(m.taxBrl) : '—'}</div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2 }}>{m.newCotas.toFixed(2)}</div>
                    </div>
                  ))}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 80px 60px 80px 80px', gap: 6, padding: '10px 14px', borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3 }}>TOTAL</div>
                    <div /><div /><div /><div />
                    <div style={{ fontFamily: MONO, fontSize: 10, color: RED, fontWeight: 600 }}>{formatBRL(tribSimResult.totalTaxBrl)}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: RED }}>{tribSimResult.totalCotasACancelar.toFixed(6)}</div>
                  </div>
                </div>
              </div>
            );

            // ── SIMULAR stage content ────────────────────────────────────
            const simularContent = () => {
              const controls = (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {regimeBanner}
                  {dateControl}
                  {simularBtn}
                  {tribSimLoading && (
                    <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: TXT_3, letterSpacing: '0.1em' }}>
                      CALCULANDO TRIBUTAÇÃO...
                    </div>
                  )}
                  {tribSimError && (
                    <div style={{ padding: '12px 16px', borderRadius: 4, background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.3)', fontFamily: MONO, fontSize: 11, color: RED }}>
                      {tribSimError}
                    </div>
                  )}
                </div>
              );
              const detail = tribSimResult ? perCotistaTable : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
                  <div style={{ fontSize: 32, color: TXT_3 }}>⊘</div>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: TXT_3, textAlign: 'center', lineHeight: 1.8 }}>
                    Configure a data de referência e clique em SIMULAR<br />
                    para calcular o impacto tributário antes de executar.
                  </div>
                </div>
              );

              if (tribLayout === 'split') {
                return (
                  <div style={{ display: 'flex', gap: 0, flex: 1, overflow: 'hidden' }}>
                    <div style={{ width: 360, flexShrink: 0, borderRight: `1px solid ${BORDER}`, overflowY: 'auto', padding: 20 }}>{controls}</div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>{detail}</div>
                  </div>
                );
              }
              if (tribLayout === 'focus') {
                return <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>{controls}{detail}</div>;
              }
              return <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>{controls}{detail}</div>;
            };

            // ── EXECUTAR stage content ───────────────────────────────────
            const executarContent = () => {
              const summaryCard = tribSimResult && (
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '14px 18px', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.1em' }}>
                    TRIBUTAÇÃO SIMULADA — {formatDateBR(tribSimResult.dataReferencia)}
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 8px', borderRadius: 3, background: tribRegime === 'fia' ? 'rgba(0,230,118,0.1)' : 'rgba(251,191,36,0.1)', color: tribRegime === 'fia' ? GREEN : AMBER, border: `1px solid ${tribRegime === 'fia' ? GREEN + '40' : AMBER + '40'}` }}>
                    {tribSimResult.regime.toUpperCase()}
                  </span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontFamily: MONO, fontSize: 11, color: RED }}>Total IRRF: {formatBRL(tribSimResult.totalTaxBrl)}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: TXT_2 }}>Cotas a cancelar: {tribSimResult.totalCotasACancelar.toFixed(6)}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: TXT_3 }}>{tribSimResult.membersWithGain} de {tribSimResult.totalMembers} cotistas</span>
                </div>
              );

              const warning = (
                <div style={{
                  padding: 16, borderRadius: 4,
                  background: 'rgba(255,82,82,0.06)',
                  border: '1px solid rgba(255,82,82,0.25)',
                }}>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: RED, fontWeight: 600, marginBottom: 8 }}>⚠ OPERAÇÃO IRREVERSÍVEL</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2, lineHeight: 1.6 }}>
                    A execução debitará IRRF de cada cotista, cancelará cotas e gerará os DARFs correspondentes. Esta operação não pode ser desfeita após confirmação. Verifique os valores acima antes de prosseguir.
                  </div>
                </div>
              );

              const confirmBlock = hasRole(user?.role, 'club_manager') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: TXT_2 }}>
                    Para confirmar, digite: <span style={{ color: TXT_1, fontWeight: 600 }}>CONFIRMAR TRIBUTAÇÃO</span>
                  </div>
                  <input
                    value={tribConfirmPhrase}
                    onChange={e => setTribConfirmPhrase(e.target.value)}
                    placeholder="CONFIRMAR TRIBUTAÇÃO"
                    style={{ ...INPUT, border: `1px solid ${tribCanConfirm ? GREEN + '60' : BORDER2}` }}
                  />
                  {tribExecError && (
                    <div style={{ padding: '8px 12px', borderRadius: 4, background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.3)', fontSize: 10, color: RED }}>
                      {tribExecError}
                    </div>
                  )}
                  <button
                    onClick={handleTribExecutar}
                    disabled={!tribCanConfirm || tribExecuting}
                    style={{
                      padding: '10px 24px', fontFamily: MONO, fontSize: 11,
                      letterSpacing: '0.1em', borderRadius: 3,
                      background: tribCanConfirm && !tribExecuting ? RED : TXT_3,
                      border: 'none', color: '#fff',
                      cursor: tribCanConfirm && !tribExecuting ? 'pointer' : 'not-allowed',
                    }}
                  >{tribExecuting ? 'EXECUTANDO...' : 'EXECUTAR TRIBUTAÇÃO'}</button>
                </div>
              );

              const successBlock = tribExecResult && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
                  <div style={{ fontSize: 48, color: GREEN }}>✓</div>
                  <div style={{ fontFamily: MONO, fontSize: 16, color: TXT_1, fontWeight: 600 }}>Tributação Executada</div>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: TXT_2 }}>
                    {formatBRL(tribExecResult.totalTaxBrl)} debitados · {tribExecResult.darfsGerados} DARFs gerados
                  </div>
                </div>
              );

              const body = (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {successBlock || (<>{summaryCard}{warning}{confirmBlock}</>)}
                </div>
              );

              if (tribLayout === 'split') {
                return (
                  <div style={{ display: 'flex', gap: 0, flex: 1, overflow: 'hidden' }}>
                    <div style={{ width: 360, flexShrink: 0, borderRight: `1px solid ${BORDER}`, overflowY: 'auto', padding: 20 }}>
                      {regimeBanner}
                      <div style={{ marginTop: 16 }}>{dateControl}</div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>{body}</div>
                  </div>
                );
              }
              if (tribLayout === 'focus') {
                return <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>{body}</div>;
              }
              return <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>{body}</div>;
            };

            // ── HISTÓRICO stage content ──────────────────────────────────
            const historicoContent = () => {
              const body = (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                    HISTÓRICO DE TRIBUTAÇÕES
                  </div>
                  {historicoLoading && (
                    <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: TXT_3, letterSpacing: '0.1em' }}>
                      CARREGANDO HISTÓRICO...
                    </div>
                  )}
                  {historicoError && (
                    <div style={{ padding: '12px 16px', borderRadius: 4, background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.3)', fontFamily: MONO, fontSize: 11, color: RED }}>
                      {historicoError}
                    </div>
                  )}
                  {!historicoLoading && !historicoError && historico.length === 0 && (
                    <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_3, padding: '24px 0', textAlign: 'center' }}>
                      Nenhum evento de tributação registrado.
                    </div>
                  )}
                  {!historicoLoading && historico.length > 0 && (
                    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '100px 100px 100px 1fr', gap: 8, padding: '8px 14px', borderBottom: `1px solid ${BORDER}` }}>
                        {['DATA', 'IRRF TOTAL', 'COTISTAS', 'EXECUTADO EM'].map(h => (
                          <div key={h} style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.06em' }}>{h}</div>
                        ))}
                      </div>
                      {historico.map((h, i) => {
                        const state = h.after_state ?? {};
                        // TODO: expand to show per-cotista breakdown if available in response
                        return (
                          <div key={h.id ?? i} style={{
                            display: 'grid', gridTemplateColumns: '100px 100px 100px 1fr',
                            gap: 8, padding: '8px 14px', borderBottom: `1px solid ${BORDER2}`,
                          }}>
                            <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_1 }}>{formatDateBR(state.dataRef ?? h.created_at?.split('T')[0])}</div>
                            <div style={{ fontFamily: MONO, fontSize: 10, color: RED }}>{formatBRL(state.totalTaxBrl)}</div>
                            <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2 }}>{state.membersAffected ?? '—'}</div>
                            <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3 }}>{h.created_at ? formatDateBR(h.created_at.split('T')[0]) : '—'}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );

              if (tribLayout === 'focus') {
                return <div style={{ maxWidth: 720, margin: '0 auto' }}>{body}</div>;
              }
              return body;
            };

            // ── Stage toggle + layout toggle + content ───────────────────
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
                {/* Top bar: stage toggle + layout toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  {/* Stage toggle */}
                  <div style={{ display: 'inline-flex', border: `1px solid ${BORDER2}`, borderRadius: 4, overflow: 'hidden' }}>
                    {TRIB_STAGES.map(({ id, label }) => {
                      const isActive = tribStage === id;
                      const isDisabled = id === 'executar' && !tribSimResult;
                      return (
                        <button
                          key={id}
                          onClick={() => { if (!isDisabled) setTribStage(id); }}
                          disabled={isDisabled}
                          style={{
                            padding: '6px 16px', fontFamily: MONO, fontSize: 10,
                            letterSpacing: '0.08em', border: 'none',
                            background: isActive ? ACCENT : 'transparent',
                            color: isActive ? '#fff' : isDisabled ? TXT_3 + '60' : TXT_2,
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            borderRight: `1px solid ${BORDER2}`,
                            opacity: isDisabled ? 0.4 : 1,
                          }}
                        >{label}</button>
                      );
                    })}
                  </div>

                  {/* Layout toggle */}
                  <div style={{ display: 'inline-flex', gap: 2 }}>
                    {['stack', 'split', 'focus'].map(layoutId => (
                      <button
                        key={layoutId}
                        onClick={() => setTribLayout(layoutId)}
                        title={layoutId}
                        style={{
                          width: 28, height: 28,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: tribLayout === layoutId ? 'rgba(59,130,246,0.15)' : 'transparent',
                          border: `1px solid ${tribLayout === layoutId ? ACCENT : BORDER2}`,
                          borderRadius: 3, cursor: 'pointer',
                          color: tribLayout === layoutId ? ACCENT : TXT_3,
                        }}
                      >{LAYOUT_ICONS[layoutId]}</button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                {tribStage === 'simular' && simularContent()}
                {tribStage === 'executar' && executarContent()}
                {tribStage === 'historico' && historicoContent()}
              </div>
            );
          })()}

        </div>
      </div>

      {/* Save confirmation modal */}
      {showSaveConfirm && (
        <div onClick={() => setShowSaveConfirm(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: BG_CARD, border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: 32, width: 420, maxWidth: '90vw', fontFamily: MONO,
          }}>
            <div style={{ fontSize: 10, color: ACCENT, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
              CONFIRMAR ALTERAÇÃO DE POSIÇÕES
            </div>
            <div style={{ fontSize: 11, color: TXT_2, lineHeight: 1.7, marginBottom: 20 }}>
              Isso substituirá os pesos atuais da carteira pelos pesos propostos.
              Esta ação atualiza o ledger de posições — não pode ser desfeita.
            </div>

            {saveError && (
              <div style={{
                padding: '8px 12px', borderRadius: 4, marginBottom: 12,
                background: `${RED}08`, border: `1px solid ${RED}30`,
                fontSize: 10, color: RED,
              }}>
                {saveError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowSaveConfirm(false)} style={{
                padding: '8px 16px', fontFamily: MONO, fontSize: 10,
                background: 'transparent', border: `1px solid ${TXT_3}`,
                color: TXT_3, borderRadius: 3, cursor: 'pointer', letterSpacing: '0.06em',
              }}>← CANCELAR</button>
              <button onClick={handleSavePositions} disabled={savingPosition} style={{
                padding: '8px 16px', fontFamily: MONO, fontSize: 10,
                background: savingPosition ? TXT_3 : ACCENT, border: 'none',
                color: '#fff', borderRadius: 3,
                cursor: savingPosition ? 'not-allowed' : 'pointer', letterSpacing: '0.06em',
              }}>{savingPosition ? 'SALVANDO...' : 'CONFIRMAR'}</button>
            </div>
          </div>
        </div>
      )}
    </ClubeShell>
  );
}
