# QA Checklist — §7 Non-Functional Requirements (M8)

Status at handover. ✅ = verified in this build · 🔶 = verify after real
credentials/deploy (needs live Supabase / Razorpay / Meta).

## Security

| Requirement | Status | Evidence |
|---|---|---|
| RLS on every customer-facing table | ✅ | `0002_rls.sql`: all 21 tables have RLS enabled; `payments` + `whatsapp_sessions` have **no** client policies (service-role only) |
| Razorpay webhook signature mandatory | ✅ | HMAC-SHA256 of raw body, timing-safe compare; live test: signed → 200, tampered body → 401, unsigned → 401 |
| WhatsApp webhook verification | ✅ | GET handshake (verify token → challenge echo, wrong token → 403); POST `X-Hub-Signature-256` verified (tampered → 401) |
| No card data touches the server | ✅ | Razorpay Checkout.js / payment links only; server stores gateway ids, never PANs |
| Admin endpoints: role check + RLS (defense in depth) | ✅ | proxy fast-path + `getAdminUser()` in layout/routes + RLS policies; `/api/admin/dashboard/revenue` → 403 without admin row |
| Auth checked before body validation | ✅ | 20-check regression suite (all auth gates return 401/403 first) |

## Reliability

| Requirement | Status | Evidence |
|---|---|---|
| Renewal job idempotent (safe re-run after restart) | ✅ | DB unique index `(subscription_id, scheduled_date)`; endpoint returns 409 `already_renewed`; n8n workflow treats 409 as success |
| Webhook re-delivery safe | ✅ | `markOrderPaid`/`markOrderPaymentFailed` are no-ops on repeat; late `failed` never downgrades a capture |
| Order never lost on gateway failure | ✅ | checkout 502 path leaves a `pending_payment` order with retry from the order page |
| Coupon uses burned only on capture | ✅ | `increment_coupon_use` called from webhook path only |
| WhatsApp session recovery | ✅ design | state persisted per message in `whatsapp_sessions`; unrecognised input → menu re-send; inbound always logged even if n8n forward fails |

## Scalability

| Requirement | Status | Evidence |
|---|---|---|
| Routing pure PIN-code/geo lookup, no hardcoded stores | ✅ | `/api/stores/resolve` is a coverage-table query + haversine tie-break; adding store #6…#100 is data entry only |
| Store locked at order creation | ✅ | `orders.store_id` written once at checkout/renewal; no re-routing code exists |

## Privacy

| Requirement | Status | Evidence |
|---|---|---|
| Phone numbers/order history: owner + service role only | ✅ | RLS `customer_id = auth.uid()`; admin read is role-gated |
| Admin access role-scoped | ✅ | `store_manager` sees only their store via `admin_can_access_store()` on orders/inventory/subscriptions/slots |

## Performance

| Requirement | Status | Evidence |
|---|---|---|
| Builder step transitions < 300ms | ✅ | catalogue fetched once, steps are client state (260ms auto-advance incl. selection feedback) |
| Storefront LCP < 2s on 4G | 🔶 | measure post-deploy (Vercel Analytics / Lighthouse); no blocking third-party scripts, fonts load `display=swap` |

## Functional spot-checks (from milestone verification)

- Builder pricing: first-N-free multi-select, portion-carried base price —
  matched hand-computed totals (₹185 → ₹374; 675 kcal / 48 g protein).
- Out-of-stock grey-out with "temporarily unavailable" (Grilled Fish @ Kakkanad seed case).
- Schedule math: 11/11 unit tests incl. weekday wrap + month/year rollover.
- Cart: quantity/removal update badge + line totals live.
- Routing tie-break testable via seeded overlap pincode **682019** (two stores, different fees).

## 🔶 Post-credential test plan (run once live keys exist)

1. Supabase: run migrations 0001→0005, enable phone auth, sign up, confirm
   `customer_profiles` auto-created; seed first super_admin.
2. Razorpay test mode: web checkout with test UPI → webhook fires → order
   `confirmed`, WhatsApp confirmation received, receipt renders; then a
   failing test card → `failed` + retry link + n8n recovery.
3. WhatsApp: Meta test number → "hi" → menu; full build→pay in chat;
   `whatsapp_sessions.state` transitions visible in table editor.
4. Renewal: create a daily subscription with `next_delivery_date = today`,
   run the n8n cron twice → exactly one order, second run logs 409.
5. Pincode boundary: order from 682019 → cheapest-fee store wins.
