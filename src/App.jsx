import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import TerminalLayout from './components/TerminalLayout.jsx';
import { TickerProvider } from './context/TickerContext.jsx';
import { SelectedAssetProvider } from './context/SelectedAssetContext.jsx';
import { useAuth } from './hooks/useAuth.js';
import { useAlerts } from './context/AlertsContext.jsx';
import AuthPanel from './components/AuthPanel.jsx';
import RolePromotionModal from './components/RolePromotionModal.jsx';
import AlertToast from './components/AlertToast.jsx';
import PublicLayout from './components/PublicLayout.jsx';

// ─── Lazy-loaded page components ───────────────────────────────────────────
// Each becomes its own chunk at build time. Only the route the user visits
// is downloaded on first navigation. Subsequent visits use the cache.
const GlobalMarketsTerminal = React.lazy(() => import('./GlobalMarketsTerminal'));
const BrazilTerminal        = React.lazy(() => import('./BrazilTerminal'));
const CatalogPage           = React.lazy(() => import('./CatalogPage'));
const NewsPage              = React.lazy(() => import('./NewsPage'));
const MarketHeatmapPage     = React.lazy(() => import('./MarketHeatmapPage'));
const WatchlistPage         = React.lazy(() => import('./WatchlistPage'));
const LoginPage             = React.lazy(() => import('./pages/LoginPage.jsx'));
const LandingPage           = React.lazy(() => import('./pages/LandingPage.jsx'));
const RegisterPage          = React.lazy(() => import('./pages/RegisterPage.jsx'));
const AdminPanel            = React.lazy(() => import('./pages/AdminPanel.jsx'));
const FundamentalLabPage    = React.lazy(() => import('./pages/markets/FundamentalLabPage.jsx'));
const MacroHubPage          = React.lazy(() => import('./pages/markets/MacroHubPage.jsx'));
const SignalEnginePage      = React.lazy(() => import('./pages/markets/SignalEnginePage.jsx'));
const ChartResearchPage     = React.lazy(() => import('./pages/markets/ChartResearchPage.jsx'));
const ClubePage             = React.lazy(() => import('./pages/ClubePage.jsx'));
const ClubeReportPage       = React.lazy(() => import('./pages/ClubeReportPage.jsx'));
const ClubeMembroPage       = React.lazy(() => import('./pages/ClubeMembroPage.jsx'));
const ClubeSimuladorPage    = React.lazy(() => import('./pages/ClubeSimuladorPage.jsx'));
const ClubeGovernancaPage   = React.lazy(() => import('./pages/ClubeGovernancaPage.jsx'));
const ClubeGovernancaDetailPage     = React.lazy(() => import('./pages/ClubeGovernancaDetailPage.jsx'));
const ClubeReenquadramentoPage      = React.lazy(() => import('./pages/ClubeReenquadramentoPage.jsx'));
const ClubeReenquadramentoDetailPage = React.lazy(() => import('./pages/ClubeReenquadramentoDetailPage.jsx'));
const ClubeCalendarioPage   = React.lazy(() => import('./pages/ClubeCalendarioPage.jsx'));
const ClubeNavPage          = React.lazy(() => import('./pages/ClubeNavPage.jsx'));

const ClubeListPage         = React.lazy(() => import('./pages/ClubeListPage.jsx'));
const SettingsPage          = React.lazy(() => import('./pages/SettingsPage.jsx'));
const TerminalProLandingPage = React.lazy(() => import('./pages/TerminalProLandingPage.jsx'));
const TerminalMiniPage      = React.lazy(() => import('./pages/TerminalMiniPage.jsx'));
const ClubeLandingPage      = React.lazy(() => import('./clube/pages/ClubeLandingPage.jsx'));
const ComoFuncionaPage      = React.lazy(() => import('./clube/pages/ComoFuncionaPage.jsx'));
const ParaGestoresPage      = React.lazy(() => import('./clube/pages/ParaGestoresPage.jsx'));
const ParaMembrosPage       = React.lazy(() => import('./clube/pages/ParaMembrosPage.jsx'));
const ContatoPage           = React.lazy(() => import('./clube/pages/ContatoPage.jsx'));
const FeaturesPage          = React.lazy(() => import('./pages/FeaturesPage.jsx'));
const CoveragePage          = React.lazy(() => import('./pages/CoveragePage.jsx'));
const PricingPage           = React.lazy(() => import('./pages/PricingPage.jsx'));
const AboutPage             = React.lazy(() => import('./pages/AboutPage.jsx'));
const CommunityPage         = React.lazy(() => import('./pages/CommunityPage.jsx'));
const AlertsPage            = React.lazy(() => import('./pages/AlertsPage.jsx'));

