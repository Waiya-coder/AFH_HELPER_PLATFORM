import archiver from 'archiver';
import PDFDocument from 'pdfkit';
import type { AuthUser } from '@afh/shared';
import { getCprStatus } from '@afh/shared';
import { prisma } from '../lib/prisma';
import { auditContext, createAuditLog } from '../repositories/audit.repository';
import { getAuditReadiness } from './auditReadiness.service';
import { exportTimesheetsCsv } from './timesheet.service';

function dateRangeLastDays(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

async function buildReadinessPdf(user: AuthUser, readiness: Awaited<ReturnType<typeof getAuditReadiness>>) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('AFH Helper — Audit Readiness Summary', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#64748b').text(`Generated: ${new Date().toLocaleString()}`, {
      align: 'center',
    });
    doc.fillColor('#000000');
    doc.moveDown(1);
    doc.fontSize(14).text(`Overall readiness: ${readiness.percentReady}%`);
    doc.fontSize(11).text(
      `Pass: ${readiness.passCount} · Warnings: ${readiness.warnCount} · Needs attention: ${readiness.failCount + readiness.pendingCount}`,
    );
    doc.moveDown(1);

    for (const item of readiness.items) {
      doc.font('Helvetica-Bold').fontSize(10).text(`${item.label} — ${item.status.toUpperCase()}`);
      doc.font('Helvetica').fontSize(9).text(item.summary);
      doc.moveDown(0.4);
    }

    doc.end();
  });
}

async function buildStaffRosterCsv(facilityId: string): Promise<string> {
  const staff = await prisma.staff.findMany({
    where: { facilityId, status: { not: 'archived' } },
    include: {
      certifications: {
        where: { certType: 'CPR' },
        orderBy: { expirationDate: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  const header = ['First Name', 'Last Name', 'Role', 'CPR Issue', 'CPR Expires', 'CPR Status'].join(',');
  const rows = staff.map((member) => {
    const cpr = member.certifications[0];
    const status = cpr ? getCprStatus(cpr.expirationDate) : 'missing';
    return [
      member.firstName,
      member.lastName,
      member.role,
      cpr ? cpr.issueDate.toISOString().split('T')[0] : '',
      cpr ? cpr.expirationDate.toISOString().split('T')[0] : '',
      status,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(',');
  });

  return [header, ...rows].join('\n');
}

async function buildClientsCsv(facilityId: string): Promise<string> {
  const clients = await prisma.client.findMany({
    where: { facilityId, status: 'active' },
    include: {
      assignments: { include: { staff: { select: { firstName: true, lastName: true } } } },
      documents: true,
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  const header = [
    'First Name',
    'Last Name',
    'DOB',
    'Has Daily Plan',
    'Has Health/Needs',
    'Assigned Staff',
    'Hospital Plan PDF',
  ].join(',');

  const rows = clients.map((client) => {
    const assigned = client.assignments
      .map((row) => `${row.staff.firstName} ${row.staff.lastName}`)
      .join('; ');
    const hasPlan = Boolean(client.dailyCarePlan?.trim());
    const hasNeeds = Boolean(client.healthProblems?.trim() || client.needs?.trim());
    const hasHospital = client.documents.some((doc) => doc.category === 'hospital_care_plan');
    return [
      client.firstName,
      client.lastName,
      client.dateOfBirth.toISOString().split('T')[0],
      hasPlan ? 'yes' : 'no',
      hasNeeds ? 'yes' : 'no',
      assigned,
      hasHospital ? 'yes' : 'no',
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(',');
  });

  return [header, ...rows].join('\n');
}

export async function buildAuditPacket(user: AuthUser): Promise<Buffer> {
  const range = dateRangeLastDays(90);
  const [readiness, timesheetsCsv, rosterCsv, clientsCsv] = await Promise.all([
    getAuditReadiness(user),
    exportTimesheetsCsv(user, range),
    buildStaffRosterCsv(user.facilityId),
    buildClientsCsv(user.facilityId),
  ]);

  const readinessPdf = await buildReadinessPdf(user, readiness);

  return new Promise<Buffer>((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    archive.append(readinessPdf, { name: 'audit-readiness-summary.pdf' });
    archive.append(timesheetsCsv, { name: 'timesheets-last-90-days.csv' });
    archive.append(rosterCsv, { name: 'staff-roster-cpr.csv' });
    archive.append(clientsCsv, { name: 'clients-summary.csv' });
    archive.append(JSON.stringify(readiness, null, 2), { name: 'readiness-checklist.json' });

    archive.finalize();
  }).then(async (buffer) => {
    await createAuditLog({
      ...auditContext(user),
      action: 'EXPORT',
      tableName: 'audit_packet',
      recordId: user.facilityId,
      changes: { range, percentReady: readiness.percentReady },
    });
    return buffer;
  });
}
