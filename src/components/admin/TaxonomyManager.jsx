import { useState, useEffect, useCallback } from 'react';
import {
  fetchGroups, fetchSubgroups, fetchAssets,
} from '../../services/taxonomyService.js';
import GroupFormModal      from './GroupFormModal.jsx';
import SubgroupFormModal   from './SubgroupFormModal.jsx';
import DeleteGroupModal    from './DeleteGroupModal.jsx';
import DeleteSubgroupModal from './DeleteSubgroupModal.jsx';
import AssetFormModal      from './AssetFormModal.jsx';
import { CLUBE_COLORS } from '../../lib/tokens.js';

// ── Scoped styles for animations, focus, and scrollbar ────────────────────────
function ScopedStyles() {
  return (
    <style>{`
      @keyframes tm-slideIn {
        from { opacity: 0; transform: translateX(40px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes tm-shimmer {
        from { background-position: -400px 0; }
        to   { background-position:  400px 0; }
      }
      .tm-toast-item { animation: tm-slideIn 0.25s ease; }
      .tm-skeleton-bar {
        border-radius: 3px;
        background: linear-gradient(90deg, #0D1220 25%, #1A2035 50%, #0D1220 75%);
        background-size: 400px 100%;
        animation: tm-shimmer 1.5s ease infinite;
      }
      .tm-col-body::-webkit-scrollbar { width: 4px; }
      .tm-col-body::-webkit-scrollbar-track { background: transparent; }
      .tm-col-body::-webkit-scrollbar-thumb { background: #1E2740; border-radius: 2px; }
      .tm-filter-input::placeholder { color: #2D3748; }
      .tm-filter-input:focus { border-color: rgba(0,188,212,0.4); }
    `}</style>
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

// ── Skeleton loading rows ──────────────────────────────────────────────────────
const SKELETON_WIDTHS = ['55%', '70%', '45%', '62%', '50%', '68%'];

function SkeletonRows({ count = 4 }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} style={{
      padding: '9px 14px',
      borderBottom: '1px solid #0D1220',
      minHeight: 44,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 6,
    }}>
      <div className="tm-skeleton-bar" style={{
        height: 10,
        width: SKELETON_WIDTHS[i % SKELETON_WIDTHS.length],
      }} />
      <div className="tm-skeleton-bar" style={{
        height: 8,
        width: SKELETON_WIDTHS[(i + 2) % SKELETON_WIDTHS.length],
      }} />
    </div>
  ));
}

// ── Reusable inline style helpers ─────────────────────────────────────────────
function ListRowComp({ active, onClick, onMouseEnter, onMouseLeave, hovered, children }) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        padding: '9px 14px',
        borderBottom: '1px solid #0D1220',
        cursor: 'pointer',
        background: active ? 'rgba(0,188,212,0.10)' : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        borderLeft: `3px solid ${active ? 'var(--c-accent)' : hovered ? 'rgba(0,188,212,0.25)' : 'transparent'}`,
        transition: 'background 0.12s, border-color 0.12s',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
      }}
    >
      {children}
    </div>
  );
}

function IconBtnComp({ danger, title, onClick, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? (danger ? 'rgba(255,82,82,0.10)' : 'rgba(0,188,212,0.10)')
          : 'transparent',
        border: `1px solid ${hovered ? (danger ? 'var(--c-error)' : 'var(--c-accent)') : 'transparent'}`,
        borderRadius: 4,
        color: hovered ? (danger ? 'var(--c-error)' : 'var(--c-accent)') : '#4A5568',
        cursor: 'pointer',
        padding: '5px 6px',
        minWidth: 28,
        minHeight: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  );
}

