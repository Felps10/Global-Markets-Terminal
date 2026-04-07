import { useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import TaxonomyManager from '../components/admin/TaxonomyManager.jsx';
import UserManager     from '../components/admin/UserManager.jsx';

const GlobalStyle = createGlobalStyle`* { box-sizing: border-box; }`;

// ── Layout ─────────────────────────────────────────────────────────────────────
const Page = styled.div`
  min-height: 100vh;
  background: #080C18;
  color: #E8EAF0;
  font-family: 'Space Mono', 'Courier New', monospace;
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  background: #0D1220;
  border-bottom: 1px solid #1E2740;
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 14px;
  flex-shrink: 0;
`;

const Logo = styled.div`
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #E8EAF0;
  text-transform: uppercase;
  flex-shrink: 0;
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
  flex-shrink: 0;
`;

const Divider = styled.div`
  width: 1px;
  height: 20px;
  background: #1E2740;
  flex-shrink: 0;
`;

const TabGroup = styled.nav`
  display: flex;
  align-items: center;
  height: 100%;
  gap: 2px;
`;

const Tab = styled.button`
  background: transparent;
  border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? 'var(--c-accent)' : 'transparent')};
  color: ${(p) => (p.$active ? '#E2E8F0' : '#64748B')};
  cursor: pointer;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  padding: 0 14px;
  height: 100%;
  text-transform: uppercase;
  transition: color 0.15s, border-color 0.15s;
  &:hover { color: #CBD5E1; }
  &:focus-visible { outline: 2px solid var(--c-accent); outline-offset: -2px; }
`;

const RightActions = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const UserEmail = styled.span`
  font-size: 11px;
  color: #64748B;
`;

const ActionBtn = styled.button`
  background: transparent;
  border: 1px solid #1E2740;
  border-radius: 4px;
  color: #64748B;
  cursor: pointer;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  padding: 5px 12px;
  min-height: 30px;
  text-transform: uppercase;
  transition: all 0.15s;
  &:hover { border-color: #4A5568; color: #CBD5E1; }
`;

const LogoutBtn = styled(ActionBtn)`
  &:hover { border-color: var(--c-error); color: var(--c-error); }
`;

const TabContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
`;

const TABS = [
  { id: 'taxonomy', label: 'Taxonomy' },
  { id: 'users',    label: 'Users'    },
];

// ── Component ──────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();
  const [activeTab, setActiveTab] = useState('taxonomy');

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <GlobalStyle />
      <Page>
        <Header>
          <Logo>GMT</Logo>
          <AdminBadge>Admin</AdminBadge>
          <Divider />
          <TabGroup role="tablist">
            {TABS.map((t) => (
              <Tab
                key={t.id}
                role="tab"
                aria-selected={activeTab === t.id}
                $active={activeTab === t.id}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </Tab>
            ))}
          </TabGroup>
          <RightActions>
            {user?.email && <UserEmail>{user.email}</UserEmail>}
            <ActionBtn onClick={() => navigate('/terminal')}>← Terminal</ActionBtn>
            <LogoutBtn onClick={handleLogout}>Logout</LogoutBtn>
          </RightActions>
        </Header>

        <TabContent role="tabpanel">
          {activeTab === 'taxonomy' && <TaxonomyManager />}
          {activeTab === 'users'    && <UserManager />}
        </TabContent>
      </Page>
    </>
  );
}
