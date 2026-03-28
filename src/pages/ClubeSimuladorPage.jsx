import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { ASSETS as STATIC_ASSETS_MAP } from '../data/assets.js';
import {
  simulateRebalance,
  simulateMovimentacao,
  simulatePreTrade,
  computePeriodicTaxPreview,
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
const ACCENT   = '#3b82f6';
const GREEN    = '#00E676';
const RED      = '#FF5252';
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
  { id: 'tributacao',   label: 'TRIBUTAÇÃO PERIÓDICA' },
];

// ── TributacaoPreviewPanel (module-level) ────────────────────────────────────
function TributacaoPreviewPanel({ cotistas, navLatest, estatuto, navigate }) {
  const preview = useMemo(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      return computePeriodicTaxPreview(cotistas, [], navLatest.valor_cota, estatuto, today);
    } catch { return null; }
  }, [cotistas, navLatest, estatuto]);

  if (!preview) return null;

  return (
    <div style={{
      maxWidth: 580, width: '100%',
      background: BG_CARD, border: `1px solid ${BORDER}`,
      borderRadius: 6, padding: 24,
    }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
        ESTIMATIVA TRIBUTÁRIA
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          ['IRRF ESTIMADO', `R$ ${preview.totalTaxBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
          ['COTISTAS COM GANHO', `${preview.membersWithGain} de ${preview.totalMembers}`],
          ['REGIME', preview.regime.toUpperCase()],
          ['ALÍQUOTA', `${(preview.irrfRate * 100).toFixed(2)}%`],
        ].map(([label, value]) => (
          <div key={label} style={{ background: BG_CARD2, borderRadius: 4, padding: '10px 12px' }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: TXT_1 }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, padding: '10px 12px', background: BG_CARD2, borderRadius: 4, marginBottom: 16, lineHeight: 1.6 }}>
        ⚠ Estimativa sem base de custo FIFO. Para cálculo preciso com histórico de aquisição, use a página de Tributação.
      </div>
      <button
        onClick={() => navigate('/clube/tributacao')}
        style={{
          width: '100%', padding: '10px 0', fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em',
          background: 'rgba(255,82,82,0.10)', border: '1px solid rgba(255,82,82,0.4)',
          color: RED, borderRadius: 4, cursor: 'pointer',
        }}
      >IR PARA TRIBUTAÇÃO → EXECUTAR</button>
    </div>
  );
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
          <span style={{ color: TXT_3 }}> · {activeMode === 'rebalance' ? 'Rebalancear' : activeMode === 'movimentacao' ? 'Movimentação' : 'Pré-Trade'}</span>
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
                    {user?.role === 'admin' && rebalanceResult.cvmStatus !== 'breach' && (
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

          {/* ════════════ MODE F — TRIBUTAÇÃO PERIÓDICA ════════════ */}
          {activeMode === 'tributacao' && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 16, padding: 40,
            }}>
              {navLatest && cotistas.length > 0 && estatuto ? (
                <TributacaoPreviewPanel
                  cotistas={cotistas}
                  navLatest={navLatest}
                  estatuto={estatuto}
                  navigate={navigate}
                />
              ) : (
                <div style={{ fontFamily: MONO, fontSize: 12, color: TXT_3, textAlign: 'center', lineHeight: 1.8 }}>
                  Carregando dados para simulação tributária...
                </div>
              )}
            </div>
          )}

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
