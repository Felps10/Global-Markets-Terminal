import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTaxonomy } from '../../context/TaxonomyContext.jsx';
import { getDataSourceConfig, saveDataSourceConfig } from '../../services/dataSourceService.js';

/**
 * Admin "Data Sources" panel (Data Source Engine, Phase C).
 * Edit provider-precedence overrides layered over the baked-in recommended defaults, at
 * three scopes: global default, per group, per subgroup. Resolution per asset is
 * subgroup → group → global → recommended, then capability-filtered on the server.
 *
 * Overrides are ordered provider lists. Providers not capable of an asset's class are
 * ignored server-side, so all providers are offered here (with a note); an empty/cleared
 * override means "use recommended".
 */

const C = {
  bg: '#080C18', panel: '#0D1220', border: '#1E2740', text: '#E8EAF0', dim: '#8A93A8',
  accent: 'var(--c-accent)', chip: '#141B2E', danger: '#E5484D', ok: '#30A46C',
};
const font = "'Space Mono', 'Courier New', monospace";

const PROVIDER_LABELS = {
  eodhd: 'EODHD', yahoo: 'Yahoo', brapi: 'BRAPI', coingecko: 'CoinGecko',
  bcb: 'BCB', fmp: 'FMP', finnhub: 'Finnhub',
};
const label = (p) => PROVIDER_LABELS[p] || p;

// ── One precedence editor (reused for global / group / subgroup) ──────────────
function PrecedenceEditor({ order, allProviders, onChange }) {
  const has = Array.isArray(order) && order.length > 0;
  const remaining = allProviders.filter((p) => !(order || []).includes(p));

  const move = (i, dir) => {
    const next = [...order];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i) => {
    const next = order.filter((_, k) => k !== i);
    onChange(next.length ? next : null); // empty → clear the override
  };
  const add = (p) => { if (p) onChange([...(order || []), p]); };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {has ? (
        order.map((p, i) => (
          <span key={p} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, background: C.chip,
            border: `1px solid ${C.border}`, borderRadius: 4, padding: '3px 6px', fontSize: 12,
          }}>
            <span style={{ color: C.dim, fontSize: 10 }}>{i + 1}</span>
            <span style={{ color: C.text }}>{label(p)}</span>
            <button onClick={() => move(i, -1)} disabled={i === 0} title="up"
              style={btn(i === 0)}>↑</button>
            <button onClick={() => move(i, +1)} disabled={i === order.length - 1} title="down"
              style={btn(i === order.length - 1)}>↓</button>
            <button onClick={() => remove(i)} title="remove"
              style={{ ...btn(false), color: C.danger }}>✕</button>
          </span>
        ))
      ) : (
        <span style={{ color: C.dim, fontSize: 12, fontStyle: 'italic' }}>— using recommended —</span>
      )}
      {remaining.length > 0 && (
        <select value="" onChange={(e) => { add(e.target.value); e.target.value = ''; }}
          style={{
            background: C.panel, color: C.text, border: `1px solid ${C.border}`,
            borderRadius: 4, padding: '3px 6px', fontSize: 12, fontFamily: font, cursor: 'pointer',
          }}>
          <option value="">+ add provider…</option>
          {remaining.map((p) => <option key={p} value={p}>{label(p)}</option>)}
        </select>
      )}
      {has && (
        <button onClick={() => onChange(null)} title="reset to recommended"
          style={{ ...linkBtn, color: C.dim }}>reset</button>
      )}
    </div>
  );
}
const btn = (disabled) => ({
  background: 'transparent', border: 'none', color: disabled ? C.border : C.dim,
  cursor: disabled ? 'default' : 'pointer', fontSize: 11, padding: '0 2px', fontFamily: font,
});
const linkBtn = {
  background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11,
  textDecoration: 'underline', fontFamily: font,
};

