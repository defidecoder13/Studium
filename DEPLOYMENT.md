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
Expand the **Environment Variables** section before clicking Deploy. You must copy and paste exactly the same credentials you've been using in your local `.env` setup. 

Add the following variables exactly as named:

### Database & Auth (Clerk)
- `DATABASE_URL` = `your-neon-database-url` (Neon pooled URL, e.g. `ep-...-pooler.*.neon.tech/neondb?sslmode=require&channel_binding=require`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_test_...` (from Clerk Dashboard)
- `CLERK_SECRET_KEY` = `sk_test_...`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` = `/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` = `/sign-up`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` = `/app/dashboard`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` = `/app/dashboard`

### Cloudflare R2 (Object Storage)
- `R2_ACCOUNT_ID` = `your-cloudflare-account-id`
- `R2_ACCESS_KEY_ID` = `your-r2-access-key-id`
- `R2_SECRET_ACCESS_KEY` = `your-r2-secret-access-key`
- `R2_BUCKET_NAME` = `studium` *(must match your real bucket name)*
- `R2_PUBLIC_URL` = `` *(leave empty — files are served via `/api/documents/file/[key]` proxy)*

### AI Integration
- `GEMINI_API_KEY` = `your-gemini-api-key`

### App URL (SEO / sitemap)
- `NEXT_PUBLIC_APP_URL` = `https://your-app.vercel.app` *(your canonical Vercel domain)*

> **R2 note:** `R2_PUBLIC_URL` is optional — Studium serves files via `/api/documents/file/[key]` proxy. Leave it empty unless you use a custom R2 public domain.

## Step 4: Deploy & Initialize Database
1. Click **Deploy**. Vercel runs `npm run build:vercel` = `prisma generate && prisma migrate deploy && next build` (see `vercel.json: buildCommand`). The DB is already baselined via `prisma/migrations/20260902200721_init` — `migrate deploy` will be a no-op on first deploy.
2. **If you change the Prisma schema later:** `npx prisma migrate dev --name <change>` locally, commit the new `prisma/migrations/` folder, push — Vercel will auto-apply it. Never use `prisma db push` on prod after baseline.

## Step 5: Verification Checklist
Once Vercel gives you your live URL (e.g. `studium-ai.vercel.app`), visit it and verify:
- [ ] **Auth:** Try signing up for a new account.
- [ ] **Upload:** Upload a PDF textbook and verify it successfully pipes into Cloudflare R2 and returns a valid public URL.
- [ ] **AI Search:** Ask a question in the AI Chat tab and verify Gemini returns an answer sourced from your document!

🎉 Congratulations! Your Enterprise AI Study platform is LIVE!
