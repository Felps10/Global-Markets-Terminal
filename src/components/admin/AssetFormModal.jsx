import { useState, useEffect } from 'react';
import { createAsset, updateAsset, deleteAsset } from '../../services/taxonomyService.js';

const ASSET_TYPES = [
  { value: 'equity',          label: 'Equity' },
  { value: 'equity-br',       label: 'Equity BR (B3)' },
  { value: 'fii',             label: 'FII (Fundo Imobiliário)' },
  { value: 'etf',             label: 'ETF (Global)' },
  { value: 'etf-br',          label: 'ETF BR (B3)' },
  { value: 'index',           label: 'Index' },
  { value: 'index-br',        label: 'Index BR' },
  { value: 'forex',           label: 'Forex' },
  { value: 'crypto',          label: 'Crypto' },
  { value: 'rate',            label: 'Rate (BCB)' },
  { value: 'macro-indicator', label: 'Macro Indicator' },
  { value: 'public-debt',     label: 'Título Público' },
  { value: 'credit',          label: 'Crédito' },
];

function metaTemplate(type) {
  if (['equity-br', 'fii', 'etf-br'].includes(type)) return '{\n  "isB3": true\n}';
  if (type === 'crypto') return '{\n  "isCrypto": true,\n  "cgId": ""\n}';
  if (['forex', 'index'].includes(type)) return '{\n  "display": ""\n}';
  return '{}';
}

function suggestCurrency(exchange) {
  if (!exchange) return '';
  const ex = exchange.trim().toUpperCase();
  if (ex === 'B3') return 'BRL';
  if (['FOREX', 'CRYPTO', 'INDEX', 'BCB', 'CBOE'].includes(ex)) return '';
  if (ex) return 'USD';
  return '';
}

const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#0D1220',
    border: '1px solid #1E2740',
    borderRadius: 8,
    width: 540,
    maxWidth: '95vw',
    maxHeight: '92vh',
    overflowY: 'auto',
    padding: 28,
    fontFamily: "'Space Mono', monospace",
  },
  title: {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: 16, fontWeight: 700,
    color: '#E8EAF0', margin: '0 0 24px',
  },
  field: { marginBottom: 16 },
  label: {
    display: 'block', fontSize: 10, fontWeight: 600,
    letterSpacing: '0.15em', color: '#4A5568',
    textTransform: 'uppercase', marginBottom: 6,
  },
  input: {
    width: '100%', background: '#080C18',
    border: '1px solid #1E2740',
    borderRadius: 4, color: '#E8EAF0',
    fontFamily: "'Space Mono', monospace", fontSize: 13,
    padding: '9px 12px', outline: 'none', boxSizing: 'border-box',
  },
  inputError: {
    border: '1px solid var(--c-error)',
  },
  select: {
    width: '100%', background: '#080C18',
    border: '1px solid #1E2740',
    borderRadius: 4, color: '#E8EAF0',
    fontFamily: "'Space Mono', monospace", fontSize: 13,
    padding: '9px 12px', outline: 'none', boxSizing: 'border-box',
    cursor: 'pointer',
  },
  selectError: {
    border: '1px solid var(--c-error)',
  },
  textarea: {
    width: '100%', background: '#080C18',
    border: '1px solid #1E2740',
    borderRadius: 4, color: '#E8EAF0',
    fontFamily: "'Space Mono', monospace", fontSize: 12,
    padding: '9px 12px', outline: 'none',
    resize: 'vertical', minHeight: 80, boxSizing: 'border-box',
  },
  textareaError: {
    border: '1px solid var(--c-error)',
  },
  fieldError: {
    fontSize: 11, color: 'var(--c-error)', marginTop: 4,
  },
  row2: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
  },
  errorMsg: {
    background: 'rgba(255,82,82,0.08)',
    border: '1px solid rgba(255,82,82,0.3)',
    borderRadius: 4, color: 'var(--c-error)',
    fontSize: 12, padding: '10px 12px', marginBottom: 18,
  },
  confirmText: {
    color: '#8892A4', fontSize: 13, lineHeight: 1.6, marginBottom: 24,
  },
  confirmSpan: {
    color: 'var(--c-error)', fontWeight: 700,
  },
  actions: {
    display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24,
  },
  actionsWithDelete: {
    display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 24,
  },
  btn: {
    borderRadius: 4, fontFamily: "'Space Mono', monospace",
    fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
    padding: '9px 18px', cursor: 'pointer', textTransform: 'uppercase',
    transition: 'background 0.15s',
  },
  cancelBtn: {
    background: 'transparent', border: '1px solid #1E2740', color: '#4A5568',
  },
  deleteBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,82,82,0.35)',
    color: 'var(--c-error)',
  },
};

