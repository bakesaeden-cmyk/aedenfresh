# Production Deploy — Aeden Fresh Platform

Order matters: Supabase → app env → Vercel → Razorpay → Meta/WhatsApp → n8n.

## 1. Supabase (database + auth)

1. Create a project (region: `ap-south-1` Mumbai for Kochi latency).
2. SQL Editor → run migrations **in order**:
   `0001_schema.sql` → `0002_rls.sql` → `0003_seed.sql` → `0004_checkout.sql` → `0005_automation.sql`.
3. Authentication → Providers → **Phone**: connect Twilio Verify (or
   MessageBird/Vonage). Buy an Indian-capable sender; set OTP length 6.
4. After your first sign-in, seed yourself as super admin:
   ```sql
   insert into admin_users (id, role)
   values ('<your auth.users id>', 'super_admin');
   ```
5. Copy Project URL, anon key, service_role key (Settings → API).

## 2. Vercel (Next.js app)

1. Push `platform/` to a Git repo → import in Vercel (framework auto-detects).
2. Environment variables (all from `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` *(server-only — never `NEXT_PUBLIC`)*
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
   - `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`,
     `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`,
     `NEXT_PUBLIC_WHATSAPP_NUMBER` *(digits only, e.g. `919876543210`)*
   - `N8N_API_SECRET` (generate: `openssl rand -hex 32`),
     `N8N_WHATSAPP_WEBHOOK_URL`, `N8N_PAYMENT_FAILED_WEBHOOK_URL`
   - `PLATFORM_URL` = `https://<your-domain>`
3. Deploy. Verify `https://<domain>/api/health` → `{ok:true}`.

## 3. Razorpay

1. Dashboard → API Keys → generate live keys (test keys first!).
2. Webhooks → add `https://<domain>/api/webhooks/razorpay`, secret =
   `RAZORPAY_WEBHOOK_SECRET`, events: `payment.captured`, `payment.failed`,
   `payment_link.paid`.
3. Test-mode dry run: place a web order with a test VPA (`success@razorpay`),
   confirm order flips to `confirmed` and the WhatsApp confirmation sends.

## 4. Meta / WhatsApp Cloud API

1. Meta App (Business type) → add WhatsApp product → business phone number.
2. Generate a **permanent** token via a System User (scopes:
   `whatsapp_business_messaging`, `whatsapp_business_management`).
3. WhatsApp → Configuration → Callback URL =
   `https://<domain>/api/webhooks/whatsapp`, Verify Token =
   `WHATSAPP_WEBHOOK_VERIFY_TOKEN` → subscribe to `messages`.
4. App Settings → Basic → copy App Secret into `WHATSAPP_APP_SECRET`.
5. Marketing templates (festival campaigns) need pre-approval in Business
   Manager before M6's campaign cron can send them.

## 5. n8n (Render)

Follow `docs/n8n-setup.md`: import the three workflows, set env
(`GENERIC_TIMEZONE=Asia/Kolkata`, `PLATFORM_URL`, `N8N_API_SECRET`,
WhatsApp vars), attach Supabase Postgres + header-auth credentials, then
copy each trigger's production URL back into Vercel env
(`N8N_WHATSAPP_WEBHOOK_URL`, `N8N_PAYMENT_FAILED_WEBHOOK_URL`) and redeploy.

## 6. Go-live checklist

- [ ] `docs/qa-checklist.md` 🔶 items all pass against live services
- [ ] Razorpay switched from test to live keys (and webhook re-pointed)
- [ ] First super_admin seeded; a store_manager tested (sees one store only)
- [ ] Seed data reviewed: real store phone numbers, pincode fees, prices
- [ ] WhatsApp business profile (name, logo, description) filled in Meta
- [ ] Custom domain + HTTPS on Vercel; `PLATFORM_URL` updated
- [ ] Backups: Supabase PITR enabled (paid tier) or scheduled dumps

## Rollback

Vercel: promote the previous deployment (instant). DB: migrations are
additive — never destructive rollbacks in prod; fix-forward with a new
migration. n8n: deactivate a workflow to stop its side effects immediately.
