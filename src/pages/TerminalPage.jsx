import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function TerminalPage() {
  const navigate = useNavigate();
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) navigate('/app', { replace: true });
  }, [loading, navigate]);

  return null;
}
