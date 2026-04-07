import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
const RED      = 'var(--c-error)';
const AMBER    = '#fbbf24';
const GOLD     = '#FFD700';
const MONO     = "'JetBrains Mono', monospace";

const STATUS_STEPS = ['aberto', 'em_correcao', 'resolvido'];
const STATUS_LABELS = { aberto: 'ABERTO', em_correcao: 'EM CORREÇÃO', resolvido: 'RESOLVIDO' };
const STATUS_COLORS = { aberto: RED, em_correcao: AMBER, resolvido: GREEN };

function fmtDate(d) { return d ? d.split('-').reverse().join('/') : '—'; }

const REMEDIATION_GUIDANCE = {
  compliance_rv_breach: {
    titulo: 'Reenquadramento de Renda Variável',
    passos: [
      'Calcule o déficit de RV: patrimônio total × 67% − valor atual em RV',
      'Identifique ativos de renda variável para aporte ou rebalanceamento',
      'Use o Simulador (Pré-Trade) para verificar o impacto antes de executar',
      'Execute as operações necessárias via seu agente de custódia',
      'Registre as operações no sistema e verifique o novo percentual RV',
    ],
  },
  compliance_breach: {
    titulo: 'Reenquadramento de Renda Variável',
    passos: [
      'Calcule o déficit de RV: patrimônio total × 67% − valor atual em RV',
      'Identifique ativos de renda variável para aporte ou rebalanceamento',
      'Use o Simulador (Pré-Trade) para verificar o impacto antes de executar',
      'Execute as operações necessárias via seu agente de custódia',
      'Registre as operações no sistema e verifique o novo percentual RV',
    ],
  },
  ownership_cap_breach: {
    titulo: 'Limite de Concentração (40%)',
    passos: [
      'Identifique o cotista com participação acima de 40%',
      'Calcule o excesso de cotas para atingir 40% do total',
      'Registre um resgate parcial para o cotista em questão',
      'Alternativamente, realize aportes de outros cotistas para diluir a participação',
      'Verifique o novo percentual de participação após a operação',
    ],
  },
  member_count_breach: {
    titulo: 'Limite de Cotistas (50)',
    passos: [
      'Suspenda imediatamente novos aportes de membros adicionais',
      'Consulte o estatuto para a política de novos membros',
      'Considere registrar resgates ou encerrar cotas de membros inativos',
    ],
  },
};
const defaultGuidance = {
  titulo: 'Reenquadramento Geral',
  passos: [
    'Analise a violação detalhada na seção acima',
    'Consulte o estatuto do clube para as regras aplicáveis',
    'Defina as ações corretivas necessárias',
    'Execute as ações e registre as evidências abaixo',
  ],
};

