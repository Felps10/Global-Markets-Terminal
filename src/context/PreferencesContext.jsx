import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';

const PreferencesContext = createContext(null);

const DEFAULTS = {
  theme:           'dark',
  defaultView:     'dashboard',
  defaultExchange: 'NYSE',
};

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return ctx;
}

export function PreferencesProvider({ children }) {
  const { isAuthenticated, getToken } = useAuth();
  const [prefs,  setPrefs]  = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [synced,  setSynced]  = useState(false);

  // Load preferences when authenticated; reset to defaults on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setPrefs(DEFAULTS);
      setSynced(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const res   = await fetch('/api/v1/preferences', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch preferences');
        const { prefs: loaded } = await res.json();
        if (!cancelled) {
          setPrefs(loaded);
          setSynced(true);
        }
      } catch (err) {
        console.error('PreferencesContext load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isAuthenticated, getToken]);

  const updatePrefs = useCallback(async (partial) => {
    // Optimistic update
    setPrefs((prev) => ({ ...prev, ...partial }));

    try {
      const token = await getToken();
      const res   = await fetch('/api/v1/preferences', {
        method:  'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ prefs: partial }),
      });
      if (!res.ok) throw new Error('Failed to save preferences');
      const { prefs: saved } = await res.json();
      setPrefs(saved);
    } catch (err) {
      console.error('PreferencesContext updatePrefs error:', err);
      // Revert on failure by re-fetching
      const token = await getToken();
      const res   = await fetch('/api/v1/preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { prefs: reverted } = await res.json();
        setPrefs(reverted);
      }
    }
  }, [getToken]);

  return (
    <PreferencesContext.Provider value={{ prefs, loading, synced, updatePrefs }}>
      {children}
    </PreferencesContext.Provider>
  );
}
