import type { FastifyInstance } from 'fastify';
import { authenticate, requireRoles } from '../middleware/auth';
import { findFacilityById } from '../repositories/facility.repository';

export async function facilityRoutes(app: FastifyInstance) {
  app.get(
    '/facility/me',
    { preHandler: [authenticate, requireRoles('admin', 'supervisor')] },
    async (request, reply) => {
      const facility = await findFacilityById(request.authUser!.facilityId);
      if (!facility) {
        return reply.status(404).send({ error: 'NotFound', message: 'Facility not found' });
      }

      return reply.send({
        facility: {
          id: facility.id,
          name: facility.name,
          joinCode: facility.joinCode,
        },
      });
    },
  );
}
