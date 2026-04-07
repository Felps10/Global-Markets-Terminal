import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { hasRole } from '../lib/roles.js';
import CotistaFormModal  from '../components/clube/CotistaFormModal.jsx';
import MovimentacaoModal from '../components/clube/MovimentacaoModal.jsx';
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

const SUITABILITY_COLORS = {
  conservador: AMBER,
  moderado:    TXT_2,
  arrojado:    ACCENT,
  agressivo:   GREEN,
};

const STATUS_BADGE = {
  aguardando_recursos:  { label: 'AGUARD. RECURSOS', bg: 'rgba(71,85,105,0.25)',  color: TXT_3  },
  recursos_confirmados: { label: 'RECURSOS CONF.',   bg: 'rgba(249,195,0,0.12)',  color: GOLD   },
  convertido:           { label: 'CONVERTIDO',        bg: 'var(--c-accent-dim)', color: ACCENT },
  pago:                 { label: 'PAGO',               bg: 'rgba(0,230,118,0.12)', color: GREEN  },
  cancelado:            { label: 'CANCELADO',          bg: 'rgba(255,82,82,0.08)', color: RED    },
};

export default function ClubeMembroPage() {
  const navigate           = useNavigate();
  const { id: clubeIdParam } = useParams();
  const { getToken, user } = useAuth();

  const [clube,           setClube]           = useState(null);
  const [cotistas,        setCotistas]        = useState([]);
  const [selectedId,      setSelectedId]      = useState(null);
  const [movimentacoes,   setMovimentacoes]   = useState([]);
  const [documentos,      setDocumentos]      = useState([]);
  const [navLatest,       setNavLatest]       = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [movLoading,      setMovLoading]      = useState(false);
  const [error,           setError]           = useState(null);

  // Modal state
  const [showAddModal,     setShowAddModal]     = useState(false);
  const [showAporteModal,  setShowAporteModal]  = useState(false);
  const [showResgateModal, setShowResgateModal] = useState(false);
  const [activeView,       setActiveView]       = useState('resumo');
  const [gmtMembers,       setGmtMembers]       = useState([]);
  const [membersLoading,   setMembersLoading]   = useState(false);
  const [cotistasSearch,   setCotistasSearch]   = useState('');
  const [linkCopied,       setLinkCopied]       = useState(false);
  const [actionLoading,    setActionLoading]    = useState(null);

  // ANÁLISE tab
  const [analiseMode, setAnaliseMode]                   = useState('individual');
  const [analiseSelectedId, setAnaliseSelectedId]       = useState(null);
  const [analiseMovimentacoes, setAnaliseMovimentacoes] = useState([]);
  const [navHistory, setNavHistory]                     = useState([]);
  const [navHistoryLoaded, setNavHistoryLoaded]         = useState(false);
  const [analiseLoading, setAnaliseLoading]             = useState(false);
  const [analiseTimeWindow, setAnaliseTimeWindow]       = useState('ALL');
  const [comparacaoIds, setComparacaoIds]               = useState([]);
  const [comparacaoData, setComparacaoData]             = useState({});
  const [comparacaoLoading, setComparacaoLoading]       = useState(false);
  const [comparacaoSearch, setComparacaoSearch]         = useState('');
  const [cotistasRetornos, setCotistasRetornos]         = useState({});
  const [retornosLoading, setRetornosLoading]           = useState(false);
  const [retornosLoaded, setRetornosLoaded]             = useState(false);

  const totalCotas = useMemo(
    () => cotistas.reduce((s, c) => s + parseFloat(c.cotas_detidas ?? 0), 0),
    [cotistas],
  );

  const filteredCotistas = useMemo(() => {
    if (!cotistasSearch.trim()) return cotistas;
    const needle = cotistasSearch.trim().toLowerCase();
    const digits = needle.replace(/\D/g, '');
    return cotistas.filter(c =>
      c.nome?.toLowerCase().includes(needle) ||
      c.email?.toLowerCase().includes(needle) ||
      (digits.length >= 3 &&
       c.cpf_cnpj?.replace(/\D/g, '').includes(digits))
    );
  }, [cotistas, cotistasSearch]);

  const cotistasAtivos = useMemo(() =>
    cotistas.filter(c => c.ativo !== false),
    [cotistas]
  );

  const maiorPosicao = useMemo(() => {
    if (!cotistasAtivos.length) return null;
    return cotistasAtivos.reduce((max, c) =>
      parseFloat(c.cotas_detidas) > parseFloat(max.cotas_detidas) ? c : max
    );
  }, [cotistasAtivos]);

  const retornoMedio = useMemo(() => {
    const values = Object.values(cotistasRetornos).filter(v => v != null);
    if (!values.length) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [cotistasRetornos]);

  const cvmConcentrationStatus = useMemo(() => {
    if (!totalCotas || !cotistasAtivos.length) return 'ok';
    const max = Math.max(...cotistasAtivos.map(c =>
      parseFloat(c.cotas_detidas) / totalCotas * 100
    ));
    return max > 40 ? 'breach' : 'ok';
  }, [cotistasAtivos, totalCotas]);

  const perCotistaData = useMemo(() => {
    if (!cotistasAtivos.length) return [];
    return cotistasAtivos.map(c => {
      const cotas = parseFloat(c.cotas_detidas);
      const participacao = totalCotas > 0 ? (cotas / totalCotas) * 100 : 0;
      return { id: c.id, nome: c.nome, cotas, participacao };
    });
  }, [cotistasAtivos, totalCotas]);

  const selectedCotista = useMemo(
    () => cotistas.find(c => c.id === selectedId) ?? null,
    [cotistas, selectedId],
  );

  // ── Fetch movimentacoes + documentos for selected cotista ────────────────
  const fetchMovimentacoes = useCallback(async (cotistaId) => {
    if (!clube?.id || !cotistaId) return;
    setMovLoading(true);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [movRes, docRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/clubes/${clube.id}/movimentacoes?cotista_id=${cotistaId}`, { headers }),
        fetch(`${API_BASE}/api/v1/clubes/${clube.id}/documentos?cotista_id=${cotistaId}`, { headers }),
      ]);
      if (movRes.ok) setMovimentacoes(await movRes.json());
      if (docRes.ok) setDocumentos(await docRes.json());
    } catch (_) {
      // silent
    } finally {
      setMovLoading(false);
    }
  }, [clube?.id, getToken]);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Sessão expirada');
        const headers = { Authorization: `Bearer ${token}` };

        const clubeRes = await fetch(`${API_BASE}/api/v1/clubes/${clubeIdParam}`, { headers });
        if (!clubeRes.ok) { setLoading(false); return; }
        const c = await clubeRes.json();
        if (cancelled) return;
        setClube(c);

        const [cotRes, navRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/clubes/${c.id}/cotistas`, { headers }),
          fetch(`${API_BASE}/api/v1/clubes/${c.id}/nav/latest`, { headers }),
        ]);

        if (cancelled) return;
        if (cotRes.ok) {
          const raw = await cotRes.json();
          const list = raw.cotistas ?? raw;
          setCotistas(list);
          if (list.length > 0) setSelectedId(list[0].id);
        }
        if (navRes.ok) setNavLatest(await navRes.json());
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  // ── Fetch detail when selection changes ──────────────────────────────────
  useEffect(() => {
    if (selectedId) {
      setMovimentacoes([]);
      setDocumentos([]);
      fetchMovimentacoes(selectedId);
    }
  }, [selectedId, fetchMovimentacoes]);

  // ── Refresh cotistas list ────────────────────────────────────────────────
  const refreshCotistas = useCallback(async () => {
    if (!clube?.id) return;
    const token = await getToken();
    const res = await fetch(`${API_BASE}/api/v1/clubes/${clube.id}/cotistas`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const raw = await res.json();
      setCotistas(raw.cotistas ?? raw);
    }
  }, [clube?.id, getToken]);

  // ── Fetch GMT members for GESTÃO DE ACESSO ─────────────────────────────
  const fetchGmtMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE}/api/v1/clubes/${clubeIdParam}/access/members`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setGmtMembers(data.users || []);
    } catch { /* silent */ }
    finally { setMembersLoading(false); }
  }, [clubeIdParam, getToken]);

  // ── ANÁLISE fetch functions ──────────────────────────────────────────────
  const fetchNavHistory = useCallback(async () => {
    if (navHistoryLoaded || !clube?.id) return;
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE}/api/v1/clubes/${clube.id}/nav`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setNavHistory(data);
      setNavHistoryLoaded(true);
    } catch { /* silent */ }
  }, [clube?.id, getToken, navHistoryLoaded]);

  const fetchRetornos = useCallback(async () => {
    if (retornosLoaded || !clube?.id) return;
    setRetornosLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE}/api/v1/clubes/${clube.id}/cotistas/retornos`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const map = {};
      for (const c of (data.cotistas ?? [])) {
        map[c.id] = c.retorno;
      }
      setCotistasRetornos(map);
      setRetornosLoaded(true);
    } catch { /* silent */ }
    finally { setRetornosLoading(false); }
  }, [clube?.id, getToken, retornosLoaded]);

  const fetchAnaliseData = useCallback(async (cotistaId) => {
    if (!cotistaId || !clube?.id) return;
    setAnaliseLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE}/api/v1/clubes/${clube.id}/movimentacoes?cotista_id=${cotistaId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setAnaliseMovimentacoes(data);
    } catch { /* silent */ }
    finally { setAnaliseLoading(false); }
  }, [clube?.id, getToken]);

  const fetchComparacaoData = useCallback(async (cotistaId) => {
    if (!clube?.id || comparacaoData[cotistaId]) return;
    setComparacaoLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE}/api/v1/clubes/${clube.id}/movimentacoes?cotista_id=${cotistaId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setComparacaoData(prev => ({ ...prev, [cotistaId]: data }));
    } catch { /* silent */ }
    finally { setComparacaoLoading(false); }
  }, [clube?.id, getToken, comparacaoData]);

  // ── Lazy fetch GMT members on first TABELA visit ──────────────────────
  useEffect(() => {
    if (activeView === 'tabela' && gmtMembers.length === 0 && !membersLoading) {
      fetchGmtMembers();
    }
  }, [activeView]);

  // ── ANÁLISE useEffects ────────────────────────────────────────────────
  useEffect(() => {
    if (activeView === 'analise' && !navHistoryLoaded) {
      fetchNavHistory();
    }
    if (activeView === 'analise' && !retornosLoaded && clube?.id) {
      fetchRetornos();
    }
  }, [activeView, navHistoryLoaded, retornosLoaded, clube?.id, fetchNavHistory, fetchRetornos]);

  useEffect(() => {
    if (activeView === 'resumo' && !retornosLoaded && clube?.id) {
      fetchRetornos();
    }
  }, [activeView, retornosLoaded, clube?.id, fetchRetornos]);

  useEffect(() => {
    if (activeView === 'analise' && !analiseSelectedId && cotistas.length > 0) {
      const first = cotistas.find(c => c.ativo !== false);
      if (first) setAnaliseSelectedId(first.id);
    }
  }, [activeView, cotistas, analiseSelectedId]);

  useEffect(() => {
    if (activeView === 'analise' && analiseMode === 'individual' && analiseSelectedId) {
      fetchAnaliseData(analiseSelectedId);
    }
  }, [analiseSelectedId, analiseMode, activeView, fetchAnaliseData]);

  useEffect(() => {
    if (activeView === 'analise' && analiseMode === 'comparacao') {
      comparacaoIds.forEach(id => {
        if (!comparacaoData[id]) {
          fetchComparacaoData(id);
        }
      });
    }
  }, [comparacaoIds, analiseMode, activeView, comparacaoData, fetchComparacaoData]);

  // ── Compute cost basis and return for selected cotista ───────────────────
  const costBasisCota = useMemo(() => {
    if (!movimentacoes.length) return clube?.valor_cota_inicial ?? null;
    const firstAporte = movimentacoes
      .filter(m => m.tipo === 'aporte' && m.valor_cota)
      .sort((a, b) => (a.data_solicitacao ?? '').localeCompare(b.data_solicitacao ?? ''))[0];
    return firstAporte?.valor_cota ?? clube?.valor_cota_inicial ?? null;
  }, [movimentacoes, clube]);

  const retornoDesdeEntrada = useMemo(() => {
    if (!navLatest?.valor_cota || !costBasisCota) return null;
    return ((navLatest.valor_cota / costBasisCota) - 1) * 100;
  }, [navLatest, costBasisCota]);

  // ── ANÁLISE computed values ─────────────────────────────────────────────
  const filteredNavHistory = useMemo(() => {
    if (!navHistory.length) return [];
    if (analiseTimeWindow === 'ALL') return navHistory;
    const cutoff = new Date();
    const months = { '3M': 3, '6M': 6, '1Y': 12 };
    cutoff.setMonth(cutoff.getMonth() - months[analiseTimeWindow]);
    return navHistory.filter(n => new Date(n.data) >= cutoff);
  }, [navHistory, analiseTimeWindow]);

  const analiseRetorno = useMemo(() => {
    if (!navLatest?.valor_cota) return null;
    const firstAporte = [...analiseMovimentacoes]
      .filter(m => m.tipo === 'aporte' && m.valor_cota)
      .sort((a, b) => (a.data_solicitacao ?? '').localeCompare(b.data_solicitacao ?? ''))[0];
    const costBasis = firstAporte?.valor_cota ?? clube?.valor_cota_inicial ?? null;
    if (!costBasis) return null;
    return ((navLatest.valor_cota / costBasis) - 1) * 100;
  }, [analiseMovimentacoes, navLatest, clube]);

  const analiseTotalAportado = useMemo(() =>
    analiseMovimentacoes
      .filter(m => m.tipo === 'aporte' && m.status === 'convertido')
      .reduce((sum, m) => sum + (m.valor_brl ?? 0), 0),
    [analiseMovimentacoes]
  );

  const analiseCotas = useMemo(() => {
    const c = cotistas.find(c => c.id === analiseSelectedId);
    return c ? parseFloat(c.cotas_detidas) : 0;
  }, [cotistas, analiseSelectedId]);

  const analisePatrimonio = useMemo(() =>
    navLatest?.valor_cota ? analiseCotas * navLatest.valor_cota : null,
    [analiseCotas, navLatest]
  );

  // ── Loading / Error / Empty ──────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: BG_PAGE, fontFamily: MONO, gap: 12,
      }}>
        <div style={{ fontSize: 11, color: ACCENT, letterSpacing: '0.2em' }}>MEMBROS</div>
        <div style={{ fontSize: 12, color: TXT_2 }}>Carregando dados...</div>
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
        <div style={{ fontSize: 11, color: RED, letterSpacing: '0.1em' }}>ERRO</div>
        <div style={{ fontSize: 12, color: TXT_2, maxWidth: 400, textAlign: 'center' }}>{error}</div>
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
      </div>
    );
  }

  const valorAtual = selectedCotista && navLatest?.valor_cota
    ? parseFloat(selectedCotista.cotas_detidas) * navLatest.valor_cota
    : null;

  const equityPct = selectedCotista && totalCotas > 0
    ? (parseFloat(selectedCotista.cotas_detidas) / totalCotas * 100)
    : 0;

  const shellPatrimonio = navLatest?.valor_cota != null ? totalCotas * navLatest.valor_cota : null;

  const PIE_COLORS = ['#3b82f6', '#C5A059', '#00E676', '#ef4444', '#8b5cf6', '#f59e0b'];

  const renderPieChart = () => {
    if (!perCotistaData.length) return null;
    const W = 200, H = 200, cx = 100, cy = 100, r = 75;
    let startAngle = -Math.PI / 2;
    const slices = perCotistaData.map((d, i) => {
      const angle = (d.participacao / 100) * 2 * Math.PI;
      const endAngle = startAngle + angle;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;
      const color = PIE_COLORS[i % PIE_COLORS.length];
      const isBreach = d.participacao > 40;
      const path = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
      const slice = { path, color, isBreach, ...d };
      startAngle = endAngle;
      return slice;
    });
    return (
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 200 }}>
          {slices.map((s, i) => (
            <path key={i} d={s.path} fill={s.color}
              stroke={s.isBreach ? '#ef4444' : BG_CARD} strokeWidth={s.isBreach ? 2 : 1} />
          ))}
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
            fill={TXT_2} fontSize={11} fontFamily={MONO}>{cotistasAtivos.length}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle"
            fill={TXT_2} fontSize={8} fontFamily={MONO}>cotistas</text>
        </svg>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {slices.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontFamily: MONO, color: s.isBreach ? '#ef4444' : TXT_2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                {s.nome}
              </span>
              <span style={{ fontSize: 11, fontFamily: MONO, color: s.isBreach ? '#ef4444' : TXT_1, marginLeft: 'auto' }}>
                {s.participacao.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBarChart = () => {
    if (!perCotistaData.length) return null;
    const maxParticipacao = Math.max(...perCotistaData.map(d => d.participacao));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {perCotistaData.map((d, i) => {
          const color = PIE_COLORS[i % PIE_COLORS.length];
          const isBreach = d.participacao > 40;
          const barColor = isBreach ? '#ef4444' : color;
          const barWidth = maxParticipacao > 0 ? (d.participacao / maxParticipacao) * 100 : 0;
          return (
            <div key={d.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontFamily: MONO, color: TXT_2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                  {d.nome}
                </span>
                <span style={{ fontSize: 11, fontFamily: MONO, color: isBreach ? '#ef4444' : TXT_1, flexShrink: 0 }}>
                  {d.participacao.toFixed(2)}%
                </span>
              </div>
              <div style={{ height: 6, background: BORDER2, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${barWidth}%`, background: barColor, borderRadius: 3, transition: 'width 0.3s ease' }} />
              </div>
              {isBreach && (
                <div style={{ fontSize: 9, fontFamily: MONO, color: '#ef4444', marginTop: 2 }}>
                  ⚠ acima de 40% — limite CVM
                </div>
              )}
            </div>
          );
        })}
        <div style={{ marginTop: 4, fontSize: 9, fontFamily: MONO, color: 'rgba(255,255,255,0.25)' }}>
          Limite CVM: 40% por cotista
        </div>
      </div>
    );
  };

  const TD = {
    padding: '10px 8px',
    fontSize: 13,
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    verticalAlign: 'middle',
  };

  return (
    <ClubeShell
      clubeId={clubeIdParam}
      activePage="membros"
      clubeNome={clube?.nome}
      clubeStatus={clube?.status}
      patrimonio={shellPatrimonio}
      valorCota={navLatest?.valor_cota ?? null}
      cotasEmitidas={totalCotas || null}
      pendingCount={0}
      headerLeft={
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: TXT_2 }}>
          <span style={{ color: ACCENT }}>MEMBROS</span>
        </span>
      }
      headerRight={
        hasRole(user?.role, 'club_manager') ? (
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: 'var(--c-accent-dim)',
              border: '1px solid rgba(59,130,246,0.4)',
              color: ACCENT, fontFamily: MONO, fontSize: 10,
              letterSpacing: '0.1em', padding: '5px 11px',
              cursor: 'pointer', borderRadius: 3,
            }}
          >+ NOVO COTISTA</button>
        ) : null
      }
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 24px' }}>

        {/* ── SUMMARY BAR ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 16, padding: '20px 0 0', flexShrink: 0 }}>
          {[
            ['COTISTAS ATIVOS', String(cotistas.filter(c => c.ativo !== false).length)],
            ['COTAS EMITIDAS', totalCotas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })],
            ['PATRIMÔNIO TOTAL', navLatest?.valor_cota != null
              ? (totalCotas * navLatest.valor_cota).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : '—'],
          ].map(([label, value]) => (
            <div key={label} style={{
              background: '#0d1829', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 6, padding: '16px 20px', flex: 1,
            }}>
              <span style={{
                display: 'block', fontFamily: MONO, fontSize: 10,
                color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em',
                textTransform: 'uppercase', marginBottom: 8,
              }}>{label}</span>
              <div style={{ fontFamily: MONO, fontSize: 24, color: '#C5A059' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── VIEW TOGGLE ──────────────────────────────────────────────── */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'flex-end',
          borderBottom: `1px solid ${BORDER2}`, padding: '12px 0 0',
        }}>
          {[
            { id: 'resumo',   label: 'RESUMO' },
            { id: 'tabela',   label: 'TABELA' },
            { id: 'detalhes', label: 'DETALHES' },
            { id: 'analise', label: 'ANÁLISE' },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setActiveView(id)} style={{
              display: 'inline-block', padding: '10px 20px', fontSize: 10, letterSpacing: '0.1em',
              borderBottom: `2px solid ${activeView === id ? '#C5A059' : 'transparent'}`,
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              background: 'transparent', cursor: 'pointer',
              color: activeView === id ? TXT_1 : TXT_3,
              fontFamily: MONO, transition: 'color 0.15s',
            }}
              onMouseEnter={e => { if (activeView !== id) e.currentTarget.style.color = TXT_2; }}
              onMouseLeave={e => { if (activeView !== id) e.currentTarget.style.color = TXT_3; }}
            >{label}</button>
          ))}
        </div>

        {/* ── CONTENT AREA ─────────────────────────────────────────────── */}

        {activeView === 'resumo' && (
          <div style={{ flex: 1, overflow: 'auto', paddingTop: 24 }}>

            {/* KPI CARDS ROW */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>

              {/* Card 1: MAIOR POSIÇÃO */}
              <div style={{ flex: 1, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '16px 20px' }}>
                <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Maior Posição
                </div>
                <div style={{ fontSize: 18, color: TXT_1 }}>
                  {maiorPosicao?.nome || '—'}
                </div>
                {maiorPosicao && (
                  <div style={{ fontSize: 11, color: TXT_2, fontFamily: MONO, marginTop: 4 }}>
                    {(parseFloat(maiorPosicao.cotas_detidas) / totalCotas * 100).toFixed(1)}%
                    {parseFloat(maiorPosicao.cotas_detidas) / totalCotas * 100 > 40 && (
                      <span style={{ color: '#ef4444', marginLeft: 6 }}>⚠ CVM</span>
                    )}
                  </div>
                )}
              </div>

              {/* Card 2: RETORNO MÉDIO */}
              <div style={{ flex: 1, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '16px 20px' }}>
                <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Retorno Médio
                </div>
                <div style={{
                  fontSize: 24, fontFamily: MONO,
                  color: retornoMedio == null ? TXT_2
                    : retornoMedio > 0 ? GREEN
                    : retornoMedio < 0 ? '#ef4444'
                    : TXT_1,
                }}>
                  {retornoMedio != null
                    ? (retornoMedio > 0 ? '+' : '') + retornoMedio.toFixed(2) + '%'
                    : '—'}
                </div>
                <div style={{ fontSize: 11, color: TXT_2, marginTop: 4 }}>média por cotista</div>
              </div>

              {/* Card 3: CONCENTRAÇÃO CVM */}
              <div style={{
                flex: 1, background: BG_CARD,
                border: `1px solid ${cvmConcentrationStatus === 'breach' ? 'rgba(239,68,68,0.3)' : BORDER}`,
                borderRadius: 6, padding: '16px 20px',
              }}>
                <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Concentração CVM
                </div>
                <div style={{ fontSize: 18, fontFamily: MONO, color: cvmConcentrationStatus === 'breach' ? '#ef4444' : GREEN }}>
                  {cvmConcentrationStatus === 'breach' ? 'BREACH' : 'OK'}
                </div>
                <div style={{ fontSize: 11, color: TXT_2, marginTop: 4 }}>
                  {cvmConcentrationStatus === 'breach' ? 'cotista acima de 40%' : 'todos dentro do limite'}
                </div>
              </div>

              {/* Card 4: COTISTAS ATIVOS */}
              <div style={{ flex: 1, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '16px 20px' }}>
                <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Cotistas Ativos
                </div>
                <div style={{ fontSize: 24, fontFamily: MONO, color: '#C5A059' }}>
                  {cotistasAtivos.length}
                </div>
                <div style={{ fontSize: 11, color: TXT_2, fontFamily: MONO, marginTop: 4 }}>
                  de {cotistas.length} total
                </div>
              </div>

            </div>

            {/* CHARTS ROW */}
            <div style={{ display: 'flex', gap: 16 }}>

              {/* PIE CHART CARD */}
              <div style={{ flex: 1, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 20 }}>
                <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
                  Participação
                </div>
                {renderPieChart()}
              </div>

              {/* BAR CHART CARD */}
              <div style={{ flex: 1.5, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 20 }}>
                <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
                  Distribuição de Cotas
                </div>
                {renderBarChart()}
              </div>

            </div>
          </div>
        )}

        {activeView === 'tabela' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 0' }}>

            {/* SEARCH BAR */}
            <input
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#0f1f2e',
                border: '1px solid rgba(51,65,85,0.5)',
                borderRadius: 3, color: '#e2e8f0',
                fontFamily: MONO, fontSize: 12,
                padding: '8px 10px', outline: 'none',
                marginBottom: 24,
              }}
              value={cotistasSearch}
              onChange={e => setCotistasSearch(e.target.value)}
              placeholder="Buscar por nome, CPF/CNPJ ou email..."
            />

            {/* SECTION 1: COTISTAS */}
            <div style={{ marginBottom: 8, fontSize: 10, fontFamily: MONO, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
              Cotistas
            </div>

            {filteredCotistas.length === 0 && cotistasSearch ? (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: MONO, fontSize: 12, padding: '16px 0' }}>
                Nenhum resultado para &ldquo;{cotistasSearch}&rdquo;
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
                <thead>
                  <tr>
                    {['NOME', 'CPF / CNPJ', 'EMAIL', 'COTAS', 'ENTRADA', 'VALOR ATUAL', 'PARTICIPAÇÃO', 'GMT'].map(col => (
                      <th key={col} style={{
                        fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.35)',
                        letterSpacing: '0.08em', textAlign: col === 'PARTICIPAÇÃO' ? 'right' : col === 'GMT' ? 'center' : 'left',
                        paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)',
                        fontWeight: 'normal',
                      }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCotistas.map(c => {
                    const cotas = parseFloat(c.cotas_detidas);
                    const valorAtual = navLatest?.valor_cota ? cotas * navLatest.valor_cota : null;
                    const participacao = totalCotas > 0 ? (cotas / totalCotas) * 100 : 0;
                    return (
                      <tr key={c.id} style={{ cursor: 'default' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={TD}>{c.nome}</td>
                        <td style={{ ...TD, fontFamily: MONO, fontSize: 11 }}>{c.cpf_cnpj || '—'}</td>
                        <td style={{ ...TD, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{c.email || '—'}</td>
                        <td style={{ ...TD, fontFamily: MONO }}>{cotas.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}</td>
                        <td style={{ ...TD, fontFamily: MONO, fontSize: 11 }}>{c.data_entrada?.split('-').reverse().join('/')}</td>
                        <td style={{ ...TD, fontFamily: MONO, color: '#C5A059' }}>
                          {valorAtual != null ? valorAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                        </td>
                        <td style={{ ...TD, textAlign: 'right', fontFamily: MONO, color: participacao > 40 ? '#ef4444' : 'inherit' }}>
                          {participacao.toFixed(2)}%
                        </td>
                        <td style={{ ...TD, textAlign: 'center' }}>
                          {c.auth_user_id ? (
                            <span style={{ fontSize: 9, fontFamily: MONO, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 2, background: 'rgba(0,230,118,0.1)', color: '#00E676', border: '1px solid rgba(0,230,118,0.2)' }}>VINCULADO</span>
                          ) : (
                            <span style={{ color: TXT_3, fontSize: 11 }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!cotistasSearch && (
                    <tr>
                      <td style={{ ...TD, fontFamily: MONO, color: '#C5A059', borderTop: '1px solid rgba(255,255,255,0.08)' }}>Total</td>
                      <td style={TD}>—</td>
                      <td style={TD}>—</td>
                      <td style={{ ...TD, fontFamily: MONO, color: '#C5A059' }}>{totalCotas.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}</td>
                      <td style={TD}>—</td>
                      <td style={{ ...TD, fontFamily: MONO, color: '#C5A059' }}>
                        {navLatest?.valor_cota ? (totalCotas * navLatest.valor_cota).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                      </td>
                      <td style={{ ...TD, textAlign: 'right', fontFamily: MONO, color: '#C5A059' }}>100%</td>
                      <td style={TD}>—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* SECTION DIVIDER */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '8px 0 28px' }} />

            {/* SECTION 2: GESTÃO DE ACESSO GMT */}
            <div style={{ marginBottom: 4, fontSize: 10, fontFamily: MONO, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
              Gestão de Acesso GMT
            </div>
            <div style={{ marginBottom: 20, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              Usuários com acesso à plataforma
            </div>

            {membersLoading && (
              <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                Carregando...
              </div>
            )}

            {!membersLoading && gmtMembers.length === 0 && (
              <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>
                Nenhum usuário com acesso à plataforma
              </div>
            )}

            {gmtMembers.map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{m.name}</div>
                  <div style={{ fontSize: 11, fontFamily: MONO, color: 'rgba(255,255,255,0.4)' }}>{m.email}</div>
                </div>
                <div style={{
                  fontSize: 9, fontFamily: MONO, letterSpacing: '0.06em',
                  padding: '2px 6px', borderRadius: 2,
                  background: m.role === 'club_manager' ? 'rgba(197,160,89,0.15)' : 'rgba(59,130,246,0.15)',
                  color: m.role === 'club_manager' ? '#C5A059' : '#3b82f6',
                  border: `1px solid ${m.role === 'club_manager' ? 'rgba(197,160,89,0.3)' : 'rgba(59,130,246,0.3)'}`,
                }}>
                  {m.role === 'club_manager' ? 'MANAGER' : 'MEMBER'}
                </div>
              </div>
            ))}

            {/* REGISTRATION LINK */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 16, marginTop: 16 }}>
              <div style={{ fontSize: 10, fontFamily: MONO, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>
                Link de Registro
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
                Compartilhe com cotistas que ainda não têm conta GMT
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                {window.location.origin}/register
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin + '/register').then(() => {
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  });
                }}
                style={{
                  background: linkCopied ? 'rgba(0,230,118,0.1)' : '#C5A059',
                  color: linkCopied ? '#00E676' : '#000',
                  border: linkCopied ? '1px solid #00E676' : 'none',
                  borderRadius: 3, padding: '6px 14px',
                  fontFamily: MONO, fontSize: 11, cursor: 'pointer',
                  letterSpacing: '0.06em',
                }}
              >
                {linkCopied ? 'COPIADO ✓' : 'COPIAR'}
              </button>
            </div>

          </div>
        )}

        {activeView === 'detalhes' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left panel: Cotista list ──────────────────────────────────── */}
        <div style={{
          width: 280, flexShrink: 0, borderRight: `1px solid ${BORDER}`,
          overflowY: 'auto', background: BG_PAGE,
        }}>
          <div style={{
            padding: '14px 16px 8px', fontSize: 10, color: TXT_3,
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            COTISTAS ({cotistas.length})
          </div>

          {cotistas.map(c => {
            const isActive = c.id === selectedId;
            const cotas = parseFloat(c.cotas_detidas ?? 0);
            const pct = totalCotas > 0 ? (cotas / totalCotas * 100).toFixed(1) : '0.0';
            const sColor = SUITABILITY_COLORS[c.perfil_suitability];

            return (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  background: isActive ? BG_CARD2 : 'transparent',
                  borderLeft: isActive ? `3px solid ${ACCENT}` : '3px solid transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = BG_CARD; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* Active dot */}
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                    background: c.ativo ? GREEN : TXT_3,
                  }} />
                  <span style={{ fontSize: 12, color: TXT_1 }}>{c.nome}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, paddingLeft: 11 }}>
                  <span style={{ fontSize: 10, color: TXT_2 }}>{pct}%</span>
                  {sColor && (
                    <span style={{
                      fontSize: 9, fontFamily: MONO, padding: '1px 6px',
                      borderRadius: 3, letterSpacing: '0.06em',
                      background: `${sColor}18`,
                      border: `1px solid ${sColor}50`,
                      color: sColor, textTransform: 'uppercase',
                    }}>
                      {c.perfil_suitability}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Right panel: Member detail ────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {!selectedCotista ? (
            <div style={{
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: MONO, fontSize: 12, color: TXT_3,
            }}>
              Selecione um cotista
            </div>
          ) : (
            <div style={{ maxWidth: 900 }}>
              {/* Header */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: TXT_1 }}>{selectedCotista.nome}</span>
                  {SUITABILITY_COLORS[selectedCotista.perfil_suitability] && (
                    <span style={{
                      fontSize: 9, fontFamily: MONO, padding: '2px 8px',
                      borderRadius: 3, letterSpacing: '0.06em',
                      background: `${SUITABILITY_COLORS[selectedCotista.perfil_suitability]}18`,
                      border: `1px solid ${SUITABILITY_COLORS[selectedCotista.perfil_suitability]}50`,
                      color: SUITABILITY_COLORS[selectedCotista.perfil_suitability],
                      textTransform: 'uppercase',
                    }}>
                      {selectedCotista.perfil_suitability}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: TXT_3 }}>
                  Entrada: {selectedCotista.data_entrada?.split('-').reverse().join('/') ?? '—'}
                </div>
              </div>

              {/* KPI grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                {/* Cotas */}
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16 }}>
                  <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    COTAS DETIDAS
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: TXT_1 }}>
                    {parseFloat(selectedCotista.cotas_detidas).toFixed(6)}
                  </div>
                  <div style={{ fontSize: 10, color: TXT_2, marginTop: 4 }}>cotas</div>
                </div>

                {/* Equity % */}
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16 }}>
                  <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    PARTICIPAÇÃO
                  </div>
                  <div style={{
                    fontSize: 18, fontWeight: 600,
                    color: equityPct > 40 ? RED : equityPct > 35 ? AMBER : TXT_1,
                  }}>
                    {equityPct.toFixed(2)}%
                  </div>
                  {equityPct > 40 && (
                    <div style={{ fontSize: 10, color: RED, marginTop: 4 }}>Acima do limite CVM (40%)</div>
                  )}
                </div>

                {/* Valor atual */}
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16 }}>
                  <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    VALOR ATUAL
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: TXT_1 }}>
                    {valorAtual != null
                      ? Number(valorAtual).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : '—'}
                  </div>
                </div>

                {/* Retorno */}
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16 }}>
                  <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    RETORNO DESDE ENTRADA
                  </div>
                  <div style={{
                    fontSize: 18, fontWeight: 600,
                    color: retornoDesdeEntrada == null ? TXT_2
                      : retornoDesdeEntrada > 0 ? GREEN
                      : retornoDesdeEntrada < 0 ? RED
                      : TXT_2,
                  }}>
                    {retornoDesdeEntrada != null
                      ? `${retornoDesdeEntrada > 0 ? '+' : ''}${retornoDesdeEntrada.toFixed(2)}%`
                      : '—'}
                  </div>
                </div>
              </div>

              {/* ── Movimentações table ──────────────────────────────────── */}
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  fontSize: 10, color: TXT_3, letterSpacing: '0.12em',
                  textTransform: 'uppercase', marginBottom: 8,
                }}>
                  MOVIMENTAÇÕES
                </div>

                {movLoading ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 11, color: TXT_3 }}>
                    CARREGANDO...
                  </div>
                ) : movimentacoes.length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 11, color: TXT_3 }}>
                    Nenhuma movimentação registrada.
                  </div>
                ) : (
                  <div style={{
                    background: BG_CARD, border: `1px solid ${BORDER}`,
                    borderRadius: 6, overflow: 'hidden',
                  }}>
                    {/* Header */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '90px 70px 110px 120px 130px',
                      gap: 8, padding: '8px 16px',
                      borderBottom: `1px solid ${BORDER}`,
                    }}>
                      {['DATA', 'TIPO', 'VALOR', 'COTAS Δ', 'STATUS'].map(h => (
                        <div key={h} style={{
                          fontFamily: MONO, fontSize: 9, color: TXT_3,
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                        }}>{h}</div>
                      ))}
                    </div>

                    {/* Rows */}
                    {movimentacoes.map(m => {
                      const badge = STATUS_BADGE[m.status] ?? { label: m.status?.toUpperCase(), bg: 'transparent', color: TXT_3 };
                      const isCancelled = m.status === 'cancelado';

                      return (
                        <div key={m.id} style={{
                          display: 'grid', gridTemplateColumns: '90px 70px 110px 120px 130px',
                          gap: 8, padding: '8px 16px',
                          borderBottom: `1px solid ${BORDER2}`,
                        }}>
                          <div style={{ fontSize: 11, color: TXT_2 }}>
                            {m.data_solicitacao?.split('-').reverse().join('/') ?? '—'}
                          </div>
                          <div style={{
                            fontSize: 10, textTransform: 'uppercase',
                            color: m.tipo === 'aporte' ? GREEN : m.tipo === 'resgate' ? AMBER : TXT_3,
                          }}>
                            {m.tipo}
                          </div>
                          <div style={{
                            fontSize: 11, color: TXT_1,
                            textDecoration: isCancelled ? 'line-through' : 'none',
                          }}>
                            {Number(m.valor_brl).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                          <div style={{
                            fontSize: 11,
                            color: m.cotas_delta == null ? TXT_3
                              : m.cotas_delta > 0 ? GREEN
                              : m.cotas_delta < 0 ? RED
                              : TXT_2,
                          }}>
                            {m.cotas_delta != null ? Number(m.cotas_delta).toFixed(6) : '—'}
                          </div>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center',
                            fontFamily: MONO, fontSize: 9, fontWeight: 600,
                            letterSpacing: '0.06em', padding: '2px 7px',
                            borderRadius: 3, background: badge.bg, color: badge.color,
                            width: 'fit-content',
                          }}>
                            {badge.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Documentos section ──────────────────────────────────── */}
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  fontSize: 10, color: TXT_3, letterSpacing: '0.12em',
                  textTransform: 'uppercase', marginBottom: 8,
                }}>
                  DOCUMENTOS ENVIADOS
                </div>

                {documentos.length === 0 ? (
                  <div style={{ padding: '16px 0', fontSize: 11, color: TXT_3 }}>
                    Nenhum documento enviado a este cotista.
                  </div>
                ) : (
                  <div style={{
                    background: BG_CARD, border: `1px solid ${BORDER}`,
                    borderRadius: 6, overflow: 'hidden',
                  }}>
                    {documentos.map(d => {
                      const tipoColors = {
                        anexo_b: ACCENT, relatorio_anual: GOLD,
                        declaracao_ir: GREEN, informe_rendimentos: GREEN,
                      };
                      const tColor = tipoColors[d.tipo] ?? TXT_3;
                      const dsColor = d.delivery_status === 'enviado' ? GREEN
                        : d.delivery_status === 'erro' ? RED : TXT_3;

                      return (
                        <div key={d.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '8px 16px', borderBottom: `1px solid ${BORDER2}`,
                        }}>
                          <span style={{
                            fontSize: 9, fontFamily: MONO, padding: '2px 6px',
                            borderRadius: 3, background: `${tColor}15`,
                            border: `1px solid ${tColor}40`, color: tColor,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                          }}>
                            {d.tipo}
                          </span>
                          <span style={{ fontSize: 10, color: TXT_2, flex: 1 }}>
                            {d.periodo ?? '—'}
                          </span>
                          <span style={{ fontSize: 10, color: TXT_3 }}>
                            {d.enviado_em ? new Date(d.enviado_em).toLocaleDateString('pt-BR') : '—'}
                          </span>
                          <span style={{
                            fontSize: 9, fontFamily: MONO, padding: '2px 6px',
                            borderRadius: 3, background: `${dsColor}15`,
                            color: dsColor, textTransform: 'uppercase',
                          }}>
                            {d.delivery_status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Action buttons ──────────────────────────────────────── */}
              {hasRole(user?.role, 'club_manager') && (
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button
                    onClick={() => setShowAporteModal(true)}
                    style={{
                      background: 'transparent', border: `1px solid ${ACCENT}`,
                      color: ACCENT, fontFamily: MONO, fontSize: 10,
                      letterSpacing: '0.1em', padding: '8px 16px',
                      cursor: 'pointer', borderRadius: 3,
                    }}
                  >+ REGISTRAR APORTE</button>
                  <button
                    onClick={() => setShowResgateModal(true)}
                    style={{
                      background: 'transparent', border: `1px solid ${AMBER}`,
                      color: AMBER, fontFamily: MONO, fontSize: 10,
                      letterSpacing: '0.1em', padding: '8px 16px',
                      cursor: 'pointer', borderRadius: 3,
                    }}
                  >+ REGISTRAR RESGATE</button>
                  {selectedCotista && (
                    <button
                      onClick={async () => {
                        try {
                          const token = await getToken();
                          const res = await fetch(
                            `${API_BASE}/api/v1/clubes/${clube?.id}/cotistas/${selectedCotista.id}/export`,
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          if (!res.ok) throw new Error(`Erro ${res.status}`);
                          const data = await res.json();
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `lgpd_${selectedCotista.nome.replace(/\s+/g, '_')}_${new Date().getFullYear()}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (err) {
                          alert(`Erro ao exportar: ${err.message}`);
                        }
                      }}
                      style={{
                        padding: '5px 11px', fontFamily: MONO, fontSize: 10,
                        background: 'transparent', border: `1px solid ${TXT_3}`,
                        color: TXT_3, borderRadius: 3, cursor: 'pointer',
                        letterSpacing: '0.08em',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = TXT_2; e.currentTarget.style.color = TXT_2; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = TXT_3; e.currentTarget.style.color = TXT_3; }}
                    >EXPORTAR DADOS (LGPD)</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        </div>
        )}

        {activeView === 'analise' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 0' }}>

            {/* MODE TOGGLE */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['individual', 'comparacao'].map(mode => (
                <button key={mode}
                  onClick={() => setAnaliseMode(mode)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px',
                    fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: analiseMode === mode ? '#C5A059' : 'rgba(255,255,255,0.4)',
                    borderBottom: analiseMode === mode ? '2px solid #C5A059' : '2px solid transparent',
                    marginBottom: -1,
                  }}>
                  {mode === 'individual' ? 'Individual' : 'Comparação'}
                </button>
              ))}
            </div>

            {/* INDIVIDUAL MODE */}
            {analiseMode === 'individual' && (
              <div style={{ display: 'flex', gap: 20 }}>

                {/* COTISTA SELECTOR — left column */}
                <div style={{ width: 220, flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontFamily: MONO, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Cotista
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {cotistas.filter(c => c.ativo !== false).map(c => (
                      <button key={c.id}
                        onClick={() => { setAnaliseSelectedId(c.id); setAnaliseMovimentacoes([]); }}
                        style={{
                          background: analiseSelectedId === c.id ? 'rgba(197,160,89,0.1)' : 'transparent',
                          border: 'none',
                          borderLeft: analiseSelectedId === c.id ? '2px solid #C5A059' : '2px solid transparent',
                          borderRadius: 3, cursor: 'pointer', padding: '8px 12px', textAlign: 'left', width: '100%',
                        }}>
                        <div style={{ fontSize: 12, color: analiseSelectedId === c.id ? '#C5A059' : '#e2e8f0' }}>
                          {c.nome}
                        </div>
                        {cotistasRetornos[c.id] != null && (
                          <div style={{ fontSize: 10, fontFamily: MONO, marginTop: 2, color: cotistasRetornos[c.id] >= 0 ? '#00E676' : '#ef4444' }}>
                            {(cotistasRetornos[c.id] > 0 ? '+' : '') + cotistasRetornos[c.id].toFixed(2) + '%'}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div style={{ flex: 1 }}>

                  {/* TIME WINDOW TOGGLE */}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                    {['3M', '6M', '1Y', 'ALL'].map(w => (
                      <button key={w}
                        onClick={() => setAnaliseTimeWindow(w)}
                        style={{
                          background: analiseTimeWindow === w ? 'rgba(197,160,89,0.15)' : 'transparent',
                          border: `1px solid ${analiseTimeWindow === w ? '#C5A059' : 'rgba(255,255,255,0.12)'}`,
                          borderRadius: 3, cursor: 'pointer', padding: '4px 10px',
                          fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em',
                          color: analiseTimeWindow === w ? '#C5A059' : 'rgba(255,255,255,0.4)',
                        }}>
                        {w}
                      </button>
                    ))}
                  </div>

                  {/* LOADING STATE */}
                  {analiseLoading && (
                    <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '24px 0' }}>
                      Carregando análise...
                    </div>
                  )}

                  {/* EMPTY STATE */}
                  {!analiseLoading && !analiseSelectedId && (
                    <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '24px 0' }}>
                      Selecione um cotista para ver a análise
                    </div>
                  )}

                  {/* KPI CARDS + CHARTS + TABLE */}
                  {!analiseLoading && analiseSelectedId && (
                    <div style={{ color: 'inherit', fontFamily: 'inherit' }}>

                      {/* KPI CARDS */}
                      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                        {/* RETORNO TOTAL */}
                        <div style={{ flex: 1, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '16px 20px' }}>
                          <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Retorno Total</div>
                          <div style={{ fontSize: 24, fontFamily: MONO, color: analiseRetorno == null ? TXT_2 : analiseRetorno > 0 ? '#00E676' : analiseRetorno < 0 ? '#ef4444' : TXT_1 }}>
                            {analiseRetorno != null ? (analiseRetorno > 0 ? '+' : '') + analiseRetorno.toFixed(2) + '%' : '—'}
                          </div>
                          <div style={{ fontSize: 11, color: TXT_2, marginTop: 4 }}>vs custo de aquisição</div>
                        </div>
                        {/* COTAS ATUAIS */}
                        <div style={{ flex: 1, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '16px 20px' }}>
                          <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Cotas Atuais</div>
                          <div style={{ fontSize: 24, fontFamily: MONO, color: '#C5A059' }}>
                            {analiseCotas.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}
                          </div>
                        </div>
                        {/* PATRIMÔNIO ATUAL */}
                        <div style={{ flex: 1, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '16px 20px' }}>
                          <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Patrimônio Atual</div>
                          <div style={{ fontSize: 24, fontFamily: MONO, color: TXT_1 }}>
                            {analisePatrimonio != null ? analisePatrimonio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                          </div>
                        </div>
                        {/* TOTAL APORTADO */}
                        <div style={{ flex: 1, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '16px 20px' }}>
                          <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Total Aportado</div>
                          <div style={{ fontSize: 24, fontFamily: MONO, color: TXT_1 }}>
                            {analiseTotalAportado > 0 ? analiseTotalAportado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                          </div>
                        </div>
                      </div>

                      {/* CHART 1: EVOLUÇÃO DO RETORNO */}
                      {(() => {
                        const W = 800, H = 180;
                        const PAD = { t: 16, r: 20, b: 28, l: 48 };
                        const cW = W - PAD.l - PAD.r;
                        const cH = H - PAD.t - PAD.b;
                        const N = filteredNavHistory.length;
                        const firstAporte = [...analiseMovimentacoes]
                          .filter(m => m.tipo === 'aporte' && m.valor_cota)
                          .sort((a, b) => (a.data_solicitacao ?? '').localeCompare(b.data_solicitacao ?? ''))[0];
                        const costBasis = firstAporte?.valor_cota ?? clube?.valor_cota_inicial ?? null;
                        const retornoPts = N > 0 && costBasis
                          ? filteredNavHistory.map(nav => ((nav.valor_cota / costBasis) - 1) * 100)
                          : [];
                        const minV = retornoPts.length ? Math.min(...retornoPts, 0) : -1;
                        const maxV = retornoPts.length ? Math.max(...retornoPts, 0) : 1;
                        const range = maxV - minV || 1;
                        const toX = i => PAD.l + (i / Math.max(N - 1, 1)) * cW;
                        const toY = v => PAD.t + cH - ((v - minV) / range) * cH;
                        const zeroY = toY(0);
                        const lineColor = (analiseRetorno ?? 0) >= 0 ? '#00E676' : '#ef4444';
                        const fillColor = (analiseRetorno ?? 0) >= 0 ? 'rgba(0,230,118,0.08)' : 'rgba(239,68,68,0.08)';
                        const events = analiseMovimentacoes
                          .filter(m => m.status === 'convertido' && m.data_conversao)
                          .map(m => ({ data: m.data_conversao, tipo: m.tipo }));
                        return (
                          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 20, marginBottom: 16 }}>
                            <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Evolução do Retorno</div>
                            {retornoPts.length < 2 ? (
                              <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '16px 0', textAlign: 'center' }}>Dados insuficientes para o período</div>
                            ) : (
                              <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
                                <line x1={PAD.l} y1={zeroY} x2={W - PAD.r} y2={zeroY} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                                <polygon
                                  points={[
                                    ...retornoPts.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`),
                                    `${toX(N - 1).toFixed(1)},${zeroY.toFixed(1)}`,
                                    `${toX(0).toFixed(1)},${zeroY.toFixed(1)}`,
                                  ].join(' ')}
                                  fill={fillColor}
                                />
                                <polyline
                                  points={retornoPts.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')}
                                  fill="none" stroke={lineColor} strokeWidth={1.5}
                                />
                                {events.map((ev, ei) => {
                                  const navIdx = filteredNavHistory.findIndex(n => n.data >= ev.data);
                                  if (navIdx < 0) return null;
                                  const mx = toX(navIdx);
                                  const my = H - PAD.b + 4;
                                  const isAporte = ev.tipo === 'aporte';
                                  const mc = isAporte ? '#00E676' : '#ef4444';
                                  const pts = isAporte
                                    ? `${mx},${my} ${mx - 4},${my + 8} ${mx + 4},${my + 8}`
                                    : `${mx},${my + 8} ${mx - 4},${my} ${mx + 4},${my}`;
                                  return <polygon key={ei} points={pts} fill={mc} opacity={0.8} />;
                                })}
                                <text x={PAD.l - 4} y={PAD.t + 4} textAnchor="end" fontSize={9} fontFamily={MONO} fill="rgba(255,255,255,0.3)">{maxV.toFixed(1)}%</text>
                                <text x={PAD.l - 4} y={zeroY} textAnchor="end" dominantBaseline="middle" fontSize={9} fontFamily={MONO} fill="rgba(255,255,255,0.3)">0%</text>
                                <text x={PAD.l - 4} y={H - PAD.b} textAnchor="end" fontSize={9} fontFamily={MONO} fill="rgba(255,255,255,0.3)">{minV.toFixed(1)}%</text>
                              </svg>
                            )}
                          </div>
                        );
                      })()}

                      {/* CHART 2: EVOLUÇÃO DE COTAS */}
                      {(() => {
                        const cotasHistory = [...analiseMovimentacoes]
                          .filter(m => m.status === 'convertido' && m.data_conversao)
                          .sort((a, b) => a.data_conversao.localeCompare(b.data_conversao))
                          .reduce((acc, m) => {
                            const prev = acc.length ? acc[acc.length - 1].cotas : 0;
                            acc.push({ data: m.data_conversao, cotas: prev + parseFloat(m.cotas_delta ?? 0) });
                            return acc;
                          }, []);
                        const W = 800, H = 130;
                        const PAD = { t: 12, r: 20, b: 24, l: 48 };
                        const cW = W - PAD.l - PAD.r;
                        const cH = H - PAD.t - PAD.b;
                        const N = cotasHistory.length;
                        const minV = 0;
                        const maxV = N ? Math.max(...cotasHistory.map(p => p.cotas), 0) : 1;
                        const range = maxV - minV || 1;
                        const toX = i => PAD.l + (i / Math.max(N - 1, 1)) * cW;
                        const toY = v => PAD.t + cH - ((v - minV) / range) * cH;
                        return (
                          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 20, marginBottom: 16 }}>
                            <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Evolução de Cotas</div>
                            {cotasHistory.length < 2 ? (
                              <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '16px 0', textAlign: 'center' }}>Sem histórico de movimentações registrado</div>
                            ) : (
                              <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
                                <polygon
                                  points={[
                                    ...cotasHistory.map((p, i) => `${toX(i).toFixed(1)},${toY(p.cotas).toFixed(1)}`),
                                    `${toX(N - 1).toFixed(1)},${(PAD.t + cH).toFixed(1)}`,
                                    `${toX(0).toFixed(1)},${(PAD.t + cH).toFixed(1)}`,
                                  ].join(' ')}
                                  fill="rgba(197,160,89,0.08)"
                                />
                                <polyline
                                  points={cotasHistory.map((p, i) => `${toX(i).toFixed(1)},${toY(p.cotas).toFixed(1)}`).join(' ')}
                                  fill="none" stroke="#C5A059" strokeWidth={1.5}
                                />
                                <text x={PAD.l - 4} y={PAD.t + 4} textAnchor="end" fontSize={9} fontFamily={MONO} fill="rgba(255,255,255,0.3)">{maxV.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</text>
                                <text x={PAD.l - 4} y={H - PAD.b} textAnchor="end" fontSize={9} fontFamily={MONO} fill="rgba(255,255,255,0.3)">0</text>
                              </svg>
                            )}
                          </div>
                        );
                      })()}

                      {/* CHART 3: PATRIMÔNIO AO LONGO DO TEMPO */}
                      {(() => {
                        const movsSorted = [...analiseMovimentacoes]
                          .filter(m => m.status === 'convertido' && m.data_conversao)
                          .sort((a, b) => a.data_conversao.localeCompare(b.data_conversao));
                        const W = 800, H = 130;
                        const PAD = { t: 12, r: 20, b: 24, l: 60 };
                        const cW = W - PAD.l - PAD.r;
                        const cH = H - PAD.t - PAD.b;
                        const N = filteredNavHistory.length;
                        const patrimonioPts = filteredNavHistory.map(nav => {
                          let cotas = movsSorted
                            .filter(m => m.data_conversao <= nav.data)
                            .reduce((sum, m) => sum + parseFloat(m.cotas_delta ?? 0), 0);
                          if (cotas === 0) cotas = analiseCotas;
                          return cotas * nav.valor_cota;
                        });
                        const minV = 0;
                        const maxV = Math.max(...patrimonioPts, 1);
                        const range = maxV - minV;
                        const toX = i => PAD.l + (i / Math.max(N - 1, 1)) * cW;
                        const toY = v => PAD.t + cH - ((v - minV) / range) * cH;
                        return (
                          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 20, marginBottom: 16 }}>
                            <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Patrimônio ao Longo do Tempo</div>
                            {patrimonioPts.length < 2 ? (
                              <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '16px 0', textAlign: 'center' }}>NAV insuficiente para exibir evolução</div>
                            ) : (
                              <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
                                <polyline
                                  points={patrimonioPts.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')}
                                  fill="none" stroke="#C5A059" strokeWidth={1.5}
                                />
                                <text x={PAD.l - 4} y={PAD.t + 4} textAnchor="end" fontSize={9} fontFamily={MONO} fill="rgba(255,255,255,0.3)">{(maxV / 1000).toFixed(0)}k</text>
                                <text x={PAD.l - 4} y={H - PAD.b} textAnchor="end" fontSize={9} fontFamily={MONO} fill="rgba(255,255,255,0.3)">0</text>
                              </svg>
                            )}
                          </div>
                        );
                      })()}

                      {/* MOVIMENTAÇÕES TABLE */}
                      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 20, marginTop: 4 }}>
                        <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Histórico de Movimentações</div>
                        {analiseMovimentacoes.length === 0 ? (
                          <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Sem movimentações registradas</div>
                        ) : (() => {
                          const cutoff = (() => {
                            if (analiseTimeWindow === 'ALL') return null;
                            const d = new Date();
                            d.setMonth(d.getMonth() - { '3M': 3, '6M': 6, '1Y': 12 }[analiseTimeWindow]);
                            return d;
                          })();
                          const filtered = [...analiseMovimentacoes]
                            .filter(m => {
                              if (!cutoff) return true;
                              const d = m.data_conversao ?? m.data_solicitacao;
                              return d && new Date(d) >= cutoff;
                            })
                            .sort((a, b) => (b.data_conversao ?? b.data_solicitacao ?? '').localeCompare(a.data_conversao ?? a.data_solicitacao ?? ''));
                          if (filtered.length === 0) return (
                            <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Sem movimentações no período selecionado</div>
                          );
                          return (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  {['DATA', 'TIPO', 'VALOR', 'COTAS Δ', 'VALOR COTA', 'STATUS'].map(col => (
                                    <th key={col} style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textAlign: 'left', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 'normal' }}>{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {filtered.map(m => {
                                  const d = m.data_conversao ?? m.data_solicitacao;
                                  return (
                                    <tr key={m.id}>
                                      <td style={TD}>{d?.split('-').reverse().join('/') ?? '—'}</td>
                                      <td style={TD}>
                                        <span style={{
                                          fontSize: 9, fontFamily: MONO, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 2,
                                          background: m.tipo === 'aporte' ? 'rgba(0,230,118,0.15)' : 'rgba(239,68,68,0.15)',
                                          color: m.tipo === 'aporte' ? '#00E676' : '#ef4444',
                                          border: `1px solid ${m.tipo === 'aporte' ? 'rgba(0,230,118,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                        }}>{m.tipo?.toUpperCase()}</span>
                                      </td>
                                      <td style={{ ...TD, fontFamily: MONO }}>{m.valor_brl != null ? Number(m.valor_brl).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</td>
                                      <td style={{ ...TD, fontFamily: MONO, color: parseFloat(m.cotas_delta ?? 0) >= 0 ? '#00E676' : '#ef4444' }}>
                                        {m.cotas_delta != null ? (parseFloat(m.cotas_delta) > 0 ? '+' : '') + parseFloat(m.cotas_delta).toLocaleString('pt-BR', { maximumFractionDigits: 6 }) : '—'}
                                      </td>
                                      <td style={{ ...TD, fontFamily: MONO }}>{m.valor_cota != null ? Number(m.valor_cota).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</td>
                                      <td style={TD}>
                                        <span style={{
                                          fontSize: 9, fontFamily: MONO, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 2,
                                          background: m.status === 'convertido' ? 'rgba(0,230,118,0.1)' : m.status === 'pendente' ? 'rgba(197,160,89,0.1)' : 'rgba(255,255,255,0.05)',
                                          color: m.status === 'convertido' ? '#00E676' : m.status === 'pendente' ? '#C5A059' : TXT_2,
                                        }}>{m.status?.toUpperCase() ?? '—'}</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          );
                        })()}
                      </div>

                    </div>
                  )}

                </div>
              </div>
            )}

            {/* COMPARAÇÃO MODE */}
            {analiseMode === 'comparacao' && (
              <div style={{ color: 'inherit' }}>

                {/* COTISTA SEARCH SELECTOR */}
                {(() => {
                  const COLORS = ['#3b82f6', '#C5A059', '#00E676', '#ef4444', '#8b5cf6', '#f59e0b'];
                  return (
                    <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>

                      {/* LEFT: SELECTED COTISTAS PANEL */}
                      <div style={{ width: 240, flexShrink: 0, background: BG_CARD2, border: `1px solid ${BORDER2}`, borderRadius: 6, minHeight: 120, padding: 12 }}>
                        <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Selecionados</span>
                          <span style={{ color: comparacaoIds.length >= 5 ? '#ef4444' : TXT_3 }}>{comparacaoIds.length}/5</span>
                        </div>
                        {comparacaoIds.length === 0 ? (
                          <div style={{ fontSize: 11, color: TXT_3, fontFamily: MONO, textAlign: 'center', padding: '12px 0' }}>Nenhum cotista selecionado</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {comparacaoIds.map((cid, idx) => {
                              const cotista = cotistas.find(c => c.id === cid);
                              const currentReturn = cotistasRetornos[cid] ?? null;
                              return (
                                <div key={cid} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: BG_CARD, borderRadius: 4, border: `1px solid ${BORDER}` }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[idx % 6], flexShrink: 0 }} />
                                  <span style={{ flex: 1, fontSize: 11, color: TXT_1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cotista?.nome ?? cid}</span>
                                  {currentReturn != null && (
                                    <span style={{ fontSize: 10, fontFamily: MONO, flexShrink: 0, color: currentReturn >= 0 ? '#00E676' : '#ef4444' }}>
                                      {(currentReturn > 0 ? '+' : '') + currentReturn.toFixed(2) + '%'}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => setComparacaoIds(prev => prev.filter(id => id !== cid))}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: TXT_3, fontSize: 14, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                                    onMouseEnter={e => e.currentTarget.style.color = TXT_1}
                                    onMouseLeave={e => e.currentTarget.style.color = TXT_3}
                                  >×</button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* RIGHT: SEARCH + DROPDOWN */}
                      <div style={{ flex: 1, position: 'relative' }}>
                        <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                          Buscar Cotista
                          {comparacaoIds.length >= 5 && <span style={{ color: '#ef4444', marginLeft: 8 }}>Máximo atingido</span>}
                        </div>
                        <input
                          style={{
                            width: '100%', boxSizing: 'border-box', background: BG_CARD2,
                            border: `1px solid ${comparacaoIds.length >= 5 ? 'rgba(239,68,68,0.3)' : BORDER2}`,
                            borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 12,
                            padding: '8px 10px', outline: 'none',
                            opacity: comparacaoIds.length >= 5 ? 0.5 : 1,
                          }}
                          value={comparacaoSearch}
                          onChange={e => setComparacaoSearch(e.target.value)}
                          placeholder={comparacaoIds.length >= 5 ? 'Máximo de 5 cotistas atingido' : 'Buscar por nome...'}
                          disabled={comparacaoIds.length >= 5}
                        />
                        {comparacaoSearch.trim().length > 0 && comparacaoIds.length < 5 && (() => {
                          const needle = comparacaoSearch.trim().toLowerCase();
                          const results = cotistas.filter(c => c.ativo !== false).filter(c => c.nome.toLowerCase().includes(needle)).slice(0, 8);
                          if (results.length === 0) return (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: BG_CARD2, border: `1px solid ${BORDER2}`, borderRadius: 4, padding: '10px 12px', fontSize: 11, fontFamily: MONO, color: TXT_3, zIndex: 10 }}>
                              Nenhum cotista encontrado
                            </div>
                          );
                          return (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: BG_CARD2, border: `1px solid ${BORDER2}`, borderRadius: 4, overflow: 'hidden', zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                              {results.map(c => {
                                const isSelected = comparacaoIds.includes(c.id);
                                return (
                                  <div key={c.id}
                                    onClick={() => { if (!isSelected) { setComparacaoIds(prev => [...prev, c.id]); setComparacaoSearch(''); } }}
                                    style={{ padding: '9px 12px', fontSize: 12, cursor: isSelected ? 'default' : 'pointer', color: isSelected ? TXT_3 : TXT_1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                  >
                                    <span>{c.nome}</span>
                                    {isSelected && <span style={{ fontSize: 9, fontFamily: MONO, color: '#C5A059', letterSpacing: '0.06em' }}>JÁ SELECIONADO</span>}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                    </div>
                  );
                })()}

                {/* TIME WINDOW TOGGLE */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                  {['3M', '6M', '1Y', 'ALL'].map(w => (
                    <button key={w}
                      onClick={() => setAnaliseTimeWindow(w)}
                      style={{
                        background: analiseTimeWindow === w ? 'rgba(197,160,89,0.15)' : 'transparent',
                        border: `1px solid ${analiseTimeWindow === w ? '#C5A059' : 'rgba(255,255,255,0.12)'}`,
                        borderRadius: 3, cursor: 'pointer', padding: '4px 10px',
                        fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em',
                        color: analiseTimeWindow === w ? '#C5A059' : 'rgba(255,255,255,0.4)',
                      }}>
                      {w}
                    </button>
                  ))}
                </div>

                {/* EMPTY STATE */}
                {comparacaoIds.length < 2 && (
                  <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '32px 0', textAlign: 'center' }}>
                    Selecione pelo menos 2 cotistas para comparar
                  </div>
                )}

                {/* CHARTS + TABLE */}
                {comparacaoIds.length >= 2 && (() => {
                  const COLORS = ['#3b82f6', '#C5A059', '#00E676', '#ef4444', '#8b5cf6', '#f59e0b'];
                  const W = 800, H = 180;
                  const PAD = { t: 16, r: 20, b: 28, l: 52 };
                  const cW = W - PAD.l - PAD.r;
                  const cH = H - PAD.t - PAD.b;
                  const N = filteredNavHistory.length;
                  const toX = i => PAD.l + (i / Math.max(N - 1, 1)) * cW;

                  const retornoSeries = comparacaoIds.map((cid, idx) => {
                    const movs = comparacaoData[cid] ?? [];
                    const firstAporte = [...movs]
                      .filter(m => m.tipo === 'aporte' && m.valor_cota)
                      .sort((a, b) => (a.data_solicitacao ?? '').localeCompare(b.data_solicitacao ?? ''))[0];
                    const costBasis = firstAporte?.valor_cota ?? clube?.valor_cota_inicial ?? 1000;
                    const cotista = cotistas.find(c => c.id === cid);
                    const pts = filteredNavHistory.map(nav => costBasis ? ((nav.valor_cota / costBasis) - 1) * 100 : 0);
                    const currentReturn = navLatest?.valor_cota && costBasis ? ((navLatest.valor_cota / costBasis) - 1) * 100 : null;
                    return { cid, pts, color: COLORS[idx % COLORS.length], nome: cotista?.nome ?? String(cid), currentReturn };
                  });

                  const allRetorno = retornoSeries.flatMap(s => s.pts);
                  const minR = Math.min(...allRetorno, 0);
                  const maxR = Math.max(...allRetorno, 0);
                  const rangeR = maxR - minR || 1;
                  const toYR = v => PAD.t + cH - ((v - minR) / rangeR) * cH;
                  const zeroYR = toYR(0);

                  const patriSeries = comparacaoIds.map((cid, idx) => {
                    const movsSorted = (comparacaoData[cid] ?? [])
                      .filter(m => m.status === 'convertido' && m.data_conversao)
                      .sort((a, b) => a.data_conversao.localeCompare(b.data_conversao));
                    const cotista = cotistas.find(c => c.id === cid);
                    const currentCotas = cotista ? parseFloat(cotista.cotas_detidas) : 0;
                    const pts = filteredNavHistory.map(nav => {
                      let cotas = movsSorted
                        .filter(m => m.data_conversao <= nav.data)
                        .reduce((sum, m) => sum + parseFloat(m.cotas_delta ?? 0), 0);
                      if (cotas === 0) cotas = currentCotas;
                      return cotas * nav.valor_cota;
                    });
                    return { cid, pts, color: COLORS[idx % COLORS.length], nome: cotista?.nome ?? String(cid) };
                  });

                  const allPatri = patriSeries.flatMap(s => s.pts);
                  const minP = Math.min(...allPatri, 0);
                  const maxP = Math.max(...allPatri, 1);
                  const rangeP = maxP - minP || 1;
                  const toYP = v => PAD.t + cH - ((v - minP) / rangeP) * cH;

                  return (
                    <>
                      {/* CHART 1: RETORNO COMPARADO */}
                      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 20, marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Retorno Comparado</div>
                        {N < 2 ? (
                          <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '16px 0', textAlign: 'center' }}>Dados insuficientes para o período</div>
                        ) : (
                          <>
                            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
                              <line x1={PAD.l} y1={zeroYR} x2={W - PAD.r} y2={zeroYR} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                              {retornoSeries.map(s => (
                                <polyline key={s.cid}
                                  points={s.pts.map((v, i) => `${toX(i).toFixed(1)},${toYR(v).toFixed(1)}`).join(' ')}
                                  fill="none" stroke={s.color} strokeWidth={1.5}
                                />
                              ))}
                              <text x={PAD.l - 4} y={PAD.t + 4} textAnchor="end" fontSize={9} fontFamily={MONO} fill="rgba(255,255,255,0.3)">{maxR.toFixed(1)}%</text>
                              <text x={PAD.l - 4} y={zeroYR} textAnchor="end" dominantBaseline="middle" fontSize={9} fontFamily={MONO} fill="rgba(255,255,255,0.3)">0%</text>
                              <text x={PAD.l - 4} y={H - PAD.b} textAnchor="end" fontSize={9} fontFamily={MONO} fill="rgba(255,255,255,0.3)">{minR.toFixed(1)}%</text>
                            </svg>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                              {retornoSeries.map(s => (
                                <div key={s.cid} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 12, height: 2, background: s.color }} />
                                  <span style={{ fontFamily: MONO, fontSize: 10, color: TXT_2 }}>{s.nome}</span>
                                  {s.currentReturn != null && (
                                    <span style={{ fontFamily: MONO, fontSize: 10, color: s.currentReturn >= 0 ? '#00E676' : '#ef4444' }}>
                                      {(s.currentReturn > 0 ? '+' : '') + s.currentReturn.toFixed(2) + '%'}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {/* CHART 2: PATRIMÔNIO COMPARADO */}
                      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 20, marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Patrimônio Comparado</div>
                        {N < 2 ? (
                          <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '16px 0', textAlign: 'center' }}>Dados insuficientes para o período</div>
                        ) : (
                          <>
                            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
                              {patriSeries.map(s => (
                                <polyline key={s.cid}
                                  points={s.pts.map((v, i) => `${toX(i).toFixed(1)},${toYP(v).toFixed(1)}`).join(' ')}
                                  fill="none" stroke={s.color} strokeWidth={1.5}
                                />
                              ))}
                              <text x={PAD.l - 4} y={PAD.t + 4} textAnchor="end" fontSize={9} fontFamily={MONO} fill="rgba(255,255,255,0.3)">{maxP >= 1000 ? (maxP / 1000).toFixed(0) + 'k' : maxP.toFixed(0)}</text>
                              <text x={PAD.l - 4} y={H - PAD.b} textAnchor="end" fontSize={9} fontFamily={MONO} fill="rgba(255,255,255,0.3)">0</text>
                            </svg>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                              {patriSeries.map(s => (
                                <div key={s.cid} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 12, height: 2, background: s.color }} />
                                  <span style={{ fontFamily: MONO, fontSize: 10, color: TXT_2 }}>{s.nome}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {/* COMPARISON TABLE */}
                      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 20 }}>
                        <div style={{ fontSize: 10, fontFamily: MONO, color: TXT_2, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Resumo Comparativo</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              {['COTISTA', 'RETORNO', 'COTAS', 'PATRIMÔNIO', 'TOTAL APORTADO', 'DESDE'].map(col => (
                                <th key={col} style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textAlign: 'left', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 'normal' }}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[...retornoSeries]
                              .sort((a, b) => (b.currentReturn ?? -Infinity) - (a.currentReturn ?? -Infinity))
                              .map(s => {
                                const cotista = cotistas.find(c => c.id === s.cid);
                                const movs = comparacaoData[s.cid] ?? [];
                                const totalAportado = movs.filter(m => m.tipo === 'aporte' && m.status === 'convertido').reduce((sum, m) => sum + (m.valor_brl ?? 0), 0);
                                const cotas = cotista ? parseFloat(cotista.cotas_detidas) : 0;
                                const patrimonio = navLatest?.valor_cota ? cotas * navLatest.valor_cota : null;
                                const entrada = cotista?.data_entrada?.split('-').reverse().join('/');
                                return (
                                  <tr key={s.cid}>
                                    <td style={TD}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                                        <span>{s.nome}</span>
                                      </div>
                                    </td>
                                    <td style={{ ...TD, fontFamily: MONO, color: s.currentReturn == null ? TXT_2 : s.currentReturn >= 0 ? '#00E676' : '#ef4444' }}>
                                      {s.currentReturn != null ? (s.currentReturn > 0 ? '+' : '') + s.currentReturn.toFixed(2) + '%' : '—'}
                                    </td>
                                    <td style={{ ...TD, fontFamily: MONO }}>{cotas.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}</td>
                                    <td style={{ ...TD, fontFamily: MONO }}>{patrimonio != null ? patrimonio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</td>
                                    <td style={{ ...TD, fontFamily: MONO }}>{totalAportado > 0 ? totalAportado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</td>
                                    <td style={{ ...TD, fontFamily: MONO, fontSize: 11, color: TXT_2 }}>{entrada ?? '—'}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}

              </div>
            )}

          </div>
        )}

      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showAddModal && (
        <CotistaFormModal
          clubeId={clube?.id}
          navLatest={navLatest}
          cotistas={cotistas}
          onClose={() => setShowAddModal(false)}
          onSuccess={(newCotista) => {
            setCotistas(prev => [...prev, newCotista]);
            setSelectedId(newCotista.id);
            setShowAddModal(false);
          }}
        />
      )}

      {showAporteModal && selectedCotista && (
        <MovimentacaoModal
          clubeId={clube?.id}
          cotista={selectedCotista}
          tipo="aporte"
          navLatest={navLatest}
          cotistas={cotistas}
          onClose={() => setShowAporteModal(false)}
          onSuccess={() => {
            setShowAporteModal(false);
            fetchMovimentacoes(selectedId);
            refreshCotistas();
          }}
        />
      )}

      {showResgateModal && selectedCotista && (
        <MovimentacaoModal
          clubeId={clube?.id}
          cotista={selectedCotista}
          tipo="resgate"
          navLatest={navLatest}
          cotistas={cotistas}
          onClose={() => setShowResgateModal(false)}
          onSuccess={() => {
            setShowResgateModal(false);
            fetchMovimentacoes(selectedId);
            refreshCotistas();
          }}
        />
      )}
    </ClubeShell>
  );
}
