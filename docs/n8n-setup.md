# n8n Setup — Aeden Fresh Platform

How to wire the three workflow files in `n8n/` into your Render-hosted n8n
instance. These are import-ready skeletons: structure and node parameters are
correct; you attach credentials and finish branch wiring where a node's notes
say TODO.

## 1. Import

n8n → Workflows → Import from File → pick each of:

| File | Purpose |
|---|---|
| `whatsapp-commerce.json` | Conversational state machine (spec §5.7) — M5 |
| `renewal-daily.json` | Daily 6 AM subscription renewals (spec §5.3) — M4 |
| `automations.json` | Morning notifications, abandoned cart, failed-payment recovery, reorder prompts, festival campaigns (spec §5.8) — M6 |

## 2. Environment variables (Render → n8n service → Environment)

```
GENERIC_TIMEZONE=Asia/Kolkata        # crons fire in IST
PLATFORM_URL=https://<your-vercel-app>.vercel.app
N8N_API_SECRET=<same value as platform .env>
WHATSAPP_PHONE_NUMBER_ID=<from Meta App dashboard>
WHATSAPP_ACCESS_TOKEN=<permanent token via Meta system user>
```

## 3. Credentials to create in n8n

1. **Supabase Postgres** (used by all Postgres nodes): host/port/db/user/pass
   from Supabase → Project Settings → Database → Connection string (use the
   *session pooler* on IPv4 networks like Render).
2. **Header Auth** (for WhatsApp HTTP nodes): name `Authorization`, value
   `Bearer <WHATSAPP_ACCESS_TOKEN>` — or leave the token in the URL-level
   env expression as shipped.

## 4. Meta (WhatsApp Cloud API) webhook subscription

1. Meta App → WhatsApp → Configuration → set Callback URL to the
   **platform endpoint** `https://<your-app>/api/webhooks/whatsapp` and set
   Verify Token = `WHATSAPP_WEBHOOK_VERIFY_TOKEN` from the platform env.
2. The platform answers Meta's GET handshake, verifies the
   `X-Hub-Signature-256` on every POST (requires `WHATSAPP_APP_SECRET`),
   logs inbound messages, and forwards the payload to
   `N8N_WHATSAPP_WEBHOOK_URL` — set that env to this workflow's production
   webhook URL (shown on the trigger node once active).
3. Subscribe to the `messages` webhook field.

## 4b. Behaviour notes (M6)

- **Abandoned cart** covers both channels: WhatsApp sessions stuck in
  `cart`/`customising`, and web carts via `analytics_events`
  (`cart_activity` with no later `order_placed` for that customer, 2–48h
  old). Dedup: max one nudge per customer per 24h via `notifications_log`.
- **Reorder prompt buttons**: the prompt sends reply ids
  `reorder_yes_<saved_combo_id>`. Handle these in the WhatsApp commerce
  workflow's idle branch — look up the combo, then POST
  `/api/cart/checkout` (channel `whatsapp`) with the combo's `option_ids`
  / `curated_basket_id` and the customer's default address.
- **Favourites data**: `saved_combos.order_count` / `last_ordered_at` are
  bumped automatically on payment capture (DB function
  `record_combo_reorder`), so the reorder-gap SQL needs no extra writes.
- **Order-confirmed + payment-failed first-touch messages are sent by the
  platform itself** (instant, §5.7); n8n owns follow-ups (retry attempts
  2–3, manual-flagging) and everything scheduled.

## 5. Testing runbook

1. Use Meta's **test number** (free, 5 recipient allowlist) before the real
   business number.
2. Razorpay in **test mode** — payment links from the checkout API succeed
   with test cards/UPI.
3. WhatsApp flow: send "hi" → expect the main menu list; walk browse →
   customise → cart; verify `whatsapp_sessions.state` transitions in the
   Supabase table editor after each message.
4. Renewal idempotency: run `renewal-daily` twice in a row — second run must
   log 409s ("already done") and create zero new orders.
5. Kill the n8n container mid-renewal-run and restart — re-run must not
   duplicate orders (unique index `(subscription_id, scheduled_date)`).

## 6. n8n gotchas (learned the hard way — from the Aeden HR bot build)

- AI/interactive sub-nodes plug in **from below** via their designated
  connectors — don't try to wire them into `main`.
- Set-node fields **can't reference earlier fields from the same Set node**
  — compute multi-step values in one Code-node IIFE instead.
- Regex in expressions needs a **single** backslash (`\d`, not `\\d`).
- **Rename nodes before wiring** — renaming later breaks every
  `$('NodeName')` reference silently.
- Lookup nodes need **`alwaysOutputData: true`** so a not-found result still
  produces an (empty) item you can branch on — otherwise the branch dies.
- `neverError: true` on HTTP Request nodes when you want to branch on 4xx
  responses (e.g. the renewal 409) instead of failing the execution.
