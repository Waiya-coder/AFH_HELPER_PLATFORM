import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRoles } from '../middleware/auth';
import { listAuditLogs } from '../repositories/audit.repository';
import { buildAuditPacket } from '../services/auditPacket.service';
import {
  AuditReadinessError,
  getAuditReadiness,
  updateManualChecklistItem,
} from '../services/auditReadiness.service';

const manualUpdateSchema = z.object({
  status: z.enum(['complete', 'pending', 'not_applicable']),
  notes: z.string().max(500).nullable().optional(),
});

export async function auditRoutes(app: FastifyInstance) {
  app.get(
    '/audit/readiness',
    { preHandler: [authenticate, requireRoles('supervisor', 'admin', 'auditor')] },
    async (request, reply) => {
      const readiness = await getAuditReadiness(request.authUser!);
      return reply.send({ readiness });
    },
  );

  app.patch(
    '/audit/checklist/:itemKey',
    { preHandler: [authenticate, requireRoles('supervisor', 'admin')] },
    async (request, reply) => {
      const { itemKey } = request.params as { itemKey: string };
      const body = manualUpdateSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'ValidationError', message: 'Invalid checklist payload' });
      }

      try {
        const readiness = await updateManualChecklistItem(request.authUser!, itemKey, body.data);
        return reply.send({ readiness });
      } catch (error) {
        if (error instanceof AuditReadinessError) {
          return reply.status(400).send({ error: 'BadRequest', message: error.message });
        }
        throw error;
      }
    },
  );

  app.get(
    '/audit/packet',
    { preHandler: [authenticate, requireRoles('supervisor', 'admin', 'auditor')] },
    async (request, reply) => {
      const zip = await buildAuditPacket(request.authUser!);
      reply.header('Content-Type', 'application/zip');
      reply.header('Content-Disposition', 'attachment; filename="afh-audit-packet.zip"');
      return reply.send(zip);
    },
  );

  app.get(
    '/audit-logs',
    { preHandler: [authenticate, requireRoles('supervisor', 'admin', 'auditor')] },
    async (request, reply) => {
      const limit = Number((request.query as { limit?: string }).limit ?? 100);
      const logs = await listAuditLogs(request.authUser!.facilityId, limit);

      return reply.send({
        logs: logs.map((log: (typeof logs)[number]) => ({
          id: log.id,
          facilityId: log.facilityId,
          userId: log.userId,
          action: log.action,
          tableName: log.tableName,
          recordId: log.recordId,
          changes: log.changes,
          timestamp: log.timestamp.toISOString(),
          user: log.user,
        })),
      });
    },
  );
}
