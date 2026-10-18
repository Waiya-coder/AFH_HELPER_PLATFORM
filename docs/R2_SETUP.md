# Cloudflare R2 setup (client documents)

R2 is S3-compatible private storage for hospital/care plan uploads. The API never exposes a public bucket URL—files download only after login.

## 1. Cloudflare account

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign in (or create an account).
2. In the left sidebar: **R2 object storage** → **Overview**.

## 2. Create a bucket

1. **Create bucket**.
2. Name example: `afh-helper-documents-prod` (globally unique within your account).
3. Location: pick a region close to you (or **Automatic**).
4. **Create bucket**.
5. Leave the bucket **private** (default). Do **not** enable public access or a public R2.dev URL for this app.

## 3. Create API credentials

1. R2 → **Manage R2 API tokens** (or **Account API tokens**).
2. **Create API token** with permission template **Object Read & Write** (or custom: this bucket only).
3. Save:
   - **Access Key ID**
   - **Secret Access Key** (shown once—copy now)
4. Note your **Account ID** (R2 overview page).

## 4. Values for Render (API service)

Set these environment variables on **Render → afh-api → Environment**:

| Variable | Example / notes |
|----------|------------------|
| `S3_BUCKET` | `afh-helper-documents-prod` |
| `S3_ACCESS_KEY_ID` | from token |
| `S3_SECRET_ACCESS_KEY` | from token |
| `S3_REGION` | `auto` |
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |

Replace `<ACCOUNT_ID>` with your Cloudflare account ID.

Do **not** commit these values to git. Do **not** put them in Vercel (only the API needs them).

## 5. Verify after deploy

1. Log in as supervisor on the live app.
2. Open a client → **Upload document** → upload a small PDF.
3. **Download** the same file.
4. In Cloudflare → R2 → bucket, you should see an object under a path like `facility-id/uuid-filename.pdf`.

## Optional: AWS S3 instead of R2

Use the same env vars except:

- Omit `S3_ENDPOINT` (or use your region endpoint).
- Set `S3_REGION` to e.g. `us-west-2`.
- Create IAM user with `s3:PutObject` / `s3:GetObject` on one bucket.
- Enable **Block all public access** on the bucket.
