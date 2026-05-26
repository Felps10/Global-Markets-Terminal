import { useState } from 'react';
import { bulkRelocateAssets, deleteSubgroup } from '../../services/taxonomyService.js';

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
    padding: 28,
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  title: {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: 16, fontWeight: 700,
    color: '#E8EAF0', margin: '0 0 10px',
  },
  body: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 12, color: '#8892A4',
    lineHeight: 1.6, margin: '0 0 20px',
  },
  sectionLabel: {
    fontSize: 10, fontWeight: 600, letterSpacing: '0.15em',
    color: '#4A5568', textTransform: 'uppercase', marginBottom: 8,
  },
  select: {
    width: '100%', background: '#080C18',
    border: '1px solid #1E2740',
    borderRadius: 4, color: '#E8EAF0',
    fontFamily: "'Space Mono', monospace", fontSize: 12,
    padding: '9px 12px', outline: 'none', boxSizing: 'border-box',
    cursor: 'pointer', marginBottom: 20,
  },
  selectError: {
    border: '1px solid var(--c-error)',
  },
  assetPreview: {
    background: '#080C18',
    border: '1px solid #1E2740',
    borderRadius: 4,
    padding: '10px 12px',
    marginBottom: 20,
    maxHeight: 180,
    overflowY: 'auto',
  },
  assetRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '4px 0',
    borderBottom: '1px solid #0D1220',
  },
  assetRowLast: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '4px 0',
    borderBottom: 'none',
  },
  assetSymbol: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 11, fontWeight: 700,
    color: 'var(--c-accent)', minWidth: 70,
  },
  assetName: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 11, color: '#8892A4',
  },
  assetCount: {
    fontSize: 11, color: '#4A5568', marginBottom: 8,
    fontFamily: "'Space Mono', monospace",
  },
  errorMsg: {
    background: 'rgba(255,82,82,0.08)',
    border: '1px solid rgba(255,82,82,0.3)',
    borderRadius: 4, color: 'var(--c-error)',
    fontSize: 12, padding: '10px 12px', marginBottom: 16,
    fontFamily: "'Space Mono', monospace",
  },
  actions: {
    display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8,
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
  optGroup: { color: '#8892A4' },
};

export default function DeleteSubgroupModal({ subgroup, assets = [], allSubgroups = [], onClose, onDeleted }) {
  const hasAssets             = assets.length > 0;
  const [targetId, setTargetId] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // Build options grouped by their parent group, excluding current subgroup
  const otherSubgroups = allSubgroups.filter((s) => s.id !== subgroup.id);
  const byGroup = {};
  for (const s of otherSubgroups) {
    const label = s.groupDisplayName || s.group_id;
    if (!byGroup[label]) byGroup[label] = [];
    byGroup[label].push(s);
  }

  async function handleConfirm() {
    if (hasAssets && !targetId) return;
    setError('');
    setLoading(true);
    try {
      if (hasAssets) {
        const assetIds = assets.map((a) => a.id);
        await bulkRelocateAssets(assetIds, targetId);
      }
      await deleteSubgroup(subgroup.id);
      const target = allSubgroups.find((s) => s.id === targetId);
      onDeleted({
        moved:       hasAssets ? assets.length : 0,
        targetLabel: target?.display_name || '',
      });
    } catch (err) {
      setError(err?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  }

  const actionDisabledRelocate = loading || !targetId;
  const actionDisabledDelete = loading;

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
        {hasAssets ? (
          <>
            <h2 style={S.title}>Relocate Assets Before Deleting</h2>
            <p style={S.body}>
              <strong style={{ color: '#E8EAF0' }}>{subgroup.display_name}</strong> contains {assets.length} asset(s).
              Choose a destination subgroup before this subgroup can be deleted.
            </p>

            <div style={S.sectionLabel}>Assets to be moved</div>
            <div style={S.assetCount}>{assets.length} asset{assets.length !== 1 ? 's' : ''}</div>
            <div style={S.assetPreview}>
              {assets.map((a, i) => (
                <div key={a.id} style={i === assets.length - 1 ? S.assetRowLast : S.assetRow}>
                  <span style={S.assetSymbol}>{a.symbol}</span>
                  <span style={S.assetName}>{a.name}</span>
                </div>
              ))}
            </div>

            <div style={S.sectionLabel}>Move all assets to...</div>
            <select
              style={(!targetId && !!error) ? { ...S.select, ...S.selectError } : S.select}
              className={(!targetId && !!error) ? 'field-error' : ''}
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              <option value="">— Select destination subgroup —</option>
              {Object.entries(byGroup).map(([groupLabel, subs]) => (
                <optgroup key={groupLabel} label={groupLabel} style={S.optGroup}>
                  {subs.map((s) => (
                    <option key={s.id} value={s.id}>{s.display_name}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            {error && <div style={S.errorMsg}>⚠ {error}</div>}

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
                  background: actionDisabledRelocate ? '#1E2740' : 'var(--c-error)',
                  border: 'none',
                  color: actionDisabledRelocate ? '#4A5568' : '#fff',
                  cursor: actionDisabledRelocate ? 'not-allowed' : 'pointer',
                }}
                onClick={handleConfirm}
                disabled={actionDisabledRelocate}
                onMouseEnter={e => { if (!actionDisabledRelocate) e.currentTarget.style.background = '#FF6B6B'; }}
                onMouseLeave={e => { if (!actionDisabledRelocate) e.currentTarget.style.background = 'var(--c-error)'; }}
              >
                {loading ? 'Processing...' : `Relocate & Delete`}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={S.title}>Delete Subgroup</h2>
            <p style={S.body}>
              Permanently delete <strong style={{ color: '#E8EAF0' }}>{subgroup.display_name}</strong>?<br />
              This subgroup has no assets. This action cannot be undone.
            </p>

            {error && <div style={S.errorMsg}>⚠ {error}</div>}

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
                  background: actionDisabledDelete ? '#1E2740' : 'var(--c-error)',
                  border: 'none',
                  color: actionDisabledDelete ? '#4A5568' : '#fff',
                  cursor: actionDisabledDelete ? 'not-allowed' : 'pointer',
                }}
                onClick={handleConfirm}
                disabled={actionDisabledDelete}
                onMouseEnter={e => { if (!actionDisabledDelete) e.currentTarget.style.background = '#FF6B6B'; }}
                onMouseLeave={e => { if (!actionDisabledDelete) e.currentTarget.style.background = 'var(--c-error)'; }}
              >
                {loading ? 'Deleting...' : 'Delete Subgroup'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
