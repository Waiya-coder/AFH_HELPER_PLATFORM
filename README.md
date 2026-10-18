# AFH Helper Platform

Staff management and audit-ready platform for assisted facilities and home healthcare agencies.

See [docs/MASTER_SPECIFICATION.md](./docs/MASTER_SPECIFICATION.md) for the full product specification.

## Tech Stack

- **Monorepo** — npm workspaces (`apps/api`, `apps/web`, `packages/shared`)
- **API** — Node.js, Fastify, TypeScript, Prisma, PostgreSQL, PDFKit
- **Web** — React, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query
- **Local dev** — Docker Compose (PostgreSQL)

## Prerequisites

- Node.js 20+
- Docker Desktop (or Docker Engine + Compose)

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
cp .env.example apps/api/.env

# Start PostgreSQL, run migrations, seed local demo data (Sunrise facility)
npm run db:setup

# Start API and web (in separate terminals)
npm run dev:api
npm run dev:web
```

- **Web:** http://localhost:5173
- **API:** http://localhost:3001
- **Health:** http://localhost:3001/health

## Multi-Facility Signup

New facilities can register from day one at **http://localhost:5173/signup**. Each registration:

1. Creates a new `facility` record
2. Creates an admin `staff` profile
3. Creates an `admin` user linked to that facility
4. Logs the registration in the audit trail
5. Signs the user in automatically

Existing facilities sign in at `/login`. All data is scoped by `facility_id`.

## Pilot / production

Supervisors **register a new facility** at `/signup` (empty roster). See [docs/PILOT_LAUNCH.md](./docs/PILOT_LAUNCH.md).

Deploy: set `CORS_ORIGINS`, `VITE_API_URL`, run `npm run db:migrate:deploy`, do **not** use `SEED_DEMO=true` in production.

## Demo Accounts (local only, `npm run db:seed:demo`)

| Role       | Email                    | Password     |
|------------|--------------------------|--------------|
| Admin      | admin@demo.afh           | password123  |
| Supervisor | supervisor@demo.afh      | password123  |
| Staff      | staff@demo.afh           | password123  |
| Auditor    | auditor@demo.afh         | password123  |

## Project Structure

```
apps/
  api/          Fastify REST API
  web/          React web application
packages/
  shared/       Shared types and constants
docs/
  MASTER_SPECIFICATION.md
```

## MVP Features (Phase 1)

- [x] Monorepo with shared types
- [x] Multi-facility registration (`POST /auth/register`)
- [x] User authentication with role-based access
- [x] Staff check-in / check-out
- [x] Employee directory with status badges
- [x] Timesheet export (CSV + PDF)
- [x] Immutable audit logging

## Scripts

| Command | Description |
|---------|-------------|
| `npm run db:up` | Start PostgreSQL container |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed demo facility and users |
| `npm run dev:api` | Start API dev server |
| `npm run dev:web` | Start web dev server |
| `npm run test` | Run all tests |
