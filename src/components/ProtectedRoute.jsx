import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function ProtectedRoute({ children, requiredRole = 'admin' }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // requiredRole={null} means any authenticated user may pass
  if (requiredRole != null && user?.role !== requiredRole) {
    return <Navigate to="/app" replace />;
  }

  return children;
}
