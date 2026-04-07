import { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  fetchGroups, fetchSubgroups, fetchAssets,
} from '../../services/taxonomyService.js';
import GroupFormModal      from './GroupFormModal.jsx';
import SubgroupFormModal   from './SubgroupFormModal.jsx';
import DeleteGroupModal    from './DeleteGroupModal.jsx';
import DeleteSubgroupModal from './DeleteSubgroupModal.jsx';
import AssetFormModal      from './AssetFormModal.jsx';

// ── Animations ─────────────────────────────────────────────────────────────────
const slideIn = keyframes`
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
`;

const shimmer = keyframes`
  from { background-position: -400px 0; }
  to   { background-position:  400px 0; }
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
  border: 1px solid ${(p) => (p.$type === 'error' ? 'var(--c-error)' : '#00E676')};
  border-radius: 6px;
  color: ${(p) => (p.$type === 'error' ? 'var(--c-error)' : '#00E676')};
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

// ── SVG Icons ──────────────────────────────────────────────────────────────────
function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ── Asset type badge colours ───────────────────────────────────────────────────
const TYPE_COLORS = {
  'equity':          { bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.28)',  text: '#60A5FA' },
  'equity-br':       { bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.28)',  text: '#60A5FA' },
  'fii':             { bg: 'rgba(20,184,166,0.10)',  border: 'rgba(20,184,166,0.28)',  text: '#2DD4BF' },
  'etf':             { bg: 'rgba(20,184,166,0.10)',  border: 'rgba(20,184,166,0.28)',  text: '#2DD4BF' },
  'etf-br':          { bg: 'rgba(20,184,166,0.10)',  border: 'rgba(20,184,166,0.28)',  text: '#2DD4BF' },
  'index':           { bg: 'rgba(244,63,94,0.10)',   border: 'rgba(244,63,94,0.28)',   text: '#FB7185' },
  'index-br':        { bg: 'rgba(244,63,94,0.10)',   border: 'rgba(244,63,94,0.28)',   text: '#FB7185' },
  'forex':           { bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.28)',  text: '#34D399' },
  'crypto':          { bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.28)',  text: '#FBBF24' },
  'rate':            { bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.28)',  text: '#A78BFA' },
  'macro-indicator': { bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.28)',  text: '#A78BFA' },
  'public-debt':     { bg: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.28)',  text: '#FB923C' },
  'credit':          { bg: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.28)',  text: '#FB923C' },
};

function AssetTypeBadge({ type }) {
  if (!type) return null;
  const c = TYPE_COLORS[type] ?? { bg: 'rgba(0,188,212,0.08)', border: 'rgba(0,188,212,0.2)', text: 'var(--c-accent)' };
  return (
    <span style={{
      background:    c.bg,
      border:        `1px solid ${c.border}`,
      borderRadius:  3,
      color:         c.text,
      fontSize:      9,
      letterSpacing: '0.08em',
      padding:       '1px 6px',
      textTransform: 'uppercase',
      whiteSpace:    'nowrap',
      flexShrink:    0,
    }}>
      {type}
    </span>
  );
}

// ── Styled components ──────────────────────────────────────────────────────────
const Body = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 280px 280px 1fr;
  overflow: hidden;
  min-height: 0;
`;

const Column = styled.div`
  border-right: 1px solid #1E2740;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  &:last-child { border-right: none; }
`;

const ColHeader = styled.div`
  padding: 10px 14px;
  border-bottom: 1px solid #1E2740;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  min-height: 44px;
  gap: 8px;
`;

const ColTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
  overflow: hidden;
`;

const ColTitle = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #64748B;
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;
`;

const ColBreadcrumb = styled.span`
  font-size: 10px;
  color: #4A5568;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 130px;
  flex-shrink: 1;
  &::before { content: '/'; margin-right: 5px; color: #2D3748; }
`;

const ColCount = styled.span`
  font-size: 10px;
  color: #64748B;
  background: #0A0F1E;
  border: 1px solid #2D3748;
  border-radius: 10px;
  padding: 1px 8px;
  flex-shrink: 0;
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
  padding: 5px 12px;
  min-height: 30px;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s;
  &:hover { background: var(--c-accent-muted); border-color: var(--c-accent); }
`;

const FilterWrap = styled.div`
  padding: 7px 12px;
  border-bottom: 1px solid #0D1220;
  flex-shrink: 0;
`;

const FilterInput = styled.input`
  width: 100%;
  background: #0A0F1E;
  border: 1px solid #1E2740;
  border-radius: 4px;
  color: #CBD5E1;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  padding: 5px 10px;
  outline: none;
  box-sizing: border-box;
  &::placeholder { color: #2D3748; }
  &:focus { border-color: rgba(0,188,212,0.4); }
`;

