import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import ClubeShell from '../components/clube/ClubeShell.jsx';

const API_BASE = import.meta.env.VITE_API_URL || '';

const BG_PAGE  = '#080f1a';
const BG_CARD  = '#0d1824';
const BG_CARD2 = '#0f1f2e';
const BORDER   = 'rgba(30,41,59,0.8)';
const BORDER2  = 'rgba(51,65,85,0.5)';
const TXT_1    = '#e2e8f0';
const TXT_2    = '#94a3b8';
const TXT_3    = '#475569';
const ACCENT   = 'var(--c-accent)';
const GREEN    = '#00E676';
const RED      = '#FF5252';
const AMBER    = '#fbbf24';
const MONO     = "'JetBrains Mono', monospace";

const STATUS_COLORS = {
  agendada:         { color: TXT_3,  bg: 'rgba(71,85,105,0.2)' },
  convocada:        { color: AMBER,  bg: 'rgba(251,191,36,0.1)' },
  votacao_aberta:   { color: ACCENT, bg: 'rgba(59,130,246,0.1)' },
  realizada:        { color: GREEN,  bg: 'rgba(0,230,118,0.1)' },
  cancelada:        { color: RED,    bg: 'rgba(255,82,82,0.1)' },
};

const STATUS_LABELS = {
  agendada: 'AGENDADA', convocada: 'CONVOCADA',
  votacao_aberta: 'VOTAÇÃO ABERTA', realizada: 'REALIZADA', cancelada: 'CANCELADA',
};

function fmtDate(d) { return d ? d.split('-').reverse().join('/') : '—'; }

