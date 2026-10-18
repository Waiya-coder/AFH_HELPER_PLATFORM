import { prisma } from '../lib/prisma';

const CPR_CERT_TYPE = 'CPR';

export async function findCprCertification(staffId: string) {
  return prisma.certification.findFirst({
    where: { staffId, certType: CPR_CERT_TYPE },
    orderBy: { expirationDate: 'desc' },
  });
}

export async function upsertCprCertification(
  staffId: string,
  issueDate: Date,
  expirationDate: Date,
) {
  const existing = await findCprCertification(staffId);

  if (existing) {
    return prisma.certification.update({
      where: { id: existing.id },
      data: { issueDate, expirationDate },
    });
  }

  return prisma.certification.create({
    data: {
      staffId,
      certType: CPR_CERT_TYPE,
      issueDate,
      expirationDate,
      issuingBody: 'Self-reported',
    },
  });
}

export async function getTotalHoursWorked(staffId: string): Promise<number> {
  const result = await prisma.timesheet.aggregate({
    where: { staffId, status: 'closed' },
    _sum: { hoursWorked: true },
  });

  return Number(result._sum.hoursWorked ?? 0);
}

export async function getTotalHoursByStaffIds(
  staffIds: string[],
): Promise<Map<string, number>> {
  if (staffIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.timesheet.groupBy({
    by: ['staffId'],
    where: { staffId: { in: staffIds }, status: 'closed' },
    _sum: { hoursWorked: true },
  });

  return new Map(rows.map((row) => [row.staffId, Number(row._sum.hoursWorked ?? 0)]));
}
