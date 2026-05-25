import { useState, useEffect, useCallback } from 'react';
import { hasRole } from '../../../lib/roles.js';
import { CLUBE_COLORS, CLUBE_FONTS, CLUBE_RADIUS } from '../../styles/index.js';

const C = CLUBE_COLORS;
const MONO = CLUBE_FONTS.mono;
const API      = import.meta.env.VITE_API_URL || '';

export default function GestorFilaOperacoesTab({ clube, getToken, user }) {
  const [operacional, setOperacional] = useState(null);
  const [operacionalLoading, setOperacionalLoading] = useState(false);
  const [operacionalError, setOperacionalError] = useState(null);

  const fetchOperacional = useCallback(async (cid) => {
    setOperacionalLoading(true);
    setOperacionalError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/v1/clubes/${cid}/operacional`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setOperacionalError(err.message ?? `Erro ao carregar operacional (${res.status})`);
        return;
      }
      const data = await res.json();
      setOperacional(data);
    } catch (e) {
      setOperacionalError(e.message ?? 'Erro de conexão');
    } finally {
      setOperacionalLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!clube?.id) return;
    fetchOperacional(clube.id);
  }, [clube?.id, fetchOperacional]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Loading state */}
        {operacionalLoading && (
          <div style={{
            padding: '40px 0', textAlign: 'center',
            fontFamily: MONO, fontSize: 11, color: C.textDim, letterSpacing: '0.1em',
          }}>
            CARREGANDO OPERACIONAL...
          </div>
        )}

        {/* Error state */}
        {operacionalError && (
          <div style={{
            padding: '12px 16px', borderRadius: CLUBE_RADIUS.sm,
            background: 'rgba(255,82,82,0.08)',
            border: '1px solid rgba(255,82,82,0.3)',
            fontFamily: MONO, fontSize: 11, color: C.red,
          }}>
            {operacionalError}
          </div>
        )}

        {operacional && !operacionalLoading && (
          <div>
            <div style={{
              fontSize: 10, color: C.textDim, letterSpacing: '0.12em',
              textTransform: 'uppercase', marginBottom: 8,
            }}>
              FILA DE OPERAÇÕES
            </div>

            {(operacional.pendentes ?? []).length === 0 ? (
              <div style={{
                padding: '24px 0', textAlign: 'center',
                fontFamily: MONO, fontSize: 11, color: C.textDim,
              }}>
                Nenhuma operação pendente.
              </div>
            ) : (
              <div style={{
                background: C.bgCard, border: `1px solid ${C.borderSubtle}`,
                borderRadius: CLUBE_RADIUS.md, overflow: 'hidden',
              }}>
                {/* Table header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 110px 110px 160px 160px',
                  gap: 8, padding: '8px 16px',
                  borderBottom: `1px solid ${C.borderSubtle}`,
                }}>
                  {['COTISTA', 'TIPO', 'VALOR', 'SOLICITADO', 'STATUS', 'AÇÃO'].map(h => (
                    <div key={h} style={{
                      fontFamily: MONO, fontSize: 10, color: C.textDim,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>{h}</div>
                  ))}
                </div>

                {/* Table rows */}
                {(operacional.pendentes ?? []).map((p) => {
                  const rowColor = p.isOverdue ? C.red : C.textPrimary;

                  const statusConfig = {
                    aguardando_recursos:  { label: 'AGUARD. RECURSOS', bg: 'rgba(71,85,105,0.25)',  color: C.textMain  },
                    recursos_confirmados: { label: 'RECURSOS CONF.',   bg: 'rgba(249,195,0,0.12)',  color: C.accent   },
                    convertido:           { label: 'CONVERTIDO',        bg: C.accentDim, color: C.accent },
                  };
                  const badge = statusConfig[p.status] ?? { label: p.status.toUpperCase(), bg: 'transparent', color: C.textDim };

                  const showConfirmar = p.status === 'aguardando_recursos';
                  const showConverter = p.status === 'recursos_confirmados';
                  const showPago      = p.status === 'convertido' && p.tipo === 'resgate';

                  const patchStatus = async (newStatus) => {
                    if (newStatus === 'cancelado') {
                      const ok = window.confirm(
                        `Confirmar cancelamento da ${p.tipo === 'aporte' ? 'aporte' : 'resgate'} de ${p.cotista_nome}?\n` +
                        `Esta ação não pode ser desfeita.`
                      );
                      if (!ok) return;
                    }
                    try {
                      const token = await getToken();
                      const res = await fetch(
                        `${API}/api/v1/clubes/${clube?.id}/movimentacoes/${p.movimentacao_id}/status`,
                        {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ status: newStatus }),
                        }
                      );
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        alert(err.message ?? `Erro ao atualizar status (${res.status})`);
                        return;
                      }
                      fetchOperacional(clube?.id);
                    } catch (e) {
                      alert(e.message ?? 'Erro de conexão');
                    }
                  };

                  return (
                    <div key={p.movimentacao_id} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 80px 110px 110px 160px 160px',
                      gap: 8, padding: '10px 16px',
                      borderBottom: `1px solid ${C.borderFaint}`,
                      background: p.isOverdue ? 'rgba(255,82,82,0.04)' : 'transparent',
                      alignItems: 'center',
                    }}>
                      {/* Cotista */}
                      <div style={{ fontFamily: MONO, fontSize: 11, color: rowColor }}>
                        {p.cotista_nome}
                      </div>
                      {/* Tipo */}
                      <div style={{
                        fontFamily: MONO, fontSize: 10,
                        color: p.tipo === 'aporte' ? C.green : C.amber,
                        textTransform: 'uppercase',
                      }}>
                        {p.tipo}
                      </div>
                      {/* Valor */}
                      <div style={{ fontFamily: MONO, fontSize: 11, color: C.textPrimary }}>
                        {Number(p.valor_brl).toLocaleString('pt-BR', {
                          style: 'currency', currency: 'BRL',
                        })}
                      </div>
                      {/* Data */}
                      <div style={{ fontFamily: MONO, fontSize: 10, color: C.textMain }}>
                        {p.data_solicitacao
                          ? p.data_solicitacao.split('-').reverse().join('/')
                          : '—'}
                      </div>
                      {/* Status badge */}
                      <div style={{
                        display: 'inline-flex', alignItems: 'center',
                        fontFamily: MONO, fontSize: 9, fontWeight: 600,
                        letterSpacing: '0.08em', padding: '3px 8px',
                        borderRadius: CLUBE_RADIUS.xs, background: badge.bg, color: badge.color,
                        width: 'fit-content',
                      }}>
                        {badge.label}
                      </div>
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {hasRole(user?.role, 'club_manager') && showConfirmar && (
                          <button
                            onClick={() => patchStatus('recursos_confirmados')}
                            style={{
                              padding: '3px 8px', fontFamily: MONO, fontSize: 9,
                              background: 'transparent',
                              border: `1px solid ${C.green}60`, color: C.green,
                              borderRadius: CLUBE_RADIUS.xs, cursor: 'pointer', letterSpacing: '0.06em',
                            }}
                          >
                            CONFIRMAR
                          </button>
                        )}
                        {hasRole(user?.role, 'club_manager') && showConverter && (
                          <button
                            onClick={() => patchStatus('convertido')}
                            style={{
                              padding: '3px 8px', fontFamily: MONO, fontSize: 9,
                              background: 'transparent',
                              border: `1px solid ${C.accent}60`, color: C.accent,
                              borderRadius: CLUBE_RADIUS.xs, cursor: 'pointer', letterSpacing: '0.06em',
                            }}
                          >
                            CONVERTER
                          </button>
                        )}
                        {hasRole(user?.role, 'club_manager') && showPago && (
                          <button
                            onClick={() => patchStatus('pago')}
                            style={{
                              padding: '3px 8px', fontFamily: MONO, fontSize: 9,
                              background: 'transparent',
                              border: `1px solid ${C.accent}60`, color: C.accent,
                              borderRadius: CLUBE_RADIUS.xs, cursor: 'pointer', letterSpacing: '0.06em',
                            }}
                          >
                            MARCAR PAGO
                          </button>
                        )}
                        {hasRole(user?.role, 'club_manager') && (
                          <button
                            onClick={() => patchStatus('cancelado')}
                            style={{
                              padding: '3px 8px', fontFamily: MONO, fontSize: 9,
                              background: 'transparent',
                              border: `1px solid ${C.textDim}60`, color: C.textDim,
                              borderRadius: CLUBE_RADIUS.xs, cursor: 'pointer', letterSpacing: '0.06em',
                            }}
                          >
                            CANCELAR
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
