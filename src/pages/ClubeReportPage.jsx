import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import {
  calculateNAVFromHistory,
  calculateDrawdown,
  calculateVolatility,
  calculateRVCompliance,
  formatCurrency,
  formatPct,
} from '../services/portfolioEngine.js';

// ── Colors (same as ClubePage.jsx) ────────────────────────────────────────────
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

const PT_MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

// ── Print styles ───────────────────────────────────────────────────────────────
const PRINT_STYLE_ID = 'clube-report-print-styles';

function injectPrintStyles() {
  if (typeof document === 'undefined' || document.getElementById(PRINT_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = PRINT_STYLE_ID;
  el.textContent = `
    @media print {
      body { background: #fff !important; color: #000 !important; }
      #report-header-bar { display: none !important; }
      #report-content {
        max-width: 100% !important;
        padding: 20px !important;
        background: #fff !important;
        color: #000 !important;
      }
      #report-content * { color: #000 !important; border-color: #ccc !important; }
      #report-content .no-print { display: none !important; }
    }
  `;
  document.head.appendChild(el);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
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

// ── Simplified NAV chart (2 series, print-friendly) ───────────────────────────
function ReportNavChart({ navSeries, ibovSeries }) {
  if (!navSeries || navSeries.length < 2) {
    return (
      <div style={{
        height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontFamily: MONO, fontSize: 12, color: TXT_3, textAlign: 'center', lineHeight: 1.8 }}>
          Registre entradas de NAV diárias para visualizar a evolução.
        </div>
      </div>
    );
  }

  const W = 800, H = 180;
  const PAD = { t: 12, r: 20, b: 24, l: 20 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const N  = navSeries.length;

  const allVals = [
    ...navSeries.map(p => p.nav),
    ...(ibovSeries ?? []).map(p => p.nav),
  ];
  const minV  = Math.min(...allVals);
  const maxV  = Math.max(...allVals);
  const range = maxV - minV || 1;

  const toX = (i) => PAD.l + (i / Math.max(N - 1, 1)) * cW;
  const toY = (v) => PAD.t + cH - ((v - minV) / range) * cH;

  const pts = (series) =>
    series.map((p, i) => `${toX(i).toFixed(1)},${toY(p.nav).toFixed(1)}`).join(' ');

  const firstDate = navSeries[0]?.date     ? fmtDate(navSeries[0].date)     : '';
  const lastDate  = navSeries[N - 1]?.date ? fmtDate(navSeries[N - 1].date) : '';

  return (
    <div>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        {/* Grid lines at 25%, 50%, 75% */}
        {[0.25, 0.5, 0.75].map((pct, i) => {
          const y = PAD.t + pct * cH;
          return (
            <line key={i}
              x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
              stroke="rgba(255,255,255,0.05)" strokeWidth={1}
            />
          );
        })}
        {/* IBOV */}
        {ibovSeries && ibovSeries.length >= 2 && (
          <polyline points={pts(ibovSeries)} fill="none" stroke={AMBER} strokeWidth={1.5} />
        )}
        {/* Portfolio */}
        <polyline points={pts(navSeries)} fill="none" stroke={ACCENT} strokeWidth={1.5} />
      </svg>

      {/* Date labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '4px 20px 0', fontFamily: MONO, fontSize: 9, color: TXT_3,
      }}>
        <span>{firstDate}</span>
        <span>{lastDate}</span>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, padding: '6px 20px 0' }}>
        {[['Portfolio', ACCENT], ['IBOV', AMBER]].map(([label, color]) => (
          <span key={label} style={{
            fontFamily: MONO, fontSize: 10, color: TXT_2,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClubeReportPage() {
  const navigate         = useNavigate();
  const { getToken }     = useAuth();

  const [clube,      setClube]      = useState(null);
  const [navHistory, setNavHistory] = useState([]);
  const [posicoes,   setPosicoes]   = useState([]);
  const [cotistas,   setCotistas]   = useState(null);
  const [period,     setPeriod]     = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [commentary, setCommentary] = useState('');
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiError,    setAiError]    = useState(null);

  useEffect(() => { injectPrintStyles(); }, []);

  // ── Data fetch ───────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Sessão expirada. Faça login novamente.');
        const headers = { Authorization: `Bearer ${token}` };

        const clubesRes = await fetch('/api/v1/clubes', { headers });
        if (!clubesRes.ok) throw new Error('Erro ao carregar clube.');
        const clubesData = await clubesRes.json();
        const c = Array.isArray(clubesData) ? clubesData[0] : null;
        if (!c) { setClube(null); setLoading(false); return; }
        setClube(c);

        const [posicoesRes, cotistasRes, navRes] = await Promise.all([
          fetch(`/api/v1/clubes/${c.id}/posicoes`, { headers }),
          fetch(`/api/v1/clubes/${c.id}/cotistas`, { headers }),
          fetch(`/api/v1/clubes/${c.id}/nav`,      { headers }),
        ]);

        const posicoesData = posicoesRes.ok ? await posicoesRes.json() : [];
        const cotistasRaw  = cotistasRes.ok ? await cotistasRes.json() : null;
        const navData      = navRes.ok      ? await navRes.json()      : [];

        setPosicoes(Array.isArray(posicoesData) ? posicoesData : []);
        setCotistas(cotistasRaw
          ? { data: cotistasRaw.cotistas ?? [], summary: cotistasRaw.summary ?? {} }
          : null);
        setNavHistory(Array.isArray(navData) ? navData : []);
      } catch (err) {
        setError(err.message ?? 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [getToken]);

  // ── Period filtering ─────────────────────────────────────────────────────────
  const periodNavHistory = useMemo(() => {
    if (!navHistory.length) return [];
    return navHistory.filter(e => e.data.startsWith(period));
  }, [navHistory, period]);

  const periodStartNAV = useMemo(() => {
    const [year, month] = period.split('-').map(Number);
    const periodStart   = `${year}-${String(month).padStart(2, '0')}-01`;
    const before        = navHistory.filter(e => e.data < periodStart);
    return before.length ? before[before.length - 1] : null;
  }, [navHistory, period]);

  const periodAnalytics = useMemo(() => {
    if (!periodNavHistory.length) return null;
    const baseClube = {
      ...clube,
      valor_cota_inicial: periodStartNAV?.valor_cota
        ?? clube?.valor_cota_inicial
        ?? 1000,
    };
    return calculateNAVFromHistory(periodNavHistory, baseClube);
  }, [periodNavHistory, periodStartNAV, clube]);

  const periodDrawdown = useMemo(() =>
    periodAnalytics ? calculateDrawdown(periodAnalytics.navSeries) : null,
    [periodAnalytics]);

  const periodVolatility = useMemo(() =>
    calculateVolatility(periodNavHistory, null), [periodNavHistory]);

  const rvCompliance = useMemo(() =>
    calculateRVCompliance(posicoes), [posicoes]);

  // ── Period selector options (unique YYYY-MM) ─────────────────────────────────
  const periodOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    for (const e of navHistory) {
      const ym = e.data.slice(0, 7);
      if (!seen.has(ym)) {
        seen.add(ym);
        const [yr, mo] = ym.split('-').map(Number);
        opts.push({ value: ym, label: `${PT_MONTHS[mo - 1]} ${yr}` });
      }
    }
    return opts;
  }, [navHistory]);

  // ── Display helpers ──────────────────────────────────────────────────────────
  const periodLabel = useMemo(() => {
    const [yr, mo] = period.split('-').map(Number);
    return `${PT_MONTHS[mo - 1].toUpperCase()} ${yr}`;
  }, [period]);

  const todayFormatted = useMemo(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }, []);

  // ── AI commentary generation ─────────────────────────────────────────────────
  const generateCommentary = useCallback(async () => {
    if (!clube) return;

    const [yr, mo]       = period.split('-').map(Number);
    const periodoFormatado = `${PT_MONTHS[mo - 1]} ${yr}`;

    const ctx = {
      clube: {
        nome:             clube.nome,
        periodo:          period,
        periodoFormatado,
      },
      desempenho: {
        retornoPeriodo: periodAnalytics?.totalReturnPct ?? null,
        retornoIbov:    periodAnalytics?.ibovReturnPct  ?? null,
        retornoCdi:     periodAnalytics?.cdiReturnPct   ?? null,
        alphaIbov:      periodAnalytics
          ? (periodAnalytics.totalReturnPct - periodAnalytics.ibovReturnPct)
          : null,
        alphaCdi:       periodAnalytics
          ? (periodAnalytics.totalReturnPct - periodAnalytics.cdiReturnPct)
          : null,
      },
      risco: {
        maxDrawdown:   periodDrawdown?.maxDrawdownPct     ?? null,
        drawdownAtual: periodDrawdown?.currentDrawdown    ?? null,
        volatilidade:  periodVolatility?.annualizedVolPct ?? null,
      },
      carteira: posicoes.map(p => ({
        symbol: p.asset?.symbol,
        nome:   p.asset?.name,
        grupo:  p.asset?.group_id,
        peso:   p.peso_alvo,
      })),
      cotistas: {
        total:      cotistas?.summary?.total_cotistas  ?? null,
        patrimonio: cotistas?.summary?.patrimonio_total ?? null,
        valorCota:  cotistas?.summary?.valor_cota_atual ?? null,
      },
      enquadramento: {
        percentualRV: (rvCompliance?.percentualRV ?? 0) * 100,
        status:       rvCompliance?.status ?? 'NO_POSITIONS',
        conforme:     rvCompliance?.compliant ?? false,
      },
    };

    const userPrompt = `Você é o gestor de um clube de investimento brasileiro.
Escreva a carta mensal do clube para o período ${ctx.clube.periodoFormatado}.

Use os dados abaixo para fundamentar o comentário:
${JSON.stringify(ctx, null, 2)}

Instruções:
- Escreva em português brasileiro, tom profissional mas acessível
- Estruture em 3 parágrafos: (1) contexto e desempenho, (2) composição e decisões, (3) perspectivas
- Seja objetivo — máximo 250 palavras no total
- Não invente dados além dos fornecidos acima
- Não use markdown, asteriscos ou formatação especial — apenas texto corrido
- Se retornoPeriodo for null, mencione que os dados do período ainda estão sendo consolidados
- Nunca faça recomendações de compra ou venda`;

    setAiLoading(true);
    setAiError(null);
    setCommentary('');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages:   [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const text = data.content
        ?.filter(b => b.type === 'text')
        .map(b => b.text)
        .join('') || '';

      setCommentary(text);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  }, [clube, periodAnalytics, periodDrawdown, periodVolatility, posicoes, cotistas, period, rvCompliance]);

  // ── Loading / error states ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: BG_PAGE, fontFamily: MONO,
      }}>
        <div style={{ fontSize: 12, color: TXT_3, letterSpacing: '0.1em' }}>
          CARREGANDO RELATÓRIO...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: BG_PAGE, fontFamily: MONO, gap: 12,
      }}>
        <div style={{ fontSize: 12, color: RED }}>{error}</div>
        <button
          onClick={() => navigate('/clube')}
          style={{
            padding: '8px 20px', background: 'transparent',
            border: `1px solid ${BORDER2}`, borderRadius: 4,
            color: TXT_2, fontFamily: MONO, fontSize: 11, cursor: 'pointer',
          }}
        >← Voltar</button>
      </div>
    );
  }

  if (!clube) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: BG_PAGE, fontFamily: MONO, gap: 12,
      }}>
        <div style={{ fontSize: 12, color: TXT_2 }}>Nenhum clube encontrado.</div>
        <button
          onClick={() => navigate('/clube')}
          style={{
            padding: '8px 20px', background: 'transparent',
            border: `1px solid ${BORDER2}`, borderRadius: 4,
            color: TXT_2, fontFamily: MONO, fontSize: 11, cursor: 'pointer',
          }}
        >← Voltar</button>
      </div>
    );
  }

  // ── Derived display values ───────────────────────────────────────────────────
  const rvPct        = (rvCompliance?.percentualRV ?? 0) * 100 | 0;
  const rvStatusText = rvCompliance?.status === 'OK' ? 'CONFORME' : 'DESENQUADRADO';
  const rvColor      = rvCompliance?.status === 'OK' ? GREEN : RED;

  // Shared table cell styles
  const TH_STYLE = {
    fontSize: 10, color: TXT_3, letterSpacing: '0.08em',
    textTransform: 'uppercase', fontFamily: MONO,
    padding: '8px 12px', borderBottom: `1px solid ${BORDER2}`, textAlign: 'left',
  };
  const TD_STYLE = {
    fontSize: 13, fontFamily: MONO,
    padding: '10px 12px', borderBottom: `1px solid ${BORDER}`,
  };

  // Performance table rows
  const perfRows = [
    { label: 'Retorno no Período',   carteira: periodAnalytics?.totalReturnPct,  bench: null },
    { label: 'Retorno IBOV',         carteira: null,  bench: periodAnalytics?.ibovReturnPct },
    { label: 'Retorno CDI',          carteira: null,  bench: periodAnalytics?.cdiReturnPct  },
    { label: 'Alpha vs IBOV',        carteira: periodAnalytics ? (periodAnalytics.totalReturnPct - periodAnalytics.ibovReturnPct) : null, bench: null },
    { label: 'Alpha vs CDI',         carteira: periodAnalytics ? (periodAnalytics.totalReturnPct - periodAnalytics.cdiReturnPct)  : null, bench: null },
    { label: 'Volatilidade (a.a.)',  carteira: periodVolatility?.annualizedVolPct, bench: null },
    { label: 'Max Drawdown',         carteira: periodDrawdown?.maxDrawdownPct,     bench: null },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: BG_PAGE, fontFamily: MONO }}>

      {/* ── Header bar (screen only) ───────────────────────────────────────── */}
      <div
        id="report-header-bar"
        style={{
          height: 56, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 20px',
          background: BG_HEAD, borderBottom: `1px solid ${BORDER}`,
          position: 'sticky', top: 0, zIndex: 10,
        }}
      >
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/clube')}
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
          <span style={{ fontSize: 11, color: TXT_2, letterSpacing: '0.2em' }}>CLUBE</span>
          <span style={{ fontSize: 11, color: TXT_3, margin: '0 6px' }}>/</span>
          <span style={{ fontSize: 11, color: TXT_1, letterSpacing: '0.2em' }}>RELATÓRIO</span>
        </div>

        {/* Right — controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Period selector */}
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            style={{
              background: BG_CARD2, border: `1px solid ${BORDER2}`,
              color: TXT_1, fontFamily: MONO, fontSize: 11,
              padding: '6px 10px', borderRadius: 3, cursor: 'pointer',
            }}
          >
            {periodOptions.length === 0 && (
              <option value={period}>
                {PT_MONTHS[parseInt(period.split('-')[1], 10) - 1]} {period.split('-')[0]}
              </option>
            )}
            {periodOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* EXPORTAR */}
          <button
            onClick={() => window.print()}
            style={{
              background: 'transparent', border: `1px solid ${ACCENT}`, color: ACCENT,
              fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em',
              padding: '6px 12px', cursor: 'pointer', borderRadius: 3,
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            EXPORTAR
          </button>

          {/* GERAR COMENTÁRIO IA */}
          <button
            onClick={generateCommentary}
            disabled={aiLoading}
            style={{
              background: 'transparent',
              border: `1px solid ${aiLoading ? TXT_3 : GREEN}`,
              color: aiLoading ? TXT_3 : GREEN,
              fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em',
              padding: '6px 12px',
              cursor: aiLoading ? 'not-allowed' : 'pointer',
              borderRadius: 3,
            }}
          >
            {aiLoading ? 'GERANDO...' : 'GERAR COMENTÁRIO IA'}
          </button>
        </div>
      </div>

      {/* ── Printable report ───────────────────────────────────────────────── */}
      <div id="report-content" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 48px' }}>

        {/* SECTION 1 — Report header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 700,
            color: TXT_1, marginBottom: 6,
          }}>
            {clube.nome}
          </div>
          <div style={{ fontSize: 13, color: TXT_2, letterSpacing: '0.08em', marginBottom: 4 }}>
            CARTA MENSAL — {periodLabel}
          </div>
          {clube.corretora && (
            <div style={{ fontSize: 11, color: TXT_3, marginBottom: 4 }}>{clube.corretora}</div>
          )}
          <div style={{ height: 1, background: BORDER2, marginTop: 16 }} />
        </div>

        {/* SECTION 2 — Performance summary table */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            fontSize: 10, color: TXT_3, letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>
            DESEMPENHO DO PERÍODO
          </div>

          {periodNavHistory.length === 0 ? (
            <div style={{
              padding: '24px 0', textAlign: 'center', color: TXT_3,
              fontSize: 12, lineHeight: 1.8,
            }}>
              Nenhum dado de NAV registrado para este período.<br />
              Registre entradas de NAV diárias no painel do clube para visualizar o relatório.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['MÉTRICA', 'CARTEIRA', 'BENCHMARK'].map(h => (
                    <th key={h} style={{ ...TH_STYLE, textAlign: h === 'MÉTRICA' ? 'left' : 'right' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perfRows.map(row => (
                  <tr key={row.label}>
                    <td style={{ ...TD_STYLE, color: TXT_2 }}>{row.label}</td>
                    <td style={{
                      ...TD_STYLE, textAlign: 'right', fontWeight: 600,
                      color: row.carteira != null ? signColor(row.carteira) : TXT_3,
                    }}>
                      {row.carteira != null ? formatPct(row.carteira, { showSign: true }) : '—'}
                    </td>
                    <td style={{
                      ...TD_STYLE, textAlign: 'right',
                      color: row.bench != null ? TXT_1 : TXT_3,
                    }}>
                      {row.bench != null ? formatPct(row.bench, { showSign: true }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* SECTION 3 — NAV chart */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            fontSize: 10, color: TXT_3, letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>
            EVOLUÇÃO DA COTA
          </div>
          <div style={{
            background: BG_CARD, border: `1px solid ${BORDER}`,
            borderRadius: 4, padding: '16px 0 12px',
          }}>
            <ReportNavChart
              navSeries={periodAnalytics?.navSeries ?? []}
              ibovSeries={periodAnalytics?.ibovSeries ?? []}
            />
          </div>
        </div>

        {/* SECTION 4 — Positions table */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            fontSize: 10, color: TXT_3, letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>
            COMPOSIÇÃO DA CARTEIRA
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ATIVO', 'NOME', 'GRUPO', 'PESO'].map(h => (
                  <th key={h} style={{ ...TH_STYLE, textAlign: h === 'PESO' ? 'right' : 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posicoes.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ ...TD_STYLE, color: TXT_3, textAlign: 'center' }}>
                    Nenhuma posição registrada.
                  </td>
                </tr>
              ) : posicoes.map((p, i) => (
                <tr key={p.asset_id ?? i}>
                  <td style={{ ...TD_STYLE, color: ACCENT, fontWeight: 600 }}>{p.asset?.symbol ?? '—'}</td>
                  <td style={{ ...TD_STYLE, color: TXT_1 }}>{p.asset?.name ?? '—'}</td>
                  <td style={{ ...TD_STYLE, color: TXT_2 }}>{p.asset?.group_id ?? '—'}</td>
                  <td style={{ ...TD_STYLE, color: TXT_2, textAlign: 'right' }}>
                    {p.peso_alvo != null ? `${(p.peso_alvo * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 8, fontSize: 11, color: rvColor, fontFamily: MONO }}>
            Enquadramento RV: {rvPct}% (mín. 67%) — {rvStatusText}
          </div>
        </div>

        {/* SECTION 5 — Cotistas */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            fontSize: 10, color: TXT_3, letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>
            COTISTAS
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['NOME', 'COTAS', 'ENTRADA', 'VALOR ATUAL'].map(h => (
                  <th key={h} style={{ ...TH_STYLE, textAlign: h === 'VALOR ATUAL' ? 'right' : 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(cotistas?.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ ...TD_STYLE, color: TXT_3, textAlign: 'center' }}>
                    Nenhum cotista registrado.
                  </td>
                </tr>
              ) : (cotistas?.data ?? []).map((c, i) => (
                <tr key={c.id ?? i}>
                  <td style={{ ...TD_STYLE, color: TXT_1 }}>{c.nome}</td>
                  <td style={{ ...TD_STYLE, color: TXT_2 }}>{Number(c.cotas_detidas).toFixed(0)}</td>
                  <td style={{ ...TD_STYLE, color: TXT_2 }}>{fmtDate(c.data_entrada)}</td>
                  <td style={{ ...TD_STYLE, color: c.valor_atual != null ? GOLD : TXT_3, textAlign: 'right' }}>
                    {c.valor_atual != null ? formatCurrency(c.valor_atual) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(cotistas?.data ?? []).length > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginTop: 8, fontSize: 11, color: TXT_2, fontFamily: MONO,
            }}>
              <span>Total cotas: {cotistas?.summary?.total_cotas ?? '—'}</span>
              <span>Patrimônio: {formatCurrency(cotistas?.summary?.patrimonio_total, { compact: true })}</span>
            </div>
          )}
        </div>

        {/* SECTION 6 — AI Commentary */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            fontSize: 10, color: TXT_3, letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>
            COMENTÁRIO DO GESTOR
          </div>

          {commentary ? (
            <div style={{
              background: BG_CARD2, border: `1px solid ${BORDER2}`, borderRadius: 4,
              padding: '20px 24px', fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 13, lineHeight: 1.7, color: TXT_1, whiteSpace: 'pre-wrap',
            }}>
              {commentary}
            </div>
          ) : aiLoading ? (
            <div className="no-print" style={{ padding: '24px 0', color: TXT_2, fontSize: 12, fontFamily: MONO }}>
              Gerando comentário...
            </div>
          ) : aiError ? (
            <div className="no-print" style={{ padding: '8px 0', color: RED, fontSize: 12, fontFamily: MONO }}>
              Erro ao gerar comentário: {aiError}
            </div>
          ) : (
            <div
              className="no-print"
              style={{
                border: `1px dashed ${BORDER2}`, borderRadius: 4, padding: 24,
                textAlign: 'center', color: TXT_3, fontSize: 12, fontFamily: MONO,
              }}
            >
              Clique em GERAR COMENTÁRIO IA para gerar o comentário do gestor automaticamente.
            </div>
          )}
        </div>

        {/* SECTION 7 — Legal disclaimer */}
        <div style={{
          borderTop: `1px solid ${BORDER2}`, paddingTop: 16, marginTop: 32,
          fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10, color: TXT_3, lineHeight: 1.6,
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            Este relatório foi elaborado exclusivamente para fins informativos e não constitui
            recomendação de investimento, oferta ou solicitação de compra ou venda de valores
            mobiliários. As informações aqui contidas são baseadas em dados históricos e não
            garantem resultados futuros. O Clube de Investimento está sujeito às normas da
            Comissão de Valores Mobiliários (CVM) e da B3. Rentabilidade passada não é garantia
            de rentabilidade futura. Antes de investir, leia o regulamento do clube.
          </p>
          <p style={{ margin: 0 }}>
            Gerado por GMT — Global Markets Terminal · {todayFormatted}
          </p>
        </div>

      </div>
    </div>
  );
}
