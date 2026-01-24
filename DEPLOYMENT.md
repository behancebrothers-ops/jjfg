# Deployment Guide

Complete step-by-step guide to deploy Luxee Store to production.

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Database Setup (Supabase)](#2-database-setup-supabase)
3. [Backend Deployment (Edge Functions)](#3-backend-deployment-edge-functions)
4. [Frontend Deployment (Vercel)](#4-frontend-deployment-vercel)
5. [Post-Deployment Configuration](#5-post-deployment-configuration)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Prerequisites

Before deploying, ensure you have:

- [ ] **Node.js 18+** installed
- [ ] **Git** installed
- [ ] **npm** or **yarn** package manager
- [ ] **Supabase CLI** installed (`npm install -g supabase`)
- [ ] A **GitHub account** (for Vercel integration)
- [ ] A **Supabase account** ([supabase.com](https://supabase.com))
- [ ] A **Vercel account** ([vercel.com](https://vercel.com))
- [ ] A **Stripe account** (for payments, optional but recommended)
- [ ] A **Resend account** (for emails, optional but recommended)

---

## 2. Database Setup (Supabase)

### Step 2.1: Create a New Supabase Project

1. Go to [database.new](https://database.new)
2. Click **"New Project"**
3. Fill in:
   - **Organization**: Select or create one
   - **Project Name**: `luxee-store-production`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose the closest to your users
4. Click **"Create new project"**
5. Wait for the project to be provisioned (1-2 minutes)

### Step 2.2: Get Your API Keys

1. In Supabase Dashboard, go to **Project Settings** → **API**
2. Copy and save these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGci...` (safe for frontend)
   - **service_role key**: `eyJhbGci...` (keep SECRET! backend only)

### Step 2.3: Push Database Schema

```bash
# Login to Supabase CLI
npx supabase login

# Link to your new project (use the Reference ID from Project Settings → General)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push your local database schema to production
npx supabase db push
```

> **Note**: If you have existing migrations in `supabase/migrations/`, they will be applied automatically.

### Step 2.4: Enable Required Extensions

In Supabase Dashboard → **SQL Editor**, run:

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search (if using)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

---

## 3. Backend Deployment (Edge Functions)

Supabase Edge Functions are serverless functions that run on Supabase's infrastructure.

### Step 3.1: Set Function Secrets

```bash
# Set required secrets (replace with your actual values)
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
npx supabase secrets set RESEND_API_KEY=re_...
npx supabase secrets set SUPABASE_URL=https://xxxxx.supabase.co
npx supabase secrets set SUPABASE_ANON_KEY=eyJhbGci...
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

> **Tip**: Run `npx supabase secrets list` to verify secrets are set.

### Step 3.2: Deploy All Functions

```bash
# Deploy all edge functions at once
npx supabase functions deploy
```

This deploys all functions in `supabase/functions/`:
- `stripe-checkout` - Payment processing
- `checkout` - COD order processing
- `send-order-confirmation` - Order emails
- `ai-search` - AI-powered search
- `get-recommendations` - Product recommendations
- And more...

### Step 3.3: Verify Deployment

```bash
# List deployed functions
npx supabase functions list
```

---

## 4. Frontend Deployment (Vercel)

### Step 4.1: Push Code to GitHub

```bash
# Ensure your code is committed
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### Step 4.2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New..."** → **"Project"**
3. Select your `luxee-store` repository
4. Vercel will auto-detect the Vite framework

### Step 4.3: Configure Build Settings

| Setting | Value |
| :--- | :--- |
| Framework Preset | Vite |
| Root Directory | `./` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### Step 4.4: Add Environment Variables

In Vercel's **Environment Variables** section, add:

| Key | Value | Environment |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | All |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGci...` (anon key) | All |
| `VITE_SENTRY_DSN` | (Optional Sentry DSN) | All |

> **⚠️ Important**: Never add `SUPABASE_SERVICE_ROLE_KEY` to Vercel. It's only for Edge Functions.

### Step 4.5: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (2-3 minutes)
3. Your site is live at `https://your-project.vercel.app`

### Step 4.6: (Optional) Add Custom Domain

1. In Vercel Dashboard → **Domains**
2. Add your domain (e.g., `luxee.store`)
3. Configure DNS as instructed by Vercel

---

## 5. Post-Deployment Configuration

### Step 5.1: Update Supabase Auth URLs

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Update these fields:

| Field | Value |
| :--- | :--- |
| Site URL | `https://your-domain.com` |
| Redirect URLs | `https://your-domain.com/*` |

### Step 5.2: Update CORS Settings

In `supabase/functions/_shared/cors.ts`, ensure your production domain is allowed:

```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'https://your-domain.com',
  'https://your-project.vercel.app'
];
```

Then redeploy functions:

```bash
npx supabase functions deploy
```

### Step 5.3: Configure Stripe Webhooks (Production)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Set endpoint URL:
   ```
   https://xxxxx.supabase.co/functions/v1/stripe-checkout
   ```
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Signing secret** and update:
   ```bash
   npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_NEW_SECRET
   npx supabase functions deploy stripe-checkout
   ```

### Step 5.4: Configure Resend Domain (Production)

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add and verify your domain
3. Update the "From" email in your Edge Functions

---

## 6. Troubleshooting

### Build Fails on Vercel
- Check that all environment variables are set
- Ensure `VITE_` prefix is used for frontend variables
- Check build logs for TypeScript errors

### Edge Functions Return 500 Error
- Check function logs: `npx supabase functions logs FUNCTION_NAME`
- Verify all secrets are set: `npx supabase secrets list`
- Ensure CORS headers allow your domain

### Auth Redirects to Wrong URL
- Update **Site URL** and **Redirect URLs** in Supabase Auth settings
- Clear browser cache and cookies

### Stripe Payments Not Working
- Ensure you're using **live keys** (not test keys)
- Verify webhook secret is correct
- Check Stripe Dashboard for failed webhook attempts

### Database Connection Issues
- Verify `SUPABASE_URL` is correct
- Check Row Level Security policies
- Ensure your IP isn't blocked (for direct DB access)

---

## Deployment Checklist

- [ ] Supabase project created
- [ ] Database schema pushed
- [ ] Edge Functions deployed
- [ ] Secrets configured
- [ ] Vercel project created
- [ ] Environment variables set
- [ ] Auth URLs updated
- [ ] Stripe webhooks configured
- [ ] Custom domain added (optional)
- [ ] SSL certificate active

---

## Support

If you encounter issues:
1. Check the [Supabase Docs](https://supabase.com/docs)
2. Check the [Vercel Docs](https://vercel.com/docs)
3. Review function logs: `npx supabase functions logs --tail`

---

Built with ❤️ using React, Supabase, and Vercel.
 