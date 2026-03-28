export const ROLE_RANK = {
  user:         0,
  club_member:  1,
  club_manager: 2,
  admin:        3,
};

export const VALID_ROLES = Object.keys(ROLE_RANK);

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
