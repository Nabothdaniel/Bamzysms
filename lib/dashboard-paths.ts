import type { User } from '@/types';

type UserRole = User['role'] | undefined | null;

export function getDashboardBasePath(role: UserRole) {
  return role === 'admin' ? '/dashboard/admin' : '/dashboard/user';
}

export function getDashboardPath(role: UserRole, path = '') {
  const basePath = getDashboardBasePath(role);

  if (!path || path === '/') {
    return basePath;
  }

  return `${basePath}/${path.replace(/^\/+/, '')}`;
}
