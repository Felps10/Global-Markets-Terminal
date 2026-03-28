import { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

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

const SUITABILITY_COLORS = {
  conservador: AMBER,
  moderado:    TXT_2,
  arrojado:    ACCENT,
  agressivo:   GREEN,
};

const QUESTIONS = [
  {
    label: 'Qual seu horizonte de investimento?',
    options: ['< 1 ano', '1–3 anos', '3–5 anos', '> 5 anos'],
  },
  {
    label: 'Como você reage a perdas temporárias?',
    options: ['Muito mal', 'Mal', 'Bem', 'Muito bem'],
  },
  {
    label: 'Nível de conhecimento em renda variável?',
    options: ['Nenhum', 'Básico', 'Intermediário', 'Avançado'],
  },
  {
    label: '% do patrimônio em renda variável?',
    options: ['< 10%', '10–30%', '30–60%', '> 60%'],
  },
];

export default function CotistaFormModal({ clubeId, navLatest, cotistas, onClose, onSuccess }) {
  const { getToken } = useAuth();

  const [step, setStep] = useState(1);

  // Step 1 fields
  const [nome, setNome] = useState('');
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0]);
  const [cotasIniciais, setCotasIniciais] = useState('');

  // Step 2 fields
  const [answers, setAnswers] = useState([null, null, null, null]);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const totalCotas = useMemo(
    () => cotistas.reduce((s, c) => s + parseFloat(c.cotas_detidas ?? 0), 0),
    [cotistas],
  );

  const cotasNum = parseFloat(cotasIniciais) || 0;
  const equityPct = cotasNum > 0 && (totalCotas + cotasNum) > 0
    ? (cotasNum / (totalCotas + cotasNum)) * 100
    : 0;
  const valorEquiv = navLatest?.valor_cota ? cotasNum * navLatest.valor_cota : null;

  const activeCount = cotistas.filter(c => c.ativo).length;
  const cvmOver40 = equityPct > 40;
  const cvmAtLimit = activeCount >= 50;
  const cvmNearLimit = activeCount >= 49 && !cvmAtLimit;

  const step1Blocked = !nome.trim() || cotasNum <= 0 || cvmOver40 || cvmAtLimit;

  // Step 2: profile
  const allAnswered = answers.every(a => a !== null);
  const score = allAnswered ? answers.reduce((s, a) => s + (a + 1), 0) : 0;
  const profile = !allAnswered ? null
    : score <= 6  ? 'conservador'
    : score <= 10 ? 'moderado'
    : score <= 14 ? 'arrojado'
    :               'agressivo';

  const handleAnswer = (qi, oi) => {
    setAnswers(prev => {
      const next = [...prev];
      next[qi] = oi;
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = await getToken();
      const payload = {
        nome: nome.trim(),
        cotas_detidas: Number(cotasIniciais),
        data_entrada: dataEntrada,
        perfil_suitability: profile,
        suitability_data: new Date().toISOString().split('T')[0],
        suitability_alerta: profile === 'conservador',
      };
      const res = await fetch(`${API_BASE}/api/v1/clubes/${clubeId}/cotistas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Erro ao cadastrar cotista (${res.status})`);
      }
      const created = await res.json();
      onSuccess(created);
    } catch (e) {
      setSubmitError(e.message);
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
          borderRadius: 8, padding: 32, width: 480, maxWidth: '90vw',
          fontFamily: MONO, maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {/* ── Step 1: Basic info ──────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div style={{ fontSize: 10, color: ACCENT, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>
              NOVO COTISTA
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={LABEL}>NOME</label>
              <input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Nome completo"
                style={INPUT}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={LABEL}>DATA DE ENTRADA</label>
              <input
                type="date"
                value={dataEntrada}
                onChange={e => setDataEntrada(e.target.value)}
                style={INPUT}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={LABEL}>COTAS INICIAIS</label>
              <input
                type="number"
                step="0.000001"
                min="0.000001"
                value={cotasIniciais}
                onChange={e => setCotasIniciais(e.target.value)}
                placeholder="0.000000"
                style={INPUT}
              />
              {cotasNum > 0 && (
                <div style={{ marginTop: 6, fontSize: 10, color: TXT_2 }}>
                  {valorEquiv != null && (
                    <div>Equivale a {Number(valorEquiv).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                  )}
                  <div>Participação estimada: {equityPct.toFixed(2)}%</div>
                </div>
              )}
            </div>

            {/* CVM warnings */}
            {cvmOver40 && (
              <div style={{
                padding: '10px 14px', borderRadius: 4, marginBottom: 12,
                background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.3)',
                fontFamily: MONO, fontSize: 10, color: RED,
              }}>
                ⚠ Estas cotas dariam participação acima de 40% — bloqueado pela CVM (Resolução 11).
              </div>
            )}
            {cvmNearLimit && (
              <div style={{
                padding: '10px 14px', borderRadius: 4, marginBottom: 12,
                background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
                fontFamily: MONO, fontSize: 10, color: AMBER,
              }}>
                ⚠ O clube tem {activeCount} cotistas. Adicionar mais um atingirá o limite de 50.
              </div>
            )}
            {cvmAtLimit && (
              <div style={{
                padding: '10px 14px', borderRadius: 4, marginBottom: 12,
                background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.3)',
                fontFamily: MONO, fontSize: 10, color: RED,
              }}>
                ⚠ Limite de 50 cotistas atingido. Não é possível adicionar novos cotistas (CVM Resolução 11).
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
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
                disabled={step1Blocked}
                style={{
                  padding: '8px 16px', fontFamily: MONO, fontSize: 10,
                  background: step1Blocked ? TXT_3 : ACCENT,
                  border: 'none', color: '#fff', borderRadius: 3,
                  cursor: step1Blocked ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.06em',
                }}
              >PRÓXIMO →</button>
            </div>
          </>
        )}

        {/* ── Step 2: Suitability questionnaire ───────────────────────────── */}
        {step === 2 && (
          <>
            <div style={{ fontSize: 10, color: ACCENT, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
              PERFIL DE RISCO
            </div>
            <div style={{ fontSize: 10, color: TXT_3, marginBottom: 20 }}>
              4 perguntas · resultado automático
            </div>

            {QUESTIONS.map((q, qi) => (
              <div key={qi} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: TXT_1, marginBottom: 8 }}>
                  {qi + 1}. {q.label}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {q.options.map((opt, oi) => {
                    const selected = answers[qi] === oi;
                    return (
                      <button
                        key={oi}
                        onClick={() => handleAnswer(qi, oi)}
                        style={{
                          padding: '5px 10px', fontFamily: MONO, fontSize: 10,
                          borderRadius: 3, cursor: 'pointer',
                          background: selected ? `${ACCENT}20` : BG_CARD2,
                          border: `1px solid ${selected ? ACCENT : BORDER2}`,
                          color: selected ? TXT_1 : TXT_2,
                        }}
                      >{opt}</button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Computed profile */}
            {profile && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: TXT_3 }}>PERFIL:</span>
                  <span style={{
                    fontSize: 10, fontFamily: MONO, fontWeight: 600,
                    padding: '2px 8px', borderRadius: 3,
                    background: `${SUITABILITY_COLORS[profile]}18`,
                    border: `1px solid ${SUITABILITY_COLORS[profile]}50`,
                    color: SUITABILITY_COLORS[profile],
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    {profile}
                  </span>
                </div>

                {profile === 'conservador' && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 4,
                    background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
                    fontFamily: MONO, fontSize: 10, color: AMBER, lineHeight: 1.6,
                  }}>
                    ⚠ Perfil conservador detectado.<br />
                    Este clube investe predominantemente em renda variável (≥67%).
                    Certifique-se de que o cotista compreende os riscos antes de prosseguir.
                  </div>
                )}
              </div>
            )}

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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: '8px 16px', fontFamily: MONO, fontSize: 10,
                  background: 'transparent', border: `1px solid ${TXT_3}`,
                  color: TXT_3, borderRadius: 3, cursor: 'pointer',
                  letterSpacing: '0.06em',
                }}
              >← VOLTAR</button>
              <button
                onClick={handleSubmit}
                disabled={!allAnswered || submitting}
                style={{
                  padding: '8px 16px', fontFamily: MONO, fontSize: 10,
                  background: !allAnswered || submitting ? TXT_3 : ACCENT,
                  border: 'none', color: '#fff', borderRadius: 3,
                  cursor: !allAnswered || submitting ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.06em',
                }}
              >{submitting ? 'CADASTRANDO...' : 'CONFIRMAR CADASTRO'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
