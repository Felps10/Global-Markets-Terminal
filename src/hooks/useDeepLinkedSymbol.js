// Shared ?symbol= deep-link seeding for Markets pages with a default symbol
// (Chart & Research, Signal Engine). Behavior:
// - Lazy-seeds from the URL param so the default symbol never fetches its
//   data bundle on deep-linked visits.
// - Warm taxonomy (in-app navigation, the common drawer → page path):
//   validates/canonicalizes SYNCHRONOUSLY in the initializer, so a junk or
//   alias param never leaks into a fetch.
// - Cold taxonomy (hard reload): validates once assets arrive, falling back
//   to `fallback` for unknown symbols. Applied at most once per mount so a
//   later taxonomy refresh can't re-apply a stale param over a manual
//   selection. Known accepted race on cold mounts only: an effect keyed to
//   the seeded symbol can fire once for a junk param in the same flush that
//   validation runs in (graceful error, rare path).
// - Later same-route ?symbol= changes while mounted are intentionally
//   ignored (no such navigation exists today; the ref keeps taxonomy
//   refreshes from yanking the user's manual selection).
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { resolveAsset } from '../lib/assetResolution.js';

export default function useDeepLinkedSymbol(assets, { fallback = 'SPY' } = {}) {
  const [searchParams] = useSearchParams();
  const appliedRef = useRef(false);
  const [symbol, setSymbol] = useState(() => {
    const param = (searchParams.get('symbol') || '').toUpperCase();
    if (!param) return fallback;
    if (assets.length > 0) {
      appliedRef.current = true;
      const found = resolveAsset(assets, param);
      return found ? found.symbol : fallback;
    }
    return param;
  });

  useEffect(() => {
    if (appliedRef.current) return;
    const fromParam = searchParams.get('symbol');
    if (!fromParam || assets.length === 0) return;
    appliedRef.current = true;
    const found = resolveAsset(assets, fromParam.toUpperCase());
    setSymbol(found ? found.symbol : fallback);
  }, [assets, searchParams, fallback]);

  return [symbol, setSymbol];
}
