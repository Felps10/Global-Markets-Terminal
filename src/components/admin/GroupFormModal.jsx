import { useState, useEffect } from 'react';
import { createGroup, updateGroup } from '../../services/taxonomyService.js';

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const L1_OPTIONS = [
  { id: 'global',  display_name: 'Global' },
  { id: 'brasil',  display_name: 'Brasil' },
];

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
    width: 480,
    maxWidth: '95vw',
    padding: 28,
    fontFamily: "'Space Mono', monospace",
  },
  title: {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: 16, fontWeight: 700,
    color: '#E8EAF0', margin: '0 0 24px',
  },
  field: { marginBottom: 18 },
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
  textarea: {
    width: '100%', background: '#080C18',
    border: '1px solid #1E2740',
    borderRadius: 4, color: '#E8EAF0',
    fontFamily: "'Space Mono', monospace", fontSize: 12,
    padding: '9px 12px', outline: 'none',
    resize: 'vertical', minHeight: 72, boxSizing: 'border-box',
  },
  slugPreview: {
    fontSize: 11, color: '#4A5568', marginTop: 4,
  },
  slugAccent: { color: 'var(--c-accent)' },
  fieldError: {
    fontSize: 11, color: 'var(--c-error)', marginTop: 4,
  },
  errorMsg: {
    background: 'rgba(255,82,82,0.08)',
    border: '1px solid rgba(255,82,82,0.3)',
    borderRadius: 4, color: 'var(--c-error)',
    fontSize: 12, padding: '10px 12px', marginBottom: 18,
  },
  actions: {
    display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24,
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
  radioGroup: {
    display: 'flex', gap: 16, marginTop: 2,
  },
  radioLabel: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 12, color: '#8892A4', cursor: 'pointer',
  },
  radioInput: {
    cursor: 'pointer', accentColor: 'var(--c-accent)',
  },
  row2: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
  },
};

export default function GroupFormModal({ group, onClose, onSaved, existingSlugs = [] }) {
  const isEdit    = !!group;

  const [displayName,   setDisplayName]   = useState(group?.display_name   || '');
  const [description,   setDescription]   = useState(group?.description    || '');
  const [slug,          setSlug]          = useState(group?.slug            || '');
  const [slugManual,    setSlugManual]    = useState(isEdit);
  const [l1Id,          setL1Id]          = useState(group?.l1_id          || L1_OPTIONS[0].id);
  const [blockId,       setBlockId]       = useState(group?.block_id       || '');
  const [sortOrder,     setSortOrder]     = useState(group?.sort_order     ?? 0);
  const [icon,          setIcon]          = useState(group?.icon           || '');
  const [color,         setColor]         = useState(group?.color          || '');
  const [error,         setError]         = useState('');
  const [loading,       setLoading]       = useState(false);

  const selectedL1Slug = l1Id;

  useEffect(() => {
    if (!slugManual) setSlug(toSlug(displayName));
  }, [displayName, slugManual]);

  const slugConflict = slug && slug !== group?.slug && existingSlugs.includes(slug);
  const slugInvalid  = slug && !/^[a-z0-9-]+$/.test(slug);

  async function handleSave() {
    if (!displayName.trim() || !slug.trim()) return;
    if (slugConflict || slugInvalid) return;
    setError('');
    setLoading(true);
    try {
      const terminalView = selectedL1Slug === 'brasil' ? 'brazil' : 'global';
      const payload = {
        display_name:  displayName.trim(),
        description:   description.trim() || null,
        slug,
        l1_id:         l1Id || null,
        terminal_view: terminalView,
        block_id:      selectedL1Slug === 'brasil' ? (blockId.trim() || null) : null,
        sort_order:    Number(sortOrder) || 0,
        icon:          icon.trim()  || null,
        color:         color.trim() || null,
      };
      if (isEdit) {
        await updateGroup(group.id, payload);
      } else {
        await createGroup(payload);
      }
      onSaved();
    } catch (err) {
      setError(err?.message || 'Failed to save group');
    } finally {
      setLoading(false);
    }
  }

  const saveDisabled = loading || !displayName.trim() || !slug.trim() || slugConflict || slugInvalid;

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
      `}</style>
      <div className="admin-modal" style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={S.title}>{isEdit ? `Edit Group: ${group.display_name}` : 'Add Group'}</h2>

        {error && <div style={S.errorMsg}>⚠ {error}</div>}

        <div style={S.field}>
          <label style={S.label}>Display Name *</label>
          <input
            style={(!displayName && !!error) ? { ...S.input, ...S.inputError } : S.input}
            className={(!displayName && !!error) ? 'field-error' : ''}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. US Equities"
          />
        </div>

        <div style={S.field}>
          <label style={S.label}>Description</label>
          <textarea
            style={S.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
          />
        </div>

        <div style={S.field}>
          <label style={S.label}>Slug *</label>
          <input
            style={(slugConflict || slugInvalid) ? { ...S.input, ...S.inputError } : S.input}
            className={(slugConflict || slugInvalid) ? 'field-error' : ''}
            value={slug}
            onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
            placeholder="e.g. us-equities"
          />
          <div style={S.slugPreview}>Preview: <span style={S.slugAccent}>/api/v1/groups/{slug || '...'}</span></div>
          {slugConflict && <div style={S.fieldError}>This slug is already in use</div>}
          {slugInvalid  && <div style={S.fieldError}>Slug must be lowercase letters, numbers, and hyphens only</div>}
        </div>

        <div style={S.field}>
          <label style={S.label}>Region *</label>
          <div style={S.radioGroup}>
            {L1_OPTIONS.map((n) => (
              <label key={n.id} style={S.radioLabel}>
                <input type="radio" style={S.radioInput} value={n.id} checked={l1Id === n.id} onChange={() => setL1Id(n.id)} />
                {n.display_name}
              </label>
            ))}
          </div>
        </div>

        {selectedL1Slug === 'brasil' && (
          <div style={S.field}>
            <label style={S.label}>Block ID</label>
            <input
              style={S.input}
              value={blockId}
              onChange={(e) => setBlockId(e.target.value)}
              placeholder="e.g. mercado"
            />
          </div>
        )}

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
            <label style={S.label}>Icon (emoji)</label>
            <input
              style={S.input}
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="e.g. 🟢"
            />
          </div>
        </div>

        <div style={S.field}>
          <label style={S.label}>Accent Color</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              style={{ ...S.input, flex: 1 }}
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. #00E676"
            />
            {color && <div style={{ width: 28, height: 28, borderRadius: 4, background: color, border: '1px solid #1E2740', flexShrink: 0 }} />}
          </div>
        </div>

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
            {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Group')}
          </button>
        </div>
      </div>
    </div>
  );
}
