import { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { computeMovimentacaoPreview } from '../../services/quotizacaoEngine.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

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

const LABEL = {
  display: 'block', color: TXT_3, fontSize: 10,
  letterSpacing: '0.08em', textTransform: 'uppercase',
  fontFamily: MONO, marginBottom: 4,
};
const INPUT = {
  width: '100%', boxSizing: 'border-box',
  background: BG_CARD2, border: `1px solid ${BORDER2}`,
  borderRadius: 3, color: TXT_1,
  fontFamily: MONO, fontSize: 12,
  padding: '8px 10px', outline: 'none',
};

function formatDateBR(isoStr) {
  if (!isoStr) return '—';
  return isoStr.split('-').reverse().join('/');
}

function formatCota(val) {
  if (val == null) return '—';
  return `R$ ${Number(val).toLocaleString('pt-BR', {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  })}`;
}

function formatBRL(val) {
  if (val == null) return '—';
  return Number(val).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  });
}

export default function MovimentacaoModal({ clubeId, cotista, tipo, navLatest, cotistas, onClose, onSuccess }) {
  const { getToken } = useAuth();

  const [step, setStep] = useState(1);
  const [valorBrl, setValorBrl] = useState('');
  const [dataSolicitacao, setDataSolicitacao] = useState(new Date().toISOString().split('T')[0]);
  const [observacao, setObservacao] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const valorNum = parseFloat(valorBrl) || 0;

  const preview = useMemo(() => {
    if (!valorNum || valorNum <= 0 || !navLatest?.valor_cota) return null;
    const estatuto = {
      prazo_conversao_dias: 1,
      prazo_pagamento_dias: 5,
      carencia_dias: 0,
    };
    return computeMovimentacaoPreview(
      tipo,
      Number(valorNum),
      navLatest.valor_cota,
      cotistas,
      cotista.id,
      estatuto,
      dataSolicitacao,
    );
  }, [valorNum, tipo, navLatest, cotistas, cotista.id, dataSolicitacao]);

  const hasViolations = preview?.violations?.length > 0;
  const hasWarnings   = preview?.warnings?.length > 0;
  const canProceed    = valorNum > 0 && navLatest?.valor_cota && !hasViolations;

  // Compute before/after equity for all cotistas
  const equityTable = useMemo(() => {
    if (!preview || !cotistas.length) return [];
    const totalNow = cotistas.reduce((s, c) => s + parseFloat(c.cotas_detidas ?? 0), 0);
    const delta = tipo === 'aporte'
      ? Math.abs(preview.cotasDelta)
      : -Math.abs(preview.cotasDelta);
    const totalAfter = totalNow + delta;

    return cotistas.map(c => {
      const cotasNow = parseFloat(c.cotas_detidas ?? 0);
      const cotasAfter = Number(c.id) === Number(cotista.id)
        ? cotasNow + delta
        : cotasNow;
      return {
        id: c.id,
        nome: c.nome,
        before: totalNow > 0 ? (cotasNow / totalNow * 100) : 0,
        after:  totalAfter > 0 ? (cotasAfter / totalAfter * 100) : 0,
        isTarget: Number(c.id) === Number(cotista.id),
      };
    });
  }, [preview, cotistas, cotista.id, tipo]);

  const accentColor = tipo === 'aporte' ? ACCENT : AMBER;

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = await getToken();
      const payload = {
        cotista_id: cotista.id,
        tipo,
        valor_brl: Number(valorBrl),
        data_solicitacao: dataSolicitacao,
        observacao: observacao || null,
      };
      const res = await fetch(`${API_BASE}/api/v1/clubes/${clubeId}/movimentacoes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.error === 'CVM_VIOLATION') {
          setSubmitError(`CVM: ${(err.violations || []).join('; ')}`);
        } else {
          setSubmitError(err.message || `Erro (${res.status})`);
        }
        return;
      }
      onSuccess();
    } catch (e) {
      setSubmitError(e.message ?? 'Erro de conexão');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: BG_CARD, border: `1px solid ${BORDER}`,
          borderRadius: 8, padding: 32, width: 540, maxWidth: '90vw',
          fontFamily: MONO, maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {/* ── Step 1: Input + Preview ─────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div style={{ fontSize: 10, color: accentColor, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
              {tipo === 'aporte' ? 'REGISTRAR APORTE' : 'REGISTRAR RESGATE'}
            </div>
            <div style={{ fontSize: 11, color: TXT_2, marginBottom: 20 }}>
              {cotista.nome}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={LABEL}>VALOR EM REAIS</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={valorBrl}
                onChange={e => setValorBrl(e.target.value)}
                placeholder="0.00"
                style={INPUT}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={LABEL}>DATA DA SOLICITAÇÃO</label>
              <input
                type="date"
                value={dataSolicitacao}
                onChange={e => setDataSolicitacao(e.target.value)}
                style={INPUT}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={LABEL}>OBSERVAÇÃO (OPCIONAL)</label>
              <input
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Ex: transferência bancária"
                style={INPUT}
              />
            </div>

            {/* Live preview */}
            {preview && (
              <div style={{
                background: BG_CARD2, border: `1px solid ${BORDER2}`,
                borderRadius: 6, padding: 16, marginBottom: 14,
              }}>
                {/* Equity table */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 70px 20px 70px',
                    gap: 4, padding: '0 0 6px',
                    borderBottom: `1px solid ${BORDER2}`, marginBottom: 6,
                  }}>
                    <div style={{ fontSize: 9, color: TXT_3, letterSpacing: '0.08em' }}>COTISTA</div>
                    <div style={{ fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textAlign: 'right' }}>ANTES</div>
                    <div />
                    <div style={{ fontSize: 9, color: TXT_3, letterSpacing: '0.08em', textAlign: 'right' }}>DEPOIS</div>
                  </div>
                  {equityTable.map(row => (
                    <div key={row.id} style={{
                      display: 'grid', gridTemplateColumns: '1fr 70px 20px 70px',
                      gap: 4, padding: '3px 0',
                      borderLeft: row.isTarget ? `2px solid ${accentColor}` : '2px solid transparent',
                      paddingLeft: 8,
                    }}>
                      <div style={{ fontSize: 10, color: row.isTarget ? TXT_1 : TXT_2 }}>{row.nome}</div>
                      <div style={{ fontSize: 10, color: TXT_2, textAlign: 'right' }}>{row.before.toFixed(2)}%</div>
                      <div style={{ fontSize: 10, color: TXT_3, textAlign: 'center' }}>→</div>
                      <div style={{ fontSize: 10, color: row.isTarget ? TXT_1 : TXT_2, textAlign: 'right' }}>{row.after.toFixed(2)}%</div>
                    </div>
                  ))}
                </div>

                {/* Cotas preview */}
                <div style={{ fontSize: 11, color: TXT_2, marginBottom: 8 }}>
                  Esta operação {tipo === 'aporte' ? 'emitiria' : 'resgataria'}{' '}
                  <span style={{ color: TXT_1 }}>{Math.abs(preview.cotasDelta).toFixed(6)}</span> cotas ao preço de{' '}
                  <span style={{ color: TXT_1 }}>{formatCota(navLatest?.valor_cota)}</span>/cota
                </div>

                {/* Timing */}
                <div style={{ fontSize: 10, color: TXT_3 }}>
                  Conversão: {formatDateBR(preview.dataConversaoMin)}
                </div>
              </div>
            )}

            {/* CVM violations */}
            {hasViolations && (
              <div style={{
                padding: '10px 14px', borderRadius: 4, marginBottom: 12,
                background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.3)',
                fontFamily: MONO, fontSize: 10, color: RED,
              }}>
                {preview.violations.map((v, i) => <div key={i}>⚠ {v}</div>)}
              </div>
            )}

            {/* CVM warnings */}
            {!hasViolations && hasWarnings && (
              <div style={{
                padding: '10px 14px', borderRadius: 4, marginBottom: 12,
                background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
                fontFamily: MONO, fontSize: 10, color: AMBER,
              }}>
                {preview.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', fontFamily: MONO, fontSize: 10,
                  background: 'transparent', border: `1px solid ${TXT_3}`,
                  color: TXT_3, borderRadius: 3, cursor: 'pointer',
                  letterSpacing: '0.06em',
                }}
              >CANCELAR</button>
              <button
                onClick={() => setStep(2)}
                disabled={!canProceed}
                style={{
                  padding: '8px 16px', fontFamily: MONO, fontSize: 10,
                  background: !canProceed ? TXT_3 : accentColor,
                  border: 'none', color: '#fff', borderRadius: 3,
                  cursor: !canProceed ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.06em',
                }}
              >PROSSEGUIR →</button>
            </div>
          </>
        )}

        {/* ── Step 2: Confirmation ────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <div style={{ fontSize: 10, color: accentColor, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>
              CONFIRMAR {tipo.toUpperCase()}
            </div>

            <div style={{
              background: BG_CARD2, border: `1px solid ${BORDER}`,
              borderRadius: 6, padding: 20, marginBottom: 16,
            }}>
              {[
                ['Cotista', cotista.nome],
                ['Valor', formatBRL(valorNum)],
                [`Cotas a ${tipo === 'aporte' ? 'emitir' : 'resgatar'}`, preview ? `${Math.abs(preview.cotasDelta).toFixed(6)} cotas` : '—'],
                ['Valor da cota', formatCota(navLatest?.valor_cota)],
                ['Participação', preview ? `${equityTable.find(r => r.isTarget)?.before.toFixed(2)}% → ${equityTable.find(r => r.isTarget)?.after.toFixed(2)}%` : '—'],
                ['Prazo de conversão', formatDateBR(preview?.dataConversaoMin)],
              ].map(([label, value], i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                  borderBottom: i < 5 ? `1px solid ${BORDER2}` : 'none',
                }}>
                  <span style={{ fontSize: 10, color: TXT_3 }}>{label}</span>
                  <span style={{ fontSize: 11, color: TXT_1 }}>{value}</span>
                </div>
              ))}

              {/* Warnings */}
              {hasWarnings && (
                <div style={{
                  padding: '8px 12px', borderRadius: 4, marginTop: 12,
                  background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
                  fontFamily: MONO, fontSize: 10, color: AMBER,
                }}>
                  {preview.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
                </div>
              )}

              {/* Irreversibility notice */}
              <div style={{
                marginTop: 14, padding: '8px 12px', borderRadius: 4,
                background: 'rgba(71,85,105,0.15)',
                fontFamily: MONO, fontSize: 10, color: TXT_3,
                letterSpacing: '0.02em',
              }}>
                ⚠ Esta operação será registrada no ledger e não poderá ser excluída após confirmação.
              </div>
            </div>

            {/* Submit error */}
            {submitError && (
              <div style={{
                padding: '10px 14px', borderRadius: 4, marginBottom: 12,
                background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.3)',
                fontFamily: MONO, fontSize: 10, color: RED,
              }}>
                {submitError}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <button
                onClick={() => { setStep(1); setSubmitError(null); }}
                style={{
                  padding: '8px 16px', fontFamily: MONO, fontSize: 10,
                  background: 'transparent', border: `1px solid ${TXT_3}`,
                  color: TXT_3, borderRadius: 3, cursor: 'pointer',
                  letterSpacing: '0.06em',
                }}
              >← VOLTAR</button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                style={{
                  padding: '8px 16px', fontFamily: MONO, fontSize: 10,
                  background: submitting ? TXT_3 : accentColor,
                  border: 'none',
                  color: tipo === 'resgate' && !submitting ? '#1a1a2e' : '#fff',
                  borderRadius: 3,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.06em',
                }}
              >{submitting ? 'REGISTRANDO...' : `CONFIRMAR ${tipo.toUpperCase()}`}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
