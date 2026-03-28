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

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public */}
        <Route path="/"          element={<LandingPage />} />
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/register"  element={<RegisterPage />} />

        {/* App terminal — nested routes with shared layout */}
        <Route path="/app" element={<Navigate to="/app/global" replace />} />
        <Route
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
          <Route path="/app/global" element={<GlobalMarketsTerminal />} />
          <Route path="/app/brasil" element={<BrazilTerminal />} />
          <Route path="/app/catalog" element={<CatalogPage />} />
          <Route path="/app/news" element={<NewsPage />} />
          {/* Heatmap moved to /markets/heatmap */}
          <Route path="/app/watchlist" element={<WatchlistPage />} />
          <Route path="/app/settings" element={<SettingsPage />} />
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
        <Route path="/admin/taxonomy" element={<Navigate to="/admin" replace />} />

        {/* Markets modules — authenticated users */}
        <Route
          path="/markets/heatmap"
          element={
            <ProtectedRoute requiredRole={null}>
              <MarketHeatmapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/markets/research"
          element={
            <ProtectedRoute requiredRole={null}>
              <ChartResearchPage />
            </ProtectedRoute>
          }
        />
        <Route path="/markets/chart" element={<Navigate to="/markets/research" replace />} />
        <Route
          path="/markets/fundamentals"
          element={
            <ProtectedRoute requiredRole={null}>
              <FundamentalLabPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/markets/macro"
          element={
            <ProtectedRoute requiredRole={null}>
              <MacroHubPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/markets/signals"
          element={
            <ProtectedRoute requiredRole={null}>
              <SignalEnginePage />
            </ProtectedRoute>
          }
        />

        {/* Clube de Investimento — list entry point */}
        <Route path="/clubes" element={<ProtectedRoute requiredRole={null}><ClubeListPage /></ProtectedRoute>} />
        <Route path="/clube" element={<Navigate to="/clubes" replace />} />

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
    </BrowserRouter>
  );
}
