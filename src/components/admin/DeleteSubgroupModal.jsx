import { useState } from 'react';
import styled from 'styled-components';
import { bulkRelocateAssets, deleteSubgroup } from '../../services/taxonomyService.js';

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
  width: 540px;
  max-width: 95vw;
  padding: 28px;
  max-height: 90vh;
  overflow-y: auto;
`;
const Title = styled.h2`
  font-family: 'DM Sans', sans-serif;
  font-size: 16px; font-weight: 700;
  color: #E8EAF0; margin: 0 0 10px;
`;
const Body = styled.p`
  font-family: 'Space Mono', monospace;
  font-size: 12px; color: #8892A4;
  line-height: 1.6; margin: 0 0 20px;
`;
const SectionLabel = styled.div`
  font-size: 10px; font-weight: 600; letter-spacing: 0.15em;
  color: #4A5568; text-transform: uppercase; margin-bottom: 8px;
`;
const Select = styled.select`
  width: 100%; background: #080C18;
  border: 1px solid ${(p) => (p.$error ? '#FF5252' : '#1E2740')};
  border-radius: 4px; color: #E8EAF0;
  font-family: 'Space Mono', monospace; font-size: 12px;
  padding: 9px 12px; outline: none; box-sizing: border-box;
  cursor: pointer; margin-bottom: 20px;
  &:focus { border-color: var(--c-accent); }
`;
const AssetPreview = styled.div`
  background: #080C18;
  border: 1px solid #1E2740;
  border-radius: 4px;
  padding: 10px 12px;
  margin-bottom: 20px;
  max-height: 180px;
  overflow-y: auto;
`;
const AssetRow = styled.div`
  display: flex; align-items: center; gap: 10px;
  padding: 4px 0;
  border-bottom: 1px solid #0D1220;
  &:last-child { border-bottom: none; }
`;
const AssetSymbol = styled.span`
  font-family: 'Space Mono', monospace;
  font-size: 11px; font-weight: 700;
  color: var(--c-accent); min-width: 70px;
`;
const AssetName = styled.span`
  font-family: 'Space Mono', monospace;
  font-size: 11px; color: #8892A4;
`;
const AssetCount = styled.div`
  font-size: 11px; color: #4A5568; margin-bottom: 8px;
  font-family: 'Space Mono', monospace;
`;
const ErrorMsg = styled.div`
  background: rgba(255,82,82,0.08);
  border: 1px solid rgba(255,82,82,0.3);
  border-radius: 4px; color: #FF5252;
  font-size: 12px; padding: 10px 12px; margin-bottom: 16px;
  font-family: 'Space Mono', monospace;
`;
const Actions = styled.div`display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;`;
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
const ActionBtn = styled(Btn)`
  background: ${(p) => (p.disabled ? '#1E2740' : '#FF5252')};
  border: none;
  color: ${(p) => (p.disabled ? '#4A5568' : '#fff')};
  cursor: ${(p) => (p.disabled ? 'not-allowed' : 'pointer')};
  &:hover:not(:disabled) { background: #FF6B6B; }
`;
const OptGroup = styled.optgroup`color: #8892A4;`;

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

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        {hasAssets ? (
          <>
            <Title>Relocate Assets Before Deleting</Title>
            <Body>
              <strong style={{ color: '#E8EAF0' }}>{subgroup.display_name}</strong> contains {assets.length} asset(s).
              Choose a destination subgroup before this subgroup can be deleted.
            </Body>

            <SectionLabel>Assets to be moved</SectionLabel>
            <AssetCount>{assets.length} asset{assets.length !== 1 ? 's' : ''}</AssetCount>
            <AssetPreview>
              {assets.map((a) => (
                <AssetRow key={a.id}>
                  <AssetSymbol>{a.symbol}</AssetSymbol>
                  <AssetName>{a.name}</AssetName>
                </AssetRow>
              ))}
            </AssetPreview>

            <SectionLabel>Move all assets to...</SectionLabel>
            <Select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              $error={!targetId && !!error}
            >
              <option value="">— Select destination subgroup —</option>
              {Object.entries(byGroup).map(([groupLabel, subs]) => (
                <OptGroup key={groupLabel} label={groupLabel}>
                  {subs.map((s) => (
                    <option key={s.id} value={s.id}>{s.display_name}</option>
                  ))}
                </OptGroup>
              ))}
            </Select>

            {error && <ErrorMsg>⚠ {error}</ErrorMsg>}

            <Actions>
              <CancelBtn onClick={onClose}>Cancel</CancelBtn>
              <ActionBtn
                onClick={handleConfirm}
                disabled={loading || !targetId}
              >
                {loading ? 'Processing...' : `Relocate & Delete`}
              </ActionBtn>
            </Actions>
          </>
        ) : (
          <>
            <Title>Delete Subgroup</Title>
            <Body>
              Permanently delete <strong style={{ color: '#E8EAF0' }}>{subgroup.display_name}</strong>?<br />
              This subgroup has no assets. This action cannot be undone.
            </Body>

            {error && <ErrorMsg>⚠ {error}</ErrorMsg>}

            <Actions>
              <CancelBtn onClick={onClose}>Cancel</CancelBtn>
              <ActionBtn onClick={handleConfirm} disabled={loading}>
                {loading ? 'Deleting...' : 'Delete Subgroup'}
              </ActionBtn>
            </Actions>
          </>
        )}
      </Modal>
    </Overlay>
  );
}
