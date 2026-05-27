import { useState, useEffect, useCallback, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || '';

// ── Helper ───────────────────────────────────────────────────────────────────

async function authFetch(url, getToken) {
  const token = await getToken();
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── useClubeCore ─────────────────────────────────────────────────────────────
// Fetches the three data sets needed by both gestor and cotista views.

export function useClubeCore(clubeId, getToken) {
  const [clube, setClube]           = useState(null);
  const [navHistory, setNavHistory] = useState([]);
  const [posicoes, setPosicoes]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const fetchAll = useCallback(async () => {
    if (!clubeId) return;
    setLoading(true);
    setError(null);
    try {
      const base = `${API}/api/v1/clubes/${clubeId}`;
      const clubeData = await authFetch(base, getToken);
      setClube(clubeData);

      const [navData, posData] = await Promise.all([
        authFetch(`${base}/nav`, getToken),
        authFetch(`${base}/posicoes`, getToken),
      ]);
      setNavHistory(navData);
      setPosicoes(posData);
    } catch (err) {
      setError(err.message ?? 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [clubeId, getToken]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { clube, navHistory, posicoes, loading, error, refetch: fetchAll };
}

// ── useGestorData ────────────────────────────────────────────────────────────
// Fetches manager-only data. Only fires when enabled=true.

export function useGestorData(clubeId, getToken, enabled) {
  const [cotistas, setCotistas]             = useState(null);
  const [compliance, setCompliance]         = useState(null);
  const [operacional, setOperacional]       = useState(null);
  const [estatuto, setEstatuto]             = useState(null);
  const [setupChecklist, setSetupChecklist] = useState(null);
  const [annualClose, setAnnualClose]       = useState(null);
  const [auditLog, setAuditLog]             = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);

  useEffect(() => {
    if (!enabled || !clubeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const base = `${API}/api/v1/clubes/${clubeId}`;

        // Annual close only relevant in January
        const month = new Date().getMonth();
        const annualCloseYear = month === 0 ? new Date().getFullYear() - 1 : null;

        const results = await Promise.allSettled([
          authFetch(`${base}/cotistas`, getToken),
          authFetch(`${base}/compliance`, getToken),
          authFetch(`${base}/operacional`, getToken),
          authFetch(`${base}/estatuto/active`, getToken),
          authFetch(`${base}/setup-checklist`, getToken),
          annualCloseYear
            ? authFetch(`${base}/annual-close/${annualCloseYear}`, getToken)
            : Promise.resolve(null),
          authFetch(`${base}/audit-log?limit=50`, getToken),
        ]);

        if (cancelled) return;

        const val = (i) => results[i].status === 'fulfilled' ? results[i].value : null;

        setCotistas(val(0));
        setCompliance(val(1));
        setOperacional(val(2));
        setEstatuto(val(3));
        setSetupChecklist(val(4));
        setAnnualClose(val(5));
        setAuditLog(val(6) ?? []);
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Erro desconhecido');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [clubeId, getToken, enabled]);

  if (!enabled) {
    return {
      cotistas: null, compliance: null, operacional: null,
      estatuto: null, setupChecklist: null, annualClose: null,
      auditLog: [], loading: false, error: null,
    };
  }

  return { cotistas, compliance, operacional, estatuto, setupChecklist, annualClose, auditLog, loading, error };
}

// ── useCotistaData ───────────────────────────────────────────────────────────
// Fetches cotista-scoped data. Only fires when enabled=true.
// Sequential: meu-cotista first, then movimentacoes filtered by cotista_id.

export function useCotistaData(clubeId, getToken, enabled) {
  const [minhaCotista, setMinhaCotista]               = useState(null);
  const [entryDate, setEntryDate]                     = useState(null);
  const [minhasMovimentacoes, setMinhasMovimentacoes] = useState([]);
  const [minhaPosicao, setMinhaPosicao]               = useState(null);
  const [loading, setLoading]                         = useState(false);
  const [error, setError]                             = useState(null);

  useEffect(() => {
    if (!enabled || !clubeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const base = `${API}/api/v1/clubes/${clubeId}`;

        // Step 1: get this user's cotista row
        const meuData = await authFetch(`${base}/meu-cotista`, getToken);

        if (cancelled) return;

        if (!meuData.cotista || meuData.reason === 'not_linked') {
          setMinhaCotista(null);
          setEntryDate(null);
          setMinhasMovimentacoes([]);
          setMinhaPosicao(null);
          return;
        }

        setMinhaCotista(meuData.cotista);
        setEntryDate(meuData.entryDate ?? null);

        // Step 2: fetch movimentações + position in parallel
        const [movs, posicao] = await Promise.all([
          authFetch(
            `${base}/movimentacoes?cotista_id=${meuData.cotista.id}`,
            getToken,
          ),
          fetch(`${base}/cotistas/me`, {
            headers: { Authorization: `Bearer ${await getToken()}` },
          }).then(r => {
            if (r.status === 404) return null;
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          }).catch(err => {
            console.warn('[useCotistaData] /cotistas/me failed:', err.message);
            return null;
          }),
        ]);

        if (cancelled) return;
        setMinhasMovimentacoes(movs ?? []);
        setMinhaPosicao(posicao);
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Erro desconhecido');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [clubeId, getToken, enabled]);

  if (!enabled) {
    return {
      minhaCotista: null, entryDate: null,
      minhasMovimentacoes: [], minhaPosicao: null,
      loading: false, error: null,
    };
  }

  return { minhaCotista, entryDate, minhasMovimentacoes, minhaPosicao, loading, error };
}

