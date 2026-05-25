import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import ClubeShell from '../components/clube/ClubeShell.jsx';
import CarteiraContent from '../clube/components/shared/CarteiraContent.jsx';
import { CLUBE_COLORS, CLUBE_FONTS } from '../clube/styles/index.js';

const API  = import.meta.env.VITE_API_URL || '';
const C    = CLUBE_COLORS;
const MONO = CLUBE_FONTS.mono;

export default function ClubeCarteiraPage() {
  const { id: clubeIdParam } = useParams();
  const { getToken, user }   = useAuth();

  const [clube,    setClube]    = useState(null);
  const [posicoes, setPosicoes] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    if (!clubeIdParam) return;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Não autenticado');
        const headers = { Authorization: `Bearer ${token}` };

        const [clubeRes, posicoesRes] = await Promise.allSettled([
          fetch(`${API}/api/v1/clubes/${clubeIdParam}`,          { headers }),
          fetch(`${API}/api/v1/clubes/${clubeIdParam}/posicoes`, { headers }),
        ]);

        if (clubeRes.status !== 'fulfilled' || !clubeRes.value.ok) {
          throw new Error(`Erro ao carregar clube (${clubeRes.value?.status ?? 'network'})`);
        }
        const clubeData = await clubeRes.value.json();
        setClube(clubeData);

        const posicoesData = posicoesRes.status === 'fulfilled' && posicoesRes.value.ok
          ? await posicoesRes.value.json()
          : [];
        setPosicoes(posicoesData);
      } catch (err) {
        setError(err.message ?? 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [clubeIdParam, getToken]);

  if (loading) {
    return (
      <ClubeShell activePage="carteira" clubeId={clubeIdParam} clubeNome={null} clubeStatus={null}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 200, fontFamily: MONO, fontSize: 12, color: C.textDim,
        }}>
          Carregando...
        </div>
      </ClubeShell>
    );
  }

  if (error) {
    return (
      <ClubeShell activePage="carteira" clubeId={clubeIdParam} clubeNome={clube?.nome} clubeStatus={clube?.status}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: 200, fontFamily: MONO, gap: 12,
        }}>
          <div style={{ fontSize: 12, color: C.textMain, maxWidth: 400, textAlign: 'center' }}>{error}</div>
        </div>
      </ClubeShell>
    );
  }

  return (
    <ClubeShell
      activePage="carteira"
      clubeId={clubeIdParam}
      clubeNome={clube?.nome}
      clubeStatus={clube?.status}
    >
      <CarteiraContent
        clube={clube}
        posicoes={posicoes}
        getToken={getToken}
        user={user}
        onPosicoesFetched={setPosicoes}
      />
    </ClubeShell>
  );
}
