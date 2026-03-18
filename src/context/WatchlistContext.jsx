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
      const res   = await fetch('/api/v1/watchlist', {
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
    const token = await getToken();
    const res   = await fetch('/api/v1/watchlist', {
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
    if (!res.ok) throw new Error('Failed to pin item');

    const newItem = await res.json();
    setItems((prev) => [newItem, ...prev]);
  }, [getToken, refresh]);

  const unpin = useCallback(async (type, target_id) => {
    const token = await getToken();
    const res   = await fetch(`/api/v1/watchlist/${type}/${target_id}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to unpin item');
    setItems((prev) =>
      prev.filter((i) => !(i.type === type && i.target_id === target_id))
    );
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
