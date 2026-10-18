import type { Role } from '@afh/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthUser } from '@afh/shared';
import type { JwtPayload } from '../lib/auth-types';
import { toAuthUser } from '../lib/auth-types';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const payload = await request.jwtVerify<JwtPayload>();
    if (payload.type !== 'access') {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token type' });
    }
    request.authUser = toAuthUser(payload);
  } catch {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

export function requireRoles(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.authUser) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
    }
    if (!roles.includes(request.authUser.role)) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}
