/**
 * useSnapshot.js
 * Fetches the latest market snapshot from the API.
 * Falls back to the static JSON file instantly
 * while the API call resolves — no loading flash.
 *
 * Usage:
 *   const { assets, snapshotLabel, loading } = useSnapshot();
 */

import { useState, useEffect } from 'react';
import fallback from '../data/marketSnapshot.json';

const API_URL = import.meta.env.VITE_API_URL || '';

export function useSnapshot() {
  const [snapshot, setSnapshot] = useState({
    assets:        fallback.assets,
    snapshotLabel: fallback.snapshot_label,
    snapshotDate:  fallback.snapshot_date,
    source:        'static',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchSnapshot() {
      try {
        const res = await fetch(`${API_URL}/api/v1/snapshot`);
        if (!res.ok) {
          // 503 = no snapshot in DB yet or unavailable
          // Keep static fallback silently
          console.info(
            '[useSnapshot] API unavailable — using static fallback'
          );
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setSnapshot({
            assets:        data.assets,
            snapshotLabel: data.snapshot_label,
            snapshotDate:  data.snapshot_date,
            source:        'api',
          });
        }
      } catch (err) {
        console.info(
          '[useSnapshot] Fetch failed, using static fallback:',
          err.message
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSnapshot();
    return () => { cancelled = true; };
  }, []);

  return {
    assets:        snapshot.assets,
    snapshotLabel: snapshot.snapshotLabel,
    snapshotDate:  snapshot.snapshotDate,
    source:        snapshot.source,
    loading,
  };
}
