import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

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

export default function ClubeListPage() {
  const navigate       = useNavigate();
  const { getToken }   = useAuth();

  const [clubes,  setClubes]  = useState([]);
  const [loading, setLoading] = useState(true);

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

          {!loading && clubes.length === 0 && (
            <div style={{
              padding: 48, textAlign: 'center',
              background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6,
            }}>
              <div style={{ fontSize: 32, color: TXT_3, marginBottom: 16 }}>💼</div>
              <div style={{ fontSize: 12, color: TXT_2, lineHeight: 1.8 }}>
                Nenhum clube registrado.<br /><br />
                Clubes de investimento são geridos conforme a CVM Resolução 11.
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
