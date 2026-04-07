import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

const BG_PAGE  = '#080f1a';
const BG_HEAD  = '#0a1628';
const BG_CARD  = '#0d1824';
const BORDER   = 'rgba(30,41,59,0.8)';
const BORDER2  = 'rgba(51,65,85,0.5)';
const TXT_1    = '#e2e8f0';
const TXT_2    = '#94a3b8';
const TXT_3    = '#475569';
const TXT_4    = '#334155';
const ACCENT   = 'var(--c-accent)';
const GREEN    = '#00E676';
const RED      = 'var(--c-error)';
const AMBER    = '#fbbf24';
const GOLD     = '#F9C300';
const MONO     = "'JetBrains Mono', monospace";

const ROLE_META = {
  admin:        { label: 'ADMIN',   color: 'var(--c-accent)',       bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)'  },
  club_manager: { label: 'GESTOR',  color: '#F9C300',               bg: 'rgba(249,195,0,0.10)',  border: 'rgba(249,195,0,0.3)'   },
  club_member:  { label: 'COTISTA', color: 'rgba(0,230,118,0.9)',   bg: 'rgba(0,230,118,0.08)', border: 'rgba(0,230,118,0.25)'  },
};

const ICON_PAINEL = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <rect x="1" y="1" width="12" height="12" rx="2"/>
    <line x1="4" y1="5" x2="10" y2="5"/>
    <line x1="4" y1="8" x2="8" y2="8"/>
  </svg>
);
const ICON_MEMBROS = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <circle cx="7" cy="5" r="2.5"/>
    <path d="M2 12c0-2.2 2.2-4 5-4s5 1.8 5 4"/>
  </svg>
);
const ICON_SIMULADOR = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M2 10 L5 6 L8 8 L11 4"/>
    <circle cx="11" cy="4" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);
const ICON_RELATORIO = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M3 2h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
    <line x1="4" y1="5.5" x2="10" y2="5.5"/>
    <line x1="4" y1="8" x2="7" y2="8"/>
  </svg>
);
const ICON_GOVERNANCA = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M7 1L2 4v3c0 3.3 2.2 5.8 5 6.3C9.8 12.8 12 10.3 12 7V4L7 1z"/>
  </svg>
);
const ICON_TRIBUTACAO = (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
    <path d="M3 2h8l-2 5H5L3 2z"/>
    <path d="M5 7l-2 5h8l-2-5"/>
    <line x1="7" y1="2" x2="7" y2="12"/>
  </svg>
);
const ICON_PERFORMANCE = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M1 11 L4 7 L7 9 L13 3"/>
    <path d="M10 3h3v3"/>
  </svg>
);
const ICON_NAV = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <rect x="2" y="3" width="10" height="8" rx="1"/>
    <line x1="5" y1="6" x2="9" y2="6"/>
    <line x1="5" y1="8.5" x2="9" y2="8.5"/>
  </svg>
);
const ICON_COMPLIANCE = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M7 1L2 4v3c0 3.3 2.2 5.8 5 6.3C9.8 12.8 12 10.3 12 7V4L7 1z"/>
    <path d="M5 7l2 2 3-3"/>
  </svg>
);
const ICON_DOCUMENTOS = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M3 1h5l3 3v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
    <path d="M8 1v3h3"/>
  </svg>
);
const ICON_CALENDARIO = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <rect x="1" y="3" width="12" height="10" rx="1.5"/>
    <line x1="4" y1="1" x2="4" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/>
    <line x1="1" y1="6.5" x2="13" y2="6.5"/>
    <line x1="5" y1="6.5" x2="5" y2="13"/><line x1="9" y1="6.5" x2="9" y2="13"/>
    <line x1="1" y1="9.5" x2="13" y2="9.5"/>
  </svg>
);

function buildNavItems(clubeId, isManager) {
  const base = `/clube/${clubeId}`;

  const memberItems = [
    { id: 'painel',      label: 'Meu Clube',   path: base,                    section: 'clube', icon: ICON_PAINEL,      soon: false },
    { id: 'performance', label: 'Performance', path: null,                    section: 'clube', icon: ICON_PERFORMANCE, soon: true  },
    { id: 'calendario',  label: 'Calendário',  path: `${base}/calendario`,    section: 'clube', icon: ICON_CALENDARIO,  soon: false },
    { id: 'relatorio',   label: 'Relatórios',  path: `${base}/report`,        section: 'clube', icon: ICON_RELATORIO,   soon: false },
    { id: 'governanca',  label: 'Governança',  path: `${base}/governanca`,    section: 'clube', icon: ICON_GOVERNANCA,  soon: false },
    { id: 'simulador',   label: 'Simulador',   path: `${base}/simulador`,     section: 'clube', icon: ICON_SIMULADOR,   soon: false },
  ];

  const managerItems = [
    { id: 'membros',    label: 'Membros',    path: `${base}/membros`,           section: 'gestao', icon: ICON_MEMBROS,    soon: false },
    { id: 'nav',        label: 'NAV',        path: `${base}/nav`,               section: 'gestao', icon: ICON_NAV,        soon: false },
    { id: 'compliance', label: 'Compliance', path: `${base}/reenquadramento`,   section: 'gestao', icon: ICON_COMPLIANCE, soon: false },
    { id: 'documentos', label: 'Documentos', path: null,                        section: 'gestao', icon: ICON_DOCUMENTOS, soon: true  },
  ];

  return isManager ? [...memberItems, ...managerItems] : memberItems;
}

