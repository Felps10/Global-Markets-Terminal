import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GlobalMarketsTerminal from './GlobalMarketsTerminal';
import BrazilTerminal from './BrazilTerminal';
import CatalogPage from './CatalogPage';
import NewsPage from './NewsPage';
import MarketHeatmapPage from './MarketHeatmapPage';
import WatchlistPage from './WatchlistPage';
import LoginPage from './pages/LoginPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import TerminalLayout from './components/TerminalLayout.jsx';
import { TickerProvider } from './context/TickerContext.jsx';
import { SelectedAssetProvider } from './context/SelectedAssetContext.jsx';
import FundamentalLabPage from './pages/markets/FundamentalLabPage.jsx';
import MacroHubPage from './pages/markets/MacroHubPage.jsx';
import SignalEnginePage from './pages/markets/SignalEnginePage.jsx';
import ClubePage from './pages/ClubePage.jsx';
import ClubeReportPage from './pages/ClubeReportPage.jsx';
import ClubeMembroPage from './pages/ClubeMembroPage.jsx';
import ClubeSimuladorPage from './pages/ClubeSimuladorPage.jsx';
import ClubeGovernancaPage from './pages/ClubeGovernancaPage.jsx';
import ClubeGovernancaDetailPage from './pages/ClubeGovernancaDetailPage.jsx';
import ClubeReenquadramentoDetailPage from './pages/ClubeReenquadramentoDetailPage.jsx';
import ClubeTributacaoPage from './pages/ClubeTributacaoPage.jsx';
import ClubeListPage from './pages/ClubeListPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import ChartResearchPage from './pages/markets/ChartResearchPage.jsx';
import TerminalProLandingPage from './pages/TerminalProLandingPage.jsx';
import TerminalMiniPage from './pages/TerminalMiniPage.jsx';
import ClubeLandingPage from './pages/ClubeLandingPage.jsx';
import { useAuth } from './hooks/useAuth.js';
import AuthPanel from './components/AuthPanel.jsx';
import PublicLayout from './components/PublicLayout.jsx';
import FeaturesPage from './pages/FeaturesPage.jsx';
import CoveragePage from './pages/CoveragePage.jsx';
import PricingPage from './pages/PricingPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import CommunityPage from './pages/CommunityPage.jsx';

/**
 * ─── ROUTE SECURITY MODEL ─────────────────────────────────────────────────
 *
 * PUBLIC routes (no ProtectedRoute — accessible without login):
 *   /           LandingPage
 *   /terminal   TerminalProLandingPage
 *   /mini       TerminalMiniPage
 *   /login      LoginPage
 *   /register   RegisterPage
 *   /features   FeaturesPage
 *   /coverage   CoveragePage
 *   /pricing    PricingPage
 *   /about      AboutPage
 *   /community  CommunityPage
 *   /clube      ClubeLandingPage  (marketing page, not the app)
 *
 * PROTECTED routes — guard lives on the LAYOUT or the route itself.
 *
 *   /app/*         ProtectedRoute requiredRole={null}   any authenticated user
 *                  Guard is on the /app layout — all child routes inherit it.
 *                  To add a terminal sub-page: add a child <Route> inside
 *                  the /app layout block. No additional ProtectedRoute needed.
 *
 *   /markets/*     ProtectedRoute requiredRole={null}   any authenticated user
 *                  Guard is on each route individually (MarketsPageLayout uses
 *                  children props, not <Outlet />, so nesting is not possible).
 *                  To add a markets sub-page: copy the pattern from an existing
 *                  /markets route and add a ProtectedRoute wrapper.
 *
 *   /clube/:id/*   ProtectedRoute requiredRole={null} or "club_member"
 *                  See individual route definitions below for per-route roles.
 *
 *   /admin         ProtectedRoute requiredRole="admin"  admin only
 *
 * ROLE LADDER (defined in src/lib/roles.js):
 *   user(0) → club_member(1) → club_manager(2) → admin(3)
 *   ProtectedRoute passes if user rank >= required rank.
 *   requiredRole={null} means any authenticated user passes (rank >= 0).
 *
 * ADDING A NEW PROTECTED ROUTE — decision tree:
 *   1. Belongs inside the terminal (/app/*)
 *      → Add a child <Route path="yourpage" element={<YourPage />} />
 *        inside the /app layout block. Done — guard inherited.
 *   2. Belongs in markets (/markets/*)
 *      → Copy an existing /markets route block including its
 *        ProtectedRoute wrapper. Change path and element. Done.
 *   3. Needs a new top-level layout with <Outlet />
 *      → Wrap the layout element in ProtectedRoute. Never wrap
 *        individual leaf routes under a layout-based guard.
 *   4. Standalone protected page (no layout)
 *      → Wrap in ProtectedRoute with appropriate requiredRole.
 *
 * NEVER: add a route that renders privileged content without a
 * ProtectedRoute somewhere in its ancestor chain.
 * ──────────────────────────────────────────────────────────────────────────
 */