function AddBtnComp({ onClick, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--c-accent-muted)' : 'transparent',
        border: `1px solid ${hovered ? 'var(--c-accent)' : '#1E2740'}`,
        borderRadius: 4,
        color: 'var(--c-accent)',
        cursor: 'pointer',
        fontFamily: "'Space Mono', monospace",
        fontSize: 10,
        letterSpacing: '0.05em',
        padding: '5px 12px',
        minHeight: 30,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
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

  // Hover state for list rows
  const [hoveredRowId, setHoveredRowId] = useState(null);

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

  // ── Column style constants ────────────────────────────────────────────────────
  const columnStyle = {
    borderRight: '1px solid #1E2740',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };
  const lastColumnStyle = { ...columnStyle, borderRight: 'none' };

  return (
    <>
      <ScopedStyles />
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '280px 280px 1fr',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {/* ── LEFT: Groups ── */}
        <div style={columnStyle}>
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid #1E2740',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            minHeight: 44,
            gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
                color: '#64748B', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
              }}>Groups</div>
              {!loadingGroups && (
                <span style={{
                  fontSize: 10, color: '#64748B', background: '#0A0F1E',
                  border: '1px solid #2D3748', borderRadius: 10, padding: '1px 8px', flexShrink: 0,
                }}>{groups.length}</span>
              )}
            </div>
            <AddBtnComp onClick={() => setModal({ type: 'addGroup' })}>+ Add</AddBtnComp>
          </div>
          <div style={{ padding: '7px 12px', borderBottom: '1px solid #0D1220', flexShrink: 0 }}>
            <input
              className="tm-filter-input"
              placeholder="Filter groups…"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              style={{
                width: '100%', background: '#0A0F1E', border: '1px solid #1E2740',
                borderRadius: 4, color: '#CBD5E1', fontFamily: "'Space Mono', monospace",
                fontSize: 11, padding: '5px 10px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div className="tm-col-body" style={{ flex: 1, overflowY: 'auto' }}>
            {loadingGroups ? (
              <SkeletonRows count={5} />
            ) : filteredGroups.length === 0 ? (
              <div style={{ padding: '40px 18px', textAlign: 'center', color: '#4A5568', fontSize: 11, lineHeight: 1.8 }}>
                {groupFilter.trim() ? 'No matches.' : 'No groups yet.\nClick + Add to create one.'}
              </div>
            ) : (
              filteredGroups.map((g) => {
                const isActive = selectedGroupId === g.id;
                const isHovered = hoveredRowId === `g-${g.id}`;
                return (
                  <ListRowComp
                    key={g.id}
                    active={isActive}
                    hovered={isHovered}
                    onClick={() => setSelectedGroupId(g.id)}
                    onMouseEnter={() => setHoveredRowId(`g-${g.id}`)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 600,
                        color: isActive ? '#E8EAF0' : '#94A3B8',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        display: 'flex', alignItems: 'center', gap: 7,
                      }}>
                        {g.display_name}
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                          padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                          ...(g.l1_id === 'brasil' ? {
                            background: 'rgba(197,160,89,0.12)',
                            border: `1px solid rgba(197,160,89,0.28)`,
                            color: CLUBE_COLORS.goldMuted,
                          } : {
                            background: 'rgba(0,188,212,0.08)',
                            border: '1px solid rgba(0,188,212,0.2)',
                            color: '#26C6DA',
                          }),
                        }}>
                          {g.l1_id === 'brasil' ? 'BR' : 'GL'}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: '#4A5568', marginTop: 2 }}>
                        {g.subgroup_count} subgroup{g.subgroup_count !== 1 ? 's' : ''} · {g.slug}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex', gap: 3, opacity: isHovered ? 1 : 0,
                      flexShrink: 0, transition: 'opacity 0.15s',
                    }}>
                      <IconBtnComp
                        title="Edit group"
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'editGroup', payload: g }); }}
                      ><IconEdit /></IconBtnComp>
                      <IconBtnComp
                        danger
                        title="Delete group"
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'deleteGroup', payload: g }); }}
                      ><IconTrash /></IconBtnComp>
                    </div>
                    <div style={{
                      color: isHovered ? 'rgba(0,188,212,0.45)' : '#2D3748',
                      flexShrink: 0, display: 'flex', alignItems: 'center', transition: 'color 0.12s',
                    }}><IconChevron /></div>
                  </ListRowComp>
                );
              })
            )}
          </div>
        </div>

        {/* ── CENTER: Subgroups ── */}
        <div style={columnStyle}>
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid #1E2740',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            minHeight: 44,
            gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
                color: '#64748B', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
              }}>Subgroups</div>
              {selectedGroup && (
                <span style={{
                  fontSize: 10, color: '#4A5568', whiteSpace: 'nowrap', overflow: 'hidden',
                  textOverflow: 'ellipsis', maxWidth: 130, flexShrink: 1,
                }} title={selectedGroup.display_name}>
                  <span style={{ marginRight: 5, color: '#2D3748' }}>/</span>
                  {selectedGroup.display_name}
                </span>
              )}
              {selectedGroup && !loadingSubgroups && (
                <span style={{
                  fontSize: 10, color: '#64748B', background: '#0A0F1E',
                  border: '1px solid #2D3748', borderRadius: 10, padding: '1px 8px', flexShrink: 0,
                }}>{subgroups.length}</span>
              )}
            </div>
            {selectedGroup && (
              <AddBtnComp onClick={() => setModal({ type: 'addSubgroup' })}>+ Add</AddBtnComp>
            )}
          </div>
          {selectedGroup && (
            <div style={{ padding: '7px 12px', borderBottom: '1px solid #0D1220', flexShrink: 0 }}>
              <input
                className="tm-filter-input"
                placeholder="Filter subgroups…"
                value={subgroupFilter}
                onChange={(e) => setSubgroupFilter(e.target.value)}
                style={{
                  width: '100%', background: '#0A0F1E', border: '1px solid #1E2740',
                  borderRadius: 4, color: '#CBD5E1', fontFamily: "'Space Mono', monospace",
                  fontSize: 11, padding: '5px 10px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          )}
          <div className="tm-col-body" style={{ flex: 1, overflowY: 'auto' }}>
            {!selectedGroup ? (
              <div style={{ padding: '40px 18px', textAlign: 'center', color: '#4A5568', fontSize: 11, lineHeight: 1.8 }}>
                ← Select a group<br />to view subgroups
              </div>
            ) : loadingSubgroups ? (
              <SkeletonRows count={4} />
            ) : filteredSubgroups.length === 0 ? (
              <div style={{ padding: '40px 18px', textAlign: 'center', color: '#4A5568', fontSize: 11, lineHeight: 1.8 }}>
                {subgroupFilter.trim()
                  ? 'No matches.'
                  : `No subgroups in\n${selectedGroup.display_name}.\nClick + Add.`}
              </div>
            ) : (
              filteredSubgroups.map((s) => {
                const isActive = selectedSubgroupId === s.id;
                const isHovered = hoveredRowId === `s-${s.id}`;
                return (
                  <ListRowComp
                    key={s.id}
                    active={isActive}
                    hovered={isHovered}
                    onClick={() => setSelectedSubgroupId(s.id)}
                    onMouseEnter={() => setHoveredRowId(`s-${s.id}`)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 600,
                        color: isActive ? '#E8EAF0' : '#94A3B8',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        display: 'flex', alignItems: 'center', gap: 7,
                      }}>{s.display_name}</div>
                      <div style={{ fontSize: 10, color: '#4A5568', marginTop: 2 }}>
                        {s.asset_count} asset{s.asset_count !== 1 ? 's' : ''} · {s.slug}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex', gap: 3, opacity: isHovered ? 1 : 0,
                      flexShrink: 0, transition: 'opacity 0.15s',
                    }}>
                      <IconBtnComp
                        title="Edit subgroup"
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'editSubgroup', payload: s }); }}
                      ><IconEdit /></IconBtnComp>
                      <IconBtnComp
                        danger
                        title="Delete subgroup"
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'deleteSubgroup', payload: s }); }}
                      ><IconTrash /></IconBtnComp>
                    </div>
                    <div style={{
                      color: isHovered ? 'rgba(0,188,212,0.45)' : '#2D3748',
                      flexShrink: 0, display: 'flex', alignItems: 'center', transition: 'color 0.12s',
                    }}><IconChevron /></div>
                  </ListRowComp>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: Assets ── */}
        <div style={lastColumnStyle}>
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid #1E2740',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            minHeight: 44,
            gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
                color: '#64748B', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
              }}>Assets</div>
              {selectedSubgroup && (
                <span style={{
                  fontSize: 10, color: '#4A5568', whiteSpace: 'nowrap', overflow: 'hidden',
                  textOverflow: 'ellipsis', maxWidth: 130, flexShrink: 1,
                }} title={selectedSubgroup.display_name}>
                  <span style={{ marginRight: 5, color: '#2D3748' }}>/</span>
                  {selectedSubgroup.display_name}
                </span>
              )}
              {selectedSubgroup && !loadingAssets && (
                <span style={{
                  fontSize: 10, color: '#64748B', background: '#0A0F1E',
                  border: '1px solid #2D3748', borderRadius: 10, padding: '1px 8px', flexShrink: 0,
                }}>{assets.length}</span>
              )}
            </div>
            {selectedSubgroup && (
              <AddBtnComp onClick={() => setModal({ type: 'addAsset' })}>+ Add</AddBtnComp>
            )}
          </div>
          <div className="tm-col-body" style={{ flex: 1, overflowY: 'auto' }}>
            {!selectedSubgroup ? (
              <div style={{ padding: '40px 18px', textAlign: 'center', color: '#4A5568', fontSize: 11, lineHeight: 1.8 }}>
                ← Select a subgroup<br />to view assets
              </div>
            ) : loadingAssets ? (
              <SkeletonRows count={6} />
            ) : assets.length === 0 ? (
              <div style={{ padding: '40px 18px', textAlign: 'center', color: '#4A5568', fontSize: 11, lineHeight: 1.8 }}>
                No assets in<br />{selectedSubgroup.display_name}.<br />Click + Add.
              </div>
            ) : (
              assets.map((a) => {
                const isHovered = hoveredRowId === `a-${a.id}`;
                return (
                  <ListRowComp
                    key={a.id}
                    hovered={isHovered}
                    onClick={() => setModal({ type: 'editAsset', payload: a })}
                    onMouseEnter={() => setHoveredRowId(`a-${a.id}`)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: 'var(--c-accent)',
                      fontFamily: "'Space Mono', monospace", minWidth: 66, flexShrink: 0,
                    }}>{a.symbol}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 600,
                        color: '#94A3B8',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        display: 'flex', alignItems: 'center', gap: 7,
                      }}>{a.name}</div>
                      <div style={{ fontSize: 10, color: '#4A5568', marginTop: 2 }}>
                        {[a.exchange, a.currency].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <AssetTypeBadge type={a.type} />
                    <div style={{
                      display: 'flex', gap: 3, opacity: isHovered ? 1 : 0,
                      flexShrink: 0, transition: 'opacity 0.15s',
                    }}>
                      <IconBtnComp
                        title="Edit asset"
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'editAsset', payload: a }); }}
                      ><IconEdit /></IconBtnComp>
                    </div>
                  </ListRowComp>
                );
              })
            )}
          </div>
        </div>
      </div>

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
      <div style={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 2000,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {toasts.map((t) => (
          <div key={t.id} className="tm-toast-item" style={{
            background: t.type === 'error' ? '#2D0A0A' : '#0A1F1A',
            border: `1px solid ${t.type === 'error' ? 'var(--c-error)' : '#00E676'}`,
            borderRadius: 6,
            color: t.type === 'error' ? 'var(--c-error)' : '#00E676',
            fontFamily: "'Space Mono', monospace",
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
