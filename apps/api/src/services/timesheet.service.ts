import PDFDocument from 'pdfkit';
import type { AuthUser } from '@afh/shared';
import {
  closeTimesheet,
  createClosedTimesheet,
  createTimesheet,
  findOpenTimesheet,
  findTimesheetById,
  findTimesheets,
  getDailyTotalHours,
  updateTimesheet,
} from '../repositories/timesheet.repository';
import { findStaffById, updateStaffStatus, findStaffWithProfile } from '../repositories/staff.repository';
import { isEmployerRole } from '../lib/roles';
import { auditContext, createAuditLog } from '../repositories/audit.repository';

export class TimesheetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimesheetError';
  }
}

function calculateHours(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

function serializeTimesheet(
  sheet: Awaited<ReturnType<typeof findTimesheets>>[number],
) {
  return {
    id: sheet.id,
    staffId: sheet.staffId,
    date: sheet.date.toISOString().split('T')[0],
    checkInTime: sheet.checkInTime.toISOString(),
    checkOutTime: sheet.checkOutTime?.toISOString() ?? null,
    hoursWorked: sheet.hoursWorked ? Number(sheet.hoursWorked) : null,
    notes: sheet.notes,
    status: sheet.status,
    createdAt: sheet.createdAt.toISOString(),
    updatedAt: sheet.updatedAt.toISOString(),
    staff: sheet.staff,
  };
}

export async function checkIn(user: AuthUser) {
  if (!user.staffId) {
    throw new TimesheetError('Only staff members can check in');
  }

  const staff = await findStaffWithProfile(user.staffId);
  if (!staff?.profileComplete) {
    throw new TimesheetError('Please complete your staff profile before checking in');
  }

  const open = await findOpenTimesheet(user.staffId);
  if (open) {
    throw new TimesheetError('You already have an open timesheet. Check out first.');
  }

  const now = new Date();
  const timesheet = await createTimesheet(user.staffId, now);
  await updateStaffStatus(user.staffId, 'on_duty');

  await createAuditLog({
    ...auditContext(user),
    action: 'CHECK_IN',
    tableName: 'timesheets',
    recordId: timesheet.id,
    changes: { checkInTime: now.toISOString() },
  });

  const dailyTotal = await getDailyTotalHours(user.staffId, now);

  return {
    timesheet: serializeTimesheet({
      ...timesheet,
      staff: { firstName: '', lastName: '', email: '' },
    }),
    dailyTotalHours: dailyTotal,
  };
}

export async function checkOut(user: AuthUser) {
  if (!user.staffId) {
    throw new TimesheetError('Only staff members can check out');
  }

  const open = await findOpenTimesheet(user.staffId);
  if (!open) {
    throw new TimesheetError('No open timesheet found. Check in first.');
  }

  const now = new Date();
  const hoursWorked = calculateHours(open.checkInTime, now);
  const timesheet = await closeTimesheet(open.id, now, hoursWorked);
  await updateStaffStatus(user.staffId, 'off_duty');

  await createAuditLog({
    ...auditContext(user),
    action: 'CHECK_OUT',
    tableName: 'timesheets',
    recordId: timesheet.id,
    changes: {
      checkOutTime: now.toISOString(),
      hoursWorked,
    },
  });

  const dailyTotal = await getDailyTotalHours(user.staffId, now);

  return {
    timesheet: serializeTimesheet({
      ...timesheet,
      staff: { firstName: '', lastName: '', email: '' },
    }),
    dailyTotalHours: dailyTotal + hoursWorked,
  };
}

export async function createManualTimesheet(
  user: AuthUser,
  input: {
    staffId: string;
    date: string;
    checkInTime: string;
    checkOutTime: string;
    notes?: string;
  },
) {
  if (!isEmployerRole(user.role)) {
    throw new TimesheetError('Only supervisors can enter hours for staff');
  }

  const staff = await findStaffById(input.staffId, user.facilityId);
  if (!staff || staff.status === 'archived') {
    throw new TimesheetError('Staff member not found');
  }

  const checkIn = new Date(input.checkInTime);
  const checkOut = new Date(input.checkOutTime);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    throw new TimesheetError('Invalid check-in or check-out time');
  }

  if (checkOut <= checkIn) {
    throw new TimesheetError('Check-out must be after check-in');
  }

  const open = await findOpenTimesheet(input.staffId);
  if (open) {
    throw new TimesheetError(
      'This employee is currently checked in. Check them out first, then add manual hours if needed.',
    );
  }

  const workDate = new Date(`${input.date}T12:00:00`);
  workDate.setHours(0, 0, 0, 0);

  const hoursWorked = calculateHours(checkIn, checkOut);

  const timesheet = await createClosedTimesheet({
    staffId: input.staffId,
    date: workDate,
    checkInTime: checkIn,
    checkOutTime: checkOut,
    hoursWorked,
    notes: input.notes?.trim() || null,
  });

  await createAuditLog({
    ...auditContext(user),
    action: 'CREATE',
    tableName: 'timesheets',
    recordId: timesheet.id,
    changes: {
      manualEntry: true,
      staffId: input.staffId,
      hoursWorked,
    },
  });

  return serializeTimesheet(timesheet);
}

export async function getCurrentShift(user: AuthUser) {
  if (!user.staffId) {
    return { openTimesheet: null, dailyTotalHours: 0, elapsedHours: 0 };
  }

  const open = await findOpenTimesheet(user.staffId);
  const now = new Date();
  const dailyTotal = await getDailyTotalHours(user.staffId, now);

  if (!open) {
    return { openTimesheet: null, dailyTotalHours: dailyTotal, elapsedHours: 0 };
  }

  const elapsedHours = calculateHours(open.checkInTime, now);

  return {
    openTimesheet: serializeTimesheet({
      ...open,
      staff: { firstName: '', lastName: '', email: '' },
    }),
    dailyTotalHours: dailyTotal,
    elapsedHours,
  };
}

