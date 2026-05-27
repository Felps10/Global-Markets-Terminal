import { useState, useEffect, useCallback } from 'react';
import { getUsers, deleteUser, patchUserRole, promoteToManager } from '../../services/userService.js';
import { ROLE_LABEL, ADMIN_ASSIGNABLE_ROLES } from '../../lib/roles.js';
import { useAuth } from '../../hooks/useAuth.js';
import { CLUBE_COLORS } from '../../clube/styles/index.js';

// ── Scoped styles for animations and scrollbar ────────────────────────────────
function ScopedStyles() {
  return (
    <style>{`
      @keyframes um-fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes um-slideIn {
        from { opacity: 0; transform: translateX(40px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      .um-wrap { animation: um-fadeIn 0.25s ease; }
      .um-wrap::-webkit-scrollbar { width: 4px; }
      .um-wrap::-webkit-scrollbar-track { background: transparent; }
      .um-wrap::-webkit-scrollbar-thumb { background: #1E2740; border-radius: 2px; }
      .um-toast-item { animation: um-slideIn 0.25s ease; }
      .um-modal-box { animation: um-fadeIn 0.2s ease; }
    `}</style>
  );
}

// ── Role badge ────────────────────────────────────────────────────────────────
const ROLE_BADGE_STYLES = {
  admin:        { background: 'var(--c-accent)', color: '#fff' },
  club_manager: { background: CLUBE_COLORS.goldMuted,  color: '#1a1a1a' },
  club_member:  { background: 'rgba(197,160,89,0.3)', color: CLUBE_COLORS.goldMuted },
  user:         { background: 'rgba(255,255,255,0.06)', color: 'var(--c-text-2)' },
};

const BADGE_BASE = {
  display:       'inline-block',
  padding:       '2px 8px',
  borderRadius:  3,
  fontSize:      11,
  fontFamily:    "'JetBrains Mono', monospace",
  fontWeight:    700,
  letterSpacing: '0.06em',
  lineHeight:    '18px',
};

function RoleBadgeInline({ role, children }) {
  const colors = ROLE_BADGE_STYLES[role] || ROLE_BADGE_STYLES.user;
  return (
    <span style={{ ...BADGE_BASE, ...colors }}>
      {children}
    </span>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  return { toasts, push };
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ── Delete button with hover ──────────────────────────────────────────────────
function DeleteBtnComp({ disabled, title, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      disabled={disabled}
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: !disabled && hovered ? 'rgba(255,82,82,0.1)' : 'transparent',
        border: `1px solid ${!disabled && hovered ? 'var(--c-error)' : '#1E2740'}`,
        borderRadius: 3,
        color: !disabled && hovered ? 'var(--c-error)' : '#4A5568',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        letterSpacing: '0.06em',
        padding: '4px 10px',
        transition: 'all 0.15s',
        opacity: disabled ? 0.3 : 1,
      }}
    >
      Delete
    </button>
  );
}

