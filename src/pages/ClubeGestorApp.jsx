import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { CLUBE_COLORS, CLUBE_FONTS } from '../clube/styles/index.js';
import {
  calculateNAVFromHistory,
  calculateRVCompliance,
} from '../services/portfolioEngine.js';
import ClubeShell from '../components/clube/ClubeShell.jsx';
import NavRecordModal from '../components/clube/NavRecordModal.jsx';
import GestorVisaoGeralTab from '../clube/components/gestor-tabs/GestorVisaoGeralTab.jsx';
import GestorFilaOperacoesTab from '../clube/components/gestor-tabs/GestorFilaOperacoesTab.jsx';
import GestorCarteiraTab from '../clube/components/gestor-tabs/GestorCarteiraTab.jsx';
import GestorRiscoTab from '../clube/components/gestor-tabs/GestorRiscoTab.jsx';
import GestorEstatutoTab from '../clube/components/gestor-tabs/GestorEstatutoTab.jsx';

const API = import.meta.env.VITE_API_URL || '';
const MONO = CLUBE_FONTS.mono;

const TABS = [
  { key: 'visao-geral',    label: 'VISÃO GERAL' },
  { key: 'fila-operacoes', label: 'FILA DE OPERAÇÕES' },
  { key: 'carteira',       label: 'CARTEIRA' },
  { key: 'risco',          label: 'RISCO' },
  { key: 'estatuto',       label: 'ESTATUTO' },
];

