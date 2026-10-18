import bcrypt from 'bcryptjs';
import type { AuthUser, CprStatus } from '@afh/shared';
import { getCprStatus } from '@afh/shared';
import {
  findCprCertification,
  getTotalHoursByStaffIds,
  getTotalHoursWorked,
  upsertCprCertification,
} from '../repositories/certification.repository';
import {
  archiveStaff,
  createStaff,
  findStaffByFacility,
  findStaffById,
  findStaffByName,
  findStaffWithProfile,
  updateStaff,
} from '../repositories/staff.repository';
import { createUser } from '../repositories/user.repository';
import { auditContext, createAuditLog } from '../repositories/audit.repository';

export class StaffError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StaffError';
  }
}

type StaffRecord = Awaited<ReturnType<typeof findStaffByFacility>>[number];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function extractCpr(staff: { certifications?: { issueDate: Date; expirationDate: Date }[] }) {
  const cpr = staff.certifications?.[0];
  return {
    cprIssueDate: cpr ? formatDate(cpr.issueDate) : null,
    cprExpirationDate: cpr ? formatDate(cpr.expirationDate) : null,
    cprStatus: getCprStatus(cpr?.expirationDate ?? null),
  };
}

function serializeStaff(staff: StaffRecord & { profileComplete?: boolean }) {
  return {
    id: staff.id,
    facilityId: staff.facilityId,
    firstName: staff.firstName,
    lastName: staff.lastName,
    email: staff.email,
    phone: staff.phone,
    role: staff.role,
    status: staff.status,
    profileComplete: staff.profileComplete ?? false,
    hireDate: formatDate(staff.hireDate),
    createdAt: staff.createdAt.toISOString(),
    updatedAt: staff.updatedAt.toISOString(),
  };
}

function serializeRosterEntry(
  staff: StaffRecord,
  totalHoursWorked: number,
) {
  const cpr = extractCpr(staff);
  return {
    ...serializeStaff(staff),
    ...cpr,
    totalHoursWorked,
  };
}

export async function listStaff(user: AuthUser, search?: string) {
  const staff = await findStaffByFacility(user.facilityId, search);
  return staff.map(serializeStaff);
}

export async function listStaffRoster(user: AuthUser, search?: string) {
  const staff = await findStaffByFacility(user.facilityId, search);
  const hoursMap = await getTotalHoursByStaffIds(staff.map((member) => member.id));
  return staff.map((member) =>
    serializeRosterEntry(member, hoursMap.get(member.id) ?? 0),
  );
}

export async function getMyProfile(user: AuthUser) {
  if (!user.staffId) {
    throw new StaffError('No staff profile linked to this account');
  }

  const staff = await findStaffWithProfile(user.staffId);
  if (!staff || staff.facilityId !== user.facilityId) {
    throw new StaffError('Staff profile not found');
  }

  const totalHoursWorked = await getTotalHoursWorked(staff.id);
  const cpr = extractCpr(staff);

  return {
    id: staff.id,
    firstName: staff.firstName,
    lastName: staff.lastName,
    email: staff.email,
    profileComplete: staff.profileComplete,
    status: staff.status,
    totalHoursWorked,
    ...cpr,
  };
}

export async function completeMyProfile(
  user: AuthUser,
  input: {
    firstName: string;
    lastName: string;
    cprIssueDate: string;
    cprExpirationDate: string;
  },
) {
  if (user.role !== 'staff') {
    throw new StaffError('Only staff members can complete this profile');
  }

  if (!user.staffId) {
    throw new StaffError('No staff profile linked to this account');
  }

  const staff = await findStaffById(user.staffId, user.facilityId);
  if (!staff) {
    throw new StaffError('Staff profile not found');
  }

  if (staff.profileComplete) {
    throw new StaffError('Profile is already complete');
  }

  const issueDate = new Date(input.cprIssueDate);
  const expirationDate = new Date(input.cprExpirationDate);

  if (expirationDate <= issueDate) {
    throw new StaffError('CPR expiration date must be after the start date');
  }

  await updateStaff(staff.id, user.facilityId, {
    firstName: input.firstName,
    lastName: input.lastName,
    profileComplete: true,
  });

  await upsertCprCertification(staff.id, issueDate, expirationDate);

  await createAuditLog({
    ...auditContext(user),
    action: 'COMPLETE_PROFILE',
    tableName: 'staff',
    recordId: staff.id,
    changes: {
      firstName: input.firstName,
      lastName: input.lastName,
      cprIssueDate: input.cprIssueDate,
      cprExpirationDate: input.cprExpirationDate,
    },
  });

  return getMyProfile(user);
}