export async function listTimesheets(
  user: AuthUser,
  filters: { staffId?: string; startDate?: string; endDate?: string },
) {
  if (user.role === 'staff' && user.staffId) {
    filters.staffId = user.staffId;
  }

  const timesheets = await findTimesheets({
    facilityId: user.facilityId,
    staffId: filters.staffId,
    startDate: filters.startDate ? new Date(filters.startDate) : undefined,
    endDate: filters.endDate ? new Date(filters.endDate) : undefined,
  });

  return timesheets.map(serializeTimesheet);
}

export async function getTimesheetDetails(user: AuthUser, id: string) {
  const timesheet = await findTimesheetById(id, user.facilityId);
  if (!timesheet) {
    throw new TimesheetError('Timesheet not found');
  }

  if (user.role === 'staff' && user.staffId !== timesheet.staffId) {
    throw new TimesheetError('You can only view your own timesheets');
  }

  return serializeTimesheet(timesheet);
}

export async function editTimesheet(
  user: AuthUser,
  id: string,
  input: {
    checkInTime?: string;
    checkOutTime?: string | null;
    notes?: string | null;
  },
) {
  const existing = await findTimesheetById(id, user.facilityId);
  if (!existing) {
    throw new TimesheetError('Timesheet not found');
  }

  const checkInTime = input.checkInTime ? new Date(input.checkInTime) : existing.checkInTime;
  const checkOutTime =
    input.checkOutTime === null
      ? null
      : input.checkOutTime
        ? new Date(input.checkOutTime)
        : existing.checkOutTime;

  let hoursWorked: number | null = existing.hoursWorked ? Number(existing.hoursWorked) : null;
  let status = existing.status;

  if (checkOutTime) {
    hoursWorked = calculateHours(checkInTime, checkOutTime);
    status = 'closed';
  } else {
    hoursWorked = null;
    status = 'open';
  }

  const updated = await updateTimesheet(id, {
    checkInTime,
    checkOutTime,
    hoursWorked,
    notes: input.notes ?? existing.notes,
    status,
  });

  await createAuditLog({
    ...auditContext(user),
    action: 'UPDATE',
    tableName: 'timesheets',
    recordId: updated.id,
    changes: {
      before: serializeTimesheet(existing),
      after: serializeTimesheet({ ...updated, staff: existing.staff }),
    },
  });

  return serializeTimesheet({ ...updated, staff: existing.staff });
}

export async function exportTimesheetsCsv(
  user: AuthUser,
  filters: { staffId?: string; startDate?: string; endDate?: string },
) {
  const timesheets = await listTimesheets(user, filters);

  const header = [
    'Date',
    'Staff Name',
    'Email',
    'Check In',
    'Check Out',
    'Hours Worked',
    'Status',
    'Notes',
  ].join(',');

  const rows = timesheets.map((sheet: Awaited<ReturnType<typeof listTimesheets>>[number]) =>
    [
      sheet.date,
      `"${sheet.staff?.firstName ?? ''} ${sheet.staff?.lastName ?? ''}"`.trim(),
      sheet.staff?.email ?? '',
      sheet.checkInTime,
      sheet.checkOutTime ?? '',
      sheet.hoursWorked ?? '',
      sheet.status,
      `"${(sheet.notes ?? '').replace(/"/g, '""')}"`,
    ].join(','),
  );

  return [header, ...rows].join('\n');
}

export async function exportTimesheetsPdf(
  user: AuthUser,
  filters: { staffId?: string; startDate?: string; endDate?: string },
) {
  const timesheets = await listTimesheets(user, filters);

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('AFH Helper — Timesheet Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#64748b').text(`Generated: ${new Date().toLocaleString()}`, {
      align: 'center',
    });
    doc.fillColor('#000000');
    doc.moveDown(1.5);

    if (filters.startDate || filters.endDate) {
      doc.fontSize(11).text(
        `Date range: ${filters.startDate ?? 'start'} to ${filters.endDate ?? 'present'}`,
      );
      doc.moveDown(1);
    }

    doc.fontSize(10);

    const columns = [
      { label: 'Date', width: 70 },
      { label: 'Staff', width: 120 },
      { label: 'Check In', width: 80 },
      { label: 'Check Out', width: 80 },
      { label: 'Hours', width: 50 },
      { label: 'Status', width: 70 },
    ];

    let x = doc.page.margins.left;
    const headerY = doc.y;

    doc.font('Helvetica-Bold');
    for (const col of columns) {
      doc.text(col.label, x, headerY, { width: col.width, lineBreak: false });
      x += col.width;
    }
    doc.font('Helvetica');
    doc.moveDown(0.5);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.moveDown(0.3);

    for (const sheet of timesheets) {
      if (doc.y > doc.page.height - 80) {
        doc.addPage();
      }

      x = doc.page.margins.left;
      const rowY = doc.y;
      const staffName = `${sheet.staff?.firstName ?? ''} ${sheet.staff?.lastName ?? ''}`.trim();
      const rowValues = [
        sheet.date,
        staffName,
        new Date(sheet.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sheet.checkOutTime
          ? new Date(sheet.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '—',
        sheet.hoursWorked?.toString() ?? '—',
        sheet.status,
      ];

      for (let i = 0; i < columns.length; i++) {
        doc.text(rowValues[i], x, rowY, { width: columns[i].width, lineBreak: false });
        x += columns[i].width;
      }

      doc.moveDown(0.8);
    }

    if (timesheets.length === 0) {
      doc.text('No timesheet records found for the selected filters.');
    }

    doc.end();
  });
}
