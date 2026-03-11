import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GlobalMarketsTerminal from './GlobalMarketsTerminal';
import CatalogPage from './CatalogPage';
import NewsPage from './NewsPage';
import MarketHeatmapPage from './MarketHeatmapPage';
import LoginPage from './pages/LoginPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AdminTaxonomyPage from './pages/AdminTaxonomyPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function Dashboard() {
  const [view, setView] = useState("dashboard");
  return (
    <GlobalMarketsTerminal
      currentView={view}
      onNavigate={setView}
      catalogPage={<CatalogPage />}
      newsPage={<NewsPage />}
      heatmapPage={<MarketHeatmapPage onNavigate={setView} />}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
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
          path="/admin/taxonomy"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminTaxonomyPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
