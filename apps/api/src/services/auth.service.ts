import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import type { AuthUser } from '@afh/shared';
import { generateJoinCode } from '@afh/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { createAuditLog } from '../repositories/audit.repository';
import { findFacilityByJoinCode } from '../repositories/facility.repository';
import { findStaffByName } from '../repositories/staff.repository';
import { createUser, findUserByEmail, findUserById } from '../repositories/user.repository';
import type { JwtPayload } from '../lib/auth-types';

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

function buildAuthUser(user: {
  id: string;
  email: string;
  role: string;
  facilityId: string;
  staffId: string | null;
  staff?: { profileComplete: boolean } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role as AuthUser['role'],
    facilityId: user.facilityId,
    staffId: user.staffId,
    profileComplete: user.staff?.profileComplete ?? (user.role !== 'staff'),
  };
}

function buildTokenPayload(user: {
  id: string;
  email: string;
  role: string;
  facilityId: string;
  staffId: string | null;
}, type: 'access' | 'refresh'): JwtPayload {
  return {
    id: user.id,
    email: user.email,
    role: user.role as AuthUser['role'],
    facilityId: user.facilityId,
    staffId: user.staffId,
    type,
  };
}

export async function login(app: FastifyInstance, email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AuthError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AuthError('Invalid email or password');
  }

  if (user.role === 'staff') {
    throw new AuthError(
      'Caregiver staff sign in with first name, last name, facility code, and password on the welcome screen.',
    );
  }

  const accessToken = app.jwt.sign(buildTokenPayload(user, 'access'), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  });

  const refreshToken = app.jwt.sign(buildTokenPayload(user, 'refresh'), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  });

  return {
    accessToken,
    refreshToken,
    user: buildAuthUser(user),
  };
}

export async function employeeLogin(
  app: FastifyInstance,
  input: {
    firstName: string;
    lastName: string;
    facilityCode: string;
    password: string;
  },
) {
  const facility = await findFacilityByJoinCode(input.facilityCode);
  if (!facility) {
    throw new AuthError('Invalid facility code. Ask your supervisor for the correct code.');
  }

  const staff = await findStaffByName(
    facility.id,
    input.firstName.trim(),
    input.lastName.trim(),
  );

  if (!staff) {
    throw new AuthError(
      'You are not on the employee roster. Ask your supervisor to add you first.',
    );
  }

  if (!staff.user) {
    throw new AuthError(
      'Your login has not been set up yet. Ask your supervisor to create your employee account.',
    );
  }

  if (staff.user.role !== 'staff') {
    throw new AuthError('Invalid name or password');
  }

  const valid = await bcrypt.compare(input.password, staff.user.passwordHash);
  if (!valid) {
    throw new AuthError('Invalid name or password');
  }

  const user = staff.user;

  const accessToken = app.jwt.sign(buildTokenPayload(user, 'access'), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  });

  const refreshToken = app.jwt.sign(buildTokenPayload(user, 'refresh'), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  });

  return {
    accessToken,
    refreshToken,
    user: buildAuthUser({ ...user, staff: { profileComplete: staff.profileComplete } }),
  };
}

export async function refreshTokens(app: FastifyInstance, refreshToken: string) {
  let payload: JwtPayload;
  try {
    payload = app.jwt.verify<JwtPayload>(refreshToken);
  } catch {
    throw new AuthError('Invalid refresh token');
  }

  if (payload.type !== 'refresh') {
    throw new AuthError('Invalid refresh token');
  }

  const user = await findUserById(payload.id);
  if (!user) {
    throw new AuthError('User not found');
  }

  const accessToken = app.jwt.sign(buildTokenPayload(user, 'access'), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  });

  const newRefreshToken = app.jwt.sign(buildTokenPayload(user, 'refresh'), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: buildAuthUser(user),
  };
}

export async function getCurrentUser(userId: string): Promise<AuthUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AuthError('User not found');
  }

  return buildAuthUser(user);
}

