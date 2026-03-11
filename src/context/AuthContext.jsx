import { createContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister } from '../services/taxonomyService.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Token lives in memory only — nothing to restore on mount
  useEffect(() => { setLoading(false); }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password); // throws on error
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  const register = useCallback(async (name, email, password, confirmPassword) => {
    try {
      const data = await apiRegister(name, email, password, confirmPassword);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    register,
    isAuthenticated: !!user,
    isAdmin:         user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
