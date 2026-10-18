import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { AuthError, employeeLogin, getCurrentUser, login, refreshTokens, registerFacility, registerStaff } from '../services/auth.service';

const registerStaffSchema = z.object({
  joinCode: z.string().min(4),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  cprIssueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cprExpirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const employeeLoginSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  facilityCode: z.string().min(4),
  password: z.string().min(6),
});

const registerSchema = z.object({
  facilityName: z.string().min(2),
  facilityAddress: z.string().optional(),
  facilityContactInfo: z.string().optional(),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  adminEmail: z.string().email(),
  password: z.string().min(8),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register-staff', async (request, reply) => {
    const body = registerStaffSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'ValidationError', message: 'Invalid staff registration payload' });
    }

    try {
      const result = await registerStaff(app, body.data);
      return reply.status(201).send(result);
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(409).send({ error: 'Conflict', message: error.message });
      }
      throw error;
    }
  });

  app.post('/auth/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'ValidationError', message: 'Invalid registration payload' });
    }

    try {
      const result = await registerFacility(app, body.data);
      return reply.status(201).send(result);
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(409).send({ error: 'Conflict', message: error.message });
      }
      throw error;
    }
  });

  app.post('/auth/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'ValidationError', message: 'Invalid login payload' });
    }

    try {
      const result = await login(app, body.data.email, body.data.password);
      return reply.send(result);
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(401).send({ error: 'Unauthorized', message: error.message });
      }
      throw error;
    }
  });

  app.post('/auth/employee-login', async (request, reply) => {
    const body = employeeLoginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'ValidationError', message: 'Invalid employee login payload' });
    }

    try {
      const result = await employeeLogin(app, body.data);
      return reply.send(result);
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(401).send({ error: 'Unauthorized', message: error.message });
      }
      throw error;
    }
  });

  app.post('/auth/refresh', async (request, reply) => {
    const body = refreshSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'ValidationError', message: 'Invalid refresh payload' });
    }

    try {
      const result = await refreshTokens(app, body.data.refreshToken);
      return reply.send(result);
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(401).send({ error: 'Unauthorized', message: error.message });
      }
      throw error;
    }
  });

  app.post('/auth/logout', { preHandler: authenticate }, async (_request, reply) => {
    return reply.send({ message: 'Logged out successfully' });
  });

  app.get('/auth/me', { preHandler: authenticate }, async (request, reply) => {
    try {
      const user = await getCurrentUser(request.authUser!.id);
      return reply.send({ user });
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(401).send({ error: 'Unauthorized', message: error.message });
      }
      throw error;
    }
  });
}
