import type { StaffStatus } from '@afh/shared';
import { prisma } from '../lib/prisma';

export interface CreateStaffInput {
  facilityId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  hireDate: Date;
}

export interface UpdateStaffInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  role?: string;
  status?: StaffStatus;
  profileComplete?: boolean;
  hireDate?: Date;
}

export async function findStaffByFacility(facilityId: string, search?: string) {
  return prisma.staff.findMany({
    where: {
      facilityId,
      status: { not: 'archived' },
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      certifications: {
        where: { certType: 'CPR' },
        orderBy: { expirationDate: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ status: 'asc' }, { lastName: 'asc' }],
  });
}

export async function findStaffWithProfile(staffId: string) {
  return prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      certifications: {
        where: { certType: 'CPR' },
        orderBy: { expirationDate: 'desc' },
        take: 1,
      },
    },
  });
}

export async function findStaffById(id: string, facilityId: string) {
  return prisma.staff.findFirst({
    where: { id, facilityId },
  });
}

export async function findStaffByName(
  facilityId: string,
  firstName: string,
  lastName: string,
) {
  return prisma.staff.findFirst({
    where: {
      facilityId,
      status: { not: 'archived' },
      firstName: { equals: firstName, mode: 'insensitive' },
      lastName: { equals: lastName, mode: 'insensitive' },
    },
    include: {
      user: true,
      certifications: {
        where: { certType: 'CPR' },
        orderBy: { expirationDate: 'desc' },
        take: 1,
      },
    },
  });
}

export async function createStaff(input: CreateStaffInput) {
  return prisma.staff.create({ data: input });
}

export async function updateStaff(id: string, facilityId: string, input: UpdateStaffInput) {
  return prisma.staff.update({
    where: { id, facilityId },
    data: input,
  });
}

export async function archiveStaff(id: string, facilityId: string) {
  return prisma.staff.update({
    where: { id, facilityId },
    data: { status: 'archived' },
  });
}

export async function updateStaffStatus(id: string, status: StaffStatus) {
  return prisma.staff.update({
    where: { id },
    data: { status },
  });
}