export default function ClubeReenquadramentoDetailPage() {
  const navigate     = useNavigate();
  const { id: clubeIdParam, rid } = useParams();
  const { getToken, user } = useAuth();

  const [clube,      setClube]      = useState(null);
  const [event,      setEvent]      = useState(null);
  const [posicoes,   setPosicoes]   = useState([]);
  const [navLatest,  setNavLatest]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [patching,   setPatching]   = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // Resolution form
  const [acaoTomada,   setAcaoTomada]   = useState('');
  const [evidenciaUrl, setEvidenciaUrl] = useState('');
  const [dataResolucao, setDataResolucao] = useState(new Date().toISOString().split('T')[0]);

  // Computed: patrimonio + RV
  const patrimonio = useMemo(() => {
    if (!navLatest?.valor_cota) return 0;
    return navLatest.patrimonio_total ?? 0;
  }, [navLatest]);

  const currentRVBrl = useMemo(() => {
    return posicoes
      .filter(p => p.asset?.group_id === 'equities' || p.asset?.group_id === 'br-mercado')
      .reduce((s, p) => s + parseFloat(p.peso_alvo ?? 0) * patrimonio, 0);
  }, [posicoes, patrimonio]);

  const rvPct = patrimonio > 0 ? currentRVBrl / patrimonio : 0;
  const rvDeficit = Math.max(0, 0.67 * patrimonio - currentRVBrl);

  const fetchDetail = useCallback(async (clubeId) => {
    if (!clubeId || !rid) return;
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [evRes, posRes, navRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/v1/clubes/${clubeId}/reenquadramento/${rid}`, { headers }),
        fetch(`${API_BASE}/api/v1/clubes/${clubeId}/posicoes`, { headers }),
        fetch(`${API_BASE}/api/v1/clubes/${clubeId}/nav/latest`, { headers }),
      ]);
      if (evRes.status === 'fulfilled' && evRes.value.ok) setEvent(await evRes.value.json());
      if (posRes.status === 'fulfilled' && posRes.value.ok) setPosicoes(await posRes.value.json());
      if (navRes.status === 'fulfilled' && navRes.value.ok) setNavLatest(await navRes.value.json());
    } catch (_) {}
  }, [getToken, rid]);

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

  const patchEvent = async (updates) => {
    if (!clube?.id || patching) return;
    setPatching(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/clubes/${clube.id}/reenquadramento/${rid}`, {
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
      window.alert(e.message);
    } finally {
      setPatching(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: BG_PAGE, fontFamily: MONO, gap: 12 }}>
        <div style={{ fontSize: 11, color: ACCENT, letterSpacing: '0.2em' }}>REENQUADRAMENTO</div>
        <div style={{ fontSize: 12, color: TXT_2 }}>Carregando...</div>
      </div>
    );
  }

  if (!clube || !event) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: BG_PAGE, fontFamily: MONO, gap: 12 }}>
        <div style={{ fontSize: 12, color: TXT_2 }}>Evento não encontrado.</div>
        <button onClick={() => navigate('/clube')} style={{ marginTop: 8, padding: '8px 20px', background: 'transparent', border: `1px solid ${BORDER2}`, borderRadius: 4, color: TXT_2, fontFamily: MONO, fontSize: 11, cursor: 'pointer' }}>← Voltar</button>
      </div>
    );
  }

  const ev = event;
  const currentStepIdx = STATUS_STEPS.indexOf(ev.status);
  const guidance = REMEDIATION_GUIDANCE[ev.tipo_violacao] ?? defaultGuidance;
  const isRVBreach = ev.tipo_violacao.includes('rv') || ev.tipo_violacao === 'compliance_breach';

  return (
    <ClubeShell
      clubeId={clubeIdParam}
      activePage="painel"
      clubeNome={clube?.nome}
      clubeStatus={clube?.status}
      patrimonio={null} valorCota={null} cotasEmitidas={null} pendingCount={0}
      headerLeft={
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: TXT_2 }}>
          <span style={{ color: RED }}>REENQUADRAMENTO</span>
          <span style={{ color: TXT_3 }}> · {ev.tipo_violacao.replace(/_/g, ' ').toUpperCase()}</span>
        </span>
      }
      headerRight={
        <>
          {successMsg && <span style={{ fontFamily: MONO, fontSize: 10, color: GREEN }}>{successMsg}</span>}
          {user?.role === 'admin' && ev.status === 'aberto' && (
            <button disabled={patching} onClick={() => patchEvent({ status: 'em_correcao' })}
              style={{ padding: '5px 11px', fontFamily: MONO, fontSize: 10, borderRadius: 3, cursor: patching ? 'not-allowed' : 'pointer', background: 'transparent', border: `1px solid ${AMBER}60`, color: AMBER, letterSpacing: '0.08em' }}>
              INICIAR CORREÇÃO
            </button>
          )}
          {user?.role === 'admin' && ev.status === 'em_correcao' && (
            <span style={{ fontFamily: MONO, fontSize: 9, color: TXT_3 }}>Use o formulário abaixo para resolver</span>
          )}
        </>
      }
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>

          {/* Section 1 — Status timeline */}
          <div style={{ marginBottom: 24, padding: '16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {STATUS_STEPS.map((step, i) => {
                const isPast = currentStepIdx > i;
                const isCurrent = currentStepIdx === i;
                const dotColor = isPast ? GREEN : isCurrent ? STATUS_COLORS[step] : TXT_3;
                return (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: isCurrent ? 10 : 8, height: isCurrent ? 10 : 8, borderRadius: '50%',
                        background: isPast || isCurrent ? dotColor : 'transparent',
                        border: `2px solid ${dotColor}`,
                      }}>
                        {isPast && <span style={{ color: '#fff', fontSize: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>✓</span>}
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.06em', color: isCurrent ? TXT_1 : TXT_3, whiteSpace: 'nowrap' }}>
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
          </div>

          {/* Section 2 — Breach details */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>VIOLAÇÃO DETECTADA</div>
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{
                  fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 3,
                  background: `${STATUS_COLORS[ev.status]}15`,
                  border: `1px solid ${STATUS_COLORS[ev.status]}40`,
                  color: STATUS_COLORS[ev.status], letterSpacing: '0.08em',
                }}>
                  {ev.status === 'resolvido' ? '✓ ' : ''}{STATUS_LABELS[ev.status]}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: TXT_1, fontWeight: 600 }}>
                  {ev.tipo_violacao.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: TXT_1, lineHeight: 1.6, marginBottom: 12 }}>
                {ev.descricao}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3 }}>
                Detectado em: {fmtDate(ev.data_deteccao)}
                {ev.status !== 'resolvido' && ev.diasAberto != null && ` · ${ev.diasAberto}d aberto`}
              </div>
            </div>
          </div>

          {/* Section 3 — Remediation guidance */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>PLANO DE AÇÃO SUGERIDO</div>
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 20 }}>
              <div style={{ fontFamily: MONO, fontSize: 12, color: TXT_1, fontWeight: 600, marginBottom: 14 }}>
                {guidance.titulo}
              </div>
              {guidance.passos.map((passo, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(59,130,246,0.15)', border: `1px solid ${ACCENT}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: MONO, fontSize: 9, color: ACCENT, fontWeight: 600,
                  }}>{i + 1}</div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_2, lineHeight: 1.5, paddingTop: 1 }}>
                    {passo}
                  </div>
                </div>
              ))}

              {/* Live RV calculation for RV breaches */}
              {isRVBreach && patrimonio > 0 && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: BG_CARD2, borderRadius: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: TXT_3 }}>RV atual</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: rvPct >= 0.67 ? GREEN : RED }}>{(rvPct * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: BORDER2, overflow: 'hidden', marginBottom: 8, position: 'relative' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(rvPct * 100, 100)}%`, background: rvPct >= 0.67 ? GREEN : RED }} />
                    <div style={{ position: 'absolute', top: -2, left: '67%', width: 2, height: 10, background: TXT_1, borderRadius: 1 }} />
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, marginBottom: 8 }}>
                    Mínimo CVM: 67.0%
                  </div>
                  {rvDeficit > 0 && (
                    <div style={{ fontFamily: MONO, fontSize: 11, color: RED }}>
                      Déficit: {rvDeficit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para atingir 67%
                    </div>
                  )}
                  <button
                    onClick={() => navigate('/clube/simulador')}
                    style={{ marginTop: 10, padding: '5px 12px', fontFamily: MONO, fontSize: 10, background: 'transparent', border: `1px solid ${TXT_3}60`, color: TXT_3, borderRadius: 3, cursor: 'pointer' }}
                  >Abrir Simulador →</button>
                </div>
              )}
            </div>
          </div>

          {/* Section 4 — Resolution form */}
          {ev.status === 'em_correcao' && user?.role === 'admin' && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>REGISTRAR RESOLUÇÃO</div>
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 20 }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>AÇÃO TOMADA *</div>
                  <textarea value={acaoTomada} onChange={e => setAcaoTomada(e.target.value)} rows={4}
                    style={{ width: '100%', boxSizing: 'border-box', background: BG_CARD2, border: `1px solid ${BORDER2}`, borderRadius: 3, color: TXT_1, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, lineHeight: 1.6, padding: '10px 12px', outline: 'none', resize: 'vertical' }}
                    placeholder="Descreva as ações tomadas para resolver a violação..."
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>EVIDÊNCIA (URL)</div>
                  <input value={evidenciaUrl} onChange={e => setEvidenciaUrl(e.target.value)}
                    placeholder="Link para documento ou screenshot (opcional)"
                    style={{ width: '100%', boxSizing: 'border-box', background: BG_CARD2, border: `1px solid ${BORDER2}`, borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 12, padding: '8px 10px', outline: 'none' }}
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>DATA DE RESOLUÇÃO</div>
                  <input type="date" value={dataResolucao} onChange={e => setDataResolucao(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: BG_CARD2, border: `1px solid ${BORDER2}`, borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 12, padding: '8px 10px', outline: 'none' }}
                  />
                </div>
                <button
                  disabled={!acaoTomada.trim() || patching}
                  onClick={() => patchEvent({ status: 'resolvido', acao_tomada: acaoTomada, evidencia_url: evidenciaUrl || null, data_resolucao: dataResolucao })}
                  style={{
                    padding: '8px 20px', fontFamily: MONO, fontSize: 10,
                    background: !acaoTomada.trim() || patching ? TXT_3 : 'transparent',
                    border: `1px solid ${!acaoTomada.trim() || patching ? TXT_3 : GREEN}`,
                    color: !acaoTomada.trim() || patching ? '#666' : GREEN,
                    borderRadius: 3, cursor: !acaoTomada.trim() || patching ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.08em',
                  }}
                >{patching ? 'SALVANDO...' : 'CONFIRMAR RESOLUÇÃO'}</button>
              </div>
            </div>
          )}

          {/* Section 5 — Resolution record */}
          {ev.status === 'resolvido' && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: GREEN, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>RESOLUÇÃO REGISTRADA</div>
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${GREEN}`, borderRadius: 6, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${BORDER2}` }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: TXT_3 }}>Data de resolução</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: TXT_1 }}>{fmtDate(ev.data_resolucao)}</span>
                </div>
                <div style={{ padding: '10px 0', borderBottom: `1px solid ${BORDER2}` }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, marginBottom: 4 }}>Ação tomada</div>
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: TXT_1, lineHeight: 1.6 }}>{ev.acao_tomada}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: TXT_3 }}>Evidência</span>
                  {ev.evidencia_url ? (
                    <a href={ev.evidencia_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: MONO, fontSize: 11, color: ACCENT }}>
                      Abrir documento ↗
                    </a>
                  ) : (
                    <span style={{ fontFamily: MONO, fontSize: 11, color: TXT_3 }}>—</span>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </ClubeShell>
  );
}
