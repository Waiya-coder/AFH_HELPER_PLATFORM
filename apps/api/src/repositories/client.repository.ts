import type { ClientStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

const staffSelect = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

export async function findClientsByFacility(
  facilityId: string,
  options?: { staffId?: string; search?: string; status?: ClientStatus },
) {
  return prisma.client.findMany({
    where: {
      facilityId,
      status: options?.status ?? 'active',
      ...(options?.staffId
        ? {
            assignments: {
              some: { staffId: options.staffId },
            },
          }
        : {}),
      ...(options?.search
        ? {
            OR: [
              { firstName: { contains: options.search, mode: 'insensitive' } },
              { lastName: { contains: options.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      assignments: {
        include: { staff: { select: staffSelect } },
      },
      documents: {
        orderBy: { uploadDate: 'desc' },
        select: {
          id: true,
          category: true,
          fileName: true,
          fileType: true,
          uploadDate: true,
        },
      },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
}

export async function findClientById(id: string, facilityId: string) {
  return prisma.client.findFirst({
    where: { id, facilityId },
    include: {
      assignments: {
        include: { staff: { select: staffSelect } },
      },
      documents: {
        orderBy: { uploadDate: 'desc' },
      },
    },
  });
}

export async function createClient(data: {
  facilityId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  healthProblems?: string;
  needs?: string;
  dailyCarePlan?: string;
  assignedStaffIds?: string[];
}) {
  const { assignedStaffIds, ...clientData } = data;

  return prisma.client.create({
    data: {
      ...clientData,
      assignments: assignedStaffIds?.length
        ? {
            create: assignedStaffIds.map((staffId) => ({ staffId })),
          }
        : undefined,
    },
    include: {
      assignments: {
        include: { staff: { select: staffSelect } },
      },
      documents: true,
    },
  });
}

export async function updateClient(
  id: string,
  facilityId: string,
  data: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    healthProblems?: string | null;
    needs?: string | null;
    dailyCarePlan?: string | null;
    status?: ClientStatus;
    assignedStaffIds?: string[];
  },
) {
  const { assignedStaffIds, ...fields } = data;

  return prisma.$transaction(async (tx) => {
    if (assignedStaffIds !== undefined) {
      await tx.clientStaffAssignment.deleteMany({ where: { clientId: id } });
      if (assignedStaffIds.length > 0) {
        await tx.clientStaffAssignment.createMany({
          data: assignedStaffIds.map((staffId) => ({ clientId: id, staffId })),
        });
      }
    }

    return tx.client.update({
      where: { id, facilityId },
      data: fields,
      include: {
        assignments: {
          include: { staff: { select: staffSelect } },
        },
        documents: {
          orderBy: { uploadDate: 'desc' },
          select: {
            id: true,
            category: true,
            fileName: true,
            fileType: true,
            uploadDate: true,
          },
        },
      },
    });
  });
}

export async function createClientDocument(data: {
  clientId: string;
  facilityId: string;
  category: string;
  filePath: string;
  fileName: string;
  fileType: string;
  uploadedByUserId?: string;
}) {
  return prisma.clientDocument.create({
    data: {
      ...data,
      uploadDate: new Date(),
    },
  });
}

export async function findClientDocument(id: string, facilityId: string) {
  return prisma.clientDocument.findFirst({
    where: { id, facilityId },
    include: { client: true },
  });
}

export async function staffAssignedToClient(clientId: string, staffId: string) {
  const row = await prisma.clientStaffAssignment.findUnique({
    where: {
      clientId_staffId: { clientId, staffId },
    },
  });
  return Boolean(row);
}