export async function getStaff(user: AuthUser, id: string) {
  const staff = await findStaffById(id, user.facilityId);
  if (!staff) {
    throw new StaffError('Staff member not found');
  }
  return serializeStaff({ ...staff, certifications: [] });
}

export async function addStaff(
  user: AuthUser,
  input: {
    firstName: string;
    lastName: string;
    phone?: string;
    hireDate: string;
    password: string;
    cprIssueDate?: string;
    cprExpirationDate?: string;
  },
) {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  const duplicate = await findStaffByName(user.facilityId, firstName, lastName);
  if (duplicate) {
    throw new StaffError('An employee with this name already exists at your facility');
  }

  if (input.password.length < 6) {
    throw new StaffError('Password must be at least 6 characters');
  }

  const hasCpr = Boolean(input.cprIssueDate && input.cprExpirationDate);
  if (hasCpr) {
    const issueDate = new Date(input.cprIssueDate!);
    const expirationDate = new Date(input.cprExpirationDate!);
    if (expirationDate <= issueDate) {
      throw new StaffError('CPR expiration date must be after the start date');
    }
  }

  const emailSlug = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z0-9.]/g, '');
  const email = `${emailSlug}.${Date.now()}@employee.afh`;

  const staff = await createStaff({
    facilityId: user.facilityId,
    firstName,
    lastName,
    email,
    phone: input.phone?.trim() || undefined,
    role: 'Caregiver',
    hireDate: new Date(input.hireDate),
  });

  if (hasCpr) {
    await upsertCprCertification(
      staff.id,
      new Date(input.cprIssueDate!),
      new Date(input.cprExpirationDate!),
    );
    await updateStaff(staff.id, user.facilityId, { profileComplete: true });
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  await createUser({
    email,
    passwordHash,
    role: 'staff',
    facilityId: user.facilityId,
    staffId: staff.id,
  });

  await updateStaff(staff.id, user.facilityId, { profileComplete: true });

  const refreshed = await findStaffWithProfile(staff.id);

  await createAuditLog({
    ...auditContext(user),
    action: 'CREATE',
    tableName: 'staff',
    recordId: staff.id,
    changes: {
      after: serializeStaff({ ...(refreshed ?? staff), certifications: refreshed?.certifications ?? [] }),
      loginEnabled: true,
    },
  });

  return serializeRosterEntry(
    { ...(refreshed ?? staff), certifications: refreshed?.certifications ?? [] },
    0,
  );
}

export async function editStaff(
  user: AuthUser,
  id: string,
  input: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string | null;
    role?: string;
    status?: 'active' | 'on_duty' | 'off_duty' | 'on_break' | 'archived';
    hireDate?: string;
  },
) {
  const existing = await findStaffById(id, user.facilityId);
  if (!existing) {
    throw new StaffError('Staff member not found');
  }

  const staff = await updateStaff(id, user.facilityId, {
    ...input,
    hireDate: input.hireDate ? new Date(input.hireDate) : undefined,
  });

  await createAuditLog({
    ...auditContext(user),
    action: 'UPDATE',
    tableName: 'staff',
    recordId: staff.id,
    changes: {
      before: serializeStaff({ ...existing, certifications: [] }),
      after: serializeStaff({ ...staff, certifications: [] }),
    },
  });

  return serializeStaff({ ...staff, certifications: [] });
}

export async function deactivateStaff(user: AuthUser, id: string) {
  const existing = await findStaffById(id, user.facilityId);
  if (!existing) {
    throw new StaffError('Staff member not found');
  }

  const staff = await archiveStaff(id, user.facilityId);

  await createAuditLog({
    ...auditContext(user),
    action: 'ARCHIVE',
    tableName: 'staff',
    recordId: staff.id,
    changes: {
      before: serializeStaff({ ...existing, certifications: [] }),
      after: serializeStaff({ ...staff, certifications: [] }),
    },
  });

  return serializeStaff({ ...staff, certifications: [] });
}

export async function checkStaffAvailability(user: AuthUser, id: string) {
  const staff = await findStaffById(id, user.facilityId);
  if (!staff) {
    throw new StaffError('Staff member not found');
  }

  return {
    staffId: staff.id,
    available: staff.status === 'active' || staff.status === 'off_duty',
    status: staff.status,
  };
}

export async function isProfileComplete(staffId: string | null | undefined): Promise<boolean> {
  if (!staffId) return false;
  const staff = await findStaffWithProfile(staffId);
  return Boolean(staff?.profileComplete);
}

export { getCprStatus };
export type { CprStatus };
