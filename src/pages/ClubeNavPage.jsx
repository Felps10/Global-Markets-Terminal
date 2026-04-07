import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { calculateNAVFromHistory, formatCurrency, formatPct } from '../services/portfolioEngine.js';
import ClubeShell from '../components/clube/ClubeShell.jsx';
import NavChart from '../components/clube/NavChart.jsx';

const API_BASE = import.meta.env.VITE_API_URL || '';

const BG_PAGE  = '#080f1a';
const BG_CARD  = '#0d1829';
const BORDER   = 'rgba(255,255,255,0.06)';
const BORDER2  = 'rgba(51,65,85,0.5)';
const TXT_1    = '#e2e8f0';
const TXT_2    = '#94a3b8';
const TXT_3    = '#475569';
const ACCENT   = 'var(--c-accent)';
const GREEN    = '#00E676';
const RED      = 'var(--c-error)';
const GOLD     = '#C5A059';

const MONO = "'JetBrains Mono', monospace";
const SANS = "'DM Sans', 'IBM Plex Sans', sans-serif";

const INPUT_STYLE = {
  width: '100%', boxSizing: 'border-box',
  background: '#0f1f2e', border: `1px solid ${BORDER2}`,
  borderRadius: 3, color: TXT_1,
  fontFamily: MONO, fontSize: 12,
  padding: '8px 10px', outline: 'none', marginTop: 4,
};
const INPUT_AUTO = { ...INPUT_STYLE, background: 'rgba(59,130,246,0.05)' };
const LABEL_STYLE = {
  display: 'block', color: TXT_3, fontSize: 10,
  letterSpacing: '0.08em', textTransform: 'uppercase',
  fontFamily: MONO, marginBottom: 2,
};

// ── Module-level cache ────────────────────────────────────────────────────────
const _navPageCache   = {};
const _navPageCacheTs = {};
const NAV_PAGE_TTL_MS = 2 * 60 * 1000;

