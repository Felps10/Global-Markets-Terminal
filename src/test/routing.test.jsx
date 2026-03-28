import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import ProtectedRoute from '../components/ProtectedRoute.jsx';
import {
  mockUnauthenticated,
  mockAuthLoading,
  mockAuthenticatedUser,
  mockAuthenticatedAdmin,
} from './mocks/authMock.js';

// ── Helper ────────────────────────────────────────────────────────────────────

function renderProtected(authValue, initialPath, requiredRole = null) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page" />} />
          <Route path="/app"   element={<div data-testid="app-page" />} />
          <Route
            path={initialPath}
            element={
              <ProtectedRoute requiredRole={requiredRole}>
                <div data-testid="protected-page" />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

// ── Confirmed path lists ──────────────────────────────────────────────────────

const USER_PATHS = [
  ['/app/global',              null],
  ['/app/brasil',              null],
  ['/app/catalog',             null],
  ['/app/news',                null],
  ['/app/watchlist',           null],
  ['/app/settings',            null],
  ['/markets/chart',           null],
  ['/markets/research',        null],
  ['/markets/fundamentals',    null],
  ['/markets/macro',           null],
  ['/markets/signals',         null],
  ['/markets/heatmap',         null],
];

const ADMIN_PATHS = [
  ['/admin',          'admin'],
  ['/admin/taxonomy', 'admin'],
];

const ALL_PATHS = [...USER_PATHS, ...ADMIN_PATHS];

// ── Test suites ───────────────────────────────────────────────────────────────

describe('ProtectedRoute — unauthenticated user', () => {
  it.each(ALL_PATHS)(
    'redirects %s to /login',
    (path, role) => {
      renderProtected(mockUnauthenticated(), path, role);
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
    }
  );
});

describe('ProtectedRoute — loading state', () => {
  it('renders null while auth is resolving', () => {
    const { container } = renderProtected(
      mockAuthLoading(), '/app/global', null
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('ProtectedRoute — authenticated user (role: user)', () => {
  it.each(USER_PATHS)(
    'grants access to %s',
    (path, role) => {
      renderProtected(mockAuthenticatedUser(), path, role);
      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    }
  );

  it.each(ADMIN_PATHS)(
    'blocks access to %s and redirects to /app',
    (path, role) => {
      renderProtected(mockAuthenticatedUser(), path, role);
      expect(screen.getByTestId('app-page')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    }
  );
});

describe('ProtectedRoute — admin user', () => {
  it.each(ALL_PATHS)(
    'grants access to %s',
    (path, role) => {
      renderProtected(mockAuthenticatedAdmin(), path, role);
      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    }
  );
});

describe('ProtectedRoute — requiredRole={null} skips role check', () => {
  it('grants access to any authenticated user regardless of role', () => {
    renderProtected(mockAuthenticatedUser(), '/app/global', null);
    expect(screen.getByTestId('protected-page')).toBeInTheDocument();
  });
});

describe('ProtectedRoute — club_member role check', () => {
  it('denies access to user with role "user" when requiredRole="club_member"', () => {
    renderProtected(mockAuthenticatedUser(), '/clube/123', 'club_member');
    expect(screen.getByTestId('app-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
  });

  it('grants access to user with role "club_member"', () => {
    renderProtected(
      mockAuthenticatedUser({ role: 'club_member' }),
      '/clube/123',
      'club_member'
    );
    expect(screen.getByTestId('protected-page')).toBeInTheDocument();
  });

  it('grants access to admin when requiredRole="club_member"', () => {
    renderProtected(mockAuthenticatedAdmin(), '/clube/123', 'club_member');
    expect(screen.getByTestId('protected-page')).toBeInTheDocument();
  });
});
