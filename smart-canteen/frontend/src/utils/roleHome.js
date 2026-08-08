export const HOME_BY_ROLE = {
  student: '/student/menu',
  staff: '/student/menu',
  canteen_staff: '/kitchen/dashboard',
  manager: '/manager/dashboard',
  admin: '/admin/dashboard',
};

export function homeForRole(role) {
  return HOME_BY_ROLE[role] || '/login';
}