// Minimal loading fallback — matches the dark theme background.
function RouteFallback() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#0a0a0f',
      color: 'rgba(255,255,255,0.35)', fontFamily: "'IBM Plex Sans', sans-serif",
      fontSize: 14,
    }}>
      Loading…
    </div>
  );
}

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
 *   /clube                  ClubeLandingPage    (Clube GMT marketing)
 *   /clube/como-funciona    ComoFuncionaPage    (public)
 *   /clube/para-gestores    ParaGestoresPage    (public)
 *   /clube/para-membros     ParaMembrosPage     (public)
 *   /clube/contato          ContatoPage         (public)
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
  const { authPanelOpen, authPanelFeature, closeAuthPanel, roleNotification, dismissRoleNotification } = useAuth();
  const { triggeredQueue, clearTriggered } = useAlerts();

  function handleAuthSuccess() {
    closeAuthPanel();
  }

  return (
    <>
      <Suspense fallback={<RouteFallback />}>
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
            <Route path="alerts"    element={<AlertsPage />} />
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

          {/* Clube GMT — public marketing pages */}
          <Route path="/clube"               element={<ClubeLandingPage />}  />
          <Route path="/clube/como-funciona" element={<ComoFuncionaPage />}  />
          <Route path="/clube/para-gestores" element={<ParaGestoresPage />}  />
          <Route path="/clube/para-membros"  element={<ParaMembrosPage />}   />
          <Route path="/clube/contato"       element={<ContatoPage />}       />

          {/* Parameterized clube module routes */}
          <Route path="/clube/:id" element={<ProtectedRoute requiredRole="club_member" showDenied={true}><ClubePage /></ProtectedRoute>} />
          <Route path="/clube/:id/membros" element={<ProtectedRoute requiredRole={null}><ClubeMembroPage /></ProtectedRoute>} />
          <Route path="/clube/:id/simulador" element={<ProtectedRoute requiredRole={null}><ClubeSimuladorPage /></ProtectedRoute>} />
          <Route path="/clube/:id/report" element={<ProtectedRoute requiredRole="club_member" showDenied={true}><ClubeReportPage /></ProtectedRoute>} />
          <Route path="/clube/:id/governanca" element={<ProtectedRoute requiredRole={null}><ClubeGovernancaPage /></ProtectedRoute>} />
          <Route path="/clube/:id/governanca/:aid" element={<ProtectedRoute requiredRole={null}><ClubeGovernancaDetailPage /></ProtectedRoute>} />
          <Route path="/clube/:id/reenquadramento" element={<ProtectedRoute requiredRole={null}><ClubeReenquadramentoPage /></ProtectedRoute>} />
          <Route path="/clube/:id/reenquadramento/:rid" element={<ProtectedRoute requiredRole={null}><ClubeReenquadramentoDetailPage /></ProtectedRoute>} />
          <Route path="/clube/:id/calendario" element={<ProtectedRoute requiredRole="club_manager" showDenied={true}><ClubeCalendarioPage /></ProtectedRoute>} />
          <Route path="/clube/:id/nav" element={<ProtectedRoute requiredRole="club_manager" showDenied={true}><ClubeNavPage /></ProtectedRoute>} />
          <Route path="/clube/:id/tributacao" element={<Navigate to="../simulador" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <AuthPanel
        isOpen={authPanelOpen}
        onClose={closeAuthPanel}
        featureName={authPanelFeature}
        onSuccess={handleAuthSuccess}
      />
      {roleNotification && (
        <RolePromotionModal
          role={roleNotification}
          onDismiss={dismissRoleNotification}
        />
      )}
      <AlertToast alerts={triggeredQueue} onDismiss={clearTriggered} />
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
