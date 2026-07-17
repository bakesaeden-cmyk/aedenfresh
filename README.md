# Aeden Fresh — Digital Fresh-Commerce Platform

The operating system for Aeden Fresh's fresh-food commerce: build-your-own
salads and baskets, recurring subscriptions, multi-store PIN-code routing, and
full WhatsApp commerce — per the build spec (self-build version of the
WeCypher proposal).

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Auth + RLS) ·
Razorpay · n8n · WhatsApp Cloud API · Tailwind v4.

## Setup

1. **Supabase project**
   - Create a project at [supabase.com](https://supabase.com).
   - Run the migrations in order in the SQL Editor (or `supabase db push`):
     - `supabase/migrations/0001_schema.sql`
     - `supabase/migrations/0002_rls.sql`
   - Enable **Phone Auth**: Dashboard → Authentication → Providers → Phone
     (Twilio/MessageBird/Vonage — Twilio Verify is the usual choice for India).
2. **Environment**
   - `cp .env.example .env.local` and fill the Supabase URL + keys.
3. **Run**
   ```bash
   npm install
   npm run dev   # http://localhost:3000
   ```

## Structure

- `src/app/(storefront)/` — customer-facing routes: home, `/build` (M2),
  `/baskets` (M2), `/login` (phone OTP), `/account`
- `src/app/(admin)/admin/` — role-gated admin (RLS + proxy + layout check)
- `src/app/api/` — commerce API routes (grow per milestone, spec §6)
- `src/lib/supabase/` — browser / server / service-role clients
- `src/proxy.ts` — session refresh + route protection (Next 16 proxy)
- `supabase/migrations/` — schema (§4) and RLS policies

## Auth model

- Customers: **phone OTP** (matches their WhatsApp identity; a
  `customer_profiles` row is auto-created by DB trigger on signup).
- Admins: a row in `admin_users` (role: `super_admin` / `store_manager` /
  `ops` / `support`). Seed your first super admin after signing in once:
  ```sql
  insert into admin_users (id, role)
  values ('<auth.users.id>', 'super_admin');
  ```

## Milestones — all complete ✅

M0 foundations → M1 catalogue & stores → M2 builder → M3 checkout/Razorpay →
M4 subscriptions → M5 WhatsApp → M6 automations → M7 analytics → M8 QA.

## Docs

- [docs/api-contract.md](docs/api-contract.md) — every endpoint's shapes & errors
- [docs/deploy.md](docs/deploy.md) — Vercel + Supabase + Razorpay + Meta + n8n production setup
- [docs/qa-checklist.md](docs/qa-checklist.md) — §7 NFR evidence + post-credential test plan
- [docs/n8n-setup.md](docs/n8n-setup.md) — workflow import, credentials, gotchas
- `n8n/` — importable workflows: WhatsApp state machine, daily renewals, automations
