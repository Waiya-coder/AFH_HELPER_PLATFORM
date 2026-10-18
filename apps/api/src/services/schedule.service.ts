import type { AuthUser, ScheduleShiftRequest } from '@afh/shared';
import { auditContext, createAuditLog } from '../repositories/audit.repository';
import { findStaffById } from '../repositories/staff.repository';
import {
  createScheduleShift,
  deleteScheduleShift,
  findOverlappingShift,
  findScheduleShiftById,
  findScheduleShifts,
  updateScheduleShift,
} from '../repositories/schedule.repository';

export class ScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScheduleError';
  }
}

type ShiftRecord = NonNullable<Awaited<ReturnType<typeof findScheduleShiftById>>>;

function serializeShift(shift: ShiftRecord) {
  return {
    id: shift.id,
    facilityId: shift.facilityId,
    staffId: shift.staffId,
    startAt: shift.startAt.toISOString(),
    endAt: shift.endAt.toISOString(),
    notes: shift.notes,
    createdAt: shift.createdAt.toISOString(),
    updatedAt: shift.updatedAt.toISOString(),
    staff: shift.staff,
  };
}

function parseDateRange(startDate: string, endDate: string) {
  const startAt = new Date(`${startDate}T00:00:00.000Z`);
  const endAt = new Date(`${endDate}T23:59:59.999Z`);
  endAt.setUTCDate(endAt.getUTCDate() + 1);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new ScheduleError('Invalid date range');
  }

  if (endAt <= startAt) {
    throw new ScheduleError('End date must be on or after start date');
  }

  return { startAt, endAt };
}

function parseShiftTimes(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ScheduleError('Invalid shift times');
  }

  if (end <= start) {
    throw new ScheduleError('Shift end time must be after start time');
  }

  return { start, end };
}

async function assertStaffInFacility(facilityId: string, staffId: string) {
  const staff = await findStaffById(staffId, facilityId);
  if (!staff || staff.facilityId !== facilityId) {
    throw new ScheduleError('Staff member not found in your facility');
  }
  if (staff.status === 'archived') {
    throw new ScheduleError('Cannot schedule shifts for archived staff');
  }
  return staff;
}

async function assertNoOverlap(params: {
  staffId: string;
  startAt: Date;
  endAt: Date;
  excludeId?: string;
}) {
  const overlap = await findOverlappingShift(params);
  if (overlap) {
    throw new ScheduleError('This staff member already has a shift during that time');
  }
}

function canManageSchedule(role: AuthUser['role']) {
  return role === 'supervisor' || role === 'admin';
}

export async function listScheduleShifts(
  user: AuthUser,
  params: { startDate: string; endDate: string; staffId?: string },
) {
  const { startAt, endAt } = parseDateRange(params.startDate, params.endDate);

  let staffId = params.staffId;
  if (user.role === 'staff') {
    if (!user.staffId) {
      throw new ScheduleError('Staff profile required to view schedule');
    }
    staffId = user.staffId;
  } else if (staffId) {
    await assertStaffInFacility(user.facilityId, staffId);
  }

  const shifts = await findScheduleShifts({
    facilityId: user.facilityId,
    staffId,
    startAt,
    endAt,
  });

  return shifts.map(serializeShift);
}

export async function createShift(user: AuthUser, payload: ScheduleShiftRequest) {
  if (!canManageSchedule(user.role)) {
    throw new ScheduleError('Only supervisors and administrators can create shifts');
  }

  const { start, end } = parseShiftTimes(payload.startAt, payload.endAt);
  await assertStaffInFacility(user.facilityId, payload.staffId);
  await assertNoOverlap({ staffId: payload.staffId, startAt: start, endAt: end });

  const shift = await createScheduleShift({
    facilityId: user.facilityId,
    staffId: payload.staffId,
    startAt: start,
    endAt: end,
    notes: payload.notes?.trim() || null,
    createdById: user.id,
  });

  await createAuditLog({
    ...auditContext(user),
    action: 'CREATE',
    tableName: 'schedule_shifts',
    recordId: shift.id,
    changes: {
      staffId: shift.staffId,
      startAt: shift.startAt.toISOString(),
      endAt: shift.endAt.toISOString(),
    },
  });

  return serializeShift(shift);
}

export async function updateShift(
  user: AuthUser,
  shiftId: string,
  payload: Partial<ScheduleShiftRequest>,
) {
  if (!canManageSchedule(user.role)) {
    throw new ScheduleError('Only supervisors and administrators can update shifts');
  }

  const existing = await findScheduleShiftById(shiftId);
  if (!existing || existing.facilityId !== user.facilityId) {
    throw new ScheduleError('Shift not found');
  }

  const staffId = payload.staffId ?? existing.staffId;
  const startAt = payload.startAt ? new Date(payload.startAt) : existing.startAt;
  const endAt = payload.endAt ? new Date(payload.endAt) : existing.endAt;

  parseShiftTimes(startAt.toISOString(), endAt.toISOString());
  await assertStaffInFacility(user.facilityId, staffId);
  await assertNoOverlap({ staffId, startAt, endAt, excludeId: shiftId });

  const shift = await updateScheduleShift(shiftId, {
    staffId: payload.staffId,
    startAt: payload.startAt ? startAt : undefined,
    endAt: payload.endAt ? endAt : undefined,
    notes: payload.notes !== undefined ? payload.notes.trim() || null : undefined,
  });

  await createAuditLog({
    ...auditContext(user),
    action: 'UPDATE',
    tableName: 'schedule_shifts',
    recordId: shift.id,
    changes: payload as Record<string, unknown>,
  });

  return serializeShift(shift);
}

export async function removeShift(user: AuthUser, shiftId: string) {
  if (!canManageSchedule(user.role)) {
    throw new ScheduleError('Only supervisors and administrators can delete shifts');
  }

  const existing = await findScheduleShiftById(shiftId);
  if (!existing || existing.facilityId !== user.facilityId) {
    throw new ScheduleError('Shift not found');
  }

  await deleteScheduleShift(shiftId);

  await createAuditLog({
    ...auditContext(user),
    action: 'DELETE',
    tableName: 'schedule_shifts',
    recordId: shiftId,
    changes: {
      staffId: existing.staffId,
      startAt: existing.startAt.toISOString(),
      endAt: existing.endAt.toISOString(),
    },
  });
}
