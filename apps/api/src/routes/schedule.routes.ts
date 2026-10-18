import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRoles } from '../middleware/auth';
import {
  createShift,
  listScheduleShifts,
  removeShift,
  ScheduleError,
  updateShift,
} from '../services/schedule.service';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const listQuerySchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
  staffId: z.string().uuid().optional(),
});

const shiftSchema = z.object({
  staffId: z.string().uuid(),
  startAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid start time',
  }),
  endAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid end time',
  }),
  notes: z.string().max(500).optional(),
});

const updateShiftSchema = shiftSchema.partial();

export async function scheduleRoutes(app: FastifyInstance) {
  app.get(
    '/schedules',
    { preHandler: [authenticate, requireRoles('staff', 'supervisor', 'admin', 'auditor')] },
    async (request, reply) => {
      const query = listQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.status(400).send({ error: 'ValidationError', message: 'Invalid schedule query' });
      }

      try {
        const shifts = await listScheduleShifts(request.authUser!, query.data);
        return reply.send({ shifts });
      } catch (error) {
        if (error instanceof ScheduleError) {
          return reply.status(400).send({ error: 'BadRequest', message: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/schedules',
    { preHandler: [authenticate, requireRoles('supervisor', 'admin')] },
    async (request, reply) => {
      const body = shiftSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'ValidationError', message: 'Invalid shift payload' });
      }

      try {
        const shift = await createShift(request.authUser!, body.data);
        return reply.status(201).send({ shift });
      } catch (error) {
        if (error instanceof ScheduleError) {
          return reply.status(400).send({ error: 'BadRequest', message: error.message });
        }
        throw error;
      }
    },
  );

  app.put(
    '/schedules/:id',
    { preHandler: [authenticate, requireRoles('supervisor', 'admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateShiftSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'ValidationError', message: 'Invalid shift payload' });
      }

      try {
        const shift = await updateShift(request.authUser!, id, body.data);
        return reply.send({ shift });
      } catch (error) {
        if (error instanceof ScheduleError) {
          return reply.status(404).send({ error: 'NotFound', message: error.message });
        }
        throw error;
      }
    },
  );

  app.delete(
    '/schedules/:id',
    { preHandler: [authenticate, requireRoles('supervisor', 'admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        await removeShift(request.authUser!, id);
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof ScheduleError) {
          return reply.status(404).send({ error: 'NotFound', message: error.message });
        }
        throw error;
      }
    },
  );
}
