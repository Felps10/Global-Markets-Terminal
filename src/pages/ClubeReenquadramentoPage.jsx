/**
 * ClubeReenquadramentoPage.jsx
 * Lists all rebalancing (reenquadramento) records
 * for a clube. Entry point for the Compliance nav item.
 * Authenticated — club_member minimum.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import ClubeShell from '../components/clube/ClubeShell.jsx';

const BG_CARD = '#0d1824';
const BORDER = 'rgba(30,41,59,0.8)';
const TXT_1 = '#e2e8f0';
const TXT_3 = '#475569';
const TXT_4 = '#334155';
const MONO = "'JetBrains Mono', monospace";
const GOLD = '#F9C300';
const GREEN = '#00E676';
const RED = 'var(--c-error)';

const STATUS_STYLES = {
  pendente:       { color: GOLD,  bg: 'rgba(249,195,0,0.08)',  border: 'rgba(249,195,0,0.25)' },
  enquadrado:     { color: GREEN, bg: 'rgba(0,230,118,0.08)',  border: 'rgba(0,230,118,0.25)' },
  desenquadrado:  { color: RED,   bg: 'rgba(255,82,82,0.08)',  border: 'rgba(255,82,82,0.25)' },
};

export default function ClubeReenquadramentoPage() {
  const { id: clubeId } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/v1/clubes/${clubeId}/reenquadramento`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setRecords(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clubeId, getToken]);

  function formatDate(dateStr) {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <ClubeShell
      activePage="compliance"
      clubeId={clubeId}
      headerLeft={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: TXT_1, fontFamily: MONO, letterSpacing: '0.04em' }}>
            Compliance / Reenquadramento
          </div>
          <div style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.06em' }}>
            Histórico de reenquadramentos CVM
          </div>
        </div>
      }
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {loading && (
          <div style={{ fontSize: 12, color: TXT_3, fontFamily: MONO, padding: '40px 0', textAlign: 'center' }}>
            Carregando...
          </div>
        )}

        {error && (
          <div style={{ fontSize: 12, color: RED, fontFamily: MONO, padding: '40px 0', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {!loading && !error && records.length === 0 && (
          <div style={{ fontSize: 12, color: TXT_3, fontFamily: MONO, padding: '40px 0', textAlign: 'center' }}>
            Nenhum reenquadramento registrado.
          </div>
        )}

        {!loading && !error && records.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {records.map((record) => {
              const status = (record.status || 'pendente').toLowerCase();
              const s = STATUS_STYLES[status] || STATUS_STYLES.pendente;
              return (
                <div
                  key={record.id}
                  onClick={() => navigate(`/clube/${clubeId}/reenquadramento/${record.id}`)}
                  style={{
                    background: BG_CARD,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontSize: 12, color: TXT_1, fontFamily: MONO }}>
                      {formatDate(record.created_at || record.date)}
                    </div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 9,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: s.color,
                      background: s.bg,
                      border: `1px solid ${s.border}`,
                      borderRadius: 3,
                      padding: '2px 8px',
                      fontFamily: MONO,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />
                      {status}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: TXT_4, fontFamily: MONO }}>
                    Ver detalhes →
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ClubeShell>
  );
}
