import { Navigate } from 'react-router-dom';
import { useAuth }  from '../hooks/useAuth.js';
import { hasRole }  from '../lib/roles.js';

export default function ProtectedRoute({
  children,
  requiredRole = 'admin',
  showDenied   = false,
}) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole !== null && !hasRole(user?.role, requiredRole)) {
    if (showDenied) return <AccessDenied />;
    return <Navigate to="/app" replace />;
  }

  return children;
}

function AccessDenied() {
  return (
    <div style={{
      minHeight:      '100vh',
      background:     '#080f1a',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      flexDirection:  'column',
      gap:            16,
      padding:        40,
    }}>
      <div style={{
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      11,
        letterSpacing: '0.15em',
        color:         '#475569',
        marginBottom:  8,
      }}>
        ACESSO RESTRITO
      </div>
      <div style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize:   22,
        fontWeight: 600,
        color:      '#e2e8f0',
        textAlign:  'center',
      }}>
        Você não tem acesso a esta área
      </div>
      <div style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize:   14,
        color:      '#64748b',
        textAlign:  'center',
        maxWidth:   360,
        lineHeight: 1.6,
      }}>
        Esta seção é restrita. Entre em contato com o
        administrador para solicitar acesso.
      </div>
      <a href="/app" style={{
        marginTop:     8,
        fontFamily:    "'JetBrains Mono', monospace",
        fontSize:      12,
        color:         'var(--c-accent)',
        textDecoration:'none',
        letterSpacing: '0.08em',
      }}>
        ← Voltar ao terminal
      </a>
    </div>
  );
}