const ColBody = styled.div`
  flex: 1;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #1E2740; border-radius: 2px; }
`;

const ListRow = styled.div`
  padding: 9px 14px;
  border-bottom: 1px solid #0D1220;
  cursor: pointer;
  background: ${(p) => (p.$active ? 'rgba(0,188,212,0.10)' : 'transparent')};
  border-left: 3px solid ${(p) => (p.$active ? 'var(--c-accent)' : 'transparent')};
  transition: background 0.12s, border-color 0.12s;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;

  &:hover {
    background: ${(p) => (p.$active ? 'rgba(0,188,212,0.10)' : 'rgba(255,255,255,0.04)')};
    border-left-color: ${(p) => (p.$active ? 'var(--c-accent)' : 'rgba(0,188,212,0.25)')};
  }
`;

const RowMain = styled.div`
  flex: 1;
  min-width: 0;
`;

const RowName = styled.div`
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => (p.$active ? '#E8EAF0' : '#94A3B8')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 7px;
`;

const RowMeta = styled.div`
  font-size: 10px;
  color: #4A5568;
  margin-top: 2px;
`;

const RowActions = styled.div`
  display: flex;
  gap: 3px;
  opacity: 0;
  flex-shrink: 0;
  transition: opacity 0.15s;
  ${ListRow}:hover & { opacity: 1; }
`;

const IconBtn = styled.button`
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #4A5568;
  cursor: pointer;
  padding: 5px 6px;
  min-width: 28px;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;
  &:hover {
    background: ${(p) => (p.$danger ? 'rgba(255,82,82,0.10)' : 'rgba(0,188,212,0.10)')};
    border-color: ${(p) => (p.$danger ? 'var(--c-error)' : 'var(--c-accent)')};
    color: ${(p) => (p.$danger ? 'var(--c-error)' : 'var(--c-accent)')};
  }
`;

const ChevronWrap = styled.div`
  color: #2D3748;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  transition: color 0.12s;
  ${ListRow}:hover & { color: rgba(0,188,212,0.45); }
`;

// Terminal-origin pill (replaces emoji flags)
const OriginBadge = styled.span`
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 1px 5px;
  border-radius: 3px;
  flex-shrink: 0;
  ${(p) => p.$br ? `
    background: rgba(197,160,89,0.12);
    border: 1px solid rgba(197,160,89,0.28);
    color: #C5A059;
  ` : `
    background: rgba(0,188,212,0.08);
    border: 1px solid rgba(0,188,212,0.2);
    color: #26C6DA;
  `}
`;

const EmptyState = styled.div`
  padding: 40px 18px;
  text-align: center;
  color: #4A5568;
  font-size: 11px;
  line-height: 1.8;
`;

const AssetSymbolLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: var(--c-accent);
  font-family: 'Space Mono', monospace;
  min-width: 66px;
  flex-shrink: 0;
`;

// ── Skeleton loading rows ──────────────────────────────────────────────────────
const SkeletonRow = styled.div`
  padding: 9px 14px;
  border-bottom: 1px solid #0D1220;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
