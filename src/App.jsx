import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GlobalMarketsTerminal from './GlobalMarketsTerminal';
import CatalogPage from './CatalogPage';
import NewsPage from './NewsPage';
import MarketHeatmapPage from './MarketHeatmapPage';
import LoginPage from './pages/LoginPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ChartCenterPage from './pages/markets/ChartCenterPage.jsx';
import ResearchTerminalPage from './pages/markets/ResearchTerminalPage.jsx';
import FundamentalLabPage from './pages/markets/FundamentalLabPage.jsx';
import MacroHubPage from './pages/markets/MacroHubPage.jsx';
import SignalEnginePage from './pages/markets/SignalEnginePage.jsx';
import ClubePage from './pages/ClubePage.jsx';
import ClubeReportPage from './pages/ClubeReportPage.jsx';

const VALID_VIEWS = ['dashboard', 'catalog', 'news', 'heatmap', 'watchlist'];

function Dashboard() {
  const [view, setView] = useState('dashboard');

  const handleNavigate = (nextView) => {
    setView(VALID_VIEWS.includes(nextView) ? nextView : 'dashboard');
  };

  return (
    <GlobalMarketsTerminal
      currentView={view}
      onNavigate={handleNavigate}
      catalogPage={<CatalogPage />}
      newsPage={<NewsPage />}
      heatmapPage={<MarketHeatmapPage onNavigate={handleNavigate} />}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public */}
        <Route path="/"          element={<LandingPage />} />
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/register"  element={<RegisterPage />} />

        {/* Dashboard — any authenticated user */}
        <Route
          path="/app"
          element={
            <ProtectedRoute requiredRole={null}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

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
          path="/markets/chart"
          element={
            <ProtectedRoute requiredRole={null}>
              <ChartCenterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/markets/research"
          element={
            <ProtectedRoute requiredRole={null}>
              <ResearchTerminalPage />
            </ProtectedRoute>
          }
        />
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

        {/* Clube de Investimento */}
        <Route
          path="/clube"
          element={
            <ProtectedRoute requiredRole={null}>
              <ClubePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clube/report"
          element={
            <ProtectedRoute requiredRole={null}>
              <ClubeReportPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
