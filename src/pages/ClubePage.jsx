import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { hasRole } from '../lib/roles.js';
import { useClubeCore, useGestorData, useCotistaData } from '../hooks/useClube.js';
import ClubeGestorApp from './ClubeGestorApp.jsx';
import ClubeCotistaApp from './ClubeCotistaApp.jsx';

const MONO = "'JetBrains Mono', monospace";

export default function ClubePage() {
  const { id: clubeIdParam } = useParams();
  const { user, getToken } = useAuth();

  // hasRole is additive — admin passes club_manager check, club_manager passes club_member check
  const isManager = hasRole(user?.role, 'club_manager');
  const isMember  = hasRole(user?.role, 'club_member');

  const core    = useClubeCore(clubeIdParam, getToken);
  const gestor  = useGestorData(clubeIdParam, getToken, isManager);
  const cotista = useCotistaData(clubeIdParam, getToken, isMember && !isManager);

  // All hooks declared above — loading/error guards below are safe
  if (core.loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#080f1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: MONO,
        fontSize: 11,
        color: '#475569',
        letterSpacing: '0.1em'
      }}>
        CARREGANDO...
      </div>
    );
  }

  if (core.error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#080f1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: MONO,
        fontSize: 11,
        color: '#FF5252'
      }}>
        {core.error}
      </div>
    );
  }

  if (isManager) {
    return (
      <ClubeGestorApp
        clube={core.clube}
        navHistory={core.navHistory}
        posicoes={core.posicoes}
        gestorData={gestor}
        refetch={core.refetch}
      />
    );
  }

  return (
    <ClubeCotistaApp
      clube={core.clube}
      navHistory={core.navHistory}
      posicoes={core.posicoes}
      cotistaData={cotista}
    />
  );
}
