import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { ROUTES } from '../lib/routes.js';
import TaxonomyManager from '../components/admin/TaxonomyManager.jsx';
import UserManager     from '../components/admin/UserManager.jsx';

const TABS = [
  { id: 'taxonomy', label: 'Taxonomy' },
  { id: 'users',    label: 'Users'    },
];

// ── Component ──────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();
  const [activeTab, setActiveTab] = useState('taxonomy');

  // Hover states for interactive elements
  const [hoveredTab, setHoveredTab] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  function handleLogout() {
    logout();
    navigate(ROUTES.auth.login, { replace: true });
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#080C18', color: '#E8EAF0',
      fontFamily: "'Space Mono', 'Courier New', monospace",
      display: 'flex', flexDirection: 'column',
    }}>
      <header style={{
        background: '#0D1220', borderBottom: '1px solid #1E2740', height: 48,
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, flexShrink: 0,
      }}>
        <div style={{
          fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, fontWeight: 800,
          letterSpacing: '0.1em', color: '#E8EAF0', textTransform: 'uppercase', flexShrink: 0,
        }}>GMT</div>
        <span style={{
          background: 'rgba(0, 188, 212, 0.12)', border: '1px solid rgba(0, 188, 212, 0.3)',
          borderRadius: 3, color: 'var(--c-accent)', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.2em', padding: '2px 7px', textTransform: 'uppercase', flexShrink: 0,
        }}>Admin</span>
        <div style={{ width: 1, height: 20, background: '#1E2740', flexShrink: 0 }} />
        <nav role="tablist" style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 2 }}>
          {TABS.map((t) => {
            const isActive = activeTab === t.id;
            const isHovered = hoveredTab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(t.id)}
                onMouseEnter={() => setHoveredTab(t.id)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  background: 'transparent', border: 'none',
                  borderBottom: `2px solid ${isActive ? 'var(--c-accent)' : 'transparent'}`,
                  color: isActive ? '#E2E8F0' : isHovered ? '#CBD5E1' : '#64748B',
                  cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
                  padding: '0 14px', height: '100%', textTransform: 'uppercase',
                  transition: 'color 0.15s, border-color 0.15s',
                  outline: 'none',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {user?.email && (
            <span style={{ fontSize: 11, color: '#64748B' }}>{user.email}</span>
          )}
          <button
            onClick={() => navigate('/terminal')}
            onMouseEnter={() => setHoveredBtn('terminal')}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              background: 'transparent',
              border: `1px solid ${hoveredBtn === 'terminal' ? '#4A5568' : '#1E2740'}`,
              borderRadius: 4,
              color: hoveredBtn === 'terminal' ? '#CBD5E1' : '#64748B',
              cursor: 'pointer', fontFamily: "'Space Mono', monospace",
              fontSize: 10, letterSpacing: '0.08em', padding: '5px 12px',
              minHeight: 30, textTransform: 'uppercase', transition: 'all 0.15s',
            }}
          >← Terminal</button>
          <button
            onClick={handleLogout}
            onMouseEnter={() => setHoveredBtn('logout')}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              background: 'transparent',
              border: `1px solid ${hoveredBtn === 'logout' ? 'var(--c-error)' : '#1E2740'}`,
              borderRadius: 4,
              color: hoveredBtn === 'logout' ? 'var(--c-error)' : '#64748B',
              cursor: 'pointer', fontFamily: "'Space Mono', monospace",
              fontSize: 10, letterSpacing: '0.08em', padding: '5px 12px',
              minHeight: 30, textTransform: 'uppercase', transition: 'all 0.15s',
            }}
          >Logout</button>
        </div>
      </header>

      <div role="tabpanel" style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0,
      }}>
        {activeTab === 'taxonomy' && <TaxonomyManager />}
        {activeTab === 'users'    && <UserManager />}
      </div>
    </div>
  );
}
