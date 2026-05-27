import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import ClubeShell from '../components/clube/ClubeShell.jsx';
import OperacionalContent from '../clube/components/shared/OperacionalContent.jsx';

const API = import.meta.env.VITE_API_URL || '';

export default function ClubeOperacionalPage() {
  const { id: clubeIdParam } = useParams();
  const { user, getToken } = useAuth();

  const [clube, setClube] = useState(null);

  useEffect(() => {
    if (!clubeIdParam) return;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API}/api/v1/clubes/${clubeIdParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setClube(data);
      } catch {
        // silently ignore — shell will just show no name
      }
    })();
  }, [clubeIdParam]);

  return (
    <ClubeShell
      activePage="operacional"
      clubeId={clubeIdParam}
      clubeNome={clube?.nome}
      clubeStatus={clube?.status}
    >
      <OperacionalContent clube={clube ?? { id: clubeIdParam }} getToken={getToken} user={user} />
    </ClubeShell>
  );
}
