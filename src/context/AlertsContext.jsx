import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.js';

const AlertsContext = createContext(null);

export function useAlerts() {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error('useAlerts must be used inside <AlertsProvider>');
  return ctx;
}

const API = import.meta.env.VITE_API_URL || '';

export function AlertsProvider({ children }) {
  const { isAuthenticated, getToken } = useAuth();
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setAlerts([]); return; }
    setLoading(true);
    try {
      const token = await getToken();
      const res   = await fetch(`${API}/api/v1/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch alerts');
      setAlerts(await res.json());
    } catch (err) {
      console.error('AlertsContext refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getToken]);

  useEffect(() => { refresh(); }, [refresh]);

  const createAlert = useCallback(async (symbol, condition, threshold) => {
    const token = await getToken();
    const res   = await fetch(`${API}/api/v1/alerts`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({ symbol, condition, threshold }),
    });
    if (!res.ok) throw new Error('Failed to create alert');
    const created = await res.json();
    setAlerts(prev => [created, ...prev]);
    return created;
  }, [getToken]);

  const deleteAlert = useCallback(async (id) => {
    const token = await getToken();
    const res   = await fetch(`${API}/api/v1/alerts/${id}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete alert');
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, [getToken]);

  const toggleAlert = useCallback(async (id) => {
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;
    const token = await getToken();
    const res   = await fetch(`${API}/api/v1/alerts/${id}`, {
      method:  'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({ active: !alert.active }),
    });
    if (!res.ok) throw new Error('Failed to toggle alert');
    const updated = await res.json();
    setAlerts(prev => prev.map(a => a.id === id ? updated : a));
  }, [alerts, getToken]);

  const deactivateAlert = useCallback(async (id) => {
    const token = await getToken();
    const res   = await fetch(`${API}/api/v1/alerts/${id}`, {
      method:  'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({ active: false, triggered_at: new Date().toISOString() }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setAlerts(prev => prev.map(a => a.id === id ? updated : a));
  }, [getToken]);

  const activeAlerts = alerts.filter(a => a.active);
  const [triggeredQueue, setTriggeredQueue] = useState([]);

  // Ref to avoid stale closures in checkAlerts
  const activeAlertsRef = useRef(activeAlerts);
  useEffect(() => { activeAlertsRef.current = activeAlerts; }, [activeAlerts]);

  // Called by polling consumers (e.g. GlobalMarketsTerminal) after price update.
  // marketData: { [symbol]: { price, ... } }
  const checkAlerts = useCallback((marketData) => {
    if (!marketData) return;
    const current = activeAlertsRef.current;
    for (const alert of current) {
      const data = marketData[alert.symbol];
      if (!data?.price) continue;
      const price = Number(data.price);
      const threshold = Number(alert.threshold);
      const triggered =
        (alert.condition === 'above' && price > threshold) ||
        (alert.condition === 'below' && price < threshold);
      if (triggered) {
        deactivateAlert(alert.id);
        setTriggeredQueue(prev => [...prev, alert]);
      }
    }
  }, [deactivateAlert]);

  const clearTriggered = useCallback(() => {
    setTriggeredQueue([]);
  }, []);

  return (
    <AlertsContext.Provider value={{
      alerts, activeAlerts, loading, triggeredQueue,
      createAlert, deleteAlert, toggleAlert, deactivateAlert,
      checkAlerts, clearTriggered, refresh,
    }}>
      {children}
    </AlertsContext.Provider>
  );
}
