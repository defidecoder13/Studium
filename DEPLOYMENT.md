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

### Database & Auth
- `DATABASE_URL` = `your-neon-database-url`
- `BETTER_AUTH_SECRET` = *(Generate a random 32-character string, e.g., `openssl rand -base64 32`)*
- `BETTER_AUTH_URL` = `https://your-vercel-domain.vercel.app` *(You can set this after your first deployment generates a URL!)*

### Cloudflare R2 (Object Storage)
- `R2_ACCOUNT_ID` = `your-cloudflare-account-id`
- `R2_ACCESS_KEY_ID` = `your-r2-access-key-id`
- `R2_SECRET_ACCESS_KEY` = `your-r2-secret-access-key`
- `R2_BUCKET_NAME` = `studium-pdfs` *(or whichever name you gave your bucket)*
- `R2_PUBLIC_URL` = `https://pub-xxxxxx.r2.dev` *(from your bucket settings)*

### AI Integration
- `GEMINI_API_KEY` = `your-gemini-api-key`

## Step 4: Deploy & Initialize Database
1. Click **Deploy**. Vercel will install dependencies and run `npm run build`. Since it passed locally, it will pass here!
2. **CRITICAL POST-DEPLOY STEP:** Since Vercel builds the UI but doesn't run database migrations automatically for Prisma, you need to push your Prisma schema to your live DB if you ever make changes. Because you already ran `npx prisma db push` locally, your Neon DB is **already set up** and ready to receive production traffic!
   - In the future, if you change your schema, you can run `npx prisma db push` from your local machine to instantly update your cloud database!

## Step 5: Verification Checklist
Once Vercel gives you your live URL (e.g. `studium-ai.vercel.app`), visit it and verify:
- [ ] **Auth:** Try signing up for a new account.
- [ ] **Upload:** Upload a PDF textbook and verify it successfully pipes into Cloudflare R2 and returns a valid public URL.
- [ ] **AI Search:** Ask a question in the AI Chat tab and verify Gemini returns an answer sourced from your document!

🎉 Congratulations! Your Enterprise AI Study platform is LIVE!
