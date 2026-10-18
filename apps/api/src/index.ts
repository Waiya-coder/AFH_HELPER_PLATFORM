import 'dotenv/config';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { facilityRoutes } from './routes/facility.routes';
import { authRoutes } from './routes/auth.routes';
import { staffRoutes } from './routes/staff.routes';
import { timesheetRoutes } from './routes/timesheet.routes';
import { auditRoutes } from './routes/audit.routes';
import { clientRoutes } from './routes/client.routes';
import { scheduleRoutes } from './routes/schedule.routes';
import { CLIENT_DOCUMENT_MAX_BYTES } from '@afh/shared';

const PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);

function clientDocumentMaxBytes(): number {
  const raw = process.env.MAX_CLIENT_DOCUMENT_BYTES;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return CLIENT_DOCUMENT_MAX_BYTES;
}

function corsOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGINS ?? process.env.WEB_ORIGIN;
  if (fromEnv?.trim()) {
    return fromEnv
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
  return ['http://localhost:5173', 'http://127.0.0.1:5173'];
}

async function buildApp() {
  const maxDocumentBytes = clientDocumentMaxBytes();
  const app = Fastify({
    logger: true,
    bodyLimit: maxDocumentBytes + 2 * 1024 * 1024,
  });

  if (!process.env.S3_BUCKET?.trim()) {
    const uploadRoot =
      process.env.UPLOAD_ROOT?.trim() || path.join(process.cwd(), 'uploads', 'clients');
    await mkdir(uploadRoot, { recursive: true });
  }

  await app.register(cors, {
    origin: corsOrigins(),
    credentials: true,
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  });

  await app.register(multipart, {
    limits: { fileSize: maxDocumentBytes, files: 1 },
  });

  app.get('/health', async () => ({ status: 'ok', service: 'afh-api' }));

  await app.register(authRoutes);
  await app.register(facilityRoutes);
  await app.register(staffRoutes);
  await app.register(timesheetRoutes);
  await app.register(auditRoutes);
  await app.register(clientRoutes);
  await app.register(scheduleRoutes);

  return app;
}

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`API running at http://localhost:${PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();

export { buildApp };
