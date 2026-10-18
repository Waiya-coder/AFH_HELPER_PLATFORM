import { prisma } from '../lib/prisma';

export async function findChecklistStatuses(facilityId: string) {
  return prisma.facilityChecklistStatus.findMany({
    where: { facilityId },
  });
}

export async function upsertChecklistStatus(input: {
  facilityId: string;
  itemKey: string;
  status: string;
  notes?: string | null;
  updatedByUserId?: string;
}) {
  return prisma.facilityChecklistStatus.upsert({
    where: {
      facilityId_itemKey: {
        facilityId: input.facilityId,
        itemKey: input.itemKey,
      },
    },
    create: {
      facilityId: input.facilityId,
      itemKey: input.itemKey,
      status: input.status,
      notes: input.notes,
      updatedByUserId: input.updatedByUserId,
    },
    update: {
      status: input.status,
      notes: input.notes,
      updatedByUserId: input.updatedByUserId,
    },
  });
}