export async function registerFacility(
  app: FastifyInstance,
  input: {
    facilityName: string;
    facilityAddress?: string;
    facilityContactInfo?: string;
    adminFirstName: string;
    adminLastName: string;
    adminEmail: string;
    password: string;
  },
) {
  const existing = await findUserByEmail(input.adminEmail);
  if (existing) {
    throw new AuthError('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const joinCode = generateJoinCode();
    const facility = await tx.facility.create({
      data: {
        name: input.facilityName,
        address: input.facilityAddress,
        contactInfo: input.facilityContactInfo,
        subscriptionPlan: 'standard',
        joinCode,
      },
    });

    const staff = await tx.staff.create({
      data: {
        facilityId: facility.id,
        firstName: input.adminFirstName,
        lastName: input.adminLastName,
        email: input.adminEmail,
        role: 'Supervisor',
        status: 'active',
        profileComplete: true,
        hireDate: new Date(),
      },
    });

    const user = await tx.user.create({
      data: {
        email: input.adminEmail,
        passwordHash,
        role: 'supervisor',
        facilityId: facility.id,
        staffId: staff.id,
      },
    });

    return { facility, staff, user };
  });

  await createAuditLog({
    facilityId: result.facility.id,
    userId: result.user.id,
    action: 'REGISTER',
    tableName: 'facilities',
    recordId: result.facility.id,
    changes: {
      facilityName: result.facility.name,
      adminEmail: result.user.email,
    },
  });

  const accessToken = app.jwt.sign(buildTokenPayload(result.user, 'access'), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  });

  const refreshToken = app.jwt.sign(buildTokenPayload(result.user, 'refresh'), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  });

  return {
    accessToken,
    refreshToken,
    user: buildAuthUser(result.user),
    facility: {
      id: result.facility.id,
      name: result.facility.name,
      address: result.facility.address,
      contactInfo: result.facility.contactInfo,
      joinCode: result.facility.joinCode,
    },
  };
}

export async function registerStaff(
  app: FastifyInstance,
  input: {
    joinCode: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    cprIssueDate: string;
    cprExpirationDate: string;
  },
) {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new AuthError('An account with this email already exists');
  }

  const facility = await prisma.facility.findUnique({
    where: { joinCode: input.joinCode.toUpperCase().trim() },
  });

  if (!facility) {
    throw new AuthError('Invalid facility code. Ask your supervisor for the correct code.');
  }

  const issueDate = new Date(input.cprIssueDate);
  const expirationDate = new Date(input.cprExpirationDate);

  if (expirationDate <= issueDate) {
    throw new AuthError('CPR expiration date must be after the start date');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const staff = await tx.staff.create({
      data: {
        facilityId: facility.id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        role: 'Caregiver',
        status: 'off_duty',
        profileComplete: true,
        hireDate: new Date(),
      },
    });

    await tx.certification.create({
      data: {
        staffId: staff.id,
        certType: 'CPR',
        issueDate,
        expirationDate,
        issuingBody: 'Self-reported',
      },
    });

    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: 'staff',
        facilityId: facility.id,
        staffId: staff.id,
      },
    });

    return { staff, user, facility };
  });

  await createAuditLog({
    facilityId: result.facility.id,
    userId: result.user.id,
    action: 'REGISTER_STAFF',
    tableName: 'staff',
    recordId: result.staff.id,
    changes: {
      email: result.user.email,
      firstName: input.firstName,
      lastName: input.lastName,
      cprIssueDate: input.cprIssueDate,
      cprExpirationDate: input.cprExpirationDate,
    },
  });

  const accessToken = app.jwt.sign(buildTokenPayload(result.user, 'access'), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  });

  const refreshToken = app.jwt.sign(buildTokenPayload(result.user, 'refresh'), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  });

  return {
    accessToken,
    refreshToken,
    user: buildAuthUser({ ...result.user, staff: { profileComplete: true } }),
    facility: {
      id: result.facility.id,
      name: result.facility.name,
    },
  };
}
