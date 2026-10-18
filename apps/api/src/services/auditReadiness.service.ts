import type { AuthUser } from '@afh/shared';
import {
  AUDIT_CHECKLIST_TEMPLATE,
  MANUAL_CHECKLIST_KEYS,
  type AuditChecklistItemResult,
  type AuditChecklistItemStatus,
  type AuditReadinessSummary,
} from '@afh/shared';
import { getCprStatus } from '@afh/shared';
import { prisma } from '../lib/prisma';
import { auditContext, createAuditLog } from '../repositories/audit.repository';
import { findChecklistStatuses, upsertChecklistStatus } from '../repositories/checklist.repository';
import { isEmployerRole } from '../lib/roles';

export class AuditReadinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuditReadinessError';
  }
}

function isCaregiver(role: string): boolean {
  const normalized = role.toLowerCase();
  return normalized.includes('caregiver') || normalized === 'staff';
}

function scoreStatus(status: AuditChecklistItemStatus): 'good' | 'warn' | 'bad' | 'skip' {
  if (status === 'pass' || status === 'complete') {
    return 'good';
  }
  if (status === 'warn') {
    return 'warn';
  }
  if (status === 'not_applicable') {
    return 'skip';
  }
  return 'bad';
}

export async function getAuditReadiness(user: AuthUser): Promise<AuditReadinessSummary> {
  const facilityId = user.facilityId;

  const [caregivers, clients, manualStatuses, timesheetCount, shiftCount] = await Promise.all([
    prisma.staff.findMany({
      where: { facilityId, status: { not: 'archived' } },
      include: {
        user: true,
        certifications: {
          where: { certType: 'CPR' },
          orderBy: { expirationDate: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.client.findMany({
      where: { facilityId, status: 'active' },
      include: {
        assignments: true,
        documents: true,
      },
    }),
    findChecklistStatuses(facilityId),
    prisma.timesheet.count({
      where: {
        status: 'closed',
        staff: { facilityId },
        checkOutTime: { gte: daysAgo(30) },
      },
    }),
    prisma.scheduleShift.count({
      where: { facilityId },
    }),
  ]);

  const caregiverRows = caregivers.filter((member) => isCaregiver(member.role));
  const manualMap = new Map(manualStatuses.map((row) => [row.itemKey, row]));

  const autoResults: Record<string, AuditChecklistItemResult> = {
    staff_cpr_on_file: evaluateStaffCprOnFile(caregiverRows),
    staff_cpr_not_expired: evaluateStaffCprNotExpired(caregiverRows),
    staff_login_enabled: evaluateStaffLogin(caregiverRows),
    client_care_plan: evaluateClientCarePlan(clients),
    client_needs_documented: evaluateClientNeeds(clients),
    client_caregiver_assigned: evaluateClientAssignments(clients),
    client_hospital_plan: evaluateClientHospitalPlan(clients),
    records_timesheets_recent: {
      key: 'records_timesheets_recent',
      domain: 'records',
      kind: 'auto',
      label: 'Staff hours recorded (last 30 days)',
      description: 'Closed timesheets exist within the last 30 days.',
      status: timesheetCount > 0 ? 'pass' : 'fail',
      summary:
        timesheetCount > 0
          ? `${timesheetCount} closed shift record(s) in the last 30 days.`
          : 'No closed timesheets in the last 30 days.',
      fixHref: '/my-shift',
    },
    records_schedule_exists: {
      key: 'records_schedule_exists',
      domain: 'records',
      kind: 'auto',
      label: 'Schedule on file',
      description: 'At least one scheduled shift exists for your facility.',
      status: shiftCount > 0 ? 'pass' : 'warn',
      summary: shiftCount > 0 ? `${shiftCount} shift(s) on record.` : 'No schedule shifts created yet.',
      fixHref: '/schedule',
    },
  };

  const items: AuditChecklistItemResult[] = AUDIT_CHECKLIST_TEMPLATE.map((template) => {
    if (template.kind === 'auto') {
      return autoResults[template.key] ?? {
        key: template.key,
        domain: template.domain,
        kind: template.kind,
        label: template.label,
        description: template.description,
        status: 'fail' as const,
        summary: 'Unable to evaluate this item.',
        fixHref: template.fixHref,
      };
    }

    const saved = manualMap.get(template.key);
    const manualStatus = saved?.status ?? 'pending';
    let status: AuditChecklistItemStatus = 'pending';
    if (manualStatus === 'complete') {
      status = 'complete';
    } else if (manualStatus === 'not_applicable') {
      status = 'not_applicable';
    } else {
      status = 'pending';
    }

    return {
      key: template.key,
      domain: template.domain,
      kind: template.kind,
      label: template.label,
      description: template.description,
      status,
      summary:
        manualStatus === 'complete'
          ? saved?.notes?.trim() || 'Marked complete by supervisor.'
          : manualStatus === 'not_applicable'
            ? 'Marked not applicable for this home.'
            : 'Waiting for supervisor confirmation.',
    };
  });

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;
  let pendingCount = 0;

  const byDomain: AuditReadinessSummary['byDomain'] = {
    staff: { pass: 0, total: 0 },
    clients: { pass: 0, total: 0 },
    operations: { pass: 0, total: 0 },
    records: { pass: 0, total: 0 },
  };

  for (const item of items) {
    const bucket = scoreStatus(item.status);
    if (bucket === 'skip') {
      continue;
    }

    byDomain[item.domain].total += 1;
    if (bucket === 'good') {
      passCount += 1;
      byDomain[item.domain].pass += 1;
    } else if (bucket === 'warn') {
      warnCount += 1;
    } else if (item.status === 'pending') {
      pendingCount += 1;
      failCount += 1;
    } else {
      failCount += 1;
    }
  }

  const totalCount = passCount + warnCount + failCount + pendingCount;
  const percentReady =
    totalCount === 0 ? 0 : Math.round(((passCount + warnCount * 0.5) / totalCount) * 100);

  return {
    passCount,
    warnCount,
    failCount,
    pendingCount,
    totalCount,
    percentReady,
    byDomain,
    items,
    generatedAt: new Date().toISOString(),
  };
}

export async function updateManualChecklistItem(
  user: AuthUser,
  itemKey: string,
  input: { status: 'complete' | 'pending' | 'not_applicable'; notes?: string | null },
) {
  if (!isEmployerRole(user.role)) {
    throw new AuditReadinessError('Only supervisors can update checklist items');
  }

  if (!MANUAL_CHECKLIST_KEYS.includes(itemKey)) {
    throw new AuditReadinessError('Unknown checklist item');
  }

  const row = await upsertChecklistStatus({
    facilityId: user.facilityId,
    itemKey,
    status: input.status,
    notes: input.notes?.trim() || null,
    updatedByUserId: user.id,
  });

  await createAuditLog({
    ...auditContext(user),
    action: 'UPDATE',
    tableName: 'facility_checklist_status',
    recordId: row.id,
    changes: { itemKey, status: input.status },
  });

  return getAuditReadiness(user);
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function evaluateStaffCprOnFile(
  caregivers: Array<{
    firstName: string;
    lastName: string;
    certifications: { issueDate: Date; expirationDate: Date }[];
  }>,
): AuditChecklistItemResult {
  if (caregivers.length === 0) {
    return {
      key: 'staff_cpr_on_file',
      domain: 'staff',
      kind: 'auto',
      label: 'CPR certification on file for caregivers',
      description: 'Every active caregiver has CPR issue and expiration dates recorded.',
      status: 'warn',
      summary: 'No caregivers on the roster yet.',
      fixHref: '/training',
    };
  }

  const missing = caregivers.filter((member) => member.certifications.length === 0);
  return {
    key: 'staff_cpr_on_file',
    domain: 'staff',
    kind: 'auto',
    label: 'CPR certification on file for caregivers',
    description: 'Every active caregiver has CPR issue and expiration dates recorded.',
    status: missing.length === 0 ? 'pass' : 'fail',
    summary:
      missing.length === 0
        ? `All ${caregivers.length} caregiver(s) have CPR dates on file.`
        : `${missing.length} caregiver(s) missing CPR dates: ${missing.map((m) => `${m.firstName} ${m.lastName}`).join(', ')}.`,
    fixHref: '/training',
  };
}

function evaluateStaffCprNotExpired(
  caregivers: Array<{
    firstName: string;
    lastName: string;
    certifications: { issueDate: Date; expirationDate: Date }[];
  }>,
): AuditChecklistItemResult {
  const expired = caregivers.filter((member) => {
    const cpr = member.certifications[0];
    if (!cpr) {
      return false;
    }
    return getCprStatus(cpr.expirationDate) === 'expired';
  });

  return {
    key: 'staff_cpr_not_expired',
    domain: 'staff',
    kind: 'auto',
    label: 'No expired CPR certifications',
    description: 'No caregiver on the roster has CPR past its expiration date.',
    status: expired.length === 0 ? 'pass' : 'fail',
    summary:
      expired.length === 0
        ? 'No expired CPR on file.'
        : `Expired CPR: ${expired.map((m) => `${m.firstName} ${m.lastName}`).join(', ')}.`,
    fixHref: '/training',
  };
}

function evaluateStaffLogin(
  caregivers: Array<{ firstName: string; lastName: string; user: { id: string } | null }>,
): AuditChecklistItemResult {
  if (caregivers.length === 0) {
    return {
      key: 'staff_login_enabled',
      domain: 'staff',
      kind: 'auto',
      label: 'Caregivers can sign in for check-in',
      description: 'Each active caregiver has a staff login created by the supervisor.',
      status: 'warn',
      summary: 'No caregivers on the roster yet.',
      fixHref: '/staff',
    };
  }

  const missing = caregivers.filter((member) => !member.user);
  return {
    key: 'staff_login_enabled',
    domain: 'staff',
    kind: 'auto',
    label: 'Caregivers can sign in for check-in',
    description: 'Each active caregiver has a staff login created by the supervisor.',
    status: missing.length === 0 ? 'pass' : 'fail',
    summary:
      missing.length === 0
        ? 'Every caregiver has a login account.'
        : `Missing login: ${missing.map((m) => `${m.firstName} ${m.lastName}`).join(', ')}.`,
    fixHref: '/staff',
  };
}

function evaluateClientCarePlan(
  clients: Array<{ firstName: string; lastName: string; dailyCarePlan: string | null }>,
): AuditChecklistItemResult {
  if (clients.length === 0) {
    return {
      key: 'client_care_plan',
      domain: 'clients',
      kind: 'auto',
      label: 'Daily care plan documented',
      description: 'Each active client has a written daily care plan in their profile.',
      status: 'warn',
      summary: 'No active clients yet.',
      fixHref: '/clients',
    };
  }

  const missing = clients.filter((client) => !client.dailyCarePlan?.trim());
  return {
    key: 'client_care_plan',
    domain: 'clients',
    kind: 'auto',
    label: 'Daily care plan documented',
    description: 'Each active client has a written daily care plan in their profile.',
    status: missing.length === 0 ? 'pass' : 'fail',
    summary:
      missing.length === 0
        ? 'Every client has a daily care plan.'
        : `Missing care plan: ${missing.map((c) => `${c.firstName} ${c.lastName}`).join(', ')}.`,
    fixHref: '/clients',
  };
}

function evaluateClientNeeds(
  clients: Array<{ firstName: string; lastName: string; healthProblems: string | null; needs: string | null }>,
): AuditChecklistItemResult {
  if (clients.length === 0) {
    return {
      key: 'client_needs_documented',
      domain: 'clients',
      kind: 'auto',
      label: 'Health needs and preferences documented',
      description: 'Each client profile includes health problems and/or care needs.',
      status: 'warn',
      summary: 'No active clients yet.',
      fixHref: '/clients',
    };
  }

  const missing = clients.filter(
    (client) => !client.healthProblems?.trim() && !client.needs?.trim(),
  );
  return {
    key: 'client_needs_documented',
    domain: 'clients',
    kind: 'auto',
    label: 'Health needs and preferences documented',
    description: 'Each client profile includes health problems and/or care needs.',
    status: missing.length === 0 ? 'pass' : 'fail',
    summary:
      missing.length === 0
        ? 'Health needs documented for all clients.'
        : `Add health/needs for: ${missing.map((c) => `${c.firstName} ${c.lastName}`).join(', ')}.`,
    fixHref: '/clients',
  };
}

function evaluateClientAssignments(
  clients: Array<{ firstName: string; lastName: string; assignments: unknown[] }>,
): AuditChecklistItemResult {
  if (clients.length === 0) {
    return {
      key: 'client_caregiver_assigned',
      domain: 'clients',
      kind: 'auto',
      label: 'Caregiver assigned to each client',
      description: 'Every active client has at least one assigned employee.',
      status: 'warn',
      summary: 'No active clients yet.',
      fixHref: '/clients',
    };
  }

  const missing = clients.filter((client) => client.assignments.length === 0);
  return {
    key: 'client_caregiver_assigned',
    domain: 'clients',
    kind: 'auto',
    label: 'Caregiver assigned to each client',
    description: 'Every active client has at least one assigned employee.',
    status: missing.length === 0 ? 'pass' : 'fail',
    summary:
      missing.length === 0
        ? 'All clients have assigned caregivers.'
        : `Assign staff for: ${missing.map((c) => `${c.firstName} ${c.lastName}`).join(', ')}.`,
    fixHref: '/clients',
  };
}

function evaluateClientHospitalPlan(
  clients: Array<{ firstName: string; lastName: string; documents: { category: string }[] }>,
): AuditChecklistItemResult {
  if (clients.length === 0) {
    return {
      key: 'client_hospital_plan',
      domain: 'clients',
      kind: 'auto',
      label: 'Hospital or physician care plan on file (recommended)',
      description: 'Hospital or discharge care plan PDF uploaded when available.',
      status: 'warn',
      summary: 'No active clients yet.',
      fixHref: '/clients',
    };
  }

  const missing = clients.filter(
    (client) => !client.documents.some((doc) => doc.category === 'hospital_care_plan'),
  );
  return {
    key: 'client_hospital_plan',
    domain: 'clients',
    kind: 'auto',
    label: 'Hospital or physician care plan on file (recommended)',
    description: 'Hospital or discharge care plan PDF uploaded when available.',
    status: missing.length === 0 ? 'pass' : 'warn',
    summary:
      missing.length === 0
        ? 'Hospital care plan PDF on file for all clients.'
        : `${missing.length} client(s) without hospital plan PDF (recommended, not required).`,
    fixHref: '/clients',
  };
}
