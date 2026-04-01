import { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, createGlobalStyle } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import GMTHeader from '../components/GMTHeader.jsx';
import {
  fetchGroups, fetchSubgroups, fetchAssets,
} from '../services/taxonomyService.js';
import GroupFormModal     from '../components/admin/GroupFormModal.jsx';
import SubgroupFormModal  from '../components/admin/SubgroupFormModal.jsx';
import AssetFormModal     from '../components/admin/AssetFormModal.jsx';
import DeleteGroupModal   from '../components/admin/DeleteGroupModal.jsx';
import DeleteSubgroupModal from '../components/admin/DeleteSubgroupModal.jsx';

// ── Toast ──────────────────────────────────────────────────────────────────────
const slideIn = keyframes`
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
`;

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

// ── Layout ─────────────────────────────────────────────────────────────────────
const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; }
`;

const Page = styled.div`
  min-height: 100vh;
  background: #080C18;
  color: #E8EAF0;
  font-family: 'Space Mono', 'Courier New', monospace;
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.header`
  background: #0D1220;
  border-bottom: 1px solid #1E2740;
  padding: 0 28px;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
`;

const Breadcrumb = styled.div`
  font-size: 11px;
  color: #4A5568;
  letter-spacing: 0.05em;
  span { color: #8892A4; }
`;

const PageTitle = styled.h1`
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: #E8EAF0;
  text-transform: uppercase;
  margin: 0;
`;

const TopBarRight = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 14px;
`;

const AdminBadge = styled.span`
  background: rgba(0, 188, 212, 0.12);
  border: 1px solid rgba(0, 188, 212, 0.3);
  border-radius: 3px;
  color: var(--c-accent);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.2em;
  padding: 2px 7px;
  text-transform: uppercase;
`;

const UserEmail = styled.span`
  font-size: 11px;
  color: #8892A4;
`;

const LogoutBtn = styled.button`
  background: transparent;
  border: 1px solid #1E2740;
  border-radius: 4px;
  color: #4A5568;
  cursor: pointer;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  padding: 6px 12px;
  text-transform: uppercase;
  transition: all 0.15s;
  &:hover { border-color: #FF5252; color: #FF5252; }
`;

const Body = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 280px 280px 1fr;
  overflow: hidden;
`;

const Column = styled.div`
  border-right: 1px solid #1E2740;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  &:last-child { border-right: none; }
`;

const ColHeader = styled.div`
  padding: 14px 18px 12px;
  border-bottom: 1px solid #1E2740;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`;

const ColTitle = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #4A5568;
  text-transform: uppercase;
`;

const ColCount = styled.span`
  font-size: 10px;
  color: #2D3748;
  background: #0D1220;
  border: 1px solid #1E2740;
  border-radius: 10px;
  padding: 1px 8px;
`;

const AddBtn = styled.button`
  background: transparent;
  border: 1px solid #1E2740;
  border-radius: 4px;
  color: var(--c-accent);
  cursor: pointer;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  transition: all 0.15s;
  &:hover { background: var(--c-accent-muted); border-color: var(--c-accent); }
`;

const ColBody = styled.div`
  flex: 1;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #1E2740; border-radius: 2px; }
`;

const ListRow = styled.div`
  padding: 10px 18px;
  border-bottom: 1px solid #0D1220;
  cursor: pointer;
  background: ${(p) => (p.$active ? 'rgba(0,188,212,0.07)' : 'transparent')};
  border-left: 3px solid ${(p) => (p.$active ? 'var(--c-accent)' : 'transparent')};
  transition: background 0.1s;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: ${(p) => (p.$active ? 'rgba(0,188,212,0.07)' : 'rgba(255,255,255,0.02)')};
  }
`;

const RowMain = styled.div`
  flex: 1;
  min-width: 0;
`;

const RowName = styled.div`
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => (p.$active ? '#E8EAF0' : '#8892A4')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RowMeta = styled.div`
  font-size: 10px;
  color: #2D3748;
  margin-top: 2px;
`;

const RowActions = styled.div`
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
  ${ListRow}:hover & { opacity: 1; }
`;

