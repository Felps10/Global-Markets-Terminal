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

const VALID_VIEWS = ['dashboard', 'catalog', 'news', 'heatmap'];

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
