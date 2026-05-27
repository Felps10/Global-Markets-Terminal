export const ROLE_RANK = {
  user:  0,
  admin: 1,
};

export function hasRole(userRole, minRole) {
  return (ROLE_RANK[userRole] ?? -1) >= (ROLE_RANK[minRole] ?? 99);
}

export const ROLE_LABEL = {
  user:  'User',
  admin: 'Admin',
};

export const ADMIN_ASSIGNABLE_ROLES = ['user', 'admin'];
