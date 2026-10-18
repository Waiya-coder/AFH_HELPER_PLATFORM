import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRoles } from '../middleware/auth';
import {
  addClient,
  ClientError,
  editClient,
  getClient,
  listClients,
  openClientDocumentStream,
  uploadClientDocument,
} from '../services/client.service';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createClientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: dateSchema,
  healthProblems: z.string().optional(),
  needs: z.string().optional(),
  dailyCarePlan: z.string().optional(),
  assignedStaffIds: z.array(z.string().uuid()).optional(),
});

const updateClientSchema = createClientSchema.partial();

export async function clientRoutes(app: FastifyInstance) {
  app.get(
    '/clients',
    { preHandler: [authenticate, requireRoles('staff', 'supervisor', 'admin', 'auditor')] },
    async (request, reply) => {
      const search = (request.query as { search?: string }).search;
      try {
        const clients = await listClients(request.authUser!, search);
        return reply.send({ clients });
      } catch (error) {
        if (error instanceof ClientError) {
          return reply.status(403).send({ error: 'Forbidden', message: error.message });
        }
        throw error;
      }
    },
  );

  app.get(
    '/clients/:id',
    { preHandler: [authenticate, requireRoles('staff', 'supervisor', 'admin', 'auditor')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const client = await getClient(request.authUser!, id);
        return reply.send({ client });
      } catch (error) {
        if (error instanceof ClientError) {
          return reply.status(error.message === 'Client not found' ? 404 : 403).send({
            error: error.message === 'Client not found' ? 'NotFound' : 'Forbidden',
            message: error.message,
          });
        }
        throw error;
      }
    },
  );

  app.post(
    '/clients',
    { preHandler: [authenticate, requireRoles('supervisor', 'admin')] },
    async (request, reply) => {
      const body = createClientSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'ValidationError', message: 'Invalid client payload' });
      }

      try {
        const client = await addClient(request.authUser!, body.data);
        return reply.status(201).send({ client });
      } catch (error) {
        if (error instanceof ClientError) {
          return reply.status(400).send({ error: 'BadRequest', message: error.message });
        }
        throw error;
      }
    },
  );

  app.put(
    '/clients/:id',
    { preHandler: [authenticate, requireRoles('supervisor', 'admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateClientSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'ValidationError', message: 'Invalid client payload' });
      }

      try {
        const client = await editClient(request.authUser!, id, body.data);
        return reply.send({ client });
      } catch (error) {
        if (error instanceof ClientError) {
          return reply.status(404).send({ error: 'NotFound', message: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/clients/:id/documents',
    { preHandler: [authenticate, requireRoles('supervisor', 'admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: 'ValidationError', message: 'Document file is required' });
      }

      const categoryField = file.fields.category;
      const category =
        categoryField && typeof categoryField === 'object' && 'value' in categoryField
          ? String(categoryField.value)
          : 'hospital_care_plan';

      const buffer = await file.toBuffer();

      try {
        const document = await uploadClientDocument(
          request.authUser!,
          id,
          {
            buffer,
            filename: file.filename,
            mimetype: file.mimetype,
          },
          category,
        );
        return reply.status(201).send({ document });
      } catch (error) {
        if (error instanceof ClientError) {
          return reply.status(400).send({ error: 'BadRequest', message: error.message });
        }
        throw error;
      }
    },
  );

  app.get(
    '/clients/documents/:documentId/download',
    { preHandler: [authenticate, requireRoles('staff', 'supervisor', 'admin', 'auditor')] },
    async (request, reply) => {
      const { documentId } = request.params as { documentId: string };

      try {
        const { stream, fileName, fileType } = await openClientDocumentStream(
          request.authUser!,
          documentId,
        );
        return reply
          .header('Content-Type', fileType)
          .header('Content-Disposition', `attachment; filename="${fileName.replace(/"/g, '')}"`)
          .send(stream);
      } catch (error) {
        if (error instanceof ClientError) {
          return reply.status(404).send({ error: 'NotFound', message: error.message });
        }
        throw error;
      }
    },
  );
}
