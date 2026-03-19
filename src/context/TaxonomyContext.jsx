import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { fetchTaxonomy } from '../services/taxonomyService.js';

export const TaxonomyContext = createContext(null);

export function TaxonomyProvider({ children }) {
  const [tree,    setTree]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTaxonomy();
      setTree(data);
    } catch (err) {
      setError(err?.message || 'Failed to load taxonomy');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Flattened views for convenience
  const groups = useMemo(() => tree, [tree]);

  const subgroups = useMemo(
    () => tree.flatMap((g) => g.subgroups.map((s) => ({ ...s, groupDisplayName: g.display_name }))),
    [tree],
  );

  const assets = useMemo(
    () => subgroups.flatMap((s) => s.assets.map((a) => ({ ...a, subgroupDisplayName: s.display_name }))),
    [subgroups],
  );

  // Terminal-view filtered derived trees
  const globalTaxonomy = useMemo(
    () => tree.filter((g) => !g.terminal_view || g.terminal_view === 'global'),
    [tree],
  );

  const brazilTaxonomy = useMemo(
    () => tree.filter((g) => g.terminal_view === 'brazil'),
    [tree],
  );

  const value = {
    taxonomy:       tree,
    globalTaxonomy,
    brazilTaxonomy,
    groups,
    subgroups,
    assets,
    loading,
    error,
    refresh:        load,
  };

  return (
    <TaxonomyContext.Provider value={value}>
      {children}
    </TaxonomyContext.Provider>
  );
}

export function useTaxonomy() {
  return useContext(TaxonomyContext);
}
