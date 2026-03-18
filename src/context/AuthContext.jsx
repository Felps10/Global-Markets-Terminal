import { createContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

export const AuthContext = createContext(null);

function mapUser(supabaseUser) {
  return {
    id:    supabaseUser.id,
    email: supabaseUser.email,
    name:  supabaseUser.user_metadata?.name || '',
    role:  supabaseUser.user_metadata?.role || 'user',
  };
}

const API_URL = import.meta.env.VITE_API_URL || '';

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount — Supabase SDK reads from localStorage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session ? mapUser(session.user) : null);
      setLoading(false);
    });

    // Stay in sync with all auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session ? mapUser(session.user) : null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    // onAuthStateChange handles clearing user + session state
  }, []);

  const register = useCallback(async (name, email, password, confirmPassword) => {
    try {
      // Express handles password validation + admin.createUser
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data };

      // Sign in via Supabase to establish a proper persistent session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) return { success: false, error: signInError };

      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }, []);

  // Used by API call sites that need the current Bearer token
  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const value = {
    user,
    session,
    loading,
    login,
    logout,
    register,
    getToken,
    isAuthenticated: !!user,
    isAdmin:         user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
