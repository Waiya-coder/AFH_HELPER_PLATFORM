import type { Role } from '@afh/shared';

/** Roles that manage the facility (employer / supervisor level). */
export const EMPLOYER_ROLES: Role[] = ['admin', 'supervisor'];

export const ROUTE_ACCESS: Record<string, Role[]> = {
  '/home': ['supervisor', 'admin', 'auditor'],
  '/my-profile': ['supervisor', 'admin'],
  '/my-shift': ['staff', 'supervisor', 'admin'],
  '/schedule': ['supervisor', 'admin', 'auditor'],
  '/clients': ['supervisor', 'admin', 'auditor'],
  '/staff': ['supervisor', 'admin'],
  '/training': ['supervisor', 'admin', 'auditor'],
  '/timesheets': ['supervisor', 'admin', 'auditor'],
  '/audit-checklist': ['supervisor', 'admin', 'auditor'],
  '/audit-logs': ['supervisor', 'admin', 'auditor'],
};

function routeKey(pathname: string): string | undefined {
  if (pathname === '/clients' || pathname.startsWith('/clients/')) {
    return '/clients';
  }
  return ROUTE_ACCESS[pathname] ? pathname : undefined;
}

export function canAccessRoute(role: Role, pathname: string): boolean {
  const key = routeKey(pathname);
  if (!key) {
    return true;
  }
  const allowed = ROUTE_ACCESS[key];
  if (!allowed) {
    return true;
  }
  return allowed.includes(role);
}

export function canAccessRoles(role: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(role);
}

export function isEmployer(role: Role): boolean {
  return EMPLOYER_ROLES.includes(role);
}

export function roleLabel(role: Role): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'supervisor':
      return 'Supervisor';
    case 'staff':
      return 'Caregiver staff';
    case 'auditor':
      return 'Auditor';
    default:
      return role;
  }
}