const IconBtn = styled.button`
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  color: #4A5568;
  cursor: pointer;
  font-size: 12px;
  padding: 3px 5px;
  transition: all 0.1s;
  &:hover {
    background: ${(p) => (p.$danger ? 'rgba(255,82,82,0.1)' : 'rgba(0,188,212,0.1)')};
    border-color: ${(p) => (p.$danger ? '#FF5252' : 'var(--c-accent)')};
    color: ${(p) => (p.$danger ? '#FF5252' : 'var(--c-accent)')};
  }
`;

const TypeBadge = styled.span`
  background: rgba(0, 188, 212, 0.08);
  border: 1px solid rgba(0, 188, 212, 0.2);
  border-radius: 3px;
  color: var(--c-accent);
  font-size: 9px;
  letter-spacing: 0.1em;
  padding: 1px 6px;
  text-transform: uppercase;
  white-space: nowrap;
`;

const EmptyState = styled.div`
  padding: 40px 18px;
  text-align: center;
  color: #2D3748;
  font-size: 11px;
  line-height: 1.8;
`;

const L1SectionHeader = styled.div`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4A5568;
  padding: 8px 12px 4px;
  border-top: ${(p) => (p.$first ? 'none' : '1px solid #1A2035')};
  margin-top: ${(p) => (p.$first ? '0' : '4px')};
`;

const AssetSymbolLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: var(--c-accent);
  font-family: 'Space Mono', monospace;
  min-width: 70px;
