import { useState } from 'react';
import { deleteGroup } from '../../services/taxonomyService.js';

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
    width: 420,
    maxWidth: '95vw',
    padding: 28,
  },
  title: {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: 16, fontWeight: 700,
    color: '#E8EAF0', margin: '0 0 12px',
  },
  body: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 12, color: '#8892A4',
    lineHeight: 1.6, margin: '0 0 20px',
  },
  blockedBox: {
    background: 'rgba(255,82,82,0.06)',
    border: '1px solid rgba(255,82,82,0.25)',
    borderRadius: 4,
    color: 'var(--c-error)',
    fontFamily: "'Space Mono', monospace",
    fontSize: 12,
    padding: '12px 14px',
    marginBottom: 20,
  },
  errorMsg: {
    background: 'rgba(255,82,82,0.08)',
    border: '1px solid rgba(255,82,82,0.3)',
    borderRadius: 4, color: 'var(--c-error)',
    fontSize: 12, padding: '10px 12px', marginBottom: 16,
    fontFamily: "'Space Mono', monospace",
  },
  actions: {
    display: 'flex', justifyContent: 'flex-end', gap: 10,
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
};

export default function DeleteGroupModal({ group, onClose, onDeleted }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isBlocked = (group.subgroup_count || 0) > 0;

  async function handleDelete() {
    if (isBlocked) return;
    setError('');
    setLoading(true);
    try {
      await deleteGroup(group.id);
      onDeleted();
    } catch (err) {
      setError(err?.message || 'Failed to delete group');
    } finally {
      setLoading(false);
    }
  }

  const deleteDisabled = isBlocked || loading;

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={S.title}>Delete Group</h2>

        {isBlocked ? (
          <div style={S.blockedBox}>
            ⛔ <strong>{group.display_name}</strong> has {group.subgroup_count} subgroup(s).<br />
            Remove all subgroups before this group can be deleted.
          </div>
        ) : (
          <p style={S.body}>
            Permanently delete <strong style={{ color: '#E8EAF0' }}>{group.display_name}</strong>?<br />
            This action cannot be undone.
          </p>
        )}

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
              background: deleteDisabled ? '#1E2740' : 'var(--c-error)',
              border: 'none',
              color: deleteDisabled ? '#4A5568' : '#fff',
              cursor: deleteDisabled ? 'not-allowed' : 'pointer',
            }}
            onClick={handleDelete}
            disabled={deleteDisabled}
            onMouseEnter={e => { if (!deleteDisabled) e.currentTarget.style.background = '#FF6B6B'; }}
            onMouseLeave={e => { if (!deleteDisabled) e.currentTarget.style.background = 'var(--c-error)'; }}
          >
            {loading ? 'Deleting...' : 'Delete Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
