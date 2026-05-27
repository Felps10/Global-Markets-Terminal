// ============================================================
// TRANSFER NOTE
// Source: src/lib/roles.js
// Classification: SHARED INFRASTRUCTURE — reference only.
// Do not copy directly. New app must create its own equivalent.
// Clube used this for: hasRole() used in 5 clube components for conditional rendering
// New app action: not needed — single persona, binary auth only
// ============================================================

export const ROLE_RANK = {
  user:         0,
  club_member:  1,
  club_manager: 2,
  admin:        3,
};

export function hasRole(userRole, minRole) {
  return (ROLE_RANK[userRole] ?? -1) >= (ROLE_RANK[minRole] ?? 99);
}

export const ROLE_LABEL = {
  user:         'User',
  club_member:  'Club member',
  club_manager: 'Club manager',
  admin:        'Admin',
};

export const MANAGER_ASSIGNABLE_ROLES = ['user', 'club_member'];
export const ADMIN_ASSIGNABLE_ROLES   = ['user', 'club_member', 'club_manager', 'admin'];
