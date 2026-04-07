import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import GMTHeader from './GMTHeader.jsx';
import HamburgerMenu from './HamburgerMenu.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useTicker } from '../context/TickerContext.jsx';
import { useSelectedAsset } from '../context/SelectedAssetContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';

export default function TerminalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { tickerItems } = useTicker();
  const { setSelectedAsset } = useSelectedAsset();
  const { prefs, synced, updatePrefs } = usePreferences();

  const [menuOpen, setMenuOpen] = useState(false);

  const theme = prefs.theme || 'dark';
  const pathname = location.pathname;
  const terminalMode = pathname.startsWith('/app/brasil') ? 'brasil' : 'global';

  // Redirect /app to user's preferred terminal once prefs are loaded
  useEffect(() => {
    if (pathname === '/app' && synced && prefs.defaultTerminal) {
      navigate(`/app/${prefs.defaultTerminal}`, { replace: true });
    }
  }, [pathname, synced, prefs.defaultTerminal, navigate]);

  function handleAssetClick(item) {
    setSelectedAsset(item.ticker);
  }

  return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--c-bg-root)', color: 'var(--c-text)', display: 'flex', flexDirection: 'column' }}>
      <HamburgerMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        currentPath={pathname}
        onNavigate={(path) => { navigate(path); setMenuOpen(false); }}
        user={user}
        onLogout={() => { logout(); navigate('/'); }}
        theme={theme}
        onThemeToggle={() => updatePrefs({ theme: theme === 'dark' ? 'light' : 'dark' })}
        terminalMode={terminalMode}
      />
      <GMTHeader
        activePage="terminal"
        user={user}
        onMenuOpen={() => setMenuOpen(true)}
        onNav={(key) => {
          if (key.startsWith('/')) { navigate(key); return; }
          const pathMap = {
            dashboard: `/app/${terminalMode}`,
            heatmap:   '/app/heatmap',
            catalog:   '/app/catalog',
            news:      '/app/news',
            watchlist: '/app/watchlist',
            alerts:    '/app/alerts',
          };
          navigate(pathMap[key] || `/app/${terminalMode}`);
        }}
        onLogout={() => { logout(); navigate('/'); }}
        watchlistEnabled={!!user}
        tickerItems={tickerItems}
        onAssetClick={handleAssetClick}
      />
      <Outlet />
    </div>
  );
}