export default function AssetFormModal({
  asset,
  subgroup,
  allSubgroups = [],
  onClose,
  onSaved,
}) {
  const isEdit = !!asset;

  const [symbol,         setSymbol]         = useState(asset?.symbol      || '');
  const [name,           setName]           = useState(asset?.name        || '');
  const [type,           setType]           = useState(asset?.type        || '');
  const [exchange,       setExchange]       = useState(asset?.exchange    || '');
  const [subgroupId,     setSubgroupId]     = useState(asset?.subgroup_id || subgroup?.id || '');
  const [currency,       setCurrency]       = useState(asset?.currency    || '');
  const [active,         setActive]         = useState(asset?.active !== undefined ? !!asset.active : true);
  const [sortOrder,      setSortOrder]      = useState(asset?.sort_order  ?? 0);
  const [sector,         setSector]         = useState(asset?.sector     || '');
  const [metaJson,       setMetaJson]       = useState(
    asset?.meta ? JSON.stringify(asset.meta, null, 2) : '',
  );
  const [metaManual,     setMetaManual]     = useState(isEdit);
  const [currencyManual, setCurrencyManual] = useState(isEdit && !!asset?.currency);
  const [error,          setError]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);

  // Auto-populate meta template when type changes (unless user has manually edited)
  useEffect(() => {
    if (!metaManual && type) {
      setMetaJson(metaTemplate(type));
    }
  }, [type, metaManual]);

  // Auto-suggest currency when exchange changes (unless user has manually set it)
  useEffect(() => {
    if (!currencyManual) {
      setCurrency(suggestCurrency(exchange));
    }
  }, [exchange, currencyManual]);

  // Group allSubgroups by groupDisplayName for <optgroup>
  const subgroupsByGroup = {};
  for (const s of allSubgroups) {
    const key = s.groupDisplayName || s.group_id;
    if (!subgroupsByGroup[key]) subgroupsByGroup[key] = [];
    subgroupsByGroup[key].push(s);
  }

  function parseMetaJson() {
    if (!metaJson.trim()) return null;
    try { return JSON.parse(metaJson); } catch { return 'INVALID'; }
  }

  const metaInvalid = !!metaJson.trim() && parseMetaJson() === 'INVALID';

  const canSave = symbol.trim() && name.trim() && subgroupId && !metaInvalid;

  async function handleSave() {
    if (!canSave) return;
    setError('');
    setLoading(true);
    try {
      const payload = {
        symbol:      symbol.trim().toUpperCase(),
        name:        name.trim(),
        type:        type       || null,
        exchange:    exchange.trim() || null,
        subgroup_id: subgroupId,
        currency:    currency.trim() || null,
        active,
        sort_order:  Number(sortOrder) || 0,
        sector:      sector.trim() || null,
        meta:        parseMetaJson(),
      };
      if (isEdit) {
        await updateAsset(asset.id, payload);
      } else {
        await createAsset(payload);
      }
      onSaved(false);
    } catch (err) {
      setError(err?.message || 'Failed to save asset');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setError('');
    setLoading(true);
    try {
      await deleteAsset(asset.id);
      onSaved(true);
    } catch (err) {
      setError(err?.message || 'Failed to delete asset');
    } finally {
      setLoading(false);
    }
  }

  const saveDisabled = loading || !canSave;

  // ── Inline delete confirmation ─────────────────────────────────────────────
  if (confirmDelete) {
    return (
      <div style={S.overlay} onClick={onClose}>
        <style>{`
          .admin-modal input:focus, .admin-modal select:focus, .admin-modal textarea:focus {
            outline: none;
            border-color: var(--c-accent);
          }
          .admin-modal input.field-error:focus, .admin-modal select.field-error:focus, .admin-modal textarea.field-error:focus {
            border-color: var(--c-error);
          }
          .admin-modal::-webkit-scrollbar { width: 4px; }
          .admin-modal::-webkit-scrollbar-track { background: transparent; }
          .admin-modal::-webkit-scrollbar-thumb { background: #1E2740; border-radius: 2px; }
        `}</style>
        <div className="admin-modal" style={S.modal} onClick={(e) => e.stopPropagation()}>
          <h2 style={S.title}>Delete Asset</h2>
          {error && <div style={S.errorMsg}>⚠ {error}</div>}
          <p style={S.confirmText}>
            Delete <span style={S.confirmSpan}>{asset?.symbol}</span> permanently?<br />
            This cannot be undone.
          </p>
          <div style={S.actions}>
            <button
              style={{ ...S.btn, ...S.cancelBtn }}
              onClick={() => setConfirmDelete(false)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#4A5568'; e.currentTarget.style.color = '#E8EAF0'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2740'; e.currentTarget.style.color = '#4A5568'; }}
            >Cancel</button>
            <button
              style={{
                ...S.btn,
                background: loading ? '#1E2740' : 'var(--c-error)',
                border: 'none',
                color: loading ? '#4A5568' : '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onClick={handleDelete}
              disabled={loading}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#FF6B6B'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--c-error)'; }}
            >
              {loading ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Add / Edit form ────────────────────────────────────────────────────────
  return (
    <div style={S.overlay} onClick={onClose}>
      <style>{`
        .admin-modal input:focus, .admin-modal select:focus, .admin-modal textarea:focus {
          outline: none;
          border-color: var(--c-accent);
        }
        .admin-modal input.field-error:focus, .admin-modal select.field-error:focus, .admin-modal textarea.field-error:focus {
          border-color: var(--c-error);
        }
        .admin-modal::-webkit-scrollbar { width: 4px; }
        .admin-modal::-webkit-scrollbar-track { background: transparent; }
        .admin-modal::-webkit-scrollbar-thumb { background: #1E2740; border-radius: 2px; }
      `}</style>
      <div className="admin-modal" style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={S.title}>{isEdit ? `Edit Asset: ${asset.symbol}` : 'Add Asset'}</h2>

        {error && <div style={S.errorMsg}>⚠ {error}</div>}

        <div style={S.row2}>
          <div style={S.field}>
            <label style={S.label}>Symbol *</label>
            <input
              style={(!symbol && !!error) ? { ...S.input, ...S.inputError } : S.input}
              className={(!symbol && !!error) ? 'field-error' : ''}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. AAPL"
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>Exchange</label>
            <input
              style={S.input}
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              placeholder="e.g. NASDAQ"
            />
          </div>
        </div>

        <div style={S.field}>
          <label style={S.label}>Name *</label>
          <input
            style={(!name && !!error) ? { ...S.input, ...S.inputError } : S.input}
            className={(!name && !!error) ? 'field-error' : ''}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Apple Inc."
          />
        </div>

        <div style={S.row2}>
          <div style={S.field}>
            <label style={S.label}>Type</label>
            <select style={S.select} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">— Select —</option>
              {ASSET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div style={S.field}>
            <label style={S.label}>Currency</label>
            <input
              style={S.input}
              value={currency}
              onChange={(e) => { setCurrency(e.target.value); setCurrencyManual(true); }}
              placeholder="e.g. USD"
            />
          </div>
        </div>

        <div style={S.field}>
          <label style={S.label}>Subgroup *</label>
          <select
            style={(!subgroupId && !!error) ? { ...S.select, ...S.selectError } : S.select}
            className={(!subgroupId && !!error) ? 'field-error' : ''}
            value={subgroupId}
            onChange={(e) => setSubgroupId(e.target.value)}
          >
            <option value="">— Select Subgroup —</option>
            {Object.entries(subgroupsByGroup).map(([groupName, sgs]) => (
              <optgroup key={groupName} label={groupName}>
                {sgs.map((s) => (
                  <option key={s.id} value={s.id}>{s.display_name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {!subgroupId && !!error && <div style={S.fieldError}>Subgroup is required</div>}
        </div>

        <div style={S.row2}>
          <div style={S.field}>
            <label style={S.label}>Sort Order</label>
            <input
              style={S.input}
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="0"
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>Active</label>
            <div style={{ paddingTop: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#8892A4' }}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  style={{ accentColor: 'var(--c-accent)', cursor: 'pointer', width: 14, height: 14 }}
                />
                Active
              </label>
            </div>
          </div>
        </div>

        <div style={S.field}>
          <label style={S.label}>Sector</label>
          <input
            style={S.input}
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="e.g. Bancos, Petróleo, Tijolo"
          />
        </div>

        <div style={S.field}>
          <label style={S.label}>Meta (JSON)</label>
          <textarea
            style={metaInvalid ? { ...S.textarea, ...S.textareaError } : S.textarea}
            className={metaInvalid ? 'field-error' : ''}
            value={metaJson}
            onChange={(e) => { setMetaJson(e.target.value); setMetaManual(true); }}
            placeholder={'{\n  "isB3": true\n}'}
          />
          {metaInvalid && <div style={S.fieldError}>Invalid JSON</div>}
        </div>

        {isEdit ? (
          <div style={S.actionsWithDelete}>
            <button
              style={{ ...S.btn, ...S.deleteBtn }}
              onClick={() => setConfirmDelete(true)}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,82,82,0.12)'; e.currentTarget.style.borderColor = 'var(--c-error)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,82,82,0.35)'; }}
            >Delete Asset</button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ ...S.btn, ...S.cancelBtn }}
                onClick={onClose}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#4A5568'; e.currentTarget.style.color = '#E8EAF0'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2740'; e.currentTarget.style.color = '#4A5568'; }}
              >Cancel</button>
              <button
                style={{
                  ...S.btn,
                  background: saveDisabled ? '#1E2740' : 'var(--c-accent)',
                  border: '1px solid transparent',
                  color: saveDisabled ? '#4A5568' : '#080C18',
                  cursor: saveDisabled ? 'not-allowed' : 'pointer',
                }}
                onClick={handleSave}
                disabled={saveDisabled}
                onMouseEnter={e => { if (!saveDisabled) e.currentTarget.style.background = '#26C6DA'; }}
                onMouseLeave={e => { if (!saveDisabled) e.currentTarget.style.background = 'var(--c-accent)'; }}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div style={S.actions}>
            <button
              style={{ ...S.btn, ...S.cancelBtn }}
              onClick={onClose}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#4A5568'; e.currentTarget.style.color = '#E8EAF0'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2740'; e.currentTarget.style.color = '#4A5568'; }}
            >Cancel</button>
            <button
              style={{
                ...S.btn,
                background: saveDisabled ? '#1E2740' : 'var(--c-accent)',
                border: '1px solid transparent',
                color: saveDisabled ? '#4A5568' : '#080C18',
                cursor: saveDisabled ? 'not-allowed' : 'pointer',
              }}
              onClick={handleSave}
              disabled={saveDisabled}
              onMouseEnter={e => { if (!saveDisabled) e.currentTarget.style.background = '#26C6DA'; }}
              onMouseLeave={e => { if (!saveDisabled) e.currentTarget.style.background = 'var(--c-accent)'; }}
            >
              {loading ? 'Saving...' : 'Create Asset'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
