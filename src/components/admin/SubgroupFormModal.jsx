import { useState, useEffect } from 'react';
import { createSubgroup, updateSubgroup } from '../../services/taxonomyService.js';

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const DATA_SOURCES = ['yahoo', 'brapi', 'bcb', 'bcb_and_yahoo', 'coingecko', 'awesomeapi', 'static'];

const SECTION_IDS = [
  'acoes-b3', 'fiis', 'etfs', 'indices-benchmarks',
  'juros', 'credito', 'titulos-publicos',
  'macro-brasil', 'cambio-liquidez',
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
    width: 500,
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
  select: {
    width: '100%', background: '#080C18',
    border: '1px solid #1E2740',
    borderRadius: 4, color: '#E8EAF0',
    fontFamily: "'Space Mono', monospace", fontSize: 13,
    padding: '9px 12px', outline: 'none', boxSizing: 'border-box',
    cursor: 'pointer',
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
  row2: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
  },
};

export default function SubgroupFormModal({ subgroup, defaultGroupId, groups = [], onClose, onSaved, existingSlugs = [] }) {
  const isEdit    = !!subgroup;

  const [displayName, setDisplayName] = useState(subgroup?.display_name || '');
  const [description, setDescription] = useState(subgroup?.description  || '');
  const [groupId,     setGroupId]     = useState(subgroup?.group_id || defaultGroupId || groups[0]?.id || '');
  const [slug,        setSlug]        = useState(subgroup?.slug     || '');
  const [slugManual,  setSlugManual]  = useState(isEdit);
  const [sectionId,   setSectionId]   = useState(subgroup?.section_id  || '');
  const [dataSource,  setDataSource]  = useState(subgroup?.data_source || '');
  const [sortOrder,   setSortOrder]   = useState(subgroup?.sort_order  ?? 0);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    if (!slugManual) setSlug(toSlug(displayName));
  }, [displayName, slugManual]);

  const slugConflict = slug && slug !== subgroup?.slug && existingSlugs.includes(slug);
  const slugInvalid  = slug && !/^[a-z0-9-]+$/.test(slug);

  async function handleSave() {
    if (!displayName.trim() || !slug.trim() || !groupId) return;
    if (slugConflict || slugInvalid) return;
    setError('');
    setLoading(true);
    try {
      const payload = {
        display_name: displayName.trim(),
        description:  description.trim() || null,
        slug,
        group_id:    groupId,
        section_id:  sectionId  || null,
        data_source: dataSource || null,
        sort_order:  Number(sortOrder) || 0,
      };
      if (isEdit) {
        await updateSubgroup(subgroup.id, payload);
      } else {
        await createSubgroup(payload);
      }
      onSaved();
    } catch (err) {
      setError(err?.message || 'Failed to save subgroup');
    } finally {
      setLoading(false);
    }
  }

  const saveDisabled = loading || !displayName.trim() || !slug.trim() || !groupId || slugConflict || slugInvalid;

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
        <h2 style={S.title}>{isEdit ? `Edit Subgroup: ${subgroup.display_name}` : 'Add Subgroup'}</h2>

        {error && <div style={S.errorMsg}>⚠ {error}</div>}

        <div style={S.field}>
          <label style={S.label}>Display Name *</label>
          <input
            style={(!displayName && !!error) ? { ...S.input, ...S.inputError } : S.input}
            className={(!displayName && !!error) ? 'field-error' : ''}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Technology"
          />
        </div>

        <div style={S.field}>
          <label style={S.label}>Parent Group *</label>
          <select style={S.select} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">— Select Group —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.display_name}</option>
            ))}
          </select>
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
            placeholder="e.g. technology"
          />
          <div style={S.slugPreview}>Preview: <span style={S.slugAccent}>/api/v1/subgroups/{slug || '...'}</span></div>
          {slugConflict && <div style={S.fieldError}>This slug is already in use</div>}
          {slugInvalid  && <div style={S.fieldError}>Slug must be lowercase letters, numbers, and hyphens only</div>}
        </div>

        <div style={S.row2}>
          <div style={S.field}>
            <label style={S.label}>Section ID (Brazil)</label>
            <select style={S.select} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
              <option value="">— None —</option>
              {SECTION_IDS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={S.field}>
            <label style={S.label}>Data Source</label>
            <select style={S.select} value={dataSource} onChange={(e) => setDataSource(e.target.value)}>
              <option value="">— None —</option>
              {DATA_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

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
            {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Subgroup')}
          </button>
        </div>
      </div>
    </div>
  );
}
