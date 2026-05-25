import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import ClubeShell from '../components/clube/ClubeShell.jsx';
import RiscoContent from '../clube/components/shared/RiscoContent.jsx';
import { CLUBE_COLORS, CLUBE_FONTS } from '../clube/styles/index.js';

const API  = import.meta.env.VITE_API_URL || '';
const C    = CLUBE_COLORS;
const MONO = CLUBE_FONTS.mono;

export default function ClubeRiscoPage() {
  const navigate             = useNavigate();
  const { id: clubeIdParam } = useParams();
  const { getToken, user }   = useAuth();

  // ── Page-level state ──────────────────────────────────────────────────────
  const [clube,      setClube]      = useState(null);
  const [navHistory, setNavHistory] = useState([]);
  const [operacional, setOperacional] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // ── Fetch clube + navHistory + operacional ────────────────────────────────
  useEffect(() => {
    if (!clubeIdParam) return;

    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Sessão expirada. Faça login novamente.');
        const headers = { Authorization: `Bearer ${token}` };

        const [clubeRes, navRes, opRes] = await Promise.allSettled([
          fetch(`${API}/api/v1/clubes/${clubeIdParam}`,             { headers }),
          fetch(`${API}/api/v1/clubes/${clubeIdParam}/nav`,         { headers }),
          fetch(`${API}/api/v1/clubes/${clubeIdParam}/operacional`, { headers }),
        ]);

        const clubeData = clubeRes.status === 'fulfilled' && clubeRes.value.ok
          ? await clubeRes.value.json() : null;
        const navData = navRes.status === 'fulfilled' && navRes.value.ok
          ? await navRes.value.json() : [];
        const opData = opRes.status === 'fulfilled' && opRes.value.ok
          ? await opRes.value.json() : null;

        setClube(clubeData);
        setNavHistory(navData);
        setOperacional(opData);
      } catch (err) {
        setError(err.message ?? 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [clubeIdParam, getToken]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#080f1a', fontFamily: MONO, gap: 12,
      }}>
        <div style={{ fontSize: 11, color: C.accent, letterSpacing: '0.2em' }}>RISCO</div>
        <div style={{ fontSize: 12, color: C.textMain }}>Carregando dados...</div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#080f1a', fontFamily: MONO, gap: 12,
      }}>
        <div style={{ fontSize: 11, color: C.red, letterSpacing: '0.1em' }}>ERRO</div>
        <div style={{ fontSize: 12, color: C.textMain, maxWidth: 400, textAlign: 'center' }}>{error}</div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!clube) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#080f1a', fontFamily: MONO, gap: 12,
      }}>
        <div style={{ fontSize: 12, color: C.textMain }}>Nenhum clube encontrado.</div>
        <button
          onClick={() => navigate('/app')}
          style={{
            marginTop: 8, padding: '8px 20px', background: 'transparent',
            border: `1px solid ${C.borderFaint}`, borderRadius: 4, color: C.textMain,
            fontFamily: MONO, fontSize: 11, cursor: 'pointer',
          }}
        >← Voltar</button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ClubeShell
      activePage="risco"
      clubeId={clubeIdParam}
      clubeNome={clube?.nome}
      clubeStatus={clube?.status}
    >
      <RiscoContent
        clube={clube}
        getToken={getToken}
        user={user}
        navHistory={navHistory}
        operacional={operacional}
      />
    </ClubeShell>
  );
}
