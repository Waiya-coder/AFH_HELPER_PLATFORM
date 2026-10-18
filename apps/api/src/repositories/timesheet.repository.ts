import { prisma } from '../lib/prisma';

export interface TimesheetFilters {
  facilityId: string;
  staffId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface UpdateTimesheetInput {
  checkInTime?: Date;
  checkOutTime?: Date | null;
  hoursWorked?: number | null;
  notes?: string | null;
  status?: 'open' | 'closed' | 'pending_approval';
}

export async function findOpenTimesheet(staffId: string) {
  return prisma.timesheet.findFirst({
    where: { staffId, status: 'open' },
    orderBy: { checkInTime: 'desc' },
  });
}

export async function createTimesheet(staffId: string, checkInTime: Date) {
  const date = new Date(checkInTime);
  date.setHours(0, 0, 0, 0);

  return prisma.timesheet.create({
    data: {
      staffId,
      date,
      checkInTime,
      status: 'open',
    },
  });
}

export async function createClosedTimesheet(input: {
  staffId: string;
  date: Date;
  checkInTime: Date;
  checkOutTime: Date;
  hoursWorked: number;
  notes?: string | null;
}) {
  return prisma.timesheet.create({
    data: {
      staffId: input.staffId,
      date: input.date,
      checkInTime: input.checkInTime,
      checkOutTime: input.checkOutTime,
      hoursWorked: input.hoursWorked,
      notes: input.notes,
      status: 'closed',
    },
    include: {
      staff: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
  });
}

export async function closeTimesheet(
  id: string,
  checkOutTime: Date,
  hoursWorked: number,
) {
  return prisma.timesheet.update({
    where: { id },
    data: {
      checkOutTime,
      hoursWorked,
      status: 'closed',
    },
  });
}

export async function findTimesheets(filters: TimesheetFilters) {
  return prisma.timesheet.findMany({
    where: {
      staff: { facilityId: filters.facilityId },
      ...(filters.staffId ? { staffId: filters.staffId } : {}),
      ...(filters.startDate || filters.endDate
        ? {
            date: {
              ...(filters.startDate ? { gte: filters.startDate } : {}),
              ...(filters.endDate ? { lte: filters.endDate } : {}),
            },
          }
        : {}),
    },
    include: {
      staff: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
    orderBy: [{ date: 'desc' }, { checkInTime: 'desc' }],
  });
}

export async function findTimesheetById(id: string, facilityId: string) {
  return prisma.timesheet.findFirst({
    where: {
      id,
      staff: { facilityId },
    },
    include: {
      staff: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
  });
}

export async function updateTimesheet(id: string, input: UpdateTimesheetInput) {
  return prisma.timesheet.update({
    where: { id },
    data: input,
  });
}

export async function getDailyTotalHours(staffId: string, date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const timesheets = await prisma.timesheet.findMany({
    where: {
      staffId,
      date: { gte: start, lte: end },
      status: 'closed',
    },
  });

  return timesheets.reduce(
    (total: number, sheet: { hoursWorked: unknown }) =>
      total + Number(sheet.hoursWorked ?? 0),
    0,
  );
}
