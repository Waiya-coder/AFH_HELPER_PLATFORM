import type { AuthUser } from '@afh/shared';

export function isEmployerRole(role: AuthUser['role']): boolean {
  return role === 'admin' || role === 'supervisor';
}