// ── Panel ──────────────────────────────────────────────────────────────────────
export default function DataSourcesManager() {
  const { groups } = useTaxonomy();
  const [cfg, setCfg] = useState(null);            // { global, groups:{}, subgroups:{} }
  const [providers, setProviders] = useState({});  // capability matrix
  const [recommended, setRecommended] = useState({ ideal: {}, effective: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const allProviders = useMemo(() => Object.keys(providers), [providers]);

  useEffect(() => {
    let cancelled = false;
    getDataSourceConfig()
      .then((d) => {
        if (cancelled) return;
        setCfg({ global: d.config.global || [], groups: d.config.groups || {}, subgroups: d.config.subgroups || {} });
        setProviders(d.providers || {});
        setRecommended(d.recommended || { ideal: {}, effective: {} });
        setLoading(false);
      })
      .catch((e) => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const setGlobal    = useCallback((order) => setCfg((c) => ({ ...c, global: order || [] })), []);
  const setScopeOrder = useCallback((bucket, id, order) => setCfg((c) => {
    const next = { ...c[bucket] };
    if (order && order.length) next[id] = order; else delete next[id];
    return { ...c, [bucket]: next };
  }), []);

  const resetAll = useCallback(() => setCfg({ global: [], groups: {}, subgroups: {} }), []);

  const save = useCallback(async () => {
    setSaving(true); setError(null);
    try {
      const payload = { version: 1, global: cfg.global, groups: cfg.groups, subgroups: cfg.subgroups };
      const { config } = await saveDataSourceConfig(payload);
      setCfg({ global: config.global || [], groups: config.groups || {}, subgroups: config.subgroups || {} });
      setToast({ kind: 'ok', msg: 'Saved. New precedence applies on the next fetch cycle.' });
      setTimeout(() => setToast(null), 4000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }, [cfg]);

  if (loading) return <div style={{ color: C.dim, padding: 24, fontFamily: font }}>Loading config…</div>;
  if (error && !cfg) return <div style={{ color: C.danger, padding: 24, fontFamily: font }}>Error: {error}</div>;

  return (
    <div style={{ padding: 24, color: C.text, fontFamily: font, maxWidth: 900, height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700 }}>
          Data Sources
        </h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={resetAll} style={{ ...linkBtn, color: C.dim, fontSize: 12 }}>reset all</button>
          <button onClick={save} disabled={saving} style={{
            background: C.accent, color: '#04121A', border: 'none', borderRadius: 4,
            padding: '6px 14px', fontSize: 12, fontWeight: 700, fontFamily: font,
            cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
          }}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
      <p style={{ color: C.dim, fontSize: 12, marginTop: 0, lineHeight: 1.5 }}>
        Provider precedence, layered over the recommended defaults (resolution: subgroup → group →
        global → recommended). Providers that can’t serve a group’s asset class are ignored. An empty
        scope uses the recommended order. Changes apply on the next fetch cycle.
      </p>
      {error && <div style={{ color: C.danger, fontSize: 12, marginBottom: 10 }}>Error: {error}</div>}
      {toast && <div style={{ color: toast.kind === 'ok' ? C.ok : C.danger, fontSize: 12, marginBottom: 10 }}>{toast.msg}</div>}

      {/* Global default */}
      <Section title="Global default">
        <Row label="All assets (default)">
          <PrecedenceEditor order={cfg.global} allProviders={allProviders} onChange={setGlobal} />
        </Row>
      </Section>

      {/* Per group → subgroup */}
      {groups.map((g) => (
        <Section key={g.id} title={g.display_name}>
          <Row label={`${g.display_name} (group)`} strong>
            <PrecedenceEditor order={cfg.groups[g.id]} allProviders={allProviders}
              onChange={(o) => setScopeOrder('groups', g.id, o)} />
          </Row>
          {(g.subgroups || []).map((s) => (
            <Row key={s.id} label={s.display_name} indent>
              <PrecedenceEditor order={cfg.subgroups[s.id]} allProviders={allProviders}
                onChange={(o) => setScopeOrder('subgroups', s.id, o)} />
            </Row>
          ))}
        </Section>
      ))}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.dim,
        borderBottom: `1px solid ${C.border}`, paddingBottom: 4, marginBottom: 8,
      }}>{title}</div>
      {children}
    </div>
  );
}
function Row({ label: rowLabel, children, indent, strong }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '6px 0',
      paddingLeft: indent ? 18 : 0,
    }}>
      <div style={{
        width: 220, flexShrink: 0, fontSize: 12, color: strong ? C.text : C.dim,
        fontWeight: strong ? 700 : 400,
      }}>{rowLabel}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
