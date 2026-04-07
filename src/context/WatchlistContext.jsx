import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';

const WatchlistContext = createContext(null);

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used inside <WatchlistProvider>');
  return ctx;
}

export function WatchlistProvider({ children }) {
  const { isAuthenticated, getToken } = useAuth();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setItems([]); return; }
    setLoading(true);
    try {
      const token = await getToken();
      const res   = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/watchlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch watchlist');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('WatchlistContext refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getToken]);

  // Fetch whenever auth state changes
  useEffect(() => { refresh(); }, [refresh]);

  const pin = useCallback(async (type, target_id) => {
    // Optimistic: add immediately
    const optimistic = { type, target_id, id: `opt_${Date.now()}` };
    setItems((prev) => [optimistic, ...prev]);

    try {
      const token = await getToken();
      const res   = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/watchlist`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ type, target_id }),
      });

      if (res.status === 409) {
        // Already pinned — re-sync to be safe
        await refresh();
        return;
      }
      if (!res.ok) {
        // Rollback optimistic add
        setItems((prev) => prev.filter((i) => i.id !== optimistic.id));
        return;
      }

      const newItem = await res.json();
      // Replace optimistic placeholder with real server item
      setItems((prev) => prev.map((i) => i.id === optimistic.id ? newItem : i));
    } catch (err) {
      // Rollback on network error
      setItems((prev) => prev.filter((i) => i.id !== optimistic.id));
      console.error('WatchlistContext pin error:', err);
    }
  }, [getToken, refresh]);

  const unpin = useCallback(async (type, target_id) => {
    // Optimistic: remove immediately
    let removed = null;
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.type === type && i.target_id === target_id);
      if (idx >= 0) removed = prev[idx];
      return prev.filter((i) => !(i.type === type && i.target_id === target_id));
    });

    try {
      const token = await getToken();
      const res   = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/watchlist/${type}/${target_id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && removed) {
        // Rollback: re-add the removed item
        setItems((prev) => [removed, ...prev]);
      }
    } catch (err) {
      // Rollback on network error
      if (removed) setItems((prev) => [removed, ...prev]);
      console.error('WatchlistContext unpin error:', err);
    }
  }, [getToken]);

  const isPinned = useCallback(
    (type, target_id) => items.some((i) => i.type === type && i.target_id === target_id),
    [items]
  );

  return (
    <WatchlistContext.Provider value={{ items, loading, pin, unpin, isPinned, refresh }}>
      {children}
    </WatchlistContext.Provider>
  );
}
