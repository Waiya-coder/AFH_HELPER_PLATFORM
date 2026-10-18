import type { AuthUser } from '@afh/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

interface AuditLogInput {
  facilityId: string;
  userId: string;
  action: string;
  tableName: string;
  recordId: string;
  changes?: Record<string, unknown> | null;
}

export async function createAuditLog(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      facilityId: input.facilityId,
      userId: input.userId,
      action: input.action,
      tableName: input.tableName,
      recordId: input.recordId,
      changes: input.changes as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function listAuditLogs(facilityId: string, limit = 100) {
  return prisma.auditLog.findMany({
    where: { facilityId },
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: {
      user: {
        select: { email: true },
      },
    },
  });
}

export function auditContext(user: AuthUser) {
  return {
    facilityId: user.facilityId,
    userId: user.id,
  };
}
