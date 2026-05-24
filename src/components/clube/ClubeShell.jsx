import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { CLUBE_COLORS, CLUBE_FONTS } from '../../clube/styles/index.js';

const C    = CLUBE_COLORS;
const MONO = CLUBE_FONTS.mono;

const ROLE_META = {
  admin:        { label: 'ADMIN',   color: C.accent,              bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)'  },
  club_manager: { label: 'GESTOR',  color: C.accent,              bg: 'rgba(249,195,0,0.10)',  border: 'rgba(249,195,0,0.3)'   },
  club_member:  { label: 'COTISTA', color: 'rgba(0,230,118,0.9)', bg: 'rgba(0,230,118,0.08)', border: 'rgba(0,230,118,0.25)'  },
};

function fmtNavDate(isoDate) {
  if (!isoDate) return null;
  const today     = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (isoDate >= today)     return { label: 'NAV · hoje',  color: C.green };
  if (isoDate >= yesterday) return { label: 'NAV · ontem', color: C.amber };
  const [, m, d] = isoDate.split('-');
  return { label: `NAV · ${d}/${m}`, color: C.textDim };
}

export default function ClubeShell({
  activePage, clubeId, clubeNome, clubeStatus, patrimonio, valorCota, cotasEmitidas,
  pendingCount, activeTabLabel, lastNavDate, headerLeft, headerRight, children,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const role      = user?.role ?? 'user';
  const isManager = role === 'club_manager' || role === 'admin';

  const [opsOpen, setOpsOpen] = useState(false);

  const roleMeta    = ROLE_META[role] ?? null;
  const navDateInfo = (isManager && lastNavDate) ? fmtNavDate(lastNavDate) : null;
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : '');

  const base = `/clube/${clubeId}`;
  const path = location.pathname;

  // ── Active detection ────────────────────────────────────────────────────────

  function isActive(route) {
    if (route === base) return path === base || path === base + '/';
    return path.startsWith(route);
  }

  const opsRoutes = [`${base}/fila`, `${base}/membros`, `${base}/nav`, `${base}/simulador`];
  const opsActive = opsRoutes.some(r => isActive(r));

  // ── Nav items ───────────────────────────────────────────────────────────────

  const flatItems = [
    { label: 'Painel',      route: base },
    { label: 'Carteira',    route: `${base}/carteira` },
    { label: 'Relatórios',  route: `${base}/report` },
    { label: 'Calendário',  route: `${base}/calendario` },
  ];

  const opsItems = [
    { label: 'Fila de Operações', route: `${base}/fila` },
    { label: 'Membros',           route: `${base}/membros` },
    { label: 'NAV',               route: `${base}/nav` },
    { label: 'Simulador',         route: `${base}/simulador` },
  ];

  // ── Shared nav button style ─────────────────────────────────────────────────

  function navBtnStyle(active) {
    return {
      fontFamily: MONO,
      fontSize: 11,
      letterSpacing: '0.06em',
      padding: '0 12px',
      height: 36,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      cursor: 'pointer',
      background: 'transparent',
      border: 'none',
      borderBottom: `2px solid ${active ? C.accent : 'transparent'}`,
      color: active ? C.textPrimary : C.textDim,
      whiteSpace: 'nowrap',
      transition: 'color 0.12s, border-color 0.12s',
    };
  }

  return (
    <div data-theme="dark" data-context="brazil" style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
      background: C.bg, fontFamily: MONO,
    }}>

      {/* ── ROW 1 — Identity strip ── */}
      <div style={{
        flexShrink: 0, height: 48,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: C.bgHead,
        borderBottom: `1px solid ${C.borderSubtle}`,
        zIndex: 30, gap: 16,
      }}>

        {/* LEFT: back link + separator + club name + status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span
            onClick={() => navigate('/app')}
            style={{
              fontSize: 10, color: C.textDim, letterSpacing: '0.06em',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = C.textPrimary; }}
            onMouseLeave={e => { e.currentTarget.style.color = C.textDim; }}
          >
            ← Terminal
          </span>

          <span style={{ color: C.textFaint, fontSize: 11, flexShrink: 0 }}>·</span>

          <span style={{
            fontSize: 12, fontWeight: 600, color: C.textPrimary,
            letterSpacing: '0.06em', whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220,
          }}>
            {clubeNome ?? '—'}
          </span>

          {clubeStatus && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 9, letterSpacing: '0.1em', flexShrink: 0,
              color: clubeStatus === 'ativo' ? C.green : C.amber,
              background: clubeStatus === 'ativo' ? 'rgba(0,230,118,0.08)' : 'rgba(251,191,36,0.08)',
              border: `1px solid ${clubeStatus === 'ativo' ? 'rgba(0,230,118,0.25)' : 'rgba(251,191,36,0.25)'}`,
              borderRadius: 3, padding: '2px 7px',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: clubeStatus === 'ativo' ? C.green : C.amber }} />
              {clubeStatus.toUpperCase()}
            </div>
          )}
        </div>

        {/* RIGHT: NAV date pill + display name + role badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
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

          {displayName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 11, color: C.textMain, letterSpacing: '0.04em',
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
        </div>
      </div>

      {/* ── ROW 2 — Nav bar ── */}
      <div style={{
        flexShrink: 0, height: 36,
        display: 'flex', alignItems: 'flex-end',
        padding: '0 20px',
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
        zIndex: 20,
      }}>

        {/* Flat items: Painel, Carteira, Relatórios, Calendário */}
        {flatItems.map(item => (
          <button
            key={item.label}
            onClick={() => navigate(item.route)}
            style={navBtnStyle(isActive(item.route))}
            onMouseEnter={e => { if (!isActive(item.route)) e.currentTarget.style.color = C.textMain; }}
            onMouseLeave={e => { if (!isActive(item.route)) e.currentTarget.style.color = C.textDim; }}
          >
            {item.label}
          </button>
        ))}

        {/* Performance — disabled */}
        <span style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: '0.06em',
          padding: '0 12px',
          height: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'not-allowed',
          color: C.textFaint,
          borderBottom: '2px solid transparent',
        }}>
          Performance
          <span style={{
            fontSize: 8,
            border: `1px solid ${C.textFaint}`,
            color: C.textFaint,
            borderRadius: 3,
            padding: '1px 4px',
            lineHeight: '12px',
          }}>
            em breve
          </span>
        </span>

        {/* Divider */}
        <div style={{
          width: 1, height: 14,
          background: C.border,
          margin: '0 6px',
          alignSelf: 'center',
          flexShrink: 0,
        }} />

        {/* Operações dropdown */}
        <div
          style={{ position: 'relative', height: 36, display: 'flex', alignItems: 'flex-end' }}
          onMouseEnter={() => setOpsOpen(true)}
          onMouseLeave={() => setOpsOpen(false)}
        >
          <button
            style={{
              ...navBtnStyle(opsActive),
              color: opsActive ? C.amber : C.textDim,
              borderBottomColor: opsActive ? C.amber : 'transparent',
            }}
            onMouseEnter={e => { if (!opsActive) e.currentTarget.style.color = C.textMain; }}
            onMouseLeave={e => { if (!opsActive) e.currentTarget.style.color = opsActive ? C.amber : C.textDim; }}
          >
            Operações ▾
          </button>

          {opsOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              minWidth: 180,
              background: C.bgHead,
              border: `1px solid ${C.border}`,
              borderRadius: '0 0 4px 4px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              zIndex: 50,
              padding: '4px 0',
            }}>
              {opsItems.map(item => (
                <div
                  key={item.label}
                  onClick={() => { navigate(item.route); setOpsOpen(false); }}
                  style={{
                    padding: '9px 14px',
                    fontSize: 11,
                    fontFamily: MONO,
                    letterSpacing: '0.04em',
                    color: isActive(item.route) ? C.textPrimary : C.textMain,
                    cursor: 'pointer',
                    background: isActive(item.route) ? C.accentFaint : 'transparent',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.textPrimary; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => {
                    const a = isActive(item.route);
                    e.currentTarget.style.color = a ? C.textPrimary : C.textMain;
                    e.currentTarget.style.background = a ? C.accentFaint : 'transparent';
                  }}
                >
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{
          width: 1, height: 14,
          background: C.border,
          margin: '0 6px',
          alignSelf: 'center',
          flexShrink: 0,
        }} />

        {/* Compliance */}
        <button
          onClick={() => navigate(`${base}/compliance`)}
          style={navBtnStyle(isActive(`${base}/compliance`))}
          onMouseEnter={e => { if (!isActive(`${base}/compliance`)) e.currentTarget.style.color = C.textMain; }}
          onMouseLeave={e => { if (!isActive(`${base}/compliance`)) e.currentTarget.style.color = C.textDim; }}
        >
          Compliance
        </button>
      </div>

      {/* ── CONTENT AREA — full width ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
