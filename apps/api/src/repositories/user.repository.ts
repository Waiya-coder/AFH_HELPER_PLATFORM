import { prisma } from '../lib/prisma';

export async function createUser(input: {
  email: string;
  passwordHash: string;
  role: 'staff' | 'supervisor' | 'admin' | 'auditor';
  facilityId: string;
  staffId?: string;
}) {
  return prisma.user.create({
    data: input,
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: { staff: true },
  });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { staff: true },
  });
}

export async function findUserByStaffId(staffId: string) {
  return prisma.user.findUnique({
    where: { staffId },
    include: { staff: true },
  });
}
