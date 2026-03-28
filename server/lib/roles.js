export const ROLE_RANK = {
  user:         0,
  club_member:  1,
  club_manager: 2,
  admin:        3,
};

export const VALID_ROLES        = Object.keys(ROLE_RANK);
export const MANAGER_ASSIGNABLE = ['user', 'club_member'];
export const ADMIN_ASSIGNABLE   = ['user', 'club_member', 'club_manager', 'admin'];

export function hasRole(userRole, minRole) {
  return (ROLE_RANK[userRole] ?? -1) >= (ROLE_RANK[minRole] ?? 99);
}