function fmtBRL(v) {
  if (v == null) return '—';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ClubeNavPage() {
  const { id: clubeIdParam } = useParams();
  const { getToken, user } = useAuth();

  const [clube,       setClube]       = useState(null);
  const [navHistory,  setNavHistory]  = useState([]);
  const [cotistas,    setCotistas]    = useState(null);
  const [auditLog,    setAuditLog]    = useState([]);
  const [loading,     setLoading]     = useState(true);

  // Form state
  const [formData,      setFormData]      = useState(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [submitError,   setSubmitError]   = useState(null);
  const [submitOk,      setSubmitOk]      = useState(false);

  // Cached CDI/IBOV from mount fetch
  const [retornoCdi,  setRetornoCdi]  = useState(null);
  const [retornoIbov, setRetornoIbov] = useState(null);

  // ── Build form defaults ─────────────────────────────────────────────────────
  const buildFormDefaults = useCallback((navHist, cot, clubeData, cdi, ibov) => {
    const today = new Date().toISOString().split('T')[0];
    const analytics = calculateNAVFromHistory(navHist, clubeData);
    const prevCota = analytics?.currentNAV || clubeData?.valor_cota_inicial || 1000;
    const estimatedCota = Math.round(prevCota * 1000000) / 1000000;
    const totalCotas = cot?.summary?.total_cotas ?? 0;
    const estimatedPatrimonio = Math.round(totalCotas * estimatedCota * 100) / 100;

    return {
      data:              today,
      valor_cota:        estimatedCota,
      patrimonio_total:  estimatedPatrimonio,
      cotas_emitidas:    totalCotas,
      retorno_diario:    0,
      retorno_acumulado: null,
      retorno_ibov:      ibov,
      retorno_cdi:       cdi,
      percentual_rv:     0,
    };
  }, []);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const cacheKey = `nav-page-${clubeIdParam}`;
    if (_navPageCache[cacheKey] && Date.now() - (_navPageCacheTs[cacheKey] ?? 0) < NAV_PAGE_TTL_MS) {
      const c = _navPageCache[cacheKey];
      setClube(c.clube); setNavHistory(c.navHistory); setCotistas(c.cotistas);
      setAuditLog(c.auditLog); setRetornoCdi(c.cdi); setRetornoIbov(c.ibov);
      setFormData(buildFormDefaults(c.navHistory, c.cotistas, c.clube, c.cdi, c.ibov));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const [clubeRes, navRes, cotRes, auditRes, bcbRes, ibovRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/v1/clubes/${clubeIdParam}`, { headers }),
        fetch(`${API_BASE}/api/v1/clubes/${clubeIdParam}/nav`, { headers }),
        fetch(`${API_BASE}/api/v1/clubes/${clubeIdParam}/cotistas`, { headers }),
        fetch(`${API_BASE}/api/v1/clubes/${clubeIdParam}/audit-log?action=nav.registrar`, { headers }),
        fetch(`${API_BASE}/proxy/bcb/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json`, { signal: AbortSignal.timeout(8000) }),
        fetch(`${API_BASE}/proxy/yahoo/v7/finance/quote?symbols=%5EBVSP`, { signal: AbortSignal.timeout(12000) }),
      ]);

      let clubeData = null;
      if (clubeRes.status === 'fulfilled' && clubeRes.value.ok) {
        clubeData = await clubeRes.value.json();
        setClube(clubeData);
      }

      let navData = [];
      if (navRes.status === 'fulfilled' && navRes.value.ok) {
        navData = await navRes.value.json();
        setNavHistory(navData);
      }

      let cotData = null;
      if (cotRes.status === 'fulfilled' && cotRes.value.ok) {
        const raw = await cotRes.value.json();
        cotData = { data: raw.cotistas ?? raw, summary: raw.summary ?? null };
        setCotistas(cotData);
      }

      let auditData = [];
      if (auditRes.status === 'fulfilled' && auditRes.value.ok) {
        auditData = await auditRes.value.json();
        setAuditLog(auditData);
      }

      let cdi = null;
      if (bcbRes.status === 'fulfilled' && bcbRes.value.ok) {
        try {
          const bcbJson = await bcbRes.value.json();
          const annual = parseFloat(bcbJson[0]?.valor);
          if (!isNaN(annual)) cdi = Math.round((annual / 100 / 252) * 1e8) / 1e8;
        } catch (_) {}
      }
      setRetornoCdi(cdi);

      let ibov = null;
      if (ibovRes.status === 'fulfilled' && ibovRes.value.ok) {
        try {
          const json = await ibovRes.value.json();
          const changePct = json?.quoteResponse?.result?.[0]?.regularMarketChangePercent;
          if (changePct != null) ibov = changePct / 100;
        } catch (_) {}
      }
      setRetornoIbov(ibov);

      setFormData(buildFormDefaults(navData, cotData, clubeData, cdi, ibov));

      _navPageCache[cacheKey] = { clube: clubeData, navHistory: navData, cotistas: cotData, auditLog: auditData, cdi, ibov };
      _navPageCacheTs[cacheKey] = Date.now();
    } catch (_) {}
    finally { setLoading(false); }
  }, [getToken, clubeIdParam, buildFormDefaults]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── NAV analytics ──────────────────────────────────────────────────────────
  const navAnalytics = useMemo(
    () => clube ? calculateNAVFromHistory(navHistory, clube) : null,
    [navHistory, clube],
  );

  // ── Attribution map ────────────────────────────────────────────────────────
  const attrMap = useMemo(() => {
    const m = {};
    for (const entry of auditLog) {
      if (entry.record_id) m[entry.record_id] = entry.after_state?.registered_by_name ?? '—';
    }
    return m;
  }, [auditLog]);

  // ── Submit NAV ─────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!clube?.id || !formData) return;
    const inceptionNAV = clube?.valor_cota_inicial ?? 1000;
    const retornoAcumulado = Math.round(((formData.valor_cota / inceptionNAV) - 1) * 1e8) / 1e8;

    const payload = {
      data:              formData.data,
      valor_cota:        Number(formData.valor_cota),
      patrimonio_total:  Number(formData.patrimonio_total),
      cotas_emitidas:    Number(formData.cotas_emitidas),
      retorno_diario:    Number(formData.retorno_diario),
      retorno_acumulado: retornoAcumulado,
      retorno_ibov:      formData.retorno_ibov !== null ? Number(formData.retorno_ibov) : null,
      retorno_cdi:       formData.retorno_cdi !== null ? Number(formData.retorno_cdi) : null,
      percentual_rv:     Number(formData.percentual_rv),
    };

    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/clubes/${clube.id}/nav`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || `Erro ${res.status}`);
      }
      setSubmitOk(true);
      // Invalidate cache and re-fetch
      const cacheKey = `nav-page-${clubeIdParam}`;
      _navPageCache[cacheKey] = null;
      _navPageCacheTs[cacheKey] = 0;
      setTimeout(async () => {
        setSubmitOk(false);
        await fetchData();
      }, 1500);
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }, [clube, formData, getToken, clubeIdParam, fetchData]);

  // ── Field change handler ───────────────────────────────────────────────────
  const onFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: BG_PAGE, fontFamily: MONO, gap: 12 }}>
        <div style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em' }}>NAV</div>
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

  const retornoDiarioColor = formData?.retorno_diario > 0 ? GREEN : formData?.retorno_diario < 0 ? RED : TXT_2;
  const sortedNav = [...navHistory].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <ClubeShell
      clubeId={clubeIdParam}
      activePage="nav"
      clubeNome={clube?.nome}
      clubeStatus={clube?.status}
      patrimonio={null}
      valorCota={navAnalytics?.currentNAV ?? null}
      cotasEmitidas={null}
      pendingCount={0}
      headerLeft={
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: TXT_2 }}>
          <span style={{ color: GOLD }}>NAV</span>
          <span style={{ color: TXT_3 }}> · Registro e Histórico</span>
        </span>
      }
      headerRight={null}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ═══════════ SECTION 1: Registration form ═══════════ */}
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 24 }}>
            <div style={{ fontFamily: MONO, fontSize: 12, color: GOLD, letterSpacing: '0.1em', marginBottom: 20 }}>
              REGISTRAR NAV
            </div>

            {submitOk ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 12 }}>
                <div style={{ fontSize: 32, color: GREEN }}>✓</div>
                <div style={{ fontFamily: MONO, fontSize: 13, color: TXT_1 }}>NAV registrado com sucesso</div>
              </div>
            ) : formData && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                {/* DATA */}
                <div>
                  <label style={LABEL_STYLE}>DATA</label>
                  <input type="date" value={formData.data} onChange={e => onFieldChange('data', e.target.value)} style={INPUT_STYLE} />
                </div>

                {/* VALOR DA COTA */}
                <div>
                  <label style={LABEL_STYLE}>VALOR DA COTA (R$)</label>
                  <input type="number" step="0.000001" value={formData.valor_cota} onChange={e => onFieldChange('valor_cota', parseFloat(e.target.value))} style={INPUT_AUTO} />
                  <div style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, marginTop: 2 }}>calculado pelo sistema</div>
                </div>

                {/* RETORNO IBOV */}
                <div>
                  <label style={LABEL_STYLE}>RETORNO IBOV</label>
                  <input type="number" step="0.00001" value={formData.retorno_ibov ?? ''} placeholder="ex: 0.0123"
                    onChange={e => onFieldChange('retorno_ibov', e.target.value === '' ? null : parseFloat(e.target.value))}
                    style={formData.retorno_ibov !== null ? INPUT_AUTO : INPUT_STYLE} />
                </div>

                {/* RETORNO CDI */}
                <div>
                  <label style={LABEL_STYLE}>RETORNO CDI</label>
                  <input type="number" step="0.0000001" value={formData.retorno_cdi ?? ''} placeholder="ex: 0.000433"
                    onChange={e => onFieldChange('retorno_cdi', e.target.value === '' ? null : parseFloat(e.target.value))}
                    style={formData.retorno_cdi !== null ? INPUT_AUTO : INPUT_STYLE} />
                </div>

                {/* PATRIMÔNIO ESTIMADO */}
                <div>
                  <label style={LABEL_STYLE}>PATRIMÔNIO ESTIMADO</label>
                  <div style={{ background: '#0f1f2e', padding: 8, borderRadius: 3, marginTop: 4, border: `1px solid ${BORDER2}` }}>
                    <div style={{ fontSize: 14, color: TXT_1, fontFamily: MONO }}>{formatCurrency(formData.cotas_emitidas * formData.valor_cota)}</div>
                    <div style={{ fontSize: 9, color: TXT_3, marginTop: 2 }}>{formData.cotas_emitidas} cotas × {formatCurrency(formData.valor_cota)}</div>
                  </div>
                </div>

                {/* RETORNO CARTEIRA */}
                <div>
                  <label style={LABEL_STYLE}>RETORNO CARTEIRA</label>
                  <div style={{ background: '#0f1f2e', padding: 8, borderRadius: 3, marginTop: 4, border: `1px solid ${BORDER2}` }}>
                    <div style={{ fontSize: 14, fontFamily: MONO, color: retornoDiarioColor }}>{formatPct(formData.retorno_diario * 100, { showSign: true })}</div>
                    <div style={{ fontSize: 9, color: TXT_3, marginTop: 2 }}>calculado pelo portfolioEngine</div>
                  </div>
                </div>

                {/* Error */}
                {submitError && (
                  <div style={{ gridColumn: '1 / -1', background: 'rgba(255,82,82,0.1)', border: `1px solid ${RED}`, borderRadius: 3, padding: 8 }}>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: RED }}>{submitError}</span>
                  </div>
                )}

                {/* Submit */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || submitOk}
                    style={{
                      padding: '10px 32px', borderRadius: 3,
                      border: 'none', fontFamily: MONO, fontSize: 11,
                      letterSpacing: '0.1em',
                      cursor: submitting || submitOk ? 'not-allowed' : 'pointer',
                      background: submitting || submitOk ? TXT_3 : GOLD,
                      color: submitting || submitOk ? TXT_2 : '#080f1a',
                    }}
                  >{submitting ? 'REGISTRANDO...' : 'CONFIRMAR REGISTRO'}</button>
                </div>
              </div>
            )}
          </div>

          {/* ═══════════ SECTION 2: Performance chart ═══════════ */}
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 24 }}>
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

          {/* ═══════════ SECTION 3: History table ═══════════ */}
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 24 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
              HISTÓRICO NAV
            </div>

            {sortedNav.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: TXT_3 }}>
                Nenhum registro NAV encontrado.
              </div>
            ) : (
              <div style={{ overflow: 'hidden', borderRadius: 4, border: `1px solid ${BORDER}` }}>
                {/* Table header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 130px 130px 110px 110px 1fr',
                  gap: 8, padding: '8px 14px',
                  borderBottom: `1px solid ${BORDER}`,
                }}>
                  {['DATA', 'VALOR DA COTA', 'PATRIMÔNIO', 'COTAS', 'RETORNO', 'REGISTRADO POR'].map((h, i) => (
                    <div key={h} style={{
                      fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em',
                      color: i === 1 ? GOLD : TXT_3,
                    }}>{h}</div>
                  ))}
                </div>

                {/* Table rows */}
                {sortedNav.map(row => {
                  const registeredBy = attrMap[String(row.id)] ?? '—';
                  return (
                    <div
                      key={row.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '100px 130px 130px 110px 110px 1fr',
                        gap: 8, padding: '8px 14px',
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#111d2e'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_1 }}>
                        {row.data?.split('-').reverse().join('/')}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: GOLD }}>
                        {Number(row.valor_cota).toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 6 })}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_2 }}>
                        {fmtBRL(row.patrimonio_total)}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_2 }}>
                        {row.cotas_emitidas != null ? Number(row.cotas_emitidas).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '—'}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: row.retorno_diario > 0 ? GREEN : row.retorno_diario < 0 ? RED : TXT_3 }}>
                        {row.retorno_diario != null ? `${(row.retorno_diario * 100).toFixed(4)}%` : '—'}
                      </div>
                      <div style={{ fontFamily: SANS, fontSize: 11, color: TXT_2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {registeredBy}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ClubeShell>
  );
}
