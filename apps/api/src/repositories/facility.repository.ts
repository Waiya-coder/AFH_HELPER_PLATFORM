import { generateJoinCode } from '@afh/shared';
import { prisma } from '../lib/prisma';

export async function createFacility(input: {
  name: string;
  address?: string;
  contactInfo?: string;
}) {
  let joinCode = generateJoinCode();
  let attempts = 0;

  while (attempts < 10) {
    const existing = await prisma.facility.findUnique({ where: { joinCode } });
    if (!existing) break;
    joinCode = generateJoinCode();
    attempts++;
  }

  return prisma.facility.create({
    data: {
      name: input.name,
      address: input.address,
      contactInfo: input.contactInfo,
      subscriptionPlan: 'standard',
      joinCode,
    },
  });
}

export async function findFacilityById(id: string) {
  return prisma.facility.findUnique({ where: { id } });
}

export async function findFacilityByJoinCode(joinCode: string) {
  return prisma.facility.findUnique({
    where: { joinCode: joinCode.toUpperCase().trim() },
  });
}
