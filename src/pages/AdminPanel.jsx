import { useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import GMTHeader from '../components/GMTHeader.jsx';
import TaxonomyManager from '../components/admin/TaxonomyManager.jsx';
import UserManager from '../components/admin/UserManager.jsx';

// ── Global reset ───────────────────────────────────────────────────────────────
const GlobalStyle = createGlobalStyle`* { box-sizing: border-box; }`;

// ── Styled components ──────────────────────────────────────────────────────────
const Page = styled.div`
  min-height: 100vh;
  background: #080C18;
  color: #E8EAF0;
  font-family: 'Space Mono', 'Courier New', monospace;
  display: flex;
  flex-direction: column;
`;

const TabContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
`;

// ── Component ──────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate                = useNavigate();
  const [activeTab, setActiveTab] = useState('taxonomy');

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <GlobalStyle />
      <Page>
        {/* ── Header: top bar (identical to terminal) + admin nav bar (no ticker) ── */}
        <GMTHeader
          user={user}
          onNav={navigate}
          onLogout={handleLogout}
          adminNav={{ activeTab, onTabChange: setActiveTab }}
        />

        {/* ── Tab content ── */}
        <TabContent role="tabpanel">
          {activeTab === 'taxonomy' && <TaxonomyManager />}
          {activeTab === 'users' && (
            <UserManager
              currentUserId={user?.id}
            />
          )}
        </TabContent>
      </Page>
    </>
  );
}
