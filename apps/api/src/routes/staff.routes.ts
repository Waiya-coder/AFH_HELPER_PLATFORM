import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRoles } from '../middleware/auth';
import {
  addStaff,
  checkStaffAvailability,
  completeMyProfile,
  deactivateStaff,
  editStaff,
  getMyProfile,
  getStaff,
  listStaff,
  listStaffRoster,
  StaffError,
} from '../services/staff.service';

const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  cprIssueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cprExpirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const createStaffSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  password: z.string().min(6),
  cprIssueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cprExpirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const updateStaffSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  role: z.string().min(1).optional(),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['active', 'on_duty', 'off_duty', 'on_break', 'archived']).optional(),
});

export async function staffRoutes(app: FastifyInstance) {
  app.get('/staff/me/profile', { preHandler: authenticate }, async (request, reply) => {
    try {
      const profile = await getMyProfile(request.authUser!);
      return reply.send({ profile });
    } catch (error) {
      if (error instanceof StaffError) {
        return reply.status(404).send({ error: 'NotFound', message: error.message });
      }
      throw error;
    }
  });

  app.post(
    '/staff/me/profile',
    { preHandler: [authenticate, requireRoles('staff')] },
    async (request, reply) => {
      const body = profileSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'ValidationError', message: 'Invalid profile payload' });
      }

      try {
        const profile = await completeMyProfile(request.authUser!, body.data);
        return reply.status(201).send({ profile });
      } catch (error) {
        if (error instanceof StaffError) {
          return reply.status(400).send({ error: 'BadRequest', message: error.message });
        }
        throw error;
      }
    },
  );

  app.get(
    '/staff/roster',
    { preHandler: [authenticate, requireRoles('supervisor', 'admin', 'auditor')] },
    async (request, reply) => {
      const search = (request.query as { search?: string }).search;
      const roster = await listStaffRoster(request.authUser!, search);
      return reply.send({ roster });
    },
  );

  app.get(
    '/staff',
    { preHandler: [authenticate, requireRoles('supervisor', 'admin', 'auditor')] },
    async (request, reply) => {
      const search = (request.query as { search?: string }).search;
      const staff = await listStaff(request.authUser!, search);
      return reply.send({ staff });
    },
  );

  app.post(
    '/staff',
    { preHandler: [authenticate, requireRoles('supervisor', 'admin')] },
    async (request, reply) => {
      const body = createStaffSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'ValidationError', message: 'Invalid staff payload' });
      }

      try {
        const staff = await addStaff(request.authUser!, body.data);
        return reply.status(201).send({ staff });
      } catch (error) {
        if (error instanceof StaffError) {
          return reply.status(400).send({ error: 'BadRequest', message: error.message });
        }
        throw error;
      }
    },
  );

  app.get('/staff/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const staff = await getStaff(request.authUser!, id);
      return reply.send({ staff });
    } catch (error) {
      if (error instanceof StaffError) {
        return reply.status(404).send({ error: 'NotFound', message: error.message });
      }
      throw error;
    }
  });

  app.put(
    '/staff/:id',
    { preHandler: [authenticate, requireRoles('supervisor', 'admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateStaffSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'ValidationError', message: 'Invalid staff payload' });
      }

      try {
        const staff = await editStaff(request.authUser!, id, body.data);
        return reply.send({ staff });
      } catch (error) {
        if (error instanceof StaffError) {
          return reply.status(404).send({ error: 'NotFound', message: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/staff/:id/archive',
    { preHandler: [authenticate, requireRoles('supervisor', 'admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const staff = await deactivateStaff(request.authUser!, id);
        return reply.send({ staff });
      } catch (error) {
        if (error instanceof StaffError) {
          return reply.status(404).send({ error: 'NotFound', message: error.message });
        }
        throw error;
      }
    },
  );

  app.get('/staff/:id/availability', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const availability = await checkStaffAvailability(request.authUser!, id);
      return reply.send(availability);
    } catch (error) {
      if (error instanceof StaffError) {
        return reply.status(404).send({ error: 'NotFound', message: error.message });
      }
      throw error;
    }
  });
}
