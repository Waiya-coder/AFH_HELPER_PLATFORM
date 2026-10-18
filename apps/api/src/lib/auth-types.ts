import type { AuthUser } from '@afh/shared';

export interface JwtPayload extends AuthUser {
  type: 'access' | 'refresh';
}

export function toAuthUser(payload: JwtPayload): AuthUser {
  return {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    facilityId: payload.facilityId,
    staffId: payload.staffId,
  };
}
