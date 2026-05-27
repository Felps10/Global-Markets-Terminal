import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import ClubeShell from '../components/clube/ClubeShell.jsx';
import EstatutoContent from '../clube/components/shared/EstatutoContent.jsx';
import { CLUBE_COLORS, CLUBE_FONTS } from '../clube/styles/index.js';

const API = import.meta.env.VITE_API_URL || '';
const MONO = CLUBE_FONTS.mono;

export default function ClubeEstatutoPage() {
  const { id: clubeIdParam } = useParams();
  const { getToken } = useAuth();

  const [clube, setClube] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clubeIdParam) return;

    async function loadClube() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`${API}/api/v1/clubes/${clubeIdParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setClube(await res.json());
        } else {
          setError('Clube não encontrado');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadClube();
  }, [clubeIdParam, getToken]);

  return (
    <ClubeShell
      activePage="estatuto"
      clubeId={clubeIdParam}
      clubeNome={clube?.nome}
      clubeStatus={clube?.status}
    >
      {loading && (
        <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: CLUBE_COLORS.textDim, letterSpacing: '0.1em' }}>
          CARREGANDO...
        </div>
      )}
      {error && (
        <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: CLUBE_COLORS.red }}>
          {error}
        </div>
      )}
      {!loading && !error && clube && (
        <EstatutoContent clube={clube} getToken={getToken} />
      )}
    </ClubeShell>
  );
}
