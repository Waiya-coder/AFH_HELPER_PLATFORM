import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRoles } from '../middleware/auth';
import {
  checkIn,
  checkOut,
  createManualTimesheet,
  editTimesheet,
  exportTimesheetsCsv,
  exportTimesheetsPdf,
  getCurrentShift,
  getTimesheetDetails,
  listTimesheets,
  TimesheetError,
} from '../services/timesheet.service';

const manualTimesheetSchema = z.object({
  staffId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkInTime: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid check-in time',
  }),
  checkOutTime: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid check-out time',
  }),
  notes: z.string().max(500).optional(),
});

const timesheetFiltersSchema = z.object({
  staffId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const updateTimesheetSchema = z.object({
  checkInTime: z.string().datetime().optional(),
  checkOutTime: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const exportQuerySchema = timesheetFiltersSchema.extend({
  format: z.enum(['csv', 'pdf']).default('csv'),
});

export async function timesheetRoutes(app: FastifyInstance) {
  app.post(
    '/timesheets/check-in',
    { preHandler: [authenticate, requireRoles('staff', 'supervisor', 'admin')] },
    async (request, reply) => {
      try {
        const result = await checkIn(request.authUser!);
        return reply.status(201).send(result);
      } catch (error) {
        if (error instanceof TimesheetError) {
          return reply.status(400).send({ error: 'BadRequest', message: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/timesheets/check-out',
    { preHandler: [authenticate, requireRoles('staff', 'supervisor', 'admin')] },
    async (request, reply) => {
      try {
        const result = await checkOut(request.authUser!);
        return reply.send(result);
      } catch (error) {
        if (error instanceof TimesheetError) {
          return reply.status(400).send({ error: 'BadRequest', message: error.message });
        }
        throw error;
      }
    },
  );

  app.get('/timesheets/current', { preHandler: authenticate }, async (request, reply) => {
    const result = await getCurrentShift(request.authUser!);
    return reply.send(result);
  });

  app.post(
    '/timesheets/manual',
    { preHandler: [authenticate, requireRoles('supervisor', 'admin')] },
    async (request, reply) => {
      const body = manualTimesheetSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'ValidationError', message: 'Invalid timesheet payload' });
      }

      try {
        const timesheet = await createManualTimesheet(request.authUser!, body.data);
        return reply.status(201).send({ timesheet });
      } catch (error) {
        if (error instanceof TimesheetError) {
          return reply.status(400).send({ error: 'BadRequest', message: error.message });
        }
        throw error;
      }
    },
  );

  app.get('/timesheets', { preHandler: authenticate }, async (request, reply) => {
    const query = timesheetFiltersSchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'ValidationError', message: 'Invalid query parameters' });
    }

    const timesheets = await listTimesheets(request.authUser!, query.data);
    return reply.send({ timesheets });
  });

  app.get('/timesheets/export', { preHandler: authenticate }, async (request, reply) => {
    const query = exportQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'ValidationError', message: 'Invalid query parameters' });
    }

    const { format, ...filters } = query.data;

    if (format === 'pdf') {
      const pdf = await exportTimesheetsPdf(request.authUser!, filters);
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', 'attachment; filename="timesheets.pdf"');
      return reply.send(pdf);
    }

    const csv = await exportTimesheetsCsv(request.authUser!, filters);
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="timesheets.csv"');
    return reply.send(csv);
  });

  app.get('/timesheets/:id/details', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const timesheet = await getTimesheetDetails(request.authUser!, id);
      return reply.send({ timesheet });
    } catch (error) {
      if (error instanceof TimesheetError) {
        return reply.status(404).send({ error: 'NotFound', message: error.message });
      }
      throw error;
    }
  });

  app.put(
    '/timesheets/:id',
    { preHandler: [authenticate, requireRoles('supervisor', 'admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateTimesheetSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'ValidationError', message: 'Invalid timesheet payload' });
      }

      try {
        const timesheet = await editTimesheet(request.authUser!, id, body.data);
        return reply.send({ timesheet });
      } catch (error) {
        if (error instanceof TimesheetError) {
          return reply.status(404).send({ error: 'NotFound', message: error.message });
        }
        throw error;
      }
    },
  );
}