// ── Main component ──────────────────────────────────────────────────────────
export default function ClubeGestorApp({ clube, navHistory, posicoes, gestorData, refetch }) {
  const { id: clubeIdParam } = useParams();
  const { user, getToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'visao-geral';

  // ── Dashboard fetch state ─────────────────────────────────────────────────
  const [dashboardData, setDashboardData]       = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError]     = useState(null);

  // ── NAV modal state ───────────────────────────────────────────────────────
  const [navModalOpen, setNavModalOpen]     = useState(false);
  const [navModalData, setNavModalData]     = useState(null);
  const [navSubmitting, setNavSubmitting]   = useState(false);
  const [navSubmitError, setNavSubmitError] = useState(null);
  const [navSubmitOk, setNavSubmitOk]       = useState(false);
  const navAutoCloseRef                     = useRef(null);

  // ── Computed analytics from props ─────────────────────────────────────────
  const navAnalytics = useMemo(
    () => (clube ? calculateNAVFromHistory(navHistory, clube) : null),
    [navHistory, clube],
  );

  // ── Fetch dashboard on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!clubeIdParam) return;
    let cancelled = false;

    async function load() {
      setDashboardLoading(true);
      setDashboardError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Sessão expirada.');
        const res = await fetch(`${API}/api/v1/clubes/${clubeIdParam}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        if (!cancelled) setDashboardData(await res.json());
      } catch (err) {
        if (!cancelled) setDashboardError(err.message ?? 'Erro desconhecido');
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [clubeIdParam, getToken]);

  // ── Cleanup auto-close timer on unmount ───────────────────────────────────
  useEffect(() => {
    return () => {
      if (navAutoCloseRef.current) {
        clearTimeout(navAutoCloseRef.current);
        navAutoCloseRef.current = null;
      }
    };
  }, []);

  // ── Build NAV modal defaults ──────────────────────────────────────────────
  const buildNavModalDefaults = useCallback(async () => {
    const today    = new Date().toISOString().split('T')[0];
    const prevCota = navAnalytics?.currentNAV ?? clube?.valor_cota_inicial ?? 1000;
    const estimatedCota = Math.round(prevCota * 1000000) / 1000000;

    let retornoIbov = null;
    try {
      const res = await fetch(
        `${API}/proxy/yahoo/v7/finance/quote?symbols=${encodeURIComponent('^BVSP')}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (res.ok) {
        const json = await res.json();
        const q = json?.quoteResponse?.result?.[0];
        if (q?.regularMarketChangePercent != null) {
          retornoIbov = q.regularMarketChangePercent / 100;
        }
      }
    } catch (_) {}

    let retornoCdi = null;
    try {
      const bcbRes = await fetch(
        `${API}/proxy/bcb/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (bcbRes.ok) {
        const bcbJson = await bcbRes.json();
        const annual = parseFloat(bcbJson[0]?.valor);
        if (!isNaN(annual)) {
          retornoCdi = Math.round((annual / 100 / 252) * 1e8) / 1e8;
        }
      }
    } catch (_) {}

    const totalCotas = gestorData?.cotistas?.summary?.total_cotas ?? 0;
    const estimatedPatrimonio = Math.round(totalCotas * estimatedCota * 100) / 100;
    const percentualRv = calculateRVCompliance(posicoes)?.percentualRV ?? 0;

    setNavModalData({
      data:              today,
      valor_cota:        estimatedCota,
      patrimonio_total:  estimatedPatrimonio,
      cotas_emitidas:    totalCotas,
      retorno_diario:    0,
      retorno_acumulado: null,
      retorno_ibov:      retornoIbov,
      retorno_cdi:       retornoCdi,
      percentual_rv:     percentualRv,
    });
    setNavSubmitError(null);
    setNavSubmitOk(false);
    setNavModalOpen(true);
  }, [navAnalytics, gestorData, posicoes, clube]);

  // ── Submit NAV entry ──────────────────────────────────────────────────────
  const submitNav = useCallback(async (formValues) => {
    try {
      const inceptionNAV = clube?.valor_cota_inicial ?? 1000;
      const retornoAcumulado = Math.round(
        ((formValues.valor_cota / inceptionNAV) - 1) * 1e8,
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
      const res = await fetch(`${API}/api/v1/clubes/${clube.id}/nav`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setNavSubmitOk(true);
        setNavSubmitting(false);
        if (refetch) refetch();
        if (navAutoCloseRef.current) clearTimeout(navAutoCloseRef.current);
        navAutoCloseRef.current = setTimeout(() => {
          setNavModalOpen(false);
          navAutoCloseRef.current = null;
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
  }, [clube, getToken, refetch]);

  // ── Tab change handler ────────────────────────────────────────────────────
  function handleTabChange(tab) {
    setSearchParams({ tab }, { replace: true });
  }

  // ── All hooks above — render below ────────────────────────────────────────

  const navButton = (
    <button
      onClick={buildNavModalDefaults}
      style={{
        background: CLUBE_COLORS.accent,
        color: '#000',
        border: 'none',
        borderRadius: 4,
        padding: '6px 14px',
        fontFamily: MONO,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        cursor: 'pointer',
      }}
    >
      REGISTRAR NAV
    </button>
  );

  return (
    <ClubeShell
      activePage="painel"
      clubeId={clubeIdParam}
      clubeNome={clube?.nome}
      clubeStatus={clube?.status}
      patrimonio={dashboardData?.patrimonio_total}
      valorCota={dashboardData?.nav_latest?.valor_cota}
      cotasEmitidas={dashboardData?.cotas_emitidas}
      pendingCount={dashboardData?.pending_count}
      activeTabLabel={TABS.find(t => t.key === activeTab)?.label ?? ''}
      lastNavDate={dashboardData?.nav_latest?.data}
      headerRight={navButton}
    >
      {/* ── TAB BAR ── */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${CLUBE_COLORS.border}`,
        background: '#0a1628',
        padding: '0 20px',
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key
                ? `2px solid ${CLUBE_COLORS.accent}`
                : '2px solid transparent',
              color: activeTab === tab.key ? '#e2e8f0' : '#94a3b8',
              fontFamily: MONO,
              fontSize: 12,
              letterSpacing: '0.1em',
              fontWeight: activeTab === tab.key ? 600 : 400,
              padding: '12px 20px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {dashboardLoading && activeTab === 'visao-geral' ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: MONO, fontSize: 11, color: '#475569', letterSpacing: '0.1em',
            minHeight: 200,
          }}>
            CARREGANDO PAINEL...
          </div>
        ) : dashboardError && activeTab === 'visao-geral' ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: MONO, fontSize: 11, color: '#FF5252',
            minHeight: 200,
          }}>
            {dashboardError}
          </div>
        ) : (
          <>
            {activeTab === 'visao-geral' && (
              <GestorVisaoGeralTab
                dashboard={dashboardData}
                clube={clube}
                navAnalytics={navAnalytics}
                gestorData={gestorData}
              />
            )}
            {activeTab === 'fila-operacoes' && (
              <GestorFilaOperacoesTab
                clube={clube}
                getToken={getToken}
                user={user}
              />
            )}
            {activeTab === 'carteira' && (
              <GestorCarteiraTab
                clube={clube}
                posicoes={posicoes}
                getToken={getToken}
                user={user}
              />
            )}
            {activeTab === 'risco' && (
              <GestorRiscoTab
                clube={clube}
                navHistory={navHistory}
                gestorData={gestorData}
                getToken={getToken}
                user={user}
              />
            )}
            {activeTab === 'estatuto' && (
              <GestorEstatutoTab
                clube={clube}
                getToken={getToken}
              />
            )}
          </>
        )}
      </div>

      <NavRecordModal
        open={navModalOpen}
        data={navModalData}
        onDataChange={(field, value) =>
          setNavModalData(prev => prev ? { ...prev, [field]: value } : prev)
        }
        onSubmit={submitNav}
        onClose={() => {
          if (navAutoCloseRef.current) {
            clearTimeout(navAutoCloseRef.current);
            navAutoCloseRef.current = null;
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
