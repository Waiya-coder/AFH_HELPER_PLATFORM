# Start deployment (do these in order)

## Phase 0 — You need (15 min setup)

- [ ] **GitHub repo** with this code pushed (Vercel + Render connect to GitHub)
- [ ] **Cloudflare R2** (or AWS S3): private bucket + access key / secret
- [ ] **Render** account (API + Postgres) — or Railway with Dockerfile
- [ ] **Vercel** account (web app)

Generate JWT secrets locally (paste into Render env):

```bash
openssl rand -base64 48
openssl rand -base64 48
```

---

## Phase 1 — API + database (Render)

1. Push repo to GitHub.
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → select repo (`render.yaml`).
3. After deploy, open **afh-api** → **Environment** and set:
   - `CORS_ORIGINS` = `https://YOUR-APP.vercel.app` (update after Phase 2)
   - `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` (R2)
4. Copy the API URL: `https://afh-api-xxxx.onrender.com`
5. Test: `curl https://YOUR-API/health` → `{"status":"ok",...}`

Do **not** set `SEED_DEMO`.

---

## Phase 2 — Web (Vercel)

1. [Vercel](https://vercel.com/new) → Import GitHub repo.
2. Leave **root directory** as repo root (uses `vercel.json`).
3. **Environment variables** (Production):
   - `VITE_API_URL` = your Render API URL (no trailing slash)
4. Deploy → copy site URL (`https://....vercel.app`).
5. Back on Render, set `CORS_ORIGINS` to that Vercel URL → redeploy API.

---

## Phase 3 — Go live for your aunt

1. Open Vercel URL → **Register** (her email + password).
2. Add one employee → caregiver sign-in test.
3. Add client → upload document → download.

---

## If something fails

| Symptom | Fix |
|---------|-----|
| Login works locally, not on Vercel | `VITE_API_URL` wrong or not set at **build** time — redeploy Vercel after fixing |
| CORS error in browser | `CORS_ORIGINS` must exactly match Vercel URL (https, no trailing slash) |
| Upload fails | Check R2 keys and `S3_ENDPOINT`; bucket private is OK |
| API crash on start | Render logs → usually `DATABASE_URL` or failed migration |

Full detail: [DEPLOY.md](./DEPLOY.md)
