import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { hasRole } from '../lib/roles.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

const BG_PAGE  = '#080f1a';
const BG_HEAD  = '#0a1628';
const BG_CARD  = '#0d1824';
const BORDER   = 'rgba(30,41,59,0.8)';
const BORDER2  = 'rgba(51,65,85,0.5)';
const TXT_1    = '#e2e8f0';
const TXT_2    = '#94a3b8';
const TXT_3    = '#475569';
const ACCENT   = 'var(--c-accent)';
const GREEN    = '#00E676';
const AMBER    = '#fbbf24';
const MONO     = "'JetBrains Mono', monospace";

const GOLD = '#F5C518';
const SANS = "'IBM Plex Sans', sans-serif";

export default function ClubeListPage() {
  const navigate       = useNavigate();
  const { getToken, user } = useAuth();
  const isManager = hasRole(user?.role, 'club_manager');

  const [clubes,  setClubes]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [setupForm, setSetupForm] = useState({ nome: '', data_constituicao: '', benchmark_ibov: true, benchmark_cdi: true });
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupError, setSetupError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/v1/clubes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) setClubes(await res.json());
      } catch (_) {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: BG_PAGE, fontFamily: MONO }}>

      {/* Header */}
      <div style={{
        height: 48, flexShrink: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 20px',
        background: BG_HEAD, borderBottom: `1px solid ${BORDER}`,
      }}>
        <button
          onClick={() => navigate('/app')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: TXT_2, fontSize: 16, padding: '6px 10px', fontFamily: MONO, lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.color = TXT_1; }}
          onMouseLeave={e => { e.currentTarget.style.color = TXT_2; }}
        >← Terminal</button>
        <span style={{ fontSize: 11, color: TXT_1, letterSpacing: '0.2em' }}>CLUBES DE INVESTIMENTO</span>
        <div style={{ width: 80 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>

          {loading && (
            <div style={{ padding: '60px 0', textAlign: 'center', fontSize: 12, color: TXT_3 }}>
              Carregando clubes...
            </div>
          )}

          {!loading && clubes.length === 0 && !showSetup && (
            <div style={{
              padding: 48, textAlign: 'center',
              background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6,
            }}>
              <div style={{ fontSize: 32, color: TXT_3, marginBottom: 16 }}>💼</div>
              <div style={{ fontSize: 12, color: TXT_2, lineHeight: 1.8, marginBottom: isManager ? 24 : 0 }}>
                Nenhum clube registrado.<br /><br />
                Clubes de investimento são geridos conforme a CVM Resolução 11.
              </div>
              {isManager && (
                <button
                  onClick={() => setShowSetup(true)}
                  style={{
                    background: GOLD,
                    color: '#0C0A00',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 28px',
                    fontFamily: SANS,
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                  }}
                >
                  Criar Clube
                </button>
              )}
            </div>
          )}

          {/* Club profile setup form */}
          {!loading && showSetup && (
            <div style={{
              maxWidth: 460,
              margin: '0 auto',
              background: BG_CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              padding: '32px 28px',
            }}>
              <div style={{
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: '0.15em',
                color: GOLD,
                marginBottom: 24,
                textTransform: 'uppercase',
              }}>
                CONFIGURAR CLUBE
              </div>

              {setupError && (
                <div style={{
                  background: 'var(--c-error-dim)',
                  border: '1px solid rgba(255,82,82,0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  marginBottom: 16,
                  fontFamily: SANS,
                  fontSize: 12,
                  color: 'var(--c-error)',
                }}>
                  {setupError}
                </div>
              )}

              {/* Nome */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block',
                  fontFamily: SANS,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: TXT_3,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}>
                  NOME DO CLUBE
                </label>
                <input
                  type="text"
                  value={setupForm.nome}
                  onChange={e => setSetupForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Clube Alpha Invest"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-input)',
                    color: TXT_1,
                    fontFamily: MONO,
                    fontSize: 13,
                    padding: '10px 14px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Data de constituição */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block',
                  fontFamily: SANS,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: TXT_3,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}>
                  DATA DE CONSTITUIÇÃO
                </label>
                <input
                  type="date"
                  value={setupForm.data_constituicao}
                  onChange={e => setSetupForm(p => ({ ...p, data_constituicao: e.target.value }))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-input)',
                    color: TXT_1,
                    fontFamily: MONO,
                    fontSize: 13,
                    padding: '10px 14px',
                    outline: 'none',
                    colorScheme: 'dark',
                  }}
                />
              </div>

              {/* Benchmark */}
              <div style={{ marginBottom: 28 }}>
                <label style={{
                  display: 'block',
                  fontFamily: SANS,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: TXT_3,
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}>
                  BENCHMARK
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { key: 'benchmark_ibov', label: 'IBOVESPA' },
                    { key: 'benchmark_cdi', label: 'CDI' },
                  ].map(b => (
                    <button
                      key={b.key}
                      onClick={() => setSetupForm(p => ({ ...p, [b.key]: !p[b.key] }))}
                      style={{
                        background: setupForm[b.key] ? GOLD : 'rgba(255,255,255,0.04)',
                        color: setupForm[b.key] ? '#0C0A00' : TXT_2,
                        border: setupForm[b.key] ? 'none' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 20px',
                        fontFamily: MONO,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  disabled={setupSaving || !setupForm.nome.trim()}
                  onClick={async () => {
                    setSetupSaving(true);
                    setSetupError('');
                    try {
                      const token = await getToken();
                      const res = await fetch(`${API_BASE}/api/v1/clubes`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(setupForm),
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.message || 'Falha ao criar clube');
                      }
                      const created = await res.json();
                      navigate(`/clube/${created.id}`);
                    } catch (err) {
                      setSetupError(err.message);
                    } finally {
                      setSetupSaving(false);
                    }
                  }}
                  style={{
                    flex: 1,
                    background: !setupForm.nome.trim() ? 'rgba(255,255,255,0.05)' : GOLD,
                    color: !setupForm.nome.trim() ? TXT_3 : '#0C0A00',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 0',
                    fontFamily: SANS,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: !setupForm.nome.trim() || setupSaving ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.06em',
                    opacity: setupSaving ? 0.6 : 1,
                  }}
                >
                  {setupSaving ? 'Criando...' : 'Criar Clube'}
                </button>
                <button
                  onClick={() => setShowSetup(false)}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-sm)',
                    color: TXT_2,
                    padding: '10px 20px',
                    fontFamily: SANS,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!loading && clubes.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}>
              {clubes.map(c => (
                <div key={c.id} style={{
                  background: BG_CARD, border: `1px solid ${BORDER}`,
                  borderRadius: 6, padding: 20,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: TXT_1 }}>{c.nome}</div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 9, padding: '2px 7px', borderRadius: 3,
                      background: c.status === 'ativo' ? 'rgba(0,230,118,0.08)' : 'rgba(251,191,36,0.08)',
                      border: `1px solid ${c.status === 'ativo' ? 'rgba(0,230,118,0.25)' : 'rgba(251,191,36,0.25)'}`,
                      color: c.status === 'ativo' ? GREEN : AMBER,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.status === 'ativo' ? GREEN : AMBER }} />
                      {(c.status ?? 'ativo').toUpperCase()}
                    </span>
                  </div>

                  {c.cnpj && <div style={{ fontSize: 10, color: TXT_3, marginBottom: 4 }}>CNPJ: {c.cnpj}</div>}
                  {c.corretora && <div style={{ fontSize: 10, color: TXT_3, marginBottom: 4 }}>Corretora: {c.corretora}</div>}

                  <div style={{ borderTop: `1px solid ${BORDER2}`, margin: '12px 0', paddingTop: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: TXT_3 }}>—</div>
                        <div style={{ fontSize: 9, color: TXT_3, marginTop: 2 }}>Patrimônio</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: TXT_3 }}>—</div>
                        <div style={{ fontSize: 9, color: TXT_3, marginTop: 2 }}>Retorno total</div>
                      </div>
                    </div>

                    {c.data_constituicao && (
                      <div style={{ fontSize: 10, color: TXT_3, marginBottom: 12 }}>
                        Constituído em {c.data_constituicao.split('-').reverse().join('/')}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/clube/${c.id}`)}
                    style={{
                      width: '100%', padding: '8px 0',
                      fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em',
                      background: 'transparent', border: `1px solid ${ACCENT}`,
                      color: ACCENT, borderRadius: 3, cursor: 'pointer',
                    }}
                  >ABRIR CLUBE →</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
