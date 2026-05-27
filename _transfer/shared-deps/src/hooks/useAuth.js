// ============================================================
// TRANSFER NOTE
// Source: src/hooks/useAuth.js
// Classification: SHARED INFRASTRUCTURE — reference only.
// Do not copy directly. New app must create its own equivalent.
// Clube used this for: auth state in ClubeHeader and ClubeLandingPage
// New app action: create own useAuth wrapping new AuthContext
// ============================================================

import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
