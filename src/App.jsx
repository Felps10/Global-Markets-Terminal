import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GlobalMarketsTerminal from './GlobalMarketsTerminal';
import CatalogPage from './CatalogPage';
import NewsPage from './NewsPage';
import MarketHeatmapPage from './MarketHeatmapPage';
import LoginPage from './pages/LoginPage.jsx';
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
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Admin routes */}
        <Route
          path="/admin/taxonomy"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminTaxonomyPage />
            </ProtectedRoute>
          }
        />

        {/* Dashboard (default) */}
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