export default function ClubeGovernancaPage() {
  const navigate           = useNavigate();
  const { id: clubeIdParam } = useParams();
  const { getToken, user } = useAuth();

  const [clube,        setClube]        = useState(null);
  const [assembleias,  setAssembleias]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [showForm,     setShowForm]     = useState(false);

  // Form state
  const [formTipo,     setFormTipo]     = useState('ordinaria');
  const [formData,     setFormData]     = useState('');
  const [formConvoc,   setFormConvoc]   = useState('');
  const [formPauta,    setFormPauta]    = useState([{ titulo: '', descricao: '' }]);
  const [formError,    setFormError]    = useState(null);
  const [submitting,   setSubmitting]   = useState(false);

  const fetchAssembleias = useCallback(async (clubeId) => {
    if (!clubeId) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/clubes/${clubeId}/assembleias`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAssembleias(await res.json());
    } catch (_) {}
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const clubeRes = await fetch(`${API_BASE}/api/v1/clubes/${clubeIdParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!clubeRes.ok) { setLoading(false); return; }
        const c = await clubeRes.json();
        if (cancelled) return;
        setClube(c);
        await fetchAssembleias(c.id);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken, fetchAssembleias]);

  // AGO 120-day check
  const agoWarning = formTipo === 'ordinaria' && formData && (() => {
    const d = new Date(formData + 'T12:00:00Z');
    const prevDec31 = new Date(Date.UTC(d.getUTCFullYear() - 1, 11, 31));
    return Math.floor((d - prevDec31) / (1000 * 60 * 60 * 24)) > 120;
  })();

  const canSubmit = formTipo && formData && formPauta.some(p => p.titulo.trim());

  const handleSubmit = async () => {
    setSubmitting(true);
    setFormError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/clubes/${clube.id}/assembleias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tipo: formTipo,
          data_realizacao: formData,
          data_convocacao: formConvoc || null,
          pauta: formPauta.filter(p => p.titulo.trim()),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Erro ${res.status}`);
      }
      const created = await res.json();
      setShowForm(false);
      setAssembleias(prev => [created, ...prev]);
      navigate(`/clube/governanca/${created.id}`);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: BG_PAGE, fontFamily: MONO, gap: 12 }}>
        <div style={{ fontSize: 11, color: ACCENT, letterSpacing: '0.2em' }}>GOVERNANÇA</div>
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

  return (
    <ClubeShell
      clubeId={clubeIdParam}
      activePage="governanca"
      clubeNome={clube?.nome}
      clubeStatus={clube?.status}
      patrimonio={null}
      valorCota={null}
      cotasEmitidas={null}
      pendingCount={0}
      headerLeft={
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: TXT_2 }}>
          <span style={{ color: ACCENT }}>GOVERNANÇA</span>
        </span>
      }
      headerRight={
        user?.role === 'admin' ? (
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: 'var(--c-accent-dim)', border: '1px solid rgba(59,130,246,0.4)',
              color: ACCENT, fontFamily: MONO, fontSize: 10,
              letterSpacing: '0.1em', padding: '5px 11px',
              cursor: 'pointer', borderRadius: 3,
            }}
          >+ NOVA ASSEMBLEIA</button>
        ) : null
      }
    >
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left panel — assembly list */}
        <div style={{ width: 340, flexShrink: 0, borderRight: `1px solid ${BORDER}`, overflowY: 'auto', background: BG_PAGE }}>
          <div style={{ padding: '14px 16px 8px', fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            ASSEMBLEIAS ({assembleias.length})
          </div>

          {assembleias.length === 0 ? (
            <div style={{
              padding: 48, textAlign: 'center',
              background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6,
              margin: 16,
            }}>
              <div style={{ fontSize: 32, color: TXT_3, marginBottom: 16 }}>🛡</div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: TXT_2, lineHeight: 1.8 }}>
                Nenhuma assembleia registrada.<br /><br />
                As assembleias são reuniões formais obrigatórias.
                A AGO deve ser realizada em até 120 dias após
                o encerramento do exercício social.
              </div>
              {user?.role === 'admin' && (
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    marginTop: 20, padding: '8px 20px', fontFamily: MONO, fontSize: 10,
                    background: 'transparent', border: `1px solid ${ACCENT}`,
                    color: ACCENT, borderRadius: 3, cursor: 'pointer',
                  }}
                >+ AGENDAR PRIMEIRA ASSEMBLEIA</button>
              )}
            </div>
          ) : (
            assembleias.map(a => {
              const sc = STATUS_COLORS[a.status] ?? STATUS_COLORS.agendada;
              const isCancelled = a.status === 'cancelada';
              return (
                <div
                  key={a.id}
                  onClick={() => navigate(`/clube/governanca/${a.id}`)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer',
                    borderBottom: `1px solid ${BORDER2}`,
                    opacity: isCancelled ? 0.5 : 1,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = BG_CARD; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 9, fontFamily: MONO, padding: '2px 6px', borderRadius: 3,
                      background: a.tipo === 'ordinaria' ? 'rgba(59,130,246,0.1)' : 'rgba(251,191,36,0.1)',
                      border: `1px solid ${a.tipo === 'ordinaria' ? ACCENT + '40' : AMBER + '40'}`,
                      color: a.tipo === 'ordinaria' ? ACCENT : AMBER,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {a.tipo === 'ordinaria' ? 'AGO' : 'AGE'}
                    </span>
                    <span style={{
                      fontSize: 9, fontFamily: MONO, padding: '2px 6px', borderRadius: 3,
                      background: sc.bg, color: sc.color,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {STATUS_LABELS[a.status]}
                    </span>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_2 }}>
                    {fmtDate(a.data_realizacao)} · {Array.isArray(a.pauta) ? a.pauta.length : 0} itens de pauta
                  </div>
                  {a.b3Urgency && (
                    <div style={{
                      marginTop: 4, fontFamily: MONO, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4,
                      color: a.b3Urgency === 'overdue' || a.b3Urgency === 'urgent' ? RED
                        : a.b3Urgency === 'warning' ? AMBER : GREEN,
                    }}>
                      {(a.b3Urgency === 'urgent' || a.b3Urgency === 'overdue') && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: RED, animation: 'pulse 1.5s infinite' }} />
                      )}
                      {a.b3Urgency === 'overdue' ? 'B3: VENCIDO'
                        : a.b3Urgency === 'urgent' ? `B3: URGENTE ${a.diasParaB3}d`
                        : `B3: ${a.diasParaB3}d restantes`}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {showForm ? (
            <div style={{ maxWidth: 600 }}>
              <div style={{ fontSize: 10, color: ACCENT, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>
                NOVA ASSEMBLEIA
              </div>

              {/* Tipo */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>TIPO</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['ordinaria', 'Ordinária (AGO)'], ['extraordinaria', 'Extraordinária (AGE)']].map(([val, label]) => (
                    <button key={val} onClick={() => setFormTipo(val)} style={{
                      padding: '6px 16px', fontFamily: MONO, fontSize: 10, borderRadius: 3, cursor: 'pointer',
                      background: formTipo === val ? `${ACCENT}20` : BG_CARD2,
                      border: `1px solid ${formTipo === val ? ACCENT : BORDER2}`,
                      color: formTipo === val ? TXT_1 : TXT_3,
                    }}>{label}</button>
                  ))}
                </div>
              </div>

              {/* Data realização */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>DATA DE REALIZAÇÃO *</div>
                <input type="date" value={formData} onChange={e => setFormData(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: BG_CARD2, border: `1px solid ${BORDER2}`, borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 12, padding: '8px 10px', outline: 'none' }}
                />
                {agoWarning && (
                  <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 10, color: AMBER }}>
                    ⚠ Data excede 120 dias do encerramento do exercício (prazo AGO)
                  </div>
                )}
              </div>

              {/* Data convocação */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>DATA DE CONVOCAÇÃO (OPCIONAL)</div>
                <input type="date" value={formConvoc} onChange={e => setFormConvoc(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: BG_CARD2, border: `1px solid ${BORDER2}`, borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 12, padding: '8px 10px', outline: 'none' }}
                />
                <div style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, marginTop: 4 }}>Convocação deve ser enviada com antecedência mínima de 8 dias</div>
              </div>

              {/* Pauta */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>PAUTA</div>
                {formPauta.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, paddingTop: 10, flexShrink: 0 }}>ITEM {i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <input placeholder="Título" value={item.titulo}
                        onChange={e => setFormPauta(prev => prev.map((p, j) => j === i ? { ...p, titulo: e.target.value } : p))}
                        style={{ width: '100%', boxSizing: 'border-box', background: BG_CARD2, border: `1px solid ${BORDER2}`, borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 11, padding: '7px 10px', outline: 'none', marginBottom: 4 }}
                      />
                      <input placeholder="Descrição (opcional)" value={item.descricao}
                        onChange={e => setFormPauta(prev => prev.map((p, j) => j === i ? { ...p, descricao: e.target.value } : p))}
                        style={{ width: '100%', boxSizing: 'border-box', background: BG_CARD2, border: `1px solid ${BORDER2}`, borderRadius: 3, color: TXT_2, fontFamily: MONO, fontSize: 10, padding: '6px 10px', outline: 'none' }}
                      />
                    </div>
                    {formPauta.length > 1 && (
                      <button onClick={() => setFormPauta(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'transparent', border: 'none', color: TXT_3, cursor: 'pointer', fontFamily: MONO, fontSize: 14, padding: '6px' }}>×</button>
                    )}
                  </div>
                ))}
                {formPauta.length < 10 && (
                  <button onClick={() => setFormPauta(prev => [...prev, { titulo: '', descricao: '' }])}
                    style={{ fontFamily: MONO, fontSize: 10, color: ACCENT, background: 'transparent', border: `1px solid ${ACCENT}40`, borderRadius: 3, padding: '4px 12px', cursor: 'pointer' }}>
                    + ADICIONAR ITEM
                  </button>
                )}
              </div>

              {/* AGO warning banner */}
              {agoWarning && (
                <div style={{
                  padding: '10px 14px', borderRadius: 4, marginBottom: 14,
                  background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)',
                  fontFamily: MONO, fontSize: 10, color: AMBER, lineHeight: 1.6,
                }}>
                  ⚠ Prazo AGO<br />
                  Esta data está fora do prazo de 120 dias após o encerramento do exercício social (31/12). Considere agendar para antes de 30/04.
                </div>
              )}

              {formError && (
                <div style={{ marginBottom: 12, fontFamily: MONO, fontSize: 10, color: RED }}>{formError}</div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setShowForm(false); setFormError(null); }}
                  style={{ padding: '7px 18px', fontFamily: MONO, fontSize: 10, background: 'transparent', border: `1px solid ${TXT_3}`, color: TXT_3, borderRadius: 3, cursor: 'pointer' }}>
                  CANCELAR
                </button>
                <button onClick={handleSubmit} disabled={!canSubmit || submitting}
                  style={{ padding: '7px 18px', fontFamily: MONO, fontSize: 10, background: canSubmit && !submitting ? ACCENT : TXT_3, border: 'none', color: '#fff', borderRadius: 3, cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed' }}>
                  {submitting ? 'AGENDANDO...' : 'AGENDAR ASSEMBLEIA'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 12, color: TXT_3 }}>
              Selecione uma assembleia para ver detalhes, ou clique em + NOVA para agendar uma nova.
            </div>
          )}
        </div>
      </div>
    </ClubeShell>
  );
}
