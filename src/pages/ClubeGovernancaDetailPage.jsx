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
const ACCENT   = '#3b82f6';
const GREEN    = '#00E676';
const RED      = '#FF5252';
const AMBER    = '#fbbf24';
const MONO     = "'JetBrains Mono', monospace";

const STATUS_LABELS = { agendada: 'AGENDADA', convocada: 'CONVOCADA', votacao_aberta: 'VOTAÇÃO ABERTA', realizada: 'REALIZADA', cancelada: 'CANCELADA' };
const STATUS_STEPS = ['agendada', 'convocada', 'votacao_aberta', 'realizada'];

function fmtDate(d) { return d ? d.split('-').reverse().join('/') : '—'; }

export default function ClubeGovernancaDetailPage() {
  const navigate     = useNavigate();
  const { id: clubeIdParam, aid } = useParams();
  const { getToken, user } = useAuth();

  const [clube,       setClube]       = useState(null);
  const [assembleia,  setAssembleia]  = useState(null);
  const [cotistas,    setCotistas]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [patching,    setPatching]    = useState(false);
  const [successMsg,  setSuccessMsg]  = useState(null);

  // Ata state
  const [editingAta,  setEditingAta]  = useState(false);
  const [ataText,     setAtaText]     = useState('');
  const [ataLoading,  setAtaLoading]  = useState(false);
  const [ataError,    setAtaError]    = useState(null);

  const fetchDetail = useCallback(async (clubeId) => {
    if (!clubeId || !aid) return;
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [aRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/clubes/${clubeId}/assembleias/${aid}`, { headers }),
        fetch(`${API_BASE}/api/v1/clubes/${clubeId}/cotistas`, { headers }),
      ]);
      if (aRes.ok) {
        const data = await aRes.json();
        setAssembleia(data);
        if (data.ata) setAtaText(data.ata);
      }
      if (cRes.ok) {
        const raw = await cRes.json();
        setCotistas(raw.cotistas ?? raw);
      }
    } catch (_) {}
  }, [getToken, aid]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const clubeRes = await fetch(`${API_BASE}/api/v1/clubes/${clubeIdParam}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!clubeRes.ok) { setLoading(false); return; }
        const c = await clubeRes.json();
        if (cancelled) return;
        setClube(c);
        await fetchDetail(c.id);
      } catch (_) {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [getToken, fetchDetail]);

  const patchAssembly = async (updates) => {
    if (!clube?.id || patching) return;
    setPatching(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/clubes/${clube.id}/assembleias/${aid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Erro ${res.status}`);
      }
      setSuccessMsg('Atualizado');
      setTimeout(() => setSuccessMsg(null), 2000);
      await fetchDetail(clube.id);
    } catch (e) {
      alert(e.message);
    } finally {
      setPatching(false);
    }
  };

  const castVote = async (cotista_id, pauta_item_idx, voto) => {
    if (!clube?.id) return;
    // Optimistic update
    setAssembleia(prev => {
      if (!prev) return prev;
      const newSummary = prev.pauta_summary.map((item, idx) => {
        if (idx !== pauta_item_idx) return item;
        const updated = { ...item };
        // Check if user already voted
        const existingVote = prev.votos?.find(v => Number(v.cotista_id) === Number(cotista_id) && v.pauta_item_idx === idx);
        if (existingVote) {
          updated[existingVote.voto] = Math.max(0, (updated[existingVote.voto] ?? 1) - 1);
        } else {
          updated.pendente = Math.max(0, (updated.pendente ?? 1) - 1);
        }
        updated[voto] = (updated[voto] ?? 0) + 1;
        return updated;
      });
      return { ...prev, pauta_summary: newSummary };
    });

    try {
      const token = await getToken();
      await fetch(`${API_BASE}/api/v1/clubes/${clube.id}/assembleias/${aid}/votos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cotista_id, pauta_item_idx, voto }),
      });
      await fetchDetail(clube.id);
    } catch (_) {}
  };

  const generateAta = async () => {
    if (!assembleia) return;
    setAtaLoading(true);
    setAtaError(null);
    try {
      const userPrompt = `Você é o secretário de um clube de investimento brasileiro.
Redija a ata da ${assembleia.tipo === 'ordinaria' ? 'Assembleia Geral Ordinária' : 'Assembleia Geral Extraordinária'} realizada em ${fmtDate(assembleia.data_realizacao)}.

Dados da assembleia:
- Tipo: ${assembleia.tipo === 'ordinaria' ? 'AGO' : 'AGE'}
- Data: ${fmtDate(assembleia.data_realizacao)}
- Quórum presente: ${assembleia.quorum_presente ?? 'não informado'} cotistas
- Pauta: ${JSON.stringify(assembleia.pauta)}
- Resultado das votações: ${JSON.stringify(assembleia.pauta_summary)}

Instruções:
- Escreva em português brasileiro formal
- Inclua: abertura da sessão, leitura e aprovação da pauta, registro dos votos por item, encerramento
- Formato: texto corrido com parágrafos numerados
- Máximo 400 palavras
- Não invente informações além dos dados fornecidos
- Use linguagem jurídica adequada para atas de assembleias CVM`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: userPrompt }] }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API error ${response.status}`);
      }
      const data = await response.json();
      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
      setAtaText(text);
      setEditingAta(true);
    } catch (e) {
      setAtaError(e.message);
    } finally {
      setAtaLoading(false);
    }
  };

  const saveAta = async () => {
    await patchAssembly({ ata: ataText });
    setEditingAta(false);
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: BG_PAGE, fontFamily: MONO, gap: 12 }}>
        <div style={{ fontSize: 11, color: ACCENT, letterSpacing: '0.2em' }}>ASSEMBLEIA</div>
        <div style={{ fontSize: 12, color: TXT_2 }}>Carregando...</div>
      </div>
    );
  }

  if (!clube || !assembleia) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: BG_PAGE, fontFamily: MONO, gap: 12 }}>
        <div style={{ fontSize: 12, color: TXT_2 }}>Assembleia não encontrada.</div>
        <button onClick={() => navigate('/clube/governanca')} style={{ marginTop: 8, padding: '8px 20px', background: 'transparent', border: `1px solid ${BORDER2}`, borderRadius: 4, color: TXT_2, fontFamily: MONO, fontSize: 11, cursor: 'pointer' }}>← Voltar</button>
      </div>
    );
  }

  const a = assembleia;
  const currentStepIdx = STATUS_STEPS.indexOf(a.status);
  const isCancelled = a.status === 'cancelada';
  const isRealizada = a.status === 'realizada';

  // Header right actions
  const headerActions = [];
  if (user?.role === 'admin') {
    if (a.status === 'agendada') headerActions.push({ label: 'MARCAR CONVOCADA', status: 'convocada' });
    if (a.status === 'convocada') headerActions.push({ label: 'ABRIR VOTAÇÃO', status: 'votacao_aberta' });
    if (a.status === 'votacao_aberta') headerActions.push({ label: 'ENCERRAR VOTAÇÃO', status: 'realizada' });
    if (isRealizada && !a.b3_enviada_em) headerActions.push({ label: 'REGISTRAR ENVIO B3', field: 'b3_enviada_em' });
    if (!['realizada', 'cancelada'].includes(a.status)) headerActions.push({ label: 'CANCELAR', status: 'cancelada', destructive: true });
  }

  return (
    <ClubeShell
      clubeId={clubeIdParam}
      activePage="governanca"
      clubeNome={clube?.nome}
      clubeStatus={clube?.status}
      patrimonio={null} valorCota={null} cotasEmitidas={null} pendingCount={0}
      headerLeft={
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: TXT_2 }}>
          <span style={{ color: ACCENT }}>GOVERNANÇA</span>
          <span style={{ color: TXT_3 }}> · {a.tipo === 'ordinaria' ? 'AGO' : 'AGE'} {fmtDate(a.data_realizacao)}</span>
        </span>
      }
      headerRight={
        <>
          {successMsg && <span style={{ fontFamily: MONO, fontSize: 10, color: GREEN }}>{successMsg}</span>}
          {headerActions.map(act => (
            <button
              key={act.label}
              disabled={patching}
              onClick={() => {
                if (act.destructive && !window.confirm('Cancelar esta assembleia? Esta ação não pode ser desfeita.')) return;
                patchAssembly(act.field ? { [act.field]: true } : { status: act.status });
              }}
              style={{
                padding: '5px 11px', fontFamily: MONO, fontSize: 10, borderRadius: 3,
                cursor: patching ? 'not-allowed' : 'pointer', letterSpacing: '0.08em',
                background: act.destructive ? 'transparent' : 'rgba(59,130,246,0.12)',
                border: `1px solid ${act.destructive ? TXT_3 + '60' : 'rgba(59,130,246,0.4)'}`,
                color: act.destructive ? TXT_3 : ACCENT,
              }}
            >{act.label}</button>
          ))}
        </>
      }
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          {/* Section 1 — Status progression bar */}
          <div style={{ marginBottom: 24, padding: '16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {STATUS_STEPS.map((step, i) => {
                const isPast = !isCancelled && currentStepIdx > i;
                const isCurrent = !isCancelled && currentStepIdx === i;
                const dotColor = isCancelled ? TXT_3 : isPast ? GREEN : isCurrent ? ACCENT : TXT_3;
                return (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: isCurrent ? 10 : 8, height: isCurrent ? 10 : 8, borderRadius: '50%',
                        background: isPast || isCurrent ? dotColor : 'transparent',
                        border: `2px solid ${dotColor}`,
                        transition: 'all 0.2s',
                      }}>
                        {isPast && <span style={{ color: '#fff', fontSize: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>✓</span>}
                      </div>
                      <span style={{
                        fontFamily: MONO, fontSize: 8, letterSpacing: '0.06em',
                        color: isCurrent ? TXT_1 : TXT_3,
                        textDecoration: isCancelled ? 'line-through' : 'none',
                        whiteSpace: 'nowrap',
                      }}>
                        {STATUS_LABELS[step]}
                      </span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: isPast ? GREEN : BORDER2, margin: '0 8px', marginBottom: 18 }} />
                    )}
                  </div>
                );
              })}
            </div>
            {isCancelled && (
              <div style={{ fontFamily: MONO, fontSize: 10, color: RED, textAlign: 'center', marginTop: 8 }}>ASSEMBLEIA CANCELADA</div>
            )}
          </div>

          {/* B3 deadline card */}
          {isRealizada && !a.b3_enviada_em && a.diasParaB3 != null && (
            <div style={{
              padding: '14px 18px', borderRadius: 6, marginBottom: 24,
              background: BG_CARD,
              border: `1px solid ${a.b3Urgency === 'overdue' || a.b3Urgency === 'urgent' ? RED + '40' : a.b3Urgency === 'warning' ? AMBER + '40' : GREEN + '40'}`,
            }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>PRAZO B3</div>
              <div style={{
                fontFamily: MONO, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
                color: a.b3Urgency === 'overdue' || a.b3Urgency === 'urgent' ? RED : a.b3Urgency === 'warning' ? AMBER : GREEN,
              }}>
                {(a.b3Urgency === 'urgent' || a.b3Urgency === 'overdue') && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: RED }} />
                )}
                {a.diasParaB3 < 0 ? `VENCIDO (${Math.abs(a.diasParaB3)}d em atraso)` : `${a.diasParaB3} dias restantes`}
              </div>
            </div>
          )}
          {isRealizada && a.b3_enviada_em && (
            <div style={{ fontFamily: MONO, fontSize: 11, color: GREEN, marginBottom: 24 }}>
              ✓ Enviado à B3 em {new Date(a.b3_enviada_em).toLocaleDateString('pt-BR')} às {new Date(a.b3_enviada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}

          {/* Section 2 — Pauta */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>PAUTA</div>
            {(a.pauta_summary ?? []).map((item, idx) => {
              const total = item.favor + item.contra + item.abstencao + item.pendente;
              const myVote = a.votos?.find(v => v.pauta_item_idx === idx && Number(v.cotista_id) === Number(cotistas.find(c => c.auth_user_id)?.id));
              return (
                <div key={idx} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16, marginBottom: 10 }}>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: TXT_1, fontWeight: 600, marginBottom: 4 }}>
                    ITEM {idx + 1} — {item.titulo}
                  </div>
                  {item.descricao && <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_2, marginBottom: 10 }}>{item.descricao}</div>}

                  {/* Vote counts */}
                  <div style={{ display: 'flex', gap: 16, fontFamily: MONO, fontSize: 10, marginBottom: 8 }}>
                    <span style={{ color: GREEN }}>✓ favor ({item.favor})</span>
                    <span style={{ color: RED }}>✗ contra ({item.contra})</span>
                    <span style={{ color: TXT_3 }}>— abstenção ({item.abstencao})</span>
                    <span style={{ color: TXT_3 }}>○ pendente ({item.pendente})</span>
                  </div>

                  {/* Vote bar */}
                  {total > 0 && (
                    <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                      {item.favor > 0 && <div style={{ width: `${(item.favor / total) * 100}%`, background: GREEN }} />}
                      {item.contra > 0 && <div style={{ width: `${(item.contra / total) * 100}%`, background: RED }} />}
                      {item.abstencao > 0 && <div style={{ width: `${(item.abstencao / total) * 100}%`, background: TXT_3 }} />}
                      {item.pendente > 0 && <div style={{ width: `${(item.pendente / total) * 100}%`, background: BG_CARD2 }} />}
                    </div>
                  )}

                  {/* Voting buttons */}
                  {a.status === 'votacao_aberta' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[['favor', '✓ A FAVOR', GREEN], ['contra', '✗ CONTRA', RED], ['abstencao', '— ABSTENÇÃO', TXT_3]].map(([voto, label, color]) => (
                        <button key={voto}
                          onClick={() => {
                            // Use first cotista as default (admin voting)
                            const cId = cotistas[0]?.id;
                            if (cId) castVote(cId, idx, voto);
                          }}
                          style={{
                            padding: '4px 10px', fontFamily: MONO, fontSize: 9, borderRadius: 3, cursor: 'pointer',
                            background: 'transparent', border: `1px solid ${color}60`, color,
                            letterSpacing: '0.06em',
                          }}
                        >{label}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section 3 — Quórum */}
          {isRealizada && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>QUÓRUM</div>
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16, display: 'flex', gap: 24, alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, marginBottom: 4 }}>Presentes</div>
                  {user?.role === 'admin' ? (
                    <input type="number" min="0" max={cotistas.length} value={a.quorum_presente ?? ''}
                      onBlur={e => patchAssembly({ quorum_presente: Number(e.target.value) })}
                      onChange={e => setAssembleia(prev => ({ ...prev, quorum_presente: e.target.value }))}
                      style={{ width: 60, background: BG_CARD2, border: `1px solid ${BORDER2}`, borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 14, padding: '4px 8px', outline: 'none', textAlign: 'center' }}
                    />
                  ) : (
                    <div style={{ fontFamily: MONO, fontSize: 14, color: TXT_1 }}>{a.quorum_presente ?? '—'}</div>
                  )}
                </div>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, marginBottom: 4 }}>Total</div>
                  <div style={{ fontFamily: MONO, fontSize: 14, color: TXT_2 }}>{cotistas.length}</div>
                </div>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, marginBottom: 4 }}>Quórum</div>
                  <div style={{ fontFamily: MONO, fontSize: 14, color: TXT_1 }}>
                    {cotistas.length > 0 && a.quorum_presente ? `${((a.quorum_presente / cotistas.length) * 100).toFixed(1)}%` : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4 — Ata */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>ATA</div>

            {!isRealizada && !a.ata && (
              <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_3, letterSpacing: '0.02em', padding: '8px 0' }}>
                A ata será disponibilizada após a realização da assembleia.
              </div>
            )}

            {isRealizada && !a.ata && !editingAta && user?.role === 'admin' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setEditingAta(true); setAtaText(''); }}
                  style={{ padding: '8px 16px', fontFamily: MONO, fontSize: 10, background: 'transparent', border: `1px solid ${ACCENT}`, color: ACCENT, borderRadius: 3, cursor: 'pointer' }}>
                  REDIGIR MANUALMENTE
                </button>
                <button onClick={generateAta} disabled={ataLoading}
                  style={{ padding: '8px 16px', fontFamily: MONO, fontSize: 10, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.4)', color: ACCENT, borderRadius: 3, cursor: ataLoading ? 'not-allowed' : 'pointer' }}>
                  {ataLoading ? 'GERANDO...' : '✨ GERAR COM IA'}
                </button>
              </div>
            )}

            {ataError && <div style={{ fontFamily: MONO, fontSize: 10, color: RED, marginTop: 8 }}>{ataError}</div>}

            {editingAta && (
              <div>
                <textarea value={ataText} onChange={e => setAtaText(e.target.value)} rows={12}
                  style={{ width: '100%', boxSizing: 'border-box', background: BG_CARD2, border: `1px solid ${BORDER2}`, borderRadius: 4, color: TXT_1, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, lineHeight: 1.8, padding: '12px 14px', outline: 'none', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => setEditingAta(false)}
                    style={{ padding: '6px 14px', fontFamily: MONO, fontSize: 10, background: 'transparent', border: `1px solid ${TXT_3}`, color: TXT_3, borderRadius: 3, cursor: 'pointer' }}>CANCELAR</button>
                  <button onClick={saveAta} disabled={patching}
                    style={{ padding: '6px 14px', fontFamily: MONO, fontSize: 10, background: ACCENT, border: 'none', color: '#fff', borderRadius: 3, cursor: patching ? 'not-allowed' : 'pointer' }}>SALVAR ATA</button>
                </div>
              </div>
            )}

            {a.ata && !editingAta && (
              <div>
                <div style={{
                  background: BG_CARD2, border: `1px solid ${BORDER2}`, borderRadius: 6,
                  padding: '16px 20px', fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13, lineHeight: 1.8, color: TXT_2,
                }}>
                  {a.ata}
                </div>
                {user?.role === 'admin' && (
                  <button onClick={() => { setEditingAta(true); setAtaText(a.ata); }}
                    style={{ marginTop: 8, padding: '5px 12px', fontFamily: MONO, fontSize: 9, background: 'transparent', border: `1px solid ${TXT_3}60`, color: TXT_3, borderRadius: 3, cursor: 'pointer' }}>EDITAR</button>
                )}
              </div>
            )}
          </div>

          {/* Section 5 — Presença (when realizada) */}
          {isRealizada && (() => {
            const votedCotistaIds = new Set((a.votos ?? []).map(v => Number(v.cotista_id)));
            const absent = cotistas.filter(c => !votedCotistaIds.has(Number(c.id)));
            if (absent.length === 0) return null;
            const totalCotas = cotistas.reduce((s, c) => s + parseFloat(c.cotas_detidas ?? 0), 0);
            return (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>PRESENÇA — NÃO PARTICIPARAM ({absent.length})</div>
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
                  {absent.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: `1px solid ${BORDER2}` }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: TXT_2 }}>{c.nome}</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: TXT_3 }}>
                        {totalCotas > 0 ? `${(parseFloat(c.cotas_detidas) / totalCotas * 100).toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </ClubeShell>
  );
}
