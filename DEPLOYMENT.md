# Studium - Production Deployment Guide

Your application has successfully passed the Next.js `npm run build` step and is officially certified for production deployment! Follow this guide to deploy your app globally in less than 5 minutes using **Vercel** (the creators of Next.js).

---

## Step 1: Push your Code to GitHub
Ensure all your final code is pushed to your GitHub repository.
```bash
git add .
git commit -m "chore: ready for production launch"
git push origin main
```

## Step 2: Import Project on Vercel
1. Go to [Vercel.com](https://vercel.com/) and log in with your GitHub account.
2. Click **Add New** > **Project**.
3. Select your `Studium` GitHub repository and click **Import**.
4. Leave the Framework Preset as **Next.js**.

## Step 3: Configure Environment Variables
Expand the **Environment Variables** section before clicking Deploy. Set these for the **Production** environment.

> **Use LIVE keys in production.** The Clerk Dashboard issues separate test (`pk_test_/sk_test_`) and live (`pk_live_/sk_live_`) keys. Production **must** use `pk_live_...` / `sk_live_...`. After deploying, add your production domain to Clerk Dashboard → **Authorized parties / Allowed origins** and set the redirect URLs below to your real domain, or sign-in will loop.

Add the following variables exactly as named:

### Database (Neon Postgres + pgvector)
- `DATABASE_URL` = pooled Neon URL, e.g. `ep-...-pooler.*.neon.tech/neondb?sslmode=require&channel_binding=require`
- **Enable pgvector first:** the schema requires `CREATE EXTENSION vector` (`prisma/schema.prisma`, initial migration). In Neon: open your project → SQL Editor → run `CREATE EXTENSION IF NOT EXISTS vector;`. Without it, `migrate deploy` fails on first deploy.
- **Co-locate regions:** `vercel.json` pins functions to `sin1`. Create the Neon project and R2 bucket in the closest region (e.g. `ap-southeast-1`) or cross-region latency will slow every query.

### Auth (Clerk — LIVE keys)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_live_...` (Clerk Dashboard → API Keys, **Production** instance)
- `CLERK_SECRET_KEY` = `sk_live_...`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` = `/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` = `/sign-up`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` = `/app/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` = `/app/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` = `/app/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` = `/app/dashboard`

### Cloudflare R2 (Object Storage)
- `R2_ACCOUNT_ID` = `your-cloudflare-account-id`
- `R2_ACCESS_KEY_ID` = `your-r2-access-key-id`
- `R2_SECRET_ACCESS_KEY` = `your-r2-secret-access-key`
- `R2_BUCKET_NAME` = `studium` *(must match your real bucket name)*
- `R2_PUBLIC_URL` = `` *(leave empty — files are served via `/api/documents/file/[key]` proxy)*

### AI Integration
- `GEMINI_API_KEY` = `your-gemini-api-key` (`GOOGLE_API_KEY` also accepted)

### App URL (SEO / sitemap)
- `NEXT_PUBLIC_APP_URL` = `https://your-app.vercel.app` *(your canonical Vercel domain — **redeploy after setting this**, as sitemap/robots bake it in at build time)*

### Optional
- `MAX_UPLOAD_BYTES` = unset by default (`4500000` = 4.5 MB, the Vercel Hobby body limit). Set `10485760` only on Vercel Pro.
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` = strict cross-isolate rate limits. Without these, limits are per-isolate (best-effort).
- **Never set in production:** `ALLOW_DEMO_AUTH` (local-dev demo login; inert in `NODE_ENV=production` but leave it unset anyway).

> **R2 note:** `R2_PUBLIC_URL` is optional — Studium serves files via `/api/documents/file/[key]` proxy. Leave it empty unless you use a custom R2 public domain.

## Step 4: Deploy & Initialize Database
1. Click **Deploy**. Vercel runs `npm run build:vercel` = `prisma generate && prisma migrate deploy && next build` (see `vercel.json: buildCommand`). On a fresh database this applies both migrations (`..._init` + `..._add_perf_indexes`).
2. **Plan limits to know:** `vercel.json` sets `maxDuration: 30` on AI/upload routes — Hobby caps at 15s, so 30s needs Pro (otherwise deploy warns and long uploads/AI calls get cut). Uploads are capped at ~4.5 MB on Hobby for the same reason; large PDFs will 413 with a clear message.
3. **If you change the Prisma schema later:** `npx prisma migrate dev --name <change>` locally, commit the new `prisma/migrations/` folder, push — Vercel will auto-apply it. Never use `prisma db push` on prod after baseline. If a dev database reports drift (`P3005`/checksum errors), see `migrate resolve --applied` — never edit an already-applied migration file.

## Step 5: Verification Checklist
Once Vercel gives you your live URL (e.g. `studium-ai.vercel.app`), visit it and verify:
- [ ] **Health:** `GET /api/health` returns `{"status":"ok"}` (point your uptime monitor here).
- [ ] **Auth:** Try signing up for a new account. Unauthenticated `/app/*` and `/api/*` (except `/api/health`) must redirect/401.
- [ ] **Upload:** Upload a ≤4.5 MB PDF and verify it lands in R2 and opens in the reader.
- [ ] **AI Search:** Ask a question in the AI Chat tab and verify Gemini returns an answer with `[Page X]` citations — never placeholder content.
- [ ] **Destructive guards:** `DELETE /api/account` and `DELETE /api/documents?all=true` without `?confirm=DELETE` must 400.

🎉 Congratulations! Your Enterprise AI Study platform is LIVE!
