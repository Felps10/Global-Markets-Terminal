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
const TXT_4    = '#334155';
const ACCENT   = '#3b82f6';
const GREEN    = '#00E676';
const RED      = '#FF5252';
const AMBER    = '#fbbf24';
const GOLD     = '#FFD700';
const MONO     = "'JetBrains Mono', monospace";

function fmtBRL(v) { return v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtDate(d) { return d ? d.split('-').reverse().join('/') : '—'; }

export default function ClubeTributacaoPage() {
  const navigate           = useNavigate();
  const { id: clubeIdParam } = useParams();
  const { getToken, user } = useAuth();

  const [clube,      setClube]      = useState(null);
  const [cotistas,   setCotistas]   = useState([]);
  const [navLatest,  setNavLatest]  = useState(null);
  const [estatuto,   setEstatuto]   = useState(null);
  const [historico,  setHistorico]  = useState([]);
  const [loading,    setLoading]    = useState(true);

  const [dataRef, setDataRef] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const may = new Date(year, 4, 31);
    const nov = new Date(year, 10, 30);
    const next = now <= may ? may : now <= nov ? nov : new Date(year + 1, 4, 31);
    return next.toISOString().split('T')[0];
  });

  const [simLoading,  setSimLoading]  = useState(false);
  const [simResult,   setSimResult]   = useState(null);
  const [simError,    setSimError]    = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [executing,   setExecuting]   = useState(false);
  const [execResult,  setExecResult]  = useState(null);
  const [execError,   setExecError]   = useState(null);
  const [confirmPhrase, setConfirmPhrase] = useState('');

  const fetchHistorico = useCallback(async (clubeId) => {
    if (!clubeId) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/clubes/${clubeId}/tributacao/historico`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setHistorico(await res.json());
    } catch (_) {}
  }, [getToken]);

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

        const [cotRes, navRes, estRes] = await Promise.allSettled([
          fetch(`${API_BASE}/api/v1/clubes/${c.id}/cotistas`, { headers }),
          fetch(`${API_BASE}/api/v1/clubes/${c.id}/nav/latest`, { headers }),
          fetch(`${API_BASE}/api/v1/clubes/${c.id}/estatuto/active`, { headers }),
        ]);
        if (cancelled) return;
        if (cotRes.status === 'fulfilled' && cotRes.value.ok) {
          const raw = await cotRes.value.json();
          setCotistas(raw.cotistas ?? raw);
        }
        if (navRes.status === 'fulfilled' && navRes.value.ok) setNavLatest(await navRes.value.json());
        if (estRes.status === 'fulfilled' && estRes.value.ok) setEstatuto(await estRes.value.json());
        await fetchHistorico(c.id);
      } catch (_) {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [getToken, fetchHistorico]);

  const handleSimular = async () => {
    if (!clube?.id) return;
    setSimLoading(true); setSimError(null); setSimResult(null); setExecResult(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/clubes/${clube.id}/tributacao/simular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data_referencia: dataRef }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Erro ${res.status}`);
      }
      setSimResult(await res.json());
    } catch (e) {
      setSimError(e.message);
    } finally {
      setSimLoading(false);
    }
  };

  const handleExecutar = async () => {
    if (!clube?.id) return;
    setExecuting(true); setExecError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/clubes/${clube.id}/tributacao/executar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data_referencia: dataRef }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Erro ${res.status}`);
      }
      const result = await res.json();
      setExecResult(result);
      setShowConfirm(false);
      setConfirmPhrase('');
      setSimResult(null);
      await fetchHistorico(clube.id);
    } catch (e) {
      setExecError(e.message);
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: BG_PAGE, fontFamily: MONO, gap: 12 }}>
        <div style={{ fontSize: 11, color: ACCENT, letterSpacing: '0.2em' }}>TRIBUTAÇÃO</div>
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

  const regime = estatuto?.regime_tributario ?? 'fia';
  const canConfirm = confirmPhrase === 'CONFIRMAR TRIBUTAÇÃO';

  return (
    <ClubeShell
      clubeId={clubeIdParam}
      activePage="tributacao"
      clubeNome={clube?.nome}
      clubeStatus={clube?.status}
      patrimonio={null}
      valorCota={navLatest?.valor_cota ?? null}
      cotasEmitidas={null}
      pendingCount={0}
      headerLeft={
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: TXT_2 }}>
          <span style={{ color: ACCENT }}>TRIBUTAÇÃO</span>
          <span style={{ color: TXT_3 }}> · IRRF Periódico</span>
        </span>
      }
      headerRight={null}
    >
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left panel */}
        <div style={{ width: 360, flexShrink: 0, borderRight: `1px solid ${BORDER}`, overflowY: 'auto', padding: 20 }}>
          <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
            TRIBUTAÇÃO PERIÓDICA
          </div>

          {/* Regime banner */}
          <div style={{
            padding: '8px 12px', borderRadius: 4, marginBottom: 16,
            background: regime === 'fia' ? 'rgba(0,230,118,0.06)' : 'rgba(251,191,36,0.06)',
            border: `1px solid ${regime === 'fia' ? 'rgba(0,230,118,0.25)' : 'rgba(251,191,36,0.25)'}`,
            fontFamily: MONO, fontSize: 10,
            color: regime === 'fia' ? GREEN : AMBER,
          }}>
            {regime === 'fia' ? 'Regime FIA — Alíquota flat 15%' : 'Regime Geral — Alíquota regressiva 15–22.5%'}
          </div>

          {/* Date field */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>DATA DE REFERÊNCIA</div>
            <input type="date" value={dataRef} onChange={e => setDataRef(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', background: BG_CARD2, border: `1px solid ${BORDER2}`, borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 12, padding: '8px 10px', outline: 'none' }}
            />
            <div style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, marginTop: 4 }}>
              IRRF periódico: último dia útil de maio e novembro
            </div>
          </div>

          {/* SIMULAR button */}
          <button
            onClick={handleSimular}
            disabled={simLoading}
            style={{
              width: '100%', padding: '10px 0', fontFamily: MONO, fontSize: 11,
              letterSpacing: '0.1em', borderRadius: 3,
              background: simLoading ? TXT_3 : ACCENT, border: 'none', color: '#fff',
              cursor: simLoading ? 'not-allowed' : 'pointer', marginBottom: 24,
            }}
          >{simLoading ? 'CALCULANDO...' : 'SIMULAR'}</button>

          {/* History */}
          <div style={{ fontSize: 9, color: TXT_4, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>HISTÓRICO</div>
          {historico.length === 0 ? (
            <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_3 }}>Nenhum evento de tributação registrado.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {historico.map((h, i) => {
                const state = h.after_state ?? {};
                return (
                  <div key={h.id ?? i} style={{ fontFamily: MONO, fontSize: 10, color: TXT_2, padding: '4px 0', borderBottom: `1px solid ${BORDER2}` }}>
                    {fmtDate(state.dataRef ?? h.created_at?.split('T')[0])} · {fmtBRL(state.totalTaxBrl)} · {state.membersAffected ?? '?'} cotistas
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* Execution success */}
          {execResult && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
              <div style={{ fontSize: 48, color: GREEN }}>✓</div>
              <div style={{ fontFamily: MONO, fontSize: 16, color: TXT_1, fontWeight: 600 }}>Tributação Executada</div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: TXT_2 }}>
                {fmtBRL(execResult.totalTaxBrl)} debitados · {execResult.darfsGerados} DARFs gerados
              </div>
            </div>
          )}

          {/* Empty state */}
          {!simResult && !simLoading && !simError && !execResult && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
              <div style={{ fontSize: 32, color: TXT_3 }}>⊘</div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: TXT_3, textAlign: 'center', lineHeight: 1.8 }}>
                Configure a data de referência e clique em SIMULAR<br />
                para calcular o impacto tributário antes de executar.
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
                O valor é calculado com base nas cotas de cada cotista e nos seus respectivos preços de aquisição (custo médio FIFO).
              </div>
            </div>
          )}

          {/* Loading */}
          {simLoading && (
            <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: TXT_3 }}>CALCULANDO TRIBUTAÇÃO...</div>
          )}

          {/* Error */}
          {simError && (
            <div style={{ padding: '12px 16px', borderRadius: 4, background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.3)', fontFamily: MONO, fontSize: 11, color: RED }}>
              {simError}
            </div>
          )}

          {/* Results */}
          {simResult && !execResult && (
            <div style={{ maxWidth: 900 }}>
              {/* Summary bar */}
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3, letterSpacing: '0.1em' }}>
                  TRIBUTAÇÃO SIMULADA — {fmtDate(simResult.dataReferencia)}
                </div>
                <span style={{ fontFamily: MONO, fontSize: 9, padding: '2px 8px', borderRadius: 3, background: regime === 'fia' ? 'rgba(0,230,118,0.1)' : 'rgba(251,191,36,0.1)', color: regime === 'fia' ? GREEN : AMBER, border: `1px solid ${regime === 'fia' ? GREEN + '40' : AMBER + '40'}` }}>
                  {simResult.regime.toUpperCase()}
                </span>
                <div style={{ flex: 1 }} />
                <span style={{ fontFamily: MONO, fontSize: 11, color: RED }}>Total IRRF: {fmtBRL(simResult.totalTaxBrl)}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: TXT_2 }}>Cotas a cancelar: {simResult.totalCotasACancelar.toFixed(6)}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: TXT_3 }}>{simResult.membersWithGain} de {simResult.totalMembers} cotistas</span>
              </div>

              {/* Per-member table */}
              <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>IMPACTO POR COTISTA</div>
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 80px 60px 80px 80px', gap: 6, padding: '8px 14px', borderBottom: `1px solid ${BORDER}` }}>
                  {['COTISTA', 'COTAS', 'CUSTO', 'GANHO', 'ALÍQ.', 'IRRF', 'APÓS'].map(h => (
                    <div key={h} style={{ fontFamily: MONO, fontSize: 9, color: TXT_3, letterSpacing: '0.06em' }}>{h}</div>
                  ))}
                </div>
                {simResult.perMember.map(m => (
                  <div key={m.cotista_id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 80px 90px 80px 60px 80px 80px',
                    gap: 6, padding: '8px 14px', borderBottom: `1px solid ${BORDER2}`,
                    opacity: m.hasGain ? 1 : 0.5,
                  }}>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: TXT_1 }}>{m.cotista_nome}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2 }}>{m.cotas_detidas.toFixed(2)}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2 }}>{fmtBRL(m.costBasis)}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: m.hasGain ? GREEN : TXT_3 }}>{m.hasGain ? fmtBRL(m.gain) : 'Sem ganho'}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2 }}>{(m.irrfRate * 100).toFixed(1)}%</div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: m.hasGain ? RED : TXT_3 }}>{m.hasGain ? fmtBRL(m.taxBrl) : '—'}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2 }}>{m.newCotas.toFixed(2)}</div>
                  </div>
                ))}
                {/* Footer totals */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 80px 60px 80px 80px', gap: 6, padding: '10px 14px', borderTop: `1px solid ${BORDER}` }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_3 }}>TOTAL</div>
                  <div /><div /><div /><div />
                  <div style={{ fontFamily: MONO, fontSize: 10, color: RED, fontWeight: 600 }}>{fmtBRL(simResult.totalTaxBrl)}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: RED }}>{simResult.totalCotasACancelar.toFixed(6)}</div>
                </div>
              </div>

              {/* Irreversibility notice */}
              <div style={{
                padding: 16, borderRadius: 4, marginBottom: 20,
                background: 'rgba(255,82,82,0.06)',
                border: '1px solid rgba(255,82,82,0.25)',
              }}>
                <div style={{ fontFamily: MONO, fontSize: 11, color: RED, fontWeight: 600, marginBottom: 8 }}>⚠ OPERAÇÃO IRREVERSÍVEL</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: TXT_2, lineHeight: 1.6 }}>
                  A execução debitará IRRF de cada cotista, cancelará cotas e gerará os DARFs correspondentes. Esta operação não pode ser desfeita após confirmação. Verifique os valores acima antes de prosseguir.
                </div>
              </div>

              {/* Execute button */}
              {user?.role === 'admin' && (
                <button
                  onClick={() => { setShowConfirm(true); setConfirmPhrase(''); setExecError(null); }}
                  style={{
                    padding: '10px 24px', fontFamily: MONO, fontSize: 11,
                    letterSpacing: '0.1em', borderRadius: 3, cursor: 'pointer',
                    background: 'rgba(255,82,82,0.10)',
                    border: '1px solid rgba(255,82,82,0.5)',
                    color: RED,
                  }}
                >EXECUTAR TRIBUTAÇÃO</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div onClick={() => setShowConfirm(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: BG_CARD, border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: 32, width: 520, maxWidth: '90vw', fontFamily: MONO,
          }}>
            <div style={{ fontSize: 10, color: RED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
              CONFIRMAR EXECUÇÃO TRIBUTÁRIA
            </div>

            <div style={{ background: BG_CARD2, border: `1px solid ${BORDER2}`, borderRadius: 4, padding: 16, marginBottom: 16 }}>
              {[
                ['Data de referência', fmtDate(dataRef)],
                ['Total IRRF a debitar', fmtBRL(simResult?.totalTaxBrl)],
                ['Cotas a cancelar', `${simResult?.totalCotasACancelar.toFixed(6)} cotas`],
                ['Cotistas afetados', `${simResult?.membersWithGain} de ${simResult?.totalMembers}`],
                ['DARFs a gerar', `${simResult?.membersWithGain} documentos`],
              ].map(([label, value], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < 4 ? `1px solid ${BORDER2}` : 'none' }}>
                  <span style={{ fontSize: 10, color: TXT_3 }}>{label}</span>
                  <span style={{ fontSize: 11, color: TXT_1 }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: TXT_2, marginBottom: 8 }}>
                Para confirmar, digite: <span style={{ color: TXT_1, fontWeight: 600 }}>CONFIRMAR TRIBUTAÇÃO</span>
              </div>
              <input
                value={confirmPhrase}
                onChange={e => setConfirmPhrase(e.target.value)}
                placeholder="CONFIRMAR TRIBUTAÇÃO"
                style={{ width: '100%', boxSizing: 'border-box', background: BG_CARD2, border: `1px solid ${canConfirm ? GREEN + '60' : BORDER2}`, borderRadius: 3, color: TXT_1, fontFamily: MONO, fontSize: 12, padding: '8px 10px', outline: 'none' }}
              />
            </div>

            {execError && (
              <div style={{ padding: '8px 12px', borderRadius: 4, marginBottom: 12, background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.3)', fontSize: 10, color: RED }}>
                {execError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => { setShowConfirm(false); setConfirmPhrase(''); }}
                style={{ padding: '8px 16px', fontFamily: MONO, fontSize: 10, background: 'transparent', border: `1px solid ${TXT_3}`, color: TXT_3, borderRadius: 3, cursor: 'pointer' }}>
                CANCELAR
              </button>
              <button
                onClick={handleExecutar}
                disabled={!canConfirm || executing}
                style={{
                  padding: '8px 16px', fontFamily: MONO, fontSize: 10,
                  background: canConfirm && !executing ? RED : TXT_3,
                  border: 'none', color: '#fff', borderRadius: 3,
                  cursor: canConfirm && !executing ? 'pointer' : 'not-allowed',
                }}
              >{executing ? 'EXECUTANDO...' : 'CONFIRMAR'}</button>
            </div>
          </div>
        </div>
      )}
    </ClubeShell>
  );
}
