import { useState } from 'react';
import styled from 'styled-components';
import { deleteGroup } from '../../services/taxonomyService.js';

const Overlay = styled.div`
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
`;
const Modal = styled.div`
  background: #0D1220;
  border: 1px solid #1E2740;
  border-radius: 8px;
  width: 420px;
  max-width: 95vw;
  padding: 28px;
`;
const Title = styled.h2`
  font-family: 'DM Sans', sans-serif;
  font-size: 16px; font-weight: 700;
  color: #E8EAF0; margin: 0 0 12px;
`;
const Body = styled.p`
  font-family: 'Space Mono', monospace;
  font-size: 12px; color: #8892A4;
  line-height: 1.6; margin: 0 0 20px;
`;
const BlockedBox = styled.div`
  background: rgba(255,82,82,0.06);
  border: 1px solid rgba(255,82,82,0.25);
  border-radius: 4px;
  color: #FF5252;
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  padding: 12px 14px;
  margin-bottom: 20px;
`;
const ErrorMsg = styled.div`
  background: rgba(255,82,82,0.08);
  border: 1px solid rgba(255,82,82,0.3);
  border-radius: 4px;
  color: #FF5252;
  font-size: 12px;
  padding: 10px 12px;
  margin-bottom: 16px;
  font-family: 'Space Mono', monospace;
`;
const Actions = styled.div`display: flex; justify-content: flex-end; gap: 10px;`;
const Btn = styled.button`
  border-radius: 4px;
  font-family: 'Space Mono', monospace;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.08em;
  padding: 9px 18px; cursor: pointer;
  text-transform: uppercase;
  transition: background 0.15s;
`;
const CancelBtn = styled(Btn)`
  background: transparent; border: 1px solid #1E2740; color: #4A5568;
  &:hover { border-color: #4A5568; color: #E8EAF0; }
`;
const DeleteBtn = styled(Btn)`
  background: ${(p) => (p.disabled ? '#1E2740' : '#FF5252')};
  border: none;
  color: ${(p) => (p.disabled ? '#4A5568' : '#fff')};
  cursor: ${(p) => (p.disabled ? 'not-allowed' : 'pointer')};
  &:hover:not(:disabled) { background: #FF6B6B; }
`;

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

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>Delete Group</Title>

        {isBlocked ? (
          <BlockedBox>
            ⛔ <strong>{group.display_name}</strong> has {group.subgroup_count} subgroup(s).<br />
            Remove all subgroups before this group can be deleted.
          </BlockedBox>
        ) : (
          <Body>
            Permanently delete <strong style={{ color: '#E8EAF0' }}>{group.display_name}</strong>?<br />
            This action cannot be undone.
          </Body>
        )}

        {error && <ErrorMsg>⚠ {error}</ErrorMsg>}

        <Actions>
          <CancelBtn onClick={onClose}>Cancel</CancelBtn>
          <DeleteBtn onClick={handleDelete} disabled={isBlocked || loading}>
            {loading ? 'Deleting...' : 'Delete Group'}
          </DeleteBtn>
        </Actions>
      </Modal>
    </Overlay>
  );
}
