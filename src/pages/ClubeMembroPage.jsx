import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
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
const ACCENT   = '#3b82f6';
const GREEN    = '#00E676';
const RED      = '#FF5252';
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
  convertido:           { label: 'CONVERTIDO',        bg: 'rgba(59,130,246,0.12)', color: ACCENT },
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

  const totalCotas = useMemo(
    () => cotistas.reduce((s, c) => s + parseFloat(c.cotas_detidas ?? 0), 0),
    [cotistas],
  );

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
        user?.role === 'admin' ? (
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.4)',
              color: ACCENT, fontFamily: MONO, fontSize: 10,
              letterSpacing: '0.1em', padding: '5px 11px',
              cursor: 'pointer', borderRadius: 3,
            }}
          >+ NOVO COTISTA</button>
        ) : null
      }
    >
      {/* ── Body: left list + right detail ──────────────────────────────── */}
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
              {user?.role === 'admin' && (
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
