import { vi } from 'vitest';

const baseAuth = {
  authPanelOpen: false,
  authPanelFeature: 'default',
  openAuthPanel: vi.fn(),
  closeAuthPanel: vi.fn(),
};

export function mockUnauthenticated() {
  return {
    ...baseAuth,
    loading: false,
    isAuthenticated: false,
    isAdmin: false,
    user: null,
    session: null,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    getToken: vi.fn().mockResolvedValue(null),
  };
}

export function mockAuthLoading() {
  return {
    ...baseAuth,
    loading: true,
    isAuthenticated: false,
    isAdmin: false,
    user: null,
    session: null,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    getToken: vi.fn().mockResolvedValue(null),
  };
}

export function mockAuthenticatedUser(overrides = {}) {
  return {
    ...baseAuth,
    loading: false,
    isAuthenticated: true,
    isAdmin: false,
    user: {
      id: 'test-user-id',
      email: 'user@test.com',
      name: 'Test User',
      role: 'user',
      ...overrides,
    },
    session: { access_token: 'mock-token' },
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    getToken: vi.fn().mockResolvedValue('mock-token'),
  };
}

export function mockAuthenticatedAdmin() {
  return {
    ...mockAuthenticatedUser({ role: 'admin' }),
    isAdmin: true,
  };
}
