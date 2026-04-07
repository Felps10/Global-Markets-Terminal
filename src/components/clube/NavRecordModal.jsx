import { formatCurrency, formatPct } from '../../services/portfolioEngine.js';

const MONO    = "'JetBrains Mono', monospace";
const BG_CARD  = '#0d1824';
const BG_CARD2 = '#0f1f2e';
const BORDER2  = 'rgba(51,65,85,0.5)';
const TXT_1    = '#e2e8f0';
const TXT_2    = '#94a3b8';
const TXT_3    = '#475569';
const ACCENT   = 'var(--c-accent)';
const GREEN    = '#00E676';
const RED      = 'var(--c-error)';

export default function NavRecordModal({ open, data, onDataChange, onSubmit, onClose,
                          submitting, submitError, submitOk }) {
  if (!open || !data) return null;

  const today          = new Date().toISOString().split('T')[0];
  const todayFormatted = today.split('-').reverse().join('/');

  const retornoDiarioColor = data.retorno_diario > 0
    ? GREEN : data.retorno_diario < 0 ? RED : TXT_2;

  const LABEL_STYLE = {
    display: 'block', color: TXT_3, fontSize: 10,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    fontFamily: MONO, marginBottom: 2,
  };
  const INPUT_BASE = {
    width: '100%', boxSizing: 'border-box',
    background: BG_CARD2, border: `1px solid ${BORDER2}`,
    borderRadius: 3, color: TXT_1,
    fontFamily: MONO, fontSize: 12,
    padding: '8px 10px', outline: 'none', marginTop: 4,
  };
  const INPUT_AUTO = { ...INPUT_BASE, background: 'rgba(59,130,246,0.05)' };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 480, background: BG_CARD,
          border: `1px solid ${BORDER2}`, borderRadius: 6,
          padding: 28, fontFamily: MONO, position: 'relative',
        }}
      >
        {/* Modal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 13, color: TXT_1, letterSpacing: '0.1em' }}>REGISTRAR NAV</div>
            <div style={{ fontSize: 11, color: TXT_3, marginTop: 4 }}>{todayFormatted}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: TXT_2,
              fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px',
              fontFamily: MONO,
            }}
          >×</button>
        </div>

        {/* Success state */}
        {submitOk ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '40px 0', gap: 12,
          }}>
            <div style={{ fontSize: 32, color: GREEN }}>✓</div>
            <div style={{ fontSize: 13, color: TXT_1 }}>NAV registrado com sucesso</div>
            <div style={{ fontSize: 11, color: TXT_3 }}>Fechando...</div>
          </div>
        ) : (
          <>
            {/* Field 1 — DATA */}
            <div style={{ marginTop: 14 }}>
              <label style={LABEL_STYLE}>DATA</label>
              <input
                type="date"
                value={data.data}
                onChange={e => onDataChange('data', e.target.value)}
                style={INPUT_BASE}
              />
            </div>

            {/* Field 2 — VALOR DA COTA */}
            <div style={{ marginTop: 14 }}>
              <label style={LABEL_STYLE}>VALOR DA COTA (R$)</label>
              <div style={{ fontSize: 10, color: TXT_3, marginTop: 2 }}>
                calculado pelo sistema — edite se necessário
              </div>
              <input
                type="number"
                step="0.000001"
                value={data.valor_cota}
                onChange={e => onDataChange('valor_cota', parseFloat(e.target.value))}
                style={INPUT_AUTO}
              />
            </div>

            {/* Field 3 — RETORNO IBOV */}
            <div style={{ marginTop: 14 }}>
              <label style={LABEL_STYLE}>RETORNO IBOV</label>
              <div style={{ fontSize: 10, color: TXT_3, marginTop: 2 }}>
                ex: 0.0123 para +1.23% | fonte: GMT preços
              </div>
              <input
                type="number"
                step="0.00001"
                value={data.retorno_ibov ?? ''}
                placeholder="ex: 0.0123"
                onChange={e => onDataChange('retorno_ibov',
                  e.target.value === '' ? null : parseFloat(e.target.value))}
                style={data.retorno_ibov !== null ? INPUT_AUTO : INPUT_BASE}
              />
            </div>

            {/* Field 4 — RETORNO CDI */}
            <div style={{ marginTop: 14 }}>
              <label style={LABEL_STYLE}>RETORNO CDI</label>
              <div style={{ fontSize: 10, color: TXT_3, marginTop: 2 }}>
                ex: 0.000433 para CDI diário | fonte: BCB SGS 4389
              </div>
              <input
                type="number"
                step="0.0000001"
                value={data.retorno_cdi ?? ''}
                placeholder="ex: 0.000433"
                onChange={e => onDataChange('retorno_cdi',
                  e.target.value === '' ? null : parseFloat(e.target.value))}
                style={data.retorno_cdi !== null ? INPUT_AUTO : INPUT_BASE}
              />
            </div>

            {/* Field 5 — PATRIMÔNIO ESTIMADO (read-only) */}
            <div style={{ marginTop: 14 }}>
              <label style={LABEL_STYLE}>PATRIMÔNIO ESTIMADO</label>
              <div style={{
                background: BG_CARD2, padding: 8, borderRadius: 3,
                marginTop: 4, border: `1px solid ${BORDER2}`,
              }}>
                <div style={{ fontSize: 14, color: TXT_1, fontFamily: MONO }}>
                  {formatCurrency(data.cotas_emitidas * data.valor_cota)}
                </div>
                <div style={{ fontSize: 10, color: TXT_3, marginTop: 3 }}>
                  {data.cotas_emitidas} cotas × {formatCurrency(data.valor_cota)}
                </div>
              </div>
            </div>

            {/* Field 6 — RETORNO CARTEIRA (read-only) */}
            <div style={{ marginTop: 14 }}>
              <label style={LABEL_STYLE}>RETORNO CARTEIRA</label>
              <div style={{
                background: BG_CARD2, padding: 8, borderRadius: 3,
                marginTop: 4, border: `1px solid ${BORDER2}`,
              }}>
                <div style={{ fontSize: 14, fontFamily: MONO, color: retornoDiarioColor }}>
                  {formatPct(data.retorno_diario * 100, { showSign: true })}
                </div>
                <div style={{ fontSize: 10, color: TXT_3, marginTop: 3 }}>
                  calculado pelo portfolioEngine
                </div>
              </div>
            </div>

            {/* Error message */}
            {submitError && (
              <div style={{
                background: 'rgba(255,82,82,0.1)', border: `1px solid ${RED}`,
                borderRadius: 3, padding: 8, marginTop: 12,
              }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: RED }}>{submitError}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={() => onSubmit(data)}
              disabled={submitting || submitOk}
              style={{
                width: '100%', padding: '10px', borderRadius: 3,
                border: 'none', fontFamily: MONO, fontSize: 11,
                letterSpacing: '0.1em',
                cursor: submitting || submitOk ? 'not-allowed' : 'pointer',
                background: submitting || submitOk ? TXT_3 : ACCENT,
                color: '#fff', marginTop: 20,
              }}
            >
              {submitting ? 'REGISTRANDO...' : 'CONFIRMAR REGISTRO'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