function fmtNavDate(isoDate) {
  if (!isoDate) return null;
  const today     = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (isoDate >= today)     return { label: 'NAV · hoje',  color: GREEN };
  if (isoDate >= yesterday) return { label: 'NAV · ontem', color: AMBER };
  const [, m, d] = isoDate.split('-');
  return { label: `NAV · ${d}/${m}`, color: TXT_3 };
}

export default function ClubeShell({
  activePage, clubeId, clubeNome, clubeStatus, patrimonio, valorCota, cotasEmitidas,
  pendingCount, activeTabLabel, lastNavDate, headerLeft, headerRight, children,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role      = user?.role ?? 'user';
  const isManager = role === 'club_manager' || role === 'admin';
  const navItems  = buildNavItems(clubeId, isManager);

  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('gmt_clube_nav_open');
      return saved === null ? true : saved === 'true';
    } catch { return true; }
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem('gmt_clube_nav_open', String(next)); } catch {}
  };

  const roleMeta    = ROLE_META[role] ?? null;
  const navDateInfo = (isManager && lastNavDate) ? fmtNavDate(lastNavDate) : null;
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : '');

  return (
    <div data-theme="dark" data-context="brazil" style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
      background: BG_PAGE, fontFamily: MONO,
    }}>

      {/* ── FULL-WIDTH HEADER ── */}
      <div style={{
        flexShrink: 0, height: 56,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: BG_HEAD,
        borderBottom: `1px solid ${BORDER}`,
        zIndex: 30, gap: 16,
      }}>

        {/* LEFT: hamburger + club name + current tab */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {/* Hamburger toggle */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={toggle}
              title={open ? 'Recolher navegação' : 'Expandir navegação'}
              style={{
                width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent',
                border: `1px solid ${BORDER2}`,
                borderRadius: 4, cursor: 'pointer', color: TXT_3,
                fontFamily: MONO,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="2" y1="4" x2="12" y2="4"/>
                <line x1="2" y1="7" x2="12" y2="7"/>
                <line x1="2" y1="10" x2="12" y2="10"/>
              </svg>
            </button>
            {pendingCount > 0 && (
              <div style={{
                position: 'absolute', top: -5, right: -5,
                width: 14, height: 14, borderRadius: '50%',
                background: RED, color: '#fff',
                fontSize: 8, fontWeight: 700, fontFamily: MONO,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                {pendingCount > 9 ? '9+' : pendingCount}
              </div>
            )}
          </div>

          {/* Club name + active tab */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            <span style={{
              fontSize: 12, fontWeight: 600, color: TXT_1,
              letterSpacing: '0.06em', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220,
            }}>
              {clubeNome ?? '—'}
            </span>
            {activeTabLabel && (
              <>
                <span style={{ color: TXT_4, fontSize: 11, flexShrink: 0 }}>·</span>
                <span style={{
                  fontSize: 11, color: TXT_2,
                  letterSpacing: '0.08em', whiteSpace: 'nowrap',
                }}>
                  {activeTabLabel}
                </span>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: NAV status + user identity + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>

          {/* Last NAV date pill — managers only */}
          {navDateInfo && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 8px', borderRadius: 3,
              background: `${navDateInfo.color}10`,
              border: `1px solid ${navDateInfo.color}28`,
              flexShrink: 0,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: navDateInfo.color, flexShrink: 0,
              }} />
              <span style={{
                fontSize: 9, color: navDateInfo.color,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                fontFamily: MONO,
              }}>
                {navDateInfo.label}
              </span>
            </div>
          )}

          {/* User identity: name + role badge */}
          {displayName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 11, color: TXT_2, letterSpacing: '0.04em',
                maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {displayName}
              </span>
              {roleMeta && (
                <span style={{
                  fontSize: 9, letterSpacing: '0.12em', fontWeight: 700,
                  padding: '2px 7px', borderRadius: 3, flexShrink: 0,
                  color: roleMeta.color,
                  background: roleMeta.bg,
                  border: `1px solid ${roleMeta.border}`,
                  fontFamily: MONO,
                }}>
                  {roleMeta.label}
                </span>
              )}
            </div>
          )}

          {/* Action buttons slot */}
          {headerRight && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {headerRight}
            </div>
          )}
        </div>
      </div>

      {/* ── BODY: sidebar + content ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minWidth: 0 }}>

        {/* ── SIDEBAR ── */}
        <div style={{
          flexShrink: 0,
          width: open ? 200 : 44,
          transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
          background: BG_HEAD,
          borderRight: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', zIndex: 20,
          position: 'relative',
        }}>

          {/* Dot nav — visible only when collapsed */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: 44,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 5, paddingTop: 14,
            opacity: open ? 0 : 1,
            pointerEvents: open ? 'none' : 'auto',
            transition: 'opacity 0.12s',
          }}>
            {navItems.map((item) => (
              <div
                key={item.id}
                onClick={() => !item.soon && item.path && navigate(item.path)}
                title={item.label}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: item.soon
                    ? 'rgba(71,85,105,0.2)'
                    : item.id === activePage ? ACCENT : 'rgba(71,85,105,0.55)',
                  cursor: item.soon ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
              />
            ))}
          </div>

          {/* Expanded panel */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
            opacity: open ? 1 : 0,
            transition: 'opacity 0.15s 0.05s',
            pointerEvents: open ? 'auto' : 'none',
            overflow: 'hidden',
          }}>
            {/* Club identity */}
            <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <div
                onClick={() => navigate('/app')}
                style={{
                  fontSize: 10, color: TXT_3, letterSpacing: '0.06em',
                  cursor: 'pointer', marginBottom: 10,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                ← Terminal
              </div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: TXT_1,
                letterSpacing: '0.06em', marginBottom: 5,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {clubeNome ?? '—'}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 9, letterSpacing: '0.1em',
                color: clubeStatus === 'ativo' ? GREEN : AMBER,
                background: clubeStatus === 'ativo' ? 'rgba(0,230,118,0.08)' : 'rgba(251,191,36,0.08)',
                border: `1px solid ${clubeStatus === 'ativo' ? 'rgba(0,230,118,0.25)' : 'rgba(251,191,36,0.25)'}`,
                borderRadius: 3, padding: '2px 7px',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: clubeStatus === 'ativo' ? GREEN : AMBER }} />
                {(clubeStatus ?? 'ativo').toUpperCase()}
              </div>
            </div>

            {/* Nav items */}
            <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
              {(isManager
                ? [{ id: 'clube', label: 'Clube' }, { id: 'gestao', label: 'Gestão' }]
                : [{ id: 'clube', label: 'Clube' }]
              ).map((section) => {
                const sectionItems = navItems.filter(i => i.section === section.id);
                return (
                  <div key={section.id}>
                    <div style={{
                      fontSize: 9, color: TXT_4, letterSpacing: '0.14em',
                      textTransform: 'uppercase', padding: '10px 14px 4px', whiteSpace: 'nowrap',
                    }}>
                      {section.label}
                    </div>
                    {sectionItems.map((item) => {
                      const isActive = item.id === activePage;
                      return (
                        <div
                          key={item.id}
                          onClick={() => !item.soon && item.path && navigate(item.path)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 9,
                            padding: '7px 14px',
                            fontSize: 11, letterSpacing: '0.08em',
                            color: item.soon ? TXT_4 : isActive ? TXT_1 : TXT_3,
                            background: isActive ? 'var(--c-accent-muted)' : 'transparent',
                            borderLeft: `2px solid ${isActive ? ACCENT : 'transparent'}`,
                            cursor: item.soon ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.1s, color 0.1s',
                          }}
                          onMouseEnter={e => { if (!item.soon && !isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                          onMouseLeave={e => { if (!item.soon && !isActive) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span style={{
                            width: 14, height: 14, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: isActive ? ACCENT : 'currentColor',
                            opacity: item.soon ? 0.4 : isActive ? 1 : 0.6,
                          }}>
                            {item.icon}
                          </span>
                          {item.label}
                          {item.id === 'painel' && pendingCount > 0 && (
                            <span style={{
                              marginLeft: 'auto', background: RED, color: '#fff',
                              fontSize: 9, fontWeight: 700, borderRadius: 8,
                              padding: '1px 5px', minWidth: 16, textAlign: 'center',
                            }}>
                              {pendingCount > 9 ? '9+' : pendingCount}
                            </span>
                          )}
                          {item.soon && (
                            <span style={{
                              marginLeft: 'auto', fontSize: 8,
                              border: `1px solid ${TXT_4}`, color: TXT_4,
                              borderRadius: 3, padding: '1px 4px',
                            }}>
                              BREVE
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </nav>

            {/* KPI footer */}
            {(patrimonio != null || valorCota != null) && (
              <div style={{ padding: '12px 14px', borderTop: `1px solid ${BORDER}`, flexShrink: 0, whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: 9, color: TXT_4, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                  Patrimônio
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: GOLD, letterSpacing: '0.04em' }}>
                  {patrimonio != null
                    ? patrimonio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : '—'}
                </div>
                {valorCota != null && cotasEmitidas != null && (
                  <div style={{ fontSize: 10, color: TXT_3, marginTop: 1 }}>
                    {Number(cotasEmitidas).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} cotas · {valorCota.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}/cota
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── CONTENT AREA ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
