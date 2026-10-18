import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.SEED_DEMO !== 'true') {
    console.log(
      'Demo seed skipped. Production and pilot installs start with an empty database.',
    );
    console.log('Supervisors register at /signup, then add employees in My Employees.');
    console.log('To load local demo data (Sunrise facility), run: SEED_DEMO=true npm run db:seed -w @afh/api');
    return;
  }

  const passwordHash = await bcrypt.hash('password123', 12);

  const facility = await prisma.facility.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { joinCode: 'SUNR01' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Sunrise Assisted Living',
      address: '123 Care Lane, Portland, OR 97201',
      contactInfo: '503-555-0100',
      subscriptionPlan: 'standard',
      joinCode: 'SUNR01',
    },
  });

  const adminStaff = await prisma.staff.upsert({
    where: { id: '00000000-0000-0000-0000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      facilityId: facility.id,
      firstName: 'Alice',
      lastName: 'Admin',
      email: 'admin@demo.afh',
      phone: '503-555-0101',
      role: 'Administrator',
      status: 'active',
      profileComplete: true,
      hireDate: new Date('2020-01-15'),
    },
  });

  const supervisorStaff = await prisma.staff.upsert({
    where: { id: '00000000-0000-0000-0000-000000000102' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000102',
      facilityId: facility.id,
      firstName: 'Sam',
      lastName: 'Supervisor',
      email: 'supervisor@demo.afh',
      phone: '503-555-0102',
      role: 'Supervisor',
      status: 'active',
      profileComplete: true,
      hireDate: new Date('2021-03-10'),
    },
  });

  const staffMember = await prisma.staff.upsert({
    where: { id: '00000000-0000-0000-0000-000000000103' },
    update: { profileComplete: true },
    create: {
      id: '00000000-0000-0000-0000-000000000103',
      facilityId: facility.id,
      firstName: 'Jordan',
      lastName: 'Caregiver',
      email: 'staff@demo.afh',
      phone: '503-555-0103',
      role: 'Caregiver',
      status: 'off_duty',
      profileComplete: true,
      hireDate: new Date('2022-06-01'),
    },
  });

  const auditorStaff = await prisma.staff.upsert({
    where: { id: '00000000-0000-0000-0000-000000000104' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000104',
      facilityId: facility.id,
      firstName: 'Alex',
      lastName: 'Auditor',
      email: 'auditor@demo.afh',
      phone: '503-555-0104',
      role: 'Auditor',
      status: 'active',
      hireDate: new Date('2023-01-01'),
    },
  });

  await prisma.staff.createMany({
    data: [
      {
        facilityId: facility.id,
        firstName: 'Maria',
        lastName: 'Garcia',
        email: 'maria.garcia@demo.afh',
        phone: '503-555-0105',
        role: 'Caregiver',
        status: 'on_duty',
        hireDate: new Date('2023-04-15'),
      },
      {
        facilityId: facility.id,
        firstName: 'David',
        lastName: 'Chen',
        email: 'david.chen@demo.afh',
        phone: '503-555-0106',
        role: 'Caregiver',
        status: 'off_duty',
        hireDate: new Date('2023-08-20'),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.user.upsert({
    where: { email: 'admin@demo.afh' },
    update: {},
    create: {
      email: 'admin@demo.afh',
      passwordHash,
      role: 'admin',
      facilityId: facility.id,
      staffId: adminStaff.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'supervisor@demo.afh' },
    update: {},
    create: {
      email: 'supervisor@demo.afh',
      passwordHash,
      role: 'supervisor',
      facilityId: facility.id,
      staffId: supervisorStaff.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@demo.afh' },
    update: {},
    create: {
      email: 'staff@demo.afh',
      passwordHash,
      role: 'staff',
      facilityId: facility.id,
      staffId: staffMember.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'auditor@demo.afh' },
    update: {},
    create: {
      email: 'auditor@demo.afh',
      passwordHash,
      role: 'auditor',
      facilityId: facility.id,
      staffId: auditorStaff.id,
    },
  });

  const mariaStaff = await prisma.staff.findFirst({
    where: { email: 'maria.garcia@demo.afh' },
  });
  const davidStaff = await prisma.staff.findFirst({
    where: { email: 'david.chen@demo.afh' },
  });

  const cprRecords = [
    { staffId: staffMember.id, issueDate: '2024-06-01', expirationDate: '2026-06-01' },
    { staffId: '00000000-0000-0000-0000-000000000102', issueDate: '2024-01-01', expirationDate: '2026-01-01' },
    { staffId: adminStaff.id, issueDate: '2023-03-15', expirationDate: '2025-03-15' },
    ...(mariaStaff
      ? [{ staffId: mariaStaff.id, issueDate: '2025-02-01', expirationDate: '2027-02-01' }]
      : []),
    ...(davidStaff
      ? [{ staffId: davidStaff.id, issueDate: '2024-08-01', expirationDate: '2026-09-15' }]
      : []),
  ];

  for (const record of cprRecords) {
    const existing = await prisma.certification.findFirst({
      where: { staffId: record.staffId, certType: 'CPR' },
    });

    if (!existing) {
      await prisma.certification.create({
        data: {
          staffId: record.staffId,
          certType: 'CPR',
          issueDate: new Date(record.issueDate),
          expirationDate: new Date(record.expirationDate),
          issuingBody: 'American Red Cross',
        },
      });
    }
  }

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@demo.afh' },
    select: { id: true },
  });

  const coverageDays = ['2026-08-30', '2026-08-31', '2026-09-01'];

  const shiftTemplates = [
    { startHour: 7, endHour: 15, label: 'Day shift' },
    { startHour: 15, endHour: 23, label: 'Evening shift' },
    { startHour: 23, endHour: 31, label: 'Night shift' },
  ];

  const staffRotation = [
    staffMember.id,
    mariaStaff?.id,
    davidStaff?.id,
    supervisorStaff.id,
  ].filter(Boolean) as string[];

  let rotationIndex = 0;

  function addDaysToDateString(date: string, days: number) {
    const value = new Date(`${date}T12:00:00-07:00`);
    value.setDate(value.getDate() + days);
    return value.toISOString().split('T')[0];
  }

  for (const day of coverageDays) {
    for (const template of shiftTemplates) {
      const startAt = new Date(`${day}T${String(template.startHour).padStart(2, '0')}:00:00-07:00`);
      const endDay = template.endHour >= 24 ? addDaysToDateString(day, 1) : day;
      const endHour = template.endHour >= 24 ? template.endHour - 24 : template.endHour;
      const endAt = new Date(
        `${endDay}T${String(endHour).padStart(2, '0')}:00:00-07:00`,
      );
      const staffId = staffRotation[rotationIndex % staffRotation.length];
      rotationIndex += 1;

      const existing = await prisma.scheduleShift.findFirst({
        where: { facilityId: facility.id, startAt },
      });

      if (existing) {
        continue;
      }

      await prisma.scheduleShift.create({
        data: {
          facilityId: facility.id,
          staffId,
          startAt,
          endAt,
          notes: template.label,
          createdById: adminUser?.id ?? null,
        },
      });
    }
  }

  const demoClient = await prisma.client.upsert({
    where: { id: '00000000-0000-0000-0000-000000000201' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000201',
      facilityId: facility.id,
      firstName: 'Pat',
      lastName: 'Rivera',
      dateOfBirth: new Date('1948-03-12'),
      healthProblems: 'Type 2 diabetes, mild mobility limitations',
      needs: 'Meal reminders, morning medications, walking assistance',
      dailyCarePlan: 'Breakfast by 8am, meds at 9am, short walk after lunch, check blood sugar before dinner.',
      status: 'active',
    },
  });

  await prisma.clientStaffAssignment.upsert({
    where: {
      clientId_staffId: {
        clientId: demoClient.id,
        staffId: staffMember.id,
      },
    },
    update: {},
    create: {
      clientId: demoClient.id,
      staffId: staffMember.id,
    },
  });

  console.log('Seed completed: demo facility and users created.');
  console.log('Facility join code for new staff: SUNR01');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
