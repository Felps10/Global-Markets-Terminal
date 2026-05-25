import { useState, useEffect, useCallback, useMemo } from 'react';
import { hasRole } from '../../../lib/roles.js';
import { ASSETS as STATIC_ASSETS_MAP } from '../../../data/assets.js';
import {
  buildPortfolioSnapshot,
  calculateRVCompliance,
  formatCurrency,
  formatPct,
} from '../../../services/portfolioEngine.js';

import { CLUBE_COLORS, CLUBE_FONTS, CLUBE_RADIUS } from '../../styles/index.js';

const API = import.meta.env.VITE_API_URL || '';

const C = CLUBE_COLORS;
const MONO = CLUBE_FONTS.mono;

// ── Main Component ────────────────────────────────────────────────────────────
export default function GestorCarteiraTab({ clube, posicoes: initialPosicoes, getToken, user }) {

  // ── All hooks must be declared before any conditional return ─────────────────
  const [posicoes,     setPosicoes]     = useState(initialPosicoes ?? []);
  const [marketData,   setMarketData]   = useState({});
  const [loading,      setLoading]      = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);

  // CSV import state
  const [csvPreview,   setCsvPreview]   = useState(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvError,     setCsvError]     = useState(null);

  // ── Sync initialPosicoes prop to local state ─────────────────────────────────
  useEffect(() => {
    if (initialPosicoes) setPosicoes(initialPosicoes);
  }, [initialPosicoes]);

  // ── Price fetch (manual — only when button is clicked) ──────────────────────
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
          `${API}/proxy/yahoo/v7/finance/quote?symbols=${encodeURIComponent(symbolsStr)}`,
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
            `${API}/proxy/brapi/quote/${encodeURIComponent(symbol)}?token=${BRAPI_TOKEN}`,
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

  // ── Computed values ──────────────────────────────────────────────────────────
  const snapshot = useMemo(
    () => buildPortfolioSnapshot(posicoes, marketData),
    [posicoes, marketData]
  );

  const rvCompliance = useMemo(
    () => calculateRVCompliance(posicoes),
    [posicoes]
  );

  // ── Derived display values ───────────────────────────────────────────────────
  const rvPct    = ((rvCompliance?.percentualRV ?? 0) * 100).toFixed(1);
  const rvStatus = rvCompliance?.status ?? 'NO_POSITIONS';
  const compColor = rvStatus === 'OK' ? C.green : rvStatus === 'WARNING' ? C.amber : C.red;

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

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Compliance banner */}
      <div style={{
        padding: '14px 18px', borderRadius: CLUBE_RADIUS.md,
        background: compBannerBg,
        border: `1px solid ${compColor}`,
        fontFamily: MONO, fontSize: 12, color: compColor,
      }}>
        {compBannerText}
      </div>

      {/* Position table */}
      <div style={{
        background: C.bgCard, border: `1px solid ${C.borderSubtle}`, borderRadius: CLUBE_RADIUS.md, overflow: 'hidden',
      }}>
        {/* Header bar with title + refresh button */}
        <div style={{
          padding: '14px 16px', borderBottom: `1px solid ${C.borderSubtle}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 10, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            POSIÇÕES ATUAIS
          </span>
          <button
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              await fetchPositionPrices(posicoes);
              setRefreshing(false);
            }}
            style={{
              padding: '5px 12px', fontFamily: MONO, fontSize: 10,
              background: 'transparent',
              border: `1px solid ${refreshing ? C.textDim : C.accent}`,
              color: refreshing ? C.textDim : C.accent,
              borderRadius: CLUBE_RADIUS.xs,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              letterSpacing: '0.08em',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { if (!refreshing) e.currentTarget.style.borderColor = C.textPrimary; }}
            onMouseLeave={e => { if (!refreshing) e.currentTarget.style.borderColor = C.accent; }}
          >
            {refreshing ? 'ATUALIZANDO...' : 'ATUALIZAR PREÇOS'}
          </button>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '80px 1fr 100px 80px 70px 90px 90px',
          gap: 8, padding: '8px 16px',
          borderBottom: `1px solid ${C.borderSubtle}`,
        }}>
          {['ATIVO', 'NOME', 'GRUPO', 'BOLSA', 'PESO', 'PREÇO', 'CONTRIB.'].map(h => (
            <div key={h} style={{
              fontSize: 10, color: C.textDim, letterSpacing: '0.08em',
              textTransform: 'uppercase', fontFamily: MONO,
            }}>{h}</div>
          ))}
        </div>

        {/* Data rows */}
        {snapshot.map((item, i) => {
          const assetMeta = STATIC_ASSETS_MAP.find(a => a.id === item.asset_id);
          const exchange  = assetMeta?.exchange
            ?? posicoes.find(p => p.asset_id === item.asset_id)?.asset?.exchange;
          const isIndex   = item.group_id === 'indices';
          const isB3Local = !isIndex && exchange === 'B3';

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
            ? C.textDim
            : item.contribution > 0
            ? C.green
            : item.contribution < 0
            ? C.red
            : C.textDim;

          return (
            <div
              key={item.asset_id}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 100px 80px 70px 90px 90px',
                gap: 8, padding: '10px 16px',
                background: i % 2 === 0 ? C.bgCard : C.bgCardElevated,
                borderBottom: `1px solid ${C.borderSubtle}`,
                fontFamily: MONO, fontSize: 12,
              }}
            >
              <div style={{ color: C.textPrimary, fontWeight: 600 }}>{item.symbol}</div>
              <div style={{ color: C.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </div>
              <div style={{ color: C.textMain }}>{item.group_id}</div>
              <div style={{ color: C.textMain }}>{exchange ?? '—'}</div>
              <div style={{ color: C.textMain }}>
                {formatPct(item.peso_alvo * 100, { showSign: false })}
              </div>
              <div style={{ color: item.hasPrice ? C.textPrimary : C.textDim }}>{priceDisplay}</div>
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
          borderTop: `1px solid ${C.borderFaint}`,
          fontFamily: MONO, fontSize: 11, color: C.textMain,
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

      {/* ── CSV Position Import ──────────────────────────────────────────────── */}
      {hasRole(user?.role, 'club_manager') && (
        <div style={{
          background: C.bgCard, border: `1px solid ${C.borderSubtle}`,
          borderRadius: CLUBE_RADIUS.md, padding: 16,
        }}>
          <div style={{
            fontSize: 10, color: C.textDim, letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>
            IMPORTAR POSIÇÕES (CSV)
          </div>

          <div style={{ fontFamily: MONO, fontSize: 10, color: C.textMain, marginBottom: 12, lineHeight: 1.6 }}>
            Formato: <span style={{ color: C.textPrimary }}>asset_id,peso_alvo</span> (uma linha por ativo, sem cabeçalho)
            <br />
            Exemplo: <span style={{ color: C.textPrimary }}>petr4,0.25</span> — peso como fração (0.25 = 25%)
            <br />
            <span style={{ color: C.amber }}>⚠ Esta operação substitui todas as posições atuais.</span>
          </div>

          {!csvPreview && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{
                padding: '6px 14px', fontFamily: MONO, fontSize: 10,
                background: 'transparent', border: `1px solid ${C.textDim}`,
                color: C.textMain, borderRadius: CLUBE_RADIUS.xs, cursor: 'pointer',
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
                        const asset_id  = parts[0];
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
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.red }}>{csvError}</span>
              )}
            </div>
          )}

          {csvPreview && (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: C.textMain, marginBottom: 8 }}>
                {csvPreview.length} posições detectadas — verifique antes de confirmar:
              </div>
              <div style={{
                background: C.bgCardElevated, border: `1px solid ${C.borderFaint}`,
                borderRadius: CLUBE_RADIUS.sm, maxHeight: 200, overflowY: 'auto', marginBottom: 12,
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8, padding: '6px 12px', borderBottom: `1px solid ${C.borderFaint}` }}>
                  {['ASSET ID', 'PESO'].map(h => (
                    <div key={h} style={{ fontFamily: MONO, fontSize: 9, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</div>
                  ))}
                </div>
                {csvPreview.map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8, padding: '5px 12px', borderBottom: `1px solid ${C.borderFaint}` }}>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.accent }}>{row.asset_id}</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.textPrimary }}>{(row.peso_alvo * 100).toFixed(2)}%</div>
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8, padding: '6px 12px' }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: C.textDim }}>TOTAL</div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: C.green, fontWeight: 600 }}>
                    {(csvPreview.reduce((s, r) => s + r.peso_alvo, 0) * 100).toFixed(2)}%
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setCsvPreview(null); setCsvError(null); }}
                  style={{
                    padding: '6px 16px', fontFamily: MONO, fontSize: 10,
                    background: 'transparent', border: `1px solid ${C.textDim}`,
                    color: C.textDim, borderRadius: CLUBE_RADIUS.xs, cursor: 'pointer', letterSpacing: '0.08em',
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
                      const res = await fetch(`${API}/api/v1/clubes/${clube?.id}/posicoes`, {
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
                    } catch (err) {
                      setCsvError(err.message);
                    } finally {
                      setCsvImporting(false);
                    }
                  }}
                  style={{
                    padding: '6px 16px', fontFamily: MONO, fontSize: 10,
                    background: csvImporting ? C.textDim : C.accent,
                    border: 'none', color: '#fff', borderRadius: CLUBE_RADIUS.xs,
                    cursor: csvImporting ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.08em',
                  }}
                >{csvImporting ? 'IMPORTANDO...' : 'CONFIRMAR IMPORTAÇÃO'}</button>
              </div>
              {csvError && (
                <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 10, color: C.red }}>{csvError}</div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
