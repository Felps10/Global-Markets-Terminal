/**
 * MarketsPageLayout.jsx — Shared layout wrapper for all /markets/* pages
 *
 * Provides:
 *   - Full GMTHeader (logo, market pill, clock, user, nav bar with Markets active)
 *   - Module subtitle bar (32px) showing current module name + optional right controls
 *   - Flex container for page content (fills remaining viewport height)
 *
 * Usage:
 *   <MarketsPageLayout moduleTitle="Chart & Research" moduleIcon="📊" rightControls={<SearchBar />}>
 *     <MyPageContent />
 *   </MarketsPageLayout>
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useWatchlist } from '../context/WatchlistContext.jsx';
import GMTHeader from './GMTHeader.jsx';

export default function MarketsPageLayout({ moduleTitle, moduleIcon, rightControls, children }) {
  const { user, logout } = useAuth();
  const { items: watchlistItems } = useWatchlist();
  const navigate = useNavigate();

  const handleNav = (pageKey) => {
    if (pageKey === 'watchlist') { navigate('/app/watchlist'); return; }
    if (pageKey.startsWith('/')) { navigate(pageKey); return; }
    navigate('/app');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#080f1a' }}>
      <GMTHeader
        activePage="markets"
        user={user}
        onNav={handleNav}
        onLogout={() => { logout(); navigate('/'); }}
        watchlistEnabled={watchlistItems.length > 0}
        showTicker={false}
        tickerItems={[]}
      />

      {/* Module subtitle bar */}
      <div style={{
        height: 32,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(10,17,30,0.4)',
        borderBottom: '1px solid rgba(30,41,59,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {moduleIcon && <span style={{ fontSize: 12 }}>{moduleIcon}</span>}
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: '#94a3b8',
            textTransform: 'uppercase',
          }}>
            {moduleTitle}
          </span>
        </div>
        {rightControls && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {rightControls}
          </div>
        )}
      </div>

      {/* Page content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}
