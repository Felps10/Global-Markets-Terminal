export const ROLE_RANK = {
  user:  0,
  admin: 1,
};

export const ADMIN_ASSIGNABLE = ['user', 'admin'];

export function hasRole(userRole, minRole) {
  return (ROLE_RANK[userRole] ?? -1) >= (ROLE_RANK[minRole] ?? 99);
}