`;

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminTaxonomyPage() {
  const { user, logout }   = useAuth();
  const navigate            = useNavigate();
  const { toasts, push }    = useToast();

  // Data state
  const [groups,    setGroups]    = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [assets,    setAssets]    = useState([]);

  // Selection state
  const [selectedGroupId,    setSelectedGroupId]    = useState(null);
  const [selectedSubgroupId, setSelectedSubgroupId] = useState(null);

  // Modal state
  const [modal, setModal] = useState(null);
  // modal: { type: 'addGroup'|'editGroup'|'deleteGroup'|'addSubgroup'|'editSubgroup'|'deleteSubgroup'|'addAsset'|'editAsset', payload? }

  // Loading
  const [loadingGroups,    setLoadingGroups]    = useState(true);
  const [loadingSubgroups, setLoadingSubgroups] = useState(false);
  const [loadingAssets,    setLoadingAssets]    = useState(false);

  // ── Data loaders ───────────────────────────────────────────────────────────
  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const data = await fetchGroups();
      setGroups(data);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  const loadSubgroups = useCallback(async (groupId) => {
    if (!groupId) { setSubgroups([]); return; }
    setLoadingSubgroups(true);
    try {
      const data = await fetchSubgroups(groupId);
      setSubgroups(data);
    } finally {
      setLoadingSubgroups(false);
    }
  }, []);

  const loadAssets = useCallback(async (subgroupId) => {
    if (!subgroupId) { setAssets([]); return; }
    setLoadingAssets(true);
    try {
      const data = await fetchAssets({ subgroupId });
      setAssets(data);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, []);

  useEffect(() => {
    setSelectedSubgroupId(null);
    setAssets([]);
    loadSubgroups(selectedGroupId);
  }, [selectedGroupId, loadSubgroups]);

  useEffect(() => {
    loadAssets(selectedSubgroupId);
  }, [selectedSubgroupId, loadAssets]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const selectedGroup    = groups.find((g) => g.id === selectedGroupId);
  const selectedSubgroup = subgroups.find((s) => s.id === selectedSubgroupId);
  const existingGroupSlugs    = groups.map((g) => g.slug);
  const existingSubgroupSlugs = subgroups.map((s) => s.slug);

  // Flat subgroup list with group context (for relocation dropdown)
  const [allSubgroupsFlat, setAllSubgroupsFlat] = useState([]);
  useEffect(() => {
    fetchSubgroups().then((all) => {
      // We need group display names — fetch all groups to enrich
      fetchGroups().then((allGroups) => {
        const gMap = {};
        for (const g of allGroups) gMap[g.id] = g.display_name;
        setAllSubgroupsFlat(all.map((s) => ({ ...s, groupDisplayName: gMap[s.group_id] || s.group_id })));
      });
    }).catch(() => {});
  }, [groups]); // refresh when groups change

  // ── Modal handlers ─────────────────────────────────────────────────────────
  function closeModal() { setModal(null); }

  async function onGroupSaved() {
    closeModal();
    await loadGroups();
    push('Group saved successfully');
  }

  async function onGroupDeleted() {
    closeModal();
    setSelectedGroupId(null);
    await loadGroups();
    push('Group deleted');
  }

  async function onSubgroupSaved() {
    closeModal();
    await loadSubgroups(selectedGroupId);
    await loadGroups(); // refresh subgroup_count
    push('Subgroup saved successfully');
  }

  async function onSubgroupDeleted({ moved, targetLabel }) {
    closeModal();
    setSelectedSubgroupId(null);
    await loadSubgroups(selectedGroupId);
    await loadGroups();
    if (moved > 0) {
      push(`${moved} asset(s) moved to ${targetLabel}. Subgroup deleted.`);
    } else {
      push('Subgroup deleted');
    }
  }

  async function onAssetSaved(deleted = false) {
    closeModal();
    await loadAssets(selectedSubgroupId);
    await loadSubgroups(selectedGroupId);
    push(deleted ? 'Asset deleted' : 'Asset saved successfully');
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <GlobalStyle />
      <Page>
        {/* ── Top bar ── */}
        <GMTHeader
          activePage="terminal"
          user={user}
          onNav={navigate}
          onLogout={handleLogout}
        />

        {/* ── Three-column body ── */}
        <Body>

          {/* ── LEFT: Groups ── */}
          <Column>
            <ColHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ColTitle>Groups</ColTitle>
                <ColCount>{groups.length}</ColCount>
              </div>
              <AddBtn onClick={() => setModal({ type: 'addGroup' })}>+ Add</AddBtn>
            </ColHeader>
            <ColBody>
              {loadingGroups ? (
                <EmptyState>Loading...</EmptyState>
              ) : groups.length === 0 ? (
                <EmptyState>No groups yet.<br />Click + Add to create one.</EmptyState>
              ) : (
                groups.map((g) => (
                  <ListRow
                    key={g.id}
                    $active={selectedGroupId === g.id}
                    onClick={() => setSelectedGroupId(g.id)}
                  >
                    <RowMain>
                      <RowName $active={selectedGroupId === g.id}>
                        {g.display_name}
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          color: g.l1_id === 'brasil' ? '#F9C300' : '#26C6DA',
                          marginLeft: 8,
                          verticalAlign: 'middle',
                        }}>
                          {g.l1_id === 'brasil' ? '🇧🇷' : '🌐'}
                        </span>
                      </RowName>
                      <RowMeta>
                        {g.subgroup_count} subgroup{g.subgroup_count !== 1 ? 's' : ''} · {g.slug}
                      </RowMeta>
                    </RowMain>
                    <RowActions>
                      <IconBtn
                        title="Edit"
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'editGroup', payload: g }); }}
                      >✏</IconBtn>
                      <IconBtn
                        $danger
                        title="Delete"
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'deleteGroup', payload: g }); }}
                      >🗑</IconBtn>
                    </RowActions>
                  </ListRow>
                ))
              )}
            </ColBody>
          </Column>

          {/* ── CENTER: Subgroups ── */}
          <Column>
            <ColHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ColTitle>Subgroups</ColTitle>
                {selectedGroup && <ColCount>{subgroups.length}</ColCount>}
              </div>
              {selectedGroup && (
                <AddBtn onClick={() => setModal({ type: 'addSubgroup' })}>+ Add</AddBtn>
              )}
            </ColHeader>
            <ColBody>
              {!selectedGroup ? (
                <EmptyState>← Select a group<br />to view subgroups</EmptyState>
              ) : loadingSubgroups ? (
                <EmptyState>Loading...</EmptyState>
              ) : subgroups.length === 0 ? (
                <EmptyState>No subgroups in<br />{selectedGroup.display_name}.<br />Click + Add.</EmptyState>
              ) : (
                subgroups.map((s) => (
                  <ListRow
                    key={s.id}
                    $active={selectedSubgroupId === s.id}
                    onClick={() => setSelectedSubgroupId(s.id)}
                  >
                    <RowMain>
                      <RowName $active={selectedSubgroupId === s.id}>{s.display_name}</RowName>
                      <RowMeta>{s.asset_count} asset{s.asset_count !== 1 ? 's' : ''} · {s.slug}</RowMeta>
                    </RowMain>
                    <RowActions>
                      <IconBtn
                        title="Edit"
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'editSubgroup', payload: s }); }}
                      >✏</IconBtn>
                      <IconBtn
                        $danger
                        title="Delete"
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'deleteSubgroup', payload: s }); }}
                      >🗑</IconBtn>
                    </RowActions>
                  </ListRow>
                ))
              )}
            </ColBody>
          </Column>

          {/* ── RIGHT: Assets ── */}
          <Column>
            <ColHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ColTitle>Assets</ColTitle>
                {selectedSubgroup && <ColCount>{assets.length}</ColCount>}
              </div>
              {selectedSubgroup && (
                <AddBtn onClick={() => setModal({ type: 'addAsset' })}>+ Add</AddBtn>
              )}
            </ColHeader>
            <ColBody>
              {!selectedSubgroup ? (
                <EmptyState>← Select a subgroup<br />to view assets</EmptyState>
              ) : loadingAssets ? (
                <EmptyState>Loading...</EmptyState>
              ) : assets.length === 0 ? (
                <EmptyState>No assets in<br />{selectedSubgroup.display_name}.<br />Click + Add.</EmptyState>
              ) : (
                assets.map((a) => (
                  <ListRow
                    key={a.id}
                    onClick={() => setModal({ type: 'editAsset', payload: a })}
                    style={{ cursor: 'pointer' }}
                  >
                    <AssetSymbolLabel>{a.symbol}</AssetSymbolLabel>
                    <RowMain>
                      <RowName style={{ color: '#8892A4' }}>{a.name}</RowName>
                      <RowMeta>{a.exchange} · {a.type}</RowMeta>
                    </RowMain>
                    <TypeBadge>{a.type}</TypeBadge>
                    <RowActions>
                      <IconBtn
                        title="Edit"
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'editAsset', payload: a }); }}
                      >✏</IconBtn>
                    </RowActions>
                  </ListRow>
                ))
              )}
            </ColBody>
          </Column>

        </Body>

        {/* ── Modals ── */}
        {modal?.type === 'addGroup' && (
          <GroupFormModal
            onClose={closeModal}
            onSaved={onGroupSaved}
            existingSlugs={existingGroupSlugs}
          />
        )}
        {modal?.type === 'editGroup' && (
          <GroupFormModal
            group={modal.payload}
            onClose={closeModal}
            onSaved={onGroupSaved}
            existingSlugs={existingGroupSlugs}
          />
        )}
        {modal?.type === 'deleteGroup' && (
          <DeleteGroupModal
            group={modal.payload}
            onClose={closeModal}
            onDeleted={onGroupDeleted}
          />
        )}
        {modal?.type === 'addSubgroup' && (
          <SubgroupFormModal
            defaultGroupId={selectedGroupId}
            groups={groups}
            onClose={closeModal}
            onSaved={onSubgroupSaved}
            existingSlugs={existingSubgroupSlugs}
          />
        )}
        {modal?.type === 'editSubgroup' && (
          <SubgroupFormModal
            subgroup={modal.payload}
            defaultGroupId={selectedGroupId}
            groups={groups}
            onClose={closeModal}
            onSaved={onSubgroupSaved}
            existingSlugs={existingSubgroupSlugs}
          />
        )}
        {modal?.type === 'deleteSubgroup' && (
          <DeleteSubgroupModal
            subgroup={modal.payload}
            assets={assets.filter((a) => a.subgroup_id === modal.payload.id)}
            allSubgroups={allSubgroupsFlat}
            onClose={closeModal}
            onDeleted={onSubgroupDeleted}
          />
        )}
        {(modal?.type === 'addAsset' || modal?.type === 'editAsset') && (
          <AssetFormModal
            asset={modal.type === 'editAsset' ? modal.payload : null}
            subgroup={selectedSubgroup}
            allSubgroups={allSubgroupsFlat}
            onClose={closeModal}
            onSaved={onAssetSaved}
          />
        )}

        {/* ── Toast notifications ── */}
        <ToastWrap>
          {toasts.map((t) => (
            <ToastItem key={t.id} $type={t.type}>
              {t.type === 'error' ? '⚠' : '✓'} {t.message}
            </ToastItem>
          ))}
        </ToastWrap>
      </Page>
    </>
  );
}
