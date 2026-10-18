import { prisma } from '../lib/prisma';

const staffSelect = {
  firstName: true,
  lastName: true,
  email: true,
} as const;

export async function findScheduleShifts(params: {
  facilityId: string;
  staffId?: string;
  startAt: Date;
  endAt: Date;
}) {
  return prisma.scheduleShift.findMany({
    where: {
      facilityId: params.facilityId,
      ...(params.staffId ? { staffId: params.staffId } : {}),
      startAt: {
        gte: params.startAt,
        lt: params.endAt,
      },
    },
    orderBy: [{ startAt: 'asc' }, { staff: { lastName: 'asc' } }],
    include: {
      staff: {
        select: staffSelect,
      },
    },
  });
}

export async function findScheduleShiftById(id: string) {
  return prisma.scheduleShift.findUnique({
    where: { id },
    include: {
      staff: {
        select: staffSelect,
      },
    },
  });
}

export async function findOverlappingShift(params: {
  staffId: string;
  startAt: Date;
  endAt: Date;
  excludeId?: string;
}) {
  return prisma.scheduleShift.findFirst({
    where: {
      staffId: params.staffId,
      id: params.excludeId ? { not: params.excludeId } : undefined,
      startAt: { lt: params.endAt },
      endAt: { gt: params.startAt },
    },
  });
}

export async function createScheduleShift(data: {
  facilityId: string;
  staffId: string;
  startAt: Date;
  endAt: Date;
  notes?: string | null;
  createdById?: string | null;
}) {
  return prisma.scheduleShift.create({
    data,
    include: {
      staff: {
        select: staffSelect,
      },
    },
  });
}

export async function updateScheduleShift(
  id: string,
  data: {
    staffId?: string;
    startAt?: Date;
    endAt?: Date;
    notes?: string | null;
  },
) {
  return prisma.scheduleShift.update({
    where: { id },
    data,
    include: {
      staff: {
        select: staffSelect,
      },
    },
  });
}

export async function deleteScheduleShift(id: string) {
  return prisma.scheduleShift.delete({
    where: { id },
  });
}
