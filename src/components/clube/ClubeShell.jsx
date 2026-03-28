import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BG_PAGE  = '#080f1a';
const BG_HEAD  = '#0a1628';
const BG_CARD  = '#0d1824';
const BORDER   = 'rgba(30,41,59,0.8)';
const BORDER2  = 'rgba(51,65,85,0.5)';
const TXT_1    = '#e2e8f0';
const TXT_2    = '#94a3b8';
const TXT_3    = '#475569';
const TXT_4    = '#334155';
const ACCENT   = '#3b82f6';
const GREEN    = '#00E676';
const RED      = '#FF5252';
const AMBER    = '#fbbf24';
const GOLD     = '#FFD700';
const MONO     = "'JetBrains Mono', monospace";

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

function buildNavItems(clubeId) {
  const base = clubeId ? `/clube/${clubeId}` : '/clube';
  return [
    { id: 'painel',     label: 'PAINEL',     path: base,                 section: 'operacoes',  icon: ICON_PAINEL,     soon: false },
    { id: 'membros',    label: 'MEMBROS',    path: `${base}/membros`,    section: 'operacoes',  icon: ICON_MEMBROS,    soon: false },
    { id: 'simulador',  label: 'SIMULADOR',  path: `${base}/simulador`,  section: 'operacoes',  icon: ICON_SIMULADOR,  soon: false },
    { id: 'relatorio',  label: 'RELATÓRIO',  path: `${base}/report`,     section: 'operacoes',  icon: ICON_RELATORIO,  soon: false },
    { id: 'governanca', label: 'GOVERNANÇA', path: `${base}/governanca`, section: 'governanca', icon: ICON_GOVERNANCA, soon: false },
    { id: 'tributacao', label: 'TRIBUTAÇÃO', path: `${base}/tributacao`, section: 'governanca', icon: ICON_TRIBUTACAO,  soon: false },
  ];
}

export default function ClubeShell({
  activePage, clubeId, clubeNome, clubeStatus, patrimonio, valorCota, cotasEmitidas,
  pendingCount, headerLeft, headerRight, children,
}) {
  const navigate = useNavigate();
  const navItems = buildNavItems(clubeId);

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

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: BG_PAGE, fontFamily: MONO }}>

      {/* ── SIDEBAR ── */}
      <div style={{
        flexShrink: 0,
        width: open ? 200 : 44,
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        background: BG_HEAD,
        borderRight: `1px solid ${BORDER}`,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', zIndex: 20,
      }}>
        {/* Toggle strip */}
        <div style={{ width: 44, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 10px', gap: 6 }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={toggle}
              title={open ? 'Recolher navegação' : 'Expandir navegação'}
              style={{
                width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent',
                border: `1px solid ${BORDER2}`,
                borderRadius: 4, cursor: 'pointer', color: TXT_3,
                fontFamily: MONO, fontSize: 14,
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

          {/* Dot nav — only when closed */}
          {!open && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
              {navItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => !item.soon && item.path && navigate(item.path)}
                  title={item.label}
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: item.soon ? 'rgba(71,85,105,0.2)' : item.id === activePage ? ACCENT : 'rgba(71,85,105,0.55)',
                    cursor: item.soon ? 'default' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                />
              ))}
            </div>
          )}
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
              style={{ fontSize: 10, color: TXT_3, letterSpacing: '0.06em', cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              ← Terminal
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: TXT_1, letterSpacing: '0.06em', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            {['operacoes', 'governanca'].map((section) => {
              const sectionItems = navItems.filter(i => i.section === section);
              const sectionLabel = section === 'operacoes' ? 'Operações' : 'Governança';
              return (
                <div key={section}>
                  <div style={{
                    fontSize: 9, color: TXT_4, letterSpacing: '0.14em',
                    textTransform: 'uppercase', padding: '10px 14px 4px', whiteSpace: 'nowrap',
                  }}>
                    {sectionLabel}
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
                          background: isActive ? 'rgba(59,130,246,0.08)' : 'transparent',
                          borderLeft: `2px solid ${isActive ? ACCENT : 'transparent'}`,
                          cursor: item.soon ? 'default' : 'pointer',
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
            <div style={{ padding: '10px 14px', borderTop: `1px solid ${BORDER}`, flexShrink: 0, whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: 9, color: TXT_4, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
                Patrimônio
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: GOLD, letterSpacing: '0.04em' }}>
                {patrimonio != null
                  ? patrimonio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : '—'}
              </div>
              {valorCota != null && cotasEmitidas != null && (
                <div style={{ fontSize: 9, color: TXT_3, marginTop: 1 }}>
                  {Number(cotasEmitidas).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} cotas · {valorCota.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}/cota
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Per-page header bar */}
        <div style={{
          height: 52, flexShrink: 0,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: BG_HEAD,
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {headerLeft}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {headerRight}
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
