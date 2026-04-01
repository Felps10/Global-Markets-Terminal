import { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { getUsers, deleteUser, patchUserRole } from '../../services/userService.js';
import { ROLE_LABEL, ADMIN_ASSIGNABLE_ROLES } from '../../lib/roles.js';
import { useAuth } from '../../hooks/useAuth.js';

// ── Animations ─────────────────────────────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
`;

// ── Styled components ──────────────────────────────────────────────────────────
const Wrap = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 28px 32px;
  overflow-y: auto;
  animation: ${fadeIn} 0.25s ease;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #1E2740; border-radius: 2px; }
`;

const SectionTitle = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #4A5568;
  text-transform: uppercase;
  margin-bottom: 16px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Space Mono', monospace;
`;

const Th = styled.th`
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #4A5568;
  text-transform: uppercase;
  text-align: left;
  padding: 8px 14px;
  border-bottom: 1px solid #1E2740;
`;

const Tr = styled.tr`
  border-bottom: 1px solid #0D1220;
  transition: background 0.1s;
  &:hover { background: rgba(255,255,255,0.02); }
`;

const Td = styled.td`
  padding: 10px 14px;
  font-size: 12px;
  color: #8892A4;
  vertical-align: middle;
`;

const ROLE_COLORS = {
  admin:        { bg: 'var(--c-accent-dim)',   border: 'rgba(59,130,246,0.3)',   color: 'var(--c-accent)' },
  club_manager: { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',  color: '#fbbf24' },
  club_member:  { bg: 'rgba(0,230,118,0.12)',   border: 'rgba(0,230,118,0.3)',   color: '#00E676' },
  user:         { bg: 'rgba(107,127,163,0.12)', border: 'rgba(107,127,163,0.2)', color: '#6B7FA3' },
};

const RoleBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: ${(p) => (ROLE_COLORS[p.$role] || ROLE_COLORS.user).bg};
  border: 1px solid ${(p) => (ROLE_COLORS[p.$role] || ROLE_COLORS.user).border};
  color: ${(p) => (ROLE_COLORS[p.$role] || ROLE_COLORS.user).color};
`;

const DeleteBtn = styled.button`
  background: transparent;
  border: 1px solid #1E2740;
  border-radius: 3px;
  color: #4A5568;
  cursor: pointer;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  padding: 4px 10px;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: rgba(255,82,82,0.1);
    border-color: #FF5252;
    color: #FF5252;
  }
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  color: #2D3748;
`;

const EmptyState = styled.div`
  padding: 60px 0;
  text-align: center;
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  color: #2D3748;
  line-height: 1.8;
`;

// ── Confirmation modal ─────────────────────────────────────────────────────────
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalBox = styled.div`
  background: #0D1220;
  border: 1px solid #1E2740;
  border-radius: 8px;
  padding: 28px 32px;
  width: 420px;
  max-width: 90vw;
  animation: ${fadeIn} 0.2s ease;
`;

const ModalTitle = styled.div`
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #E8EAF0;
  margin-bottom: 10px;
`;

const ModalBody = styled.div`
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  color: #8892A4;
  line-height: 1.6;
  margin-bottom: 24px;
  word-break: break-all;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const ModalCancelBtn = styled.button`
  background: transparent;
  border: 1px solid #1E2740;
  border-radius: 4px;
  color: #4A5568;
  cursor: pointer;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.06em;
  padding: 8px 18px;
  transition: all 0.15s;
  &:hover { border-color: #8892A4; color: #8892A4; }
`;

const ModalConfirmBtn = styled.button`
  background: rgba(255,82,82,0.12);
  border: 1px solid rgba(255,82,82,0.4);
  border-radius: 4px;
  color: #FF5252;
  cursor: pointer;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 8px 18px;
  transition: all 0.15s;
  &:hover:not(:disabled) { background: rgba(255,82,82,0.2); border-color: #FF5252; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ModalError = styled.div`
  margin-top: 12px;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  color: #FF5252;
`;

// ── Toast ──────────────────────────────────────────────────────────────────────
const ToastWrap = styled.div`
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ToastItem = styled.div`
  background: ${(p) => (p.$type === 'error' ? '#2D0A0A' : '#0A1F1A')};
  border: 1px solid ${(p) => (p.$type === 'error' ? '#FF5252' : '#00E676')};
  border-radius: 6px;
  color: ${(p) => (p.$type === 'error' ? '#FF5252' : '#00E676')};
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  padding: 12px 18px;
  min-width: 280px;
  animation: ${slideIn} 0.25s ease;
`;

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

// ── Role selector ─────────────────────────────────────────────────────────────
function RoleSelector({ user, currentUserId, onSelect }) {
  const isLocked = user.id === currentUserId || user.role === 'admin';
  if (isLocked) {
    return <RoleBadge $role={user.role}>{ROLE_LABEL[user.role]}</RoleBadge>;
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
        fontFamily:  "'Space Mono', monospace",
        fontSize:    10,
        letterSpacing: '0.08em',
        padding:     '3px 6px',
        cursor:      'pointer',
        textTransform: 'uppercase',
      }}
    >
      {ADMIN_ASSIGNABLE_ROLES.filter((r) => r !== 'admin').map((r) => (
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

  // Promote modal state
  const [promotingUser,  setPromotingUser]  = useState(null); // { id, email, name, currentRole, targetRole }
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteError,   setPromoteError]   = useState(null);

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

  const nonAdminUsers = users.filter((u) => u.role !== 'admin');

  return (
    <>
      <Wrap>
        <SectionTitle>Registered Users — {users.length} total</SectionTitle>

        {loading && <StatusRow>Loading users…</StatusRow>}

        {!loading && error && (
          <StatusRow style={{ color: '#FF5252' }}>⚠ {error}</StatusRow>
        )}

        {!loading && !error && users.length === 0 && (
          <EmptyState>No registered users yet.</EmptyState>
        )}

        {!loading && !error && users.length > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Email</Th>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th>Registered</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <Tr key={u.id}>
                    <Td style={{ color: '#2D3748', fontFamily: "'Space Mono', monospace" }}>
                      {u.id}
                    </Td>
                    <Td style={{ color: '#E8EAF0' }}>{u.email}</Td>
                    <Td>{u.name || <span style={{ color: '#2D3748' }}>—</span>}</Td>
                    <Td>
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
                    </Td>
                    <Td>{fmtDate(u.created_at)}</Td>
                    <Td>
                      <DeleteBtn
                        disabled={isSelf}
                        title={isSelf ? 'Cannot delete your own account' : `Delete ${u.email}`}
                        onClick={() => { setDeleteError(null); setConfirming({ id: u.id, email: u.email }); }}
                      >
                        Delete
                      </DeleteBtn>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}

        {!loading && !error && nonAdminUsers.length === 0 && users.length > 0 && (
          <EmptyState style={{ marginTop: 32 }}>No registered users yet.</EmptyState>
        )}
      </Wrap>

      {/* ── Confirm modal ── */}
      {confirming && (
        <Overlay onClick={() => !deleteLoading && setConfirming(null)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Delete user?</ModalTitle>
            <ModalBody>
              Delete user <strong style={{ color: '#E8EAF0' }}>{confirming.email}</strong>?
              This action cannot be undone.
            </ModalBody>
            {deleteError && <ModalError>⚠ {deleteError}</ModalError>}
            <ModalActions>
              <ModalCancelBtn
                onClick={() => setConfirming(null)}
                disabled={deleteLoading}
              >
                Cancel
              </ModalCancelBtn>
              <ModalConfirmBtn
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </ModalConfirmBtn>
            </ModalActions>
          </ModalBox>
        </Overlay>
      )}

      {/* ── Promote confirm modal ── */}
      {promotingUser && (
        <Overlay onClick={() => !promoteLoading && setPromotingUser(null)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Change role?</ModalTitle>
            <ModalBody>
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
            </ModalBody>
            {promoteError && <ModalError>⚠ {promoteError}</ModalError>}
            <ModalActions>
              <ModalCancelBtn
                onClick={() => setPromotingUser(null)}
                disabled={promoteLoading}
              >
                Cancel
              </ModalCancelBtn>
              <ModalConfirmBtn
                onClick={handlePromoteConfirm}
                disabled={promoteLoading}
              >
                {promoteLoading ? 'Saving…' : 'Confirm'}
              </ModalConfirmBtn>
            </ModalActions>
          </ModalBox>
        </Overlay>
      )}

      {/* ── Toast notifications ── */}
      <ToastWrap>
        {toasts.map((t) => (
          <ToastItem key={t.id} $type={t.type}>
            {t.type === 'error' ? '⚠' : '✓'} {t.message}
          </ToastItem>
        ))}
      </ToastWrap>
    </>
  );
}