// ── Modal buttons with hover ──────────────────────────────────────────────────
function ModalCancelBtnComp({ onClick, disabled, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'transparent',
        border: `1px solid ${hovered ? '#8892A4' : '#1E2740'}`,
        borderRadius: 4,
        color: hovered ? '#8892A4' : '#4A5568',
        cursor: 'pointer',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        letterSpacing: '0.06em',
        padding: '8px 18px',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

function ModalConfirmBtnComp({ onClick, disabled, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: !disabled && hovered ? 'rgba(255,82,82,0.2)' : 'rgba(255,82,82,0.12)',
        border: `1px solid ${!disabled && hovered ? 'var(--c-error)' : 'rgba(255,82,82,0.4)'}`,
        borderRadius: 4,
        color: 'var(--c-error)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        padding: '8px 18px',
        transition: 'all 0.15s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ── Role selector ─────────────────────────────────────────────────────────────
function RoleSelector({ user, currentUserId, onSelect }) {
  const isLocked = user.id === currentUserId || user.role === 'admin';
  if (isLocked) {
    return <RoleBadgeInline role={user.role}>{ROLE_LABEL[user.role]}</RoleBadgeInline>;
  }
  return (
    <select
      value={user.role}
      onChange={(e) => onSelect(user, e.target.value)}
      style={{
        background:  '#0D1220',
        border:      '1px solid #1E2740',
        borderRadius: 3,
        color:       '#8892A4',
        fontFamily:  "'JetBrains Mono', monospace",
        fontSize:    10,
        letterSpacing: '0.08em',
        padding:     '3px 6px',
        cursor:      'pointer',
        textTransform: 'uppercase',
      }}
    >
      {ADMIN_ASSIGNABLE_ROLES.filter((r) => r !== 'admin' && r !== 'club_manager').map((r) => (
        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
      ))}
    </select>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function UserManager() {
  const { user: currentUser } = useAuth();
  const { toasts, push } = useToast();

  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Confirm modal state
  const [confirming,    setConfirming]    = useState(null); // { id, email }
  const [deleteError,   setDeleteError]   = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Promote modal state (generic role change)
  const [promotingUser,  setPromotingUser]  = useState(null); // { id, email, name, currentRole, targetRole }
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteError,   setPromoteError]   = useState(null);

  // Promote-to-manager inline confirmation state
  const [managerConfirmId,     setManagerConfirmId]     = useState(null); // user id showing confirmation
  const [managerPromoteLoading, setManagerPromoteLoading] = useState(false);

  // Table row hover state
  const [hoveredRowId, setHoveredRowId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch every time this tab mounts
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleDeleteConfirm() {
    if (!confirming) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteUser(confirming.id);
      setUsers((prev) => prev.filter((u) => u.id !== confirming.id));
      push(`User ${confirming.email} deleted`);
      setConfirming(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handlePromoteConfirm() {
    if (!promotingUser) return;
    setPromoteLoading(true);
    setPromoteError(null);
    try {
      const updated = await patchUserRole(promotingUser.id, promotingUser.targetRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, role: updated.role } : u))
      );
      push(`${promotingUser.name || promotingUser.email} is now ${ROLE_LABEL[promotingUser.targetRole]}`);
      setPromotingUser(null);
    } catch (err) {
      setPromoteError(err.message);
    } finally {
      setPromoteLoading(false);
    }
  }

  async function handlePromoteManager(userId) {
    setManagerPromoteLoading(true);
    try {
      const updated = await promoteToManager(userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, role: updated.role } : u))
      );
      push(`${updated.name || updated.email} promoted to Club Manager`);
      setManagerConfirmId(null);
    } catch (err) {
      if (err.message === 'CONFLICT' || err.message.includes('already exists')) {
        push('A club manager already exists. Demote the current one first.', 'error');
      } else {
        push(err.message || 'Failed to promote user', 'error');
      }
      setManagerConfirmId(null);
    } finally {
      setManagerPromoteLoading(false);
    }
  }

  const nonAdminUsers = users.filter((u) => u.role !== 'admin');

  const thStyle = {
    fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: '#4A5568',
    textTransform: 'uppercase', textAlign: 'left', padding: '8px 14px',
    borderBottom: '1px solid #1E2740', fontFamily: "'IBM Plex Sans', sans-serif",
  };

  const tdStyle = {
    padding: '10px 14px', fontSize: 12, color: '#8892A4', verticalAlign: 'middle',
  };

  return (
    <>
      <ScopedStyles />
      <div className="um-wrap" style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: '28px 32px', overflowY: 'auto',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: '#4A5568',
          textTransform: 'uppercase', marginBottom: 16, fontFamily: "'IBM Plex Sans', sans-serif",
        }}>
          Registered Users — {users.length} total
        </div>

        {loading && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#2D3748',
          }}>Loading users…</div>
        )}

        {!loading && error && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--c-error)',
          }}>⚠ {error}</div>
        )}

        {!loading && !error && users.length === 0 && (
          <div style={{
            padding: '60px 0', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12, color: '#2D3748', lineHeight: 1.8,
          }}>No registered users yet.</div>
        )}

        {!loading && !error && users.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Registered</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const isHovered = hoveredRowId === u.id;
                return (
                  <tr
                    key={u.id}
                    onMouseEnter={() => setHoveredRowId(u.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                    style={{
                      borderBottom: '1px solid #0D1220',
                      transition: 'background 0.1s',
                      background: isHovered ? 'rgba(255,255,255,0.02)' : 'transparent',
                    }}
                  >
                    <td style={{ ...tdStyle, color: '#2D3748', fontFamily: "'JetBrains Mono', monospace" }}>
                      {u.id}
                    </td>
                    <td style={{ ...tdStyle, color: '#E8EAF0' }}>{u.email}</td>
                    <td style={tdStyle}>{u.name || <span style={{ color: '#2D3748' }}>—</span>}</td>
                    <td style={tdStyle}>
                      <RoleSelector
                        user={u}
                        currentUserId={currentUser?.id}
                        onSelect={(targetUser, targetRole) => {
                          setPromoteError(null);
                          setPromotingUser({
                            id:          targetUser.id,
                            email:       targetUser.email,
                            name:        targetUser.name,
                            currentRole: targetUser.role,
                            targetRole,
                          });
                        }}
                      />
                    </td>
                    <td style={tdStyle}>{fmtDate(u.created_at)}</td>
                    <td style={{ ...tdStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {u.role !== 'club_manager' && u.role !== 'admin' && !isSelf && (
                        managerConfirmId === u.id ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: '#8892A4',
                          }}>
                            <span>Set as sole club manager?</span>
                            <button
                              disabled={managerPromoteLoading}
                              onClick={() => handlePromoteManager(u.id)}
                              style={{
                                background: 'rgba(59,130,246,0.12)',
                                border: '1px solid var(--c-accent)',
                                borderRadius: 3,
                                color: 'var(--c-accent)',
                                cursor: managerPromoteLoading ? 'not-allowed' : 'pointer',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: '0.06em',
                                padding: '3px 8px',
                                opacity: managerPromoteLoading ? 0.5 : 1,
                              }}
                            >
                              {managerPromoteLoading ? 'Saving...' : 'Confirm'}
                            </button>
                            <button
                              disabled={managerPromoteLoading}
                              onClick={() => setManagerConfirmId(null)}
                              style={{
                                background: 'transparent',
                                border: '1px solid #1E2740',
                                borderRadius: 3,
                                color: '#4A5568',
                                cursor: 'pointer',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 10,
                                letterSpacing: '0.06em',
                                padding: '3px 8px',
                              }}
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setManagerConfirmId(u.id)}
                            title={`Promote ${u.email} to Club Manager`}
                            style={{
                              background: 'transparent',
                              border: '1px solid #1E2740',
                              borderRadius: 3,
                              color: 'var(--c-accent)',
                              cursor: 'pointer',
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 10,
                              letterSpacing: '0.06em',
                              padding: '4px 10px',
                              transition: 'all 0.15s',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Promote to Manager
                          </button>
                        )
                      )}
                      <DeleteBtnComp
                        disabled={isSelf}
                        title={isSelf ? 'Cannot delete your own account' : `Delete ${u.email}`}
                        onClick={() => { setDeleteError(null); setConfirming({ id: u.id, email: u.email }); }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!loading && !error && nonAdminUsers.length === 0 && users.length > 0 && (
          <div style={{
            padding: '60px 0', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12, color: '#2D3748', lineHeight: 1.8, marginTop: 32,
          }}>No registered users yet.</div>
        )}
      </div>

      {/* ── Confirm modal ── */}
      {confirming && (
        <div
          onClick={() => !deleteLoading && setConfirming(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div className="um-modal-box" onClick={(e) => e.stopPropagation()} style={{
            background: '#0D1220', border: '1px solid #1E2740', borderRadius: 8,
            padding: '28px 32px', width: 420, maxWidth: '90vw',
          }}>
            <div style={{
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, fontWeight: 700,
              color: '#E8EAF0', marginBottom: 10,
            }}>Delete user?</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#8892A4',
              lineHeight: 1.6, marginBottom: 24, wordBreak: 'break-all',
            }}>
              Delete user <strong style={{ color: '#E8EAF0' }}>{confirming.email}</strong>?
              This action cannot be undone.
            </div>
            {deleteError && (
              <div style={{
                marginTop: 12, fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, color: 'var(--c-error)',
              }}>⚠ {deleteError}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <ModalCancelBtnComp
                onClick={() => setConfirming(null)}
                disabled={deleteLoading}
              >
                Cancel
              </ModalCancelBtnComp>
              <ModalConfirmBtnComp
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </ModalConfirmBtnComp>
            </div>
          </div>
        </div>
      )}

      {/* ── Promote confirm modal ── */}
      {promotingUser && (
        <div
          onClick={() => !promoteLoading && setPromotingUser(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div className="um-modal-box" onClick={(e) => e.stopPropagation()} style={{
            background: '#0D1220', border: '1px solid #1E2740', borderRadius: 8,
            padding: '28px 32px', width: 420, maxWidth: '90vw',
          }}>
            <div style={{
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, fontWeight: 700,
              color: '#E8EAF0', marginBottom: 10,
            }}>Change role?</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#8892A4',
              lineHeight: 1.6, marginBottom: 24, wordBreak: 'break-all',
            }}>
              Change <strong style={{ color: '#E8EAF0' }}>
                {promotingUser.name || promotingUser.email}
              </strong> from{' '}
              <strong style={{ color: '#E8EAF0' }}>
                {ROLE_LABEL[promotingUser.currentRole]}
              </strong>{' '}
              to{' '}
              <strong style={{ color: '#E8EAF0' }}>
                {ROLE_LABEL[promotingUser.targetRole]}
              </strong>?
            </div>
            {promoteError && (
              <div style={{
                marginTop: 12, fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, color: 'var(--c-error)',
              }}>⚠ {promoteError}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <ModalCancelBtnComp
                onClick={() => setPromotingUser(null)}
                disabled={promoteLoading}
              >
                Cancel
              </ModalCancelBtnComp>
              <ModalConfirmBtnComp
                onClick={handlePromoteConfirm}
                disabled={promoteLoading}
              >
                {promoteLoading ? 'Saving…' : 'Confirm'}
              </ModalConfirmBtnComp>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast notifications ── */}
      <div style={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 2000,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {toasts.map((t) => (
          <div key={t.id} className="um-toast-item" style={{
            background: t.type === 'error' ? '#2D0A0A' : '#0A1F1A',
            border: `1px solid ${t.type === 'error' ? 'var(--c-error)' : '#00E676'}`,
            borderRadius: 6,
            color: t.type === 'error' ? 'var(--c-error)' : '#00E676',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            padding: '12px 18px',
            minWidth: 280,
          }}>
            {t.type === 'error' ? '⚠' : '✓'} {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