function AppWithPanel() {
  const { authPanelOpen, authPanelFeature, closeAuthPanel } = useAuth();

  function handleAuthSuccess() {
    closeAuthPanel();
  }

  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/"          element={<PublicLayout><LandingPage /></PublicLayout>} />
        <Route path="/terminal"  element={<TerminalProLandingPage />} />
        <Route path="/mini"      element={<TerminalMiniPage />} />
        <Route path="/login"     element={<PublicLayout><LoginPage /></PublicLayout>} />
        <Route path="/register"  element={<PublicLayout><RegisterPage /></PublicLayout>} />
        <Route path="/features"  element={<PublicLayout><FeaturesPage /></PublicLayout>} />
        <Route path="/coverage"  element={<PublicLayout><CoveragePage /></PublicLayout>} />
        <Route path="/pricing"   element={<PublicLayout><PricingPage /></PublicLayout>} />
        <Route path="/about"     element={<PublicLayout><AboutPage /></PublicLayout>} />
        <Route path="/community" element={<PublicLayout><CommunityPage /></PublicLayout>} />

        {/* Terminal — any authenticated user */}
        <Route
          path="/app"
          element={
            <ProtectedRoute requiredRole={null}>
              <SelectedAssetProvider>
                <TickerProvider>
                  <TerminalLayout />
                </TickerProvider>
              </SelectedAssetProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="global" replace />} />
          <Route path="global"    element={<GlobalMarketsTerminal />} />
          <Route path="brasil"    element={<BrazilTerminal />} />
          <Route path="catalog"   element={<CatalogPage />} />
          <Route path="news"      element={<NewsPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="settings"  element={<SettingsPage />} />
        </Route>

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/taxonomy"
          element={
            <ProtectedRoute requiredRole="admin">
              <Navigate to="/admin" replace />
            </ProtectedRoute>
          }
        />

        {/* Markets modules — any authenticated user */}
        <Route path="/markets/heatmap"      element={<ProtectedRoute requiredRole={null}><MarketHeatmapPage /></ProtectedRoute>} />
        <Route path="/markets/research"     element={<ProtectedRoute requiredRole={null}><ChartResearchPage /></ProtectedRoute>} />
        <Route path="/markets/chart"        element={<ProtectedRoute requiredRole={null}><ChartResearchPage /></ProtectedRoute>} />
        <Route path="/markets/fundamentals" element={<ProtectedRoute requiredRole={null}><FundamentalLabPage /></ProtectedRoute>} />
        <Route path="/markets/macro"        element={<ProtectedRoute requiredRole={null}><MacroHubPage /></ProtectedRoute>} />
        <Route path="/markets/signals"      element={<ProtectedRoute requiredRole={null}><SignalEnginePage /></ProtectedRoute>} />

        {/* Clube de Investimento */}
        <Route path="/clubes" element={<ProtectedRoute requiredRole={null}><ClubeListPage /></ProtectedRoute>} />
        <Route path="/clube" element={<ClubeLandingPage />} />

        {/* Parameterized clube module routes */}
        <Route path="/clube/:id" element={<ProtectedRoute requiredRole="club_member" showDenied={true}><ClubePage /></ProtectedRoute>} />
        <Route path="/clube/:id/membros" element={<ProtectedRoute requiredRole={null}><ClubeMembroPage /></ProtectedRoute>} />
        <Route path="/clube/:id/simulador" element={<ProtectedRoute requiredRole={null}><ClubeSimuladorPage /></ProtectedRoute>} />
        <Route path="/clube/:id/report" element={<ProtectedRoute requiredRole="club_member" showDenied={true}><ClubeReportPage /></ProtectedRoute>} />
        <Route path="/clube/:id/governanca" element={<ProtectedRoute requiredRole={null}><ClubeGovernancaPage /></ProtectedRoute>} />
        <Route path="/clube/:id/governanca/:aid" element={<ProtectedRoute requiredRole={null}><ClubeGovernancaDetailPage /></ProtectedRoute>} />
        <Route path="/clube/:id/reenquadramento/:rid" element={<ProtectedRoute requiredRole={null}><ClubeReenquadramentoDetailPage /></ProtectedRoute>} />
        <Route path="/clube/:id/tributacao" element={<ProtectedRoute requiredRole={null}><ClubeTributacaoPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AuthPanel
        isOpen={authPanelOpen}
        onClose={closeAuthPanel}
        featureName={authPanelFeature}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppWithPanel />
    </BrowserRouter>
  );
}
