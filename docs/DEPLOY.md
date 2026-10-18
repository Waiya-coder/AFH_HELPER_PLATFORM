# Deploy AFH Helper (Vercel + API + R2/S3)

## Plain-language layout

| Piece | Where it runs | Why |
|-------|----------------|-----|
| **Website** (what you open in the browser) | **Vercel** | Fast, HTTPS, easy updates |
| **API + database** (login, hours, clients) | **Railway or Render** (recommended) | This app needs a always-on server and PostgreSQL; Vercel is not a good fit for the full API |
| **Client documents** (care plans, PDFs) | **Cloudflare R2 or AWS S3** | Private, durable storage—not on the web server disk |

Your aunt’s data starts **empty**: deploy with migrations only, **no demo seed**. She uses **Register** on the live site.

---

## 1. Cloudflare R2 (or AWS S3)

1. Create a **private** bucket (e.g. `afh-helper-documents-prod`).
2. Create an API token / IAM user with **read + write** on that bucket only.
3. Note:
   - **R2:** `S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com`
   - **AWS:** omit `S3_ENDPOINT`, set `S3_REGION=us-west-2` (or your region)
4. Block public access on the bucket. Files are only served through the API after login.

**API environment variables:**

```bash
S3_BUCKET=afh-helper-documents-prod
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_REGION=auto                    # R2; use real region for AWS
S3_ENDPOINT=https://....r2.cloudflarestorage.com   # R2 only
# Optional for AWS SSE-KMS / AES256:
# S3_SSE=AES256
```

Local dev without R2: leave `S3_BUCKET` unset; files go to `uploads/clients` on disk.

---

## 2. API + PostgreSQL (Railway example)

1. New project → **PostgreSQL** + **Service** from this repo’s `Dockerfile` (or Node: build `@afh/api`).
2. Set environment variables:

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=<long random>
JWT_REFRESH_SECRET=<long random>
CORS_ORIGINS=https://your-app.vercel.app
S3_BUCKET=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_REGION=auto
S3_ENDPOINT=...   # if R2
```

3. **Release command / start:** `npx prisma migrate deploy && node dist/index.js`
4. Do **not** set `SEED_DEMO=true`.
5. Copy the public API URL (e.g. `https://afh-api.up.railway.app`).

---

## 3. Vercel (web app)

1. Import the GitHub repo in Vercel.
2. **Root directory:** repository root (uses root `vercel.json`).
3. **Environment variable (Production):**

```bash
VITE_API_URL=https://your-api-url-from-step-2
```

4. Deploy. Open the Vercel URL → **Register** → supervisor uses her email.

---

## 4. Go-live checklist for your aunt

- [ ] `GET https://<api>/health` returns `{ "status": "ok" }`
- [ ] Register → Home shows facility code, zero employees
- [ ] Add employee → caregiver can sign in and log hours
- [ ] Upload client document → download works
- [ ] Demo seed was **not** run on production database

---

## FAQ

**Do we need to delete dummy data?**  
Not if production is a **new empty database** and you never ran `SEED_DEMO=true` there. She creates the only facility via Register.

**Can the API run on Vercel too?**  
Not this Fastify app as-is. Use Railway/Render/Fly for the API, Vercel for the web UI.
