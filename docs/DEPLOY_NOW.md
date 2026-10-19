# Deploy now — Waiya-coder/AFH_HELPER_PLATFORM

Repo: https://github.com/Waiya-coder/AFH_HELPER_PLATFORM

Do **Part A** first, then **Part B**, then wire them together in **Part C**.

---

## Part A — Render (API + Postgres) ~10 min

1. Go to https://dashboard.render.com and sign in (GitHub login is fine).
2. **New +** → **Blueprint**.
3. Connect **GitHub** if asked, then select repo **`AFH_HELPER_PLATFORM`**.
4. Render reads `render.yaml` and proposes:
   - **afh-api** (Docker web service)
   - **afh-postgres** (database)
5. Click **Apply** / **Create** and wait for the first deploy (build can take 5–10 min).
6. When **afh-api** is live, open it and copy the URL, e.g.  
   `https://afh-api-xxxx.onrender.com`
7. Test in browser or terminal:  
   `https://YOUR-API-URL/health`  
   Expected: `{"status":"ok","service":"afh-api"}`

**Optional now (recommended before real uploads):** R2 — see [R2_SETUP.md](./R2_SETUP.md).  
On **afh-api → Environment**, add `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, keep `S3_REGION=auto`.

**Do not** add `SEED_DEMO`.

---

## Part B — Vercel (web app only) ~5 min

The API runs on **Render**, not Vercel. `vercel.json` defines a single **`web`** service (static React app).

1. Go to https://vercel.com/new and sign in with GitHub.
2. **Import** `Waiya-coder/AFH_HELPER_PLATFORM`.
3. Leave **Root Directory** as `.` (repo root — uses `vercel.json`).
4. **Environment variables** → Production:
   - Name: `VITE_API_URL`  
   - Value: `https://YOUR-API-URL-FROM-PART-A` (no trailing slash)
5. **Deploy**.
6. Copy your site URL, e.g. `https://afh-helper-platform.vercel.app`.

---

## Part C — Connect web ↔ API ~2 min

1. **Render** → **afh-api** → **Environment**:
   - `CORS_ORIGINS` = your **exact** Vercel URL (https, no trailing slash)  
     Example: `https://afh-helper-platform.vercel.app`
2. **Save** → Render redeploys the API.
3. Open the **Vercel URL** → **Register** → sign in as supervisor.

---

## Smoke test

- [ ] Register new facility (empty roster)
- [ ] Add employee → caregiver login → log hours
- [ ] Add client → upload document → download (needs R2 on Render for persistence)

---

## If something breaks

| Issue | Fix |
|-------|-----|
| CORS error in browser console | `CORS_ORIGINS` must match Vercel URL exactly |
| API 502 on Render | Logs tab — often DB migration or build failure |
| Login works but API calls go to localhost | Redeploy Vercel after setting `VITE_API_URL` |
| Upload fails after redeploy | Set R2 env vars on Render |
