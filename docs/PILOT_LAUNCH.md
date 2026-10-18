# Pilot launch (send AFH Helper to your supervisor)

This guide is for hosting **v1** so a supervisor (e.g. your aunt) can use a **real empty facility**—no demo employees.

## How login works

| Who | Where | Credentials |
|-----|--------|-------------|
| **Supervisor** | Welcome → **Supervisor** | Email + password from **Register** (or signup) |
| **Caregiver** | Welcome → **Caregiver staff** | First name, last name, **facility code**, password **the supervisor set** when adding them in My Employees |

Caregivers are **not** on the roster until the supervisor adds them. After that, they can check in and log hours.

## One-time setup for the supervisor

1. Open your hosted app URL.
2. Tap **Register** (or **New facility? Register** on the welcome screen).
3. Enter facility name and **her email** + password.
4. She lands on **Home** with **zero caregivers**.
5. Note the **Caregiver facility code** on Home (also shown after adding an employee).
6. **My Employees → Add employee** for each caregiver (name, hire date, login password; CPR optional).
7. Share with each caregiver: exact first/last name, facility code, and password.

## Deploy checklist (operator)

See **[DEPLOY.md](./DEPLOY.md)** for Vercel (web) + Railway/Render (API) + R2/S3 (documents).

1. **New empty PostgreSQL** — migrations only; **no demo seed**.
2. **R2 or S3** — set `S3_*` env vars on the API; bucket private.
3. **API** — `CORS_ORIGINS` = your Vercel URL; strong JWT secrets.
4. **Vercel** — `VITE_API_URL` = your API URL.
5. Aunt uses **Register** on the live site (she has no data until then).

## Local demo (developers only)

```bash
npm run db:setup   # starts Postgres, migrates, loads Sunrise demo (SEED_DEMO=true)
```

Empty seed (like production):

```bash
npm run db:migrate
npm run db:seed    # skips demo unless SEED_DEMO=true
```