`;

const SkeletonBar = styled.div`
  height: ${(p) => p.$h || 10}px;
  width: ${(p) => p.$w || '60%'};
  border-radius: 3px;
  background: linear-gradient(90deg, #0D1220 25%, #1A2035 50%, #0D1220 75%);
  background-size: 400px 100%;
  animation: ${shimmer} 1.5s ease infinite;
`;

const SKELETON_WIDTHS = ['55%', '70%', '45%', '62%', '50%', '68%'];

function SkeletonRows({ count = 4 }) {
  return Array.from({ length: count }, (_, i) => (
    <SkeletonRow key={i}>
      <SkeletonBar $w={SKELETON_WIDTHS[i % SKELETON_WIDTHS.length]} />
      <SkeletonBar $h={8} $w={SKELETON_WIDTHS[(i + 2) % SKELETON_WIDTHS.length]} />
    </SkeletonRow>
  ));
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function TaxonomyManager() {
  const { toasts, push } = useToast();

  const [groups,    setGroups]    = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [assets,    setAssets]    = useState([]);

  const [selectedGroupId,    setSelectedGroupId]    = useState(null);
  const [selectedSubgroupId, setSelectedSubgroupId] = useState(null);

  const [modal, setModal] = useState(null);

  const [loadingGroups,    setLoadingGroups]    = useState(true);
  const [loadingSubgroups, setLoadingSubgroups] = useState(false);
  const [loadingAssets,    setLoadingAssets]    = useState(false);

  const [groupFilter,    setGroupFilter]    = useState('');
  const [subgroupFilter, setSubgroupFilter] = useState('');

  // ── Data loaders ─────────────────────────────────────────────────────────────
  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const data = await fetchGroups();
      setGroups(data);
    } catch {
      push('Failed to load groups', 'error');
    } finally {
      setLoadingGroups(false);
    }
  }, [push]);

  const loadSubgroups = useCallback(async (groupId) => {
    if (!groupId) { setSubgroups([]); return; }
    setLoadingSubgroups(true);
    try {
      const data = await fetchSubgroups(groupId);
      setSubgroups(data);
    } catch {
      push('Failed to load subgroups', 'error');
    } finally {
      setLoadingSubgroups(false);
    }
  }, [push]);

  const loadAssets = useCallback(async (subgroupId) => {
    if (!subgroupId) { setAssets([]); return; }
    setLoadingAssets(true);
    try {
      const data = await fetchAssets({ subgroupId });
      setAssets(data);
    } catch {
      push('Failed to load assets', 'error');
    } finally {
      setLoadingAssets(false);
    }
  }, [push]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  useEffect(() => {
    setSelectedSubgroupId(null);
    setAssets([]);
    setSubgroupFilter('');
    loadSubgroups(selectedGroupId);
  }, [selectedGroupId, loadSubgroups]);

  useEffect(() => {
    loadAssets(selectedSubgroupId);
  }, [selectedSubgroupId, loadAssets]);

  // ── Computed ──────────────────────────────────────────────────────────────────
  const selectedGroup    = groups.find((g) => g.id === selectedGroupId);
  const selectedSubgroup = subgroups.find((s) => s.id === selectedSubgroupId);

  const filteredGroups = groupFilter.trim()
    ? groups.filter((g) => g.display_name.toLowerCase().includes(groupFilter.toLowerCase().trim()))
    : groups;

  const filteredSubgroups = subgroupFilter.trim()
    ? subgroups.filter((s) => s.display_name.toLowerCase().includes(subgroupFilter.toLowerCase().trim()))
    : subgroups;

  const existingGroupSlugs    = groups.map((g) => g.slug);
  const existingSubgroupSlugs = subgroups.map((s) => s.slug);

  const [allSubgroupsFlat, setAllSubgroupsFlat] = useState([]);
  useEffect(() => {
    fetchSubgroups().then((all) => {
      fetchGroups().then((allGroups) => {
        const gMap = {};
        for (const g of allGroups) gMap[g.id] = g.display_name;
        setAllSubgroupsFlat(all.map((s) => ({ ...s, groupDisplayName: gMap[s.group_id] || s.group_id })));
      });
    }).catch(() => {});
  }, [groups]);

  // ── Modal handlers ────────────────────────────────────────────────────────────
  function closeModal() { setModal(null); }

  async function onGroupSaved() {
    closeModal();
    await loadGroups();
    push('Group saved');
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
    await loadGroups();
    push('Subgroup saved');
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
    push(deleted ? 'Asset deleted' : 'Asset saved');
  }

  return (
    <>
      <Body>
        {/* ── LEFT: Groups ── */}
        <Column>
          <ColHeader>
            <ColTitleGroup>
              <ColTitle>Groups</ColTitle>
              {!loadingGroups && <ColCount>{groups.length}</ColCount>}
            </ColTitleGroup>
            <AddBtn onClick={() => setModal({ type: 'addGroup' })}>+ Add</AddBtn>
          </ColHeader>
          <FilterWrap>
            <FilterInput
              placeholder="Filter groups…"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
            />
          </FilterWrap>
          <ColBody>
            {loadingGroups ? (
              <SkeletonRows count={5} />
            ) : filteredGroups.length === 0 ? (
              <EmptyState>
                {groupFilter.trim() ? 'No matches.' : 'No groups yet.\nClick + Add to create one.'}
              </EmptyState>
            ) : (
              filteredGroups.map((g) => (
                <ListRow
                  key={g.id}
                  $active={selectedGroupId === g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                >
                  <RowMain>
                    <RowName $active={selectedGroupId === g.id}>
                      {g.display_name}
                      <OriginBadge $br={g.l1_id === 'brasil'}>
                        {g.l1_id === 'brasil' ? 'BR' : 'GL'}
                      </OriginBadge>
                    </RowName>
                    <RowMeta>
                      {g.subgroup_count} subgroup{g.subgroup_count !== 1 ? 's' : ''} · {g.slug}
                    </RowMeta>
                  </RowMain>
                  <RowActions>
                    <IconBtn
                      title="Edit group"
                      onClick={(e) => { e.stopPropagation(); setModal({ type: 'editGroup', payload: g }); }}
                    ><IconEdit /></IconBtn>
                    <IconBtn
                      $danger
                      title="Delete group"
                      onClick={(e) => { e.stopPropagation(); setModal({ type: 'deleteGroup', payload: g }); }}
                    ><IconTrash /></IconBtn>
                  </RowActions>
                  <ChevronWrap><IconChevron /></ChevronWrap>
                </ListRow>
              ))
            )}
          </ColBody>
        </Column>

        {/* ── CENTER: Subgroups ── */}
        <Column>
          <ColHeader>
            <ColTitleGroup>
              <ColTitle>Subgroups</ColTitle>
              {selectedGroup && (
                <ColBreadcrumb title={selectedGroup.display_name}>
                  {selectedGroup.display_name}
                </ColBreadcrumb>
              )}
              {selectedGroup && !loadingSubgroups && <ColCount>{subgroups.length}</ColCount>}
            </ColTitleGroup>
            {selectedGroup && (
              <AddBtn onClick={() => setModal({ type: 'addSubgroup' })}>+ Add</AddBtn>
            )}
          </ColHeader>
          {selectedGroup && (
            <FilterWrap>
              <FilterInput
                placeholder="Filter subgroups…"
                value={subgroupFilter}
                onChange={(e) => setSubgroupFilter(e.target.value)}
              />
            </FilterWrap>
          )}
          <ColBody>
            {!selectedGroup ? (
              <EmptyState>← Select a group<br />to view subgroups</EmptyState>
            ) : loadingSubgroups ? (
              <SkeletonRows count={4} />
            ) : filteredSubgroups.length === 0 ? (
              <EmptyState>
                {subgroupFilter.trim()
                  ? 'No matches.'
                  : `No subgroups in\n${selectedGroup.display_name}.\nClick + Add.`}
              </EmptyState>
            ) : (
              filteredSubgroups.map((s) => (
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
                      title="Edit subgroup"
                      onClick={(e) => { e.stopPropagation(); setModal({ type: 'editSubgroup', payload: s }); }}
                    ><IconEdit /></IconBtn>
                    <IconBtn
                      $danger
                      title="Delete subgroup"
                      onClick={(e) => { e.stopPropagation(); setModal({ type: 'deleteSubgroup', payload: s }); }}
                    ><IconTrash /></IconBtn>
                  </RowActions>
                  <ChevronWrap><IconChevron /></ChevronWrap>
                </ListRow>
              ))
            )}
          </ColBody>
        </Column>

        {/* ── RIGHT: Assets ── */}
        <Column>
          <ColHeader>
            <ColTitleGroup>
              <ColTitle>Assets</ColTitle>
              {selectedSubgroup && (
                <ColBreadcrumb title={selectedSubgroup.display_name}>
                  {selectedSubgroup.display_name}
                </ColBreadcrumb>
              )}
              {selectedSubgroup && !loadingAssets && <ColCount>{assets.length}</ColCount>}
            </ColTitleGroup>
            {selectedSubgroup && (
              <AddBtn onClick={() => setModal({ type: 'addAsset' })}>+ Add</AddBtn>
            )}
          </ColHeader>
          <ColBody>
            {!selectedSubgroup ? (
              <EmptyState>← Select a subgroup<br />to view assets</EmptyState>
            ) : loadingAssets ? (
              <SkeletonRows count={6} />
            ) : assets.length === 0 ? (
              <EmptyState>No assets in<br />{selectedSubgroup.display_name}.<br />Click + Add.</EmptyState>
            ) : (
              assets.map((a) => (
                <ListRow
                  key={a.id}
                  onClick={() => setModal({ type: 'editAsset', payload: a })}
                >
                  <AssetSymbolLabel>{a.symbol}</AssetSymbolLabel>
                  <RowMain>
                    <RowName style={{ color: '#94A3B8' }}>{a.name}</RowName>
                    <RowMeta>
                      {[a.exchange, a.currency].filter(Boolean).join(' · ')}
                    </RowMeta>
                  </RowMain>
                  <AssetTypeBadge type={a.type} />
                  <RowActions>
                    <IconBtn
                      title="Edit asset"
                      onClick={(e) => { e.stopPropagation(); setModal({ type: 'editAsset', payload: a }); }}
                    ><IconEdit /></IconBtn>
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
    </>
  );
}
