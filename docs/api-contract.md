# Aeden Fresh Platform — API Contract

Single source of truth for endpoint shapes. All module code (web storefront,
WhatsApp/n8n, admin) must consume these contracts — never duplicate logic.
Breaking changes require updating this doc in the same commit.

## Conventions

- All responses are JSON. Errors: `{ "error": "<machine_code>", "message"?: string }`.
- Auth: customer endpoints use the Supabase session cookie (RLS-enforced).
  n8n-facing endpoints use header `x-n8n-secret: <N8N_API_SECRET>` and run
  service-role server-side.
- IDs are UUIDs unless stated.

---

## Implemented (M1)

### GET `/api/stores/resolve?pincode=682020[&lat=&lng=]`

PIN-code → nearest active store (spec §5.5). Lowest `delivery_fee` wins;
ties broken by haversine distance when `lat`/`lng` are provided.

| Status | Body |
|---|---|
| 200 | `{ store: { id, name, address, phone, pincode, latitude, longitude }, delivery_fee: number }` |
| 400 | `{ error: "invalid_pincode" }` (must be 6 digits) |
| 404 | `{ error: "no_coverage", message: "Not yet available in your area" }` — caller should offer waitlist capture (`analytics_events`, `event_name='waitlist_signup'`) |
| 500 | `{ error: "lookup_failed" }` |

### GET `/api/catalogue?store_id=<uuid>`

Builder catalogue + curated baskets for one store (spec §5.1/§5.2).

200 response:

```jsonc
{
  "store_id": "…",
  "categories": [
    {
      "id": "…", "type": "base|protein|dressing|topping|addon|portion",
      "name": "Choose Your Base", "display_order": 1,
      "max_free_selections": null, // null = single-select category
      "options": [
        {
          "id": "…", "name": "Quinoa Bowl", "price_delta": 60,
          "calories": 180, "protein_g": 6, "carbs_g": 32, "fat_g": 3,
          "image_url": null, "allergens": [],
          "is_available": true // false → grey out in builder, don't hide
        }
      ]
    }
  ],
  "baskets": [
    { "id": "…", "name": "Protein Punch", "description": "…",
      "base_price": 299, "image_url": null,
      "nutrition_summary": { "calories": 610, "protein_g": 48, "carbs_g": 45, "fat_g": 22 } }
  ]
}
```

Errors: 400 `invalid_store_id`, 500 `lookup_failed`.

### POST `/api/combos` (M2)

Save a built combo for the signed-in customer. Auth: session cookie.

Request: `{ name?: string, combo_type: "salad"|"basket", option_ids?: uuid[] (1–30), curated_basket_id?: uuid, portion_size?: string }`
— at least one of `option_ids` / `curated_basket_id` required. Missing `name`
auto-generates `"My Salad #n"`.

| Status | Body |
|---|---|
| 201 | `{ combo: { id, name } }` (also logs `analytics_events` `combo_built`) |
| 400 | `{ error: "invalid_json" \| "invalid_body", message? }` |
| 401 | `{ error: "auth_required" }` — guests keep the combo client-side (spec §5.2) |
| 500 | `{ error: "save_failed" }` |

### GET `/api/combos` (M2)

Signed-in customer's saved combos, favourites first (`order_count` desc).
200: `{ combos: [{ id, name, combo_type, option_ids, curated_basket_id, portion_size, order_count, last_ordered_at, created_at }] }` · 401 `auth_required` · 500 `lookup_failed`.

**Builder pricing rule (client + future checkout validation):** in
multi-select categories, the first `max_free_selections` picks are included
free (selection order); extras add their `price_delta`. Single-select
categories always charge `price_delta` — the portion option carries the bowl
base price. Nutrition always sums over all selections.

Notes:
- Globally inactive options (`is_active=false`) are **excluded**.
- Options unavailable at this store are **included** with `is_available:false`.
- No `store_inventory` row = available (made-to-order default).
- Portion options carry the bowl base price as `price_delta` (never a client multiplier).

### POST `/api/cart/checkout` (M3)

Creates a `pending_payment` order from a validated cart. **All prices are
recomputed server-side** (builder pricing rule above); the client estimate is
never trusted. Store is locked at creation (§5.5 — never re-routed).

Auth: web → session cookie; whatsapp → `x-n8n-secret` header + `phone`.

Request: `{ channel: "web"|"whatsapp", phone?, store_id, address_id, delivery_slot_id?, coupon_code?, scheduled_date?, items: [{ option_ids?, curated_basket_id?, saved_combo_id?, quantity }] (1–10) }`

| Status | Body |
|---|---|
| 201 | `{ order: { id, order_number, total }, payment: { type:"checkout", razorpay_order_id, key_id, amount, currency } \| { type:"link", url } \| null }` — `payment:null` + `message:"payment_gateway_not_configured"` when Razorpay keys absent |
| 400 | `invalid_body` / `invalid_address` / `no_coverage` / `unknown_option` / `option_inactive` / `unknown_basket` / coupon errors (`invalid_coupon`, `coupon_expired`, `coupon_not_started`, `coupon_exhausted`, `coupon_min_order`) |
| 401 | `auth_required` (web) / `unauthorized` (bad n8n secret) |
| 404 | `unknown_customer` (whatsapp phone with no profile) |
| 502 | order created but gateway errored — `{ order, payment:null, message:"payment_gateway_error" }`; retry from the order page |

Coupon `used_count` increments **only on capture** (webhook), never at creation.

### POST `/api/webhooks/razorpay` (M3)

Razorpay webhook. `x-razorpay-signature` (HMAC-SHA256 of raw body with
`RAZORPAY_WEBHOOK_SECRET`) is mandatory → 401 otherwise. Handles
`payment.captured` (→ payment captured, order `confirmed`, coupon burned),
`payment.failed` (→ order `failed` + n8n recovery ping), `payment_link.paid`.
**Idempotent**: re-deliveries are no-ops; a late `failed` never downgrades a
captured payment. Always 200 `{ received: true }` for verified events.

### POST `/api/payments/verify` (M3)

Checkout.js success-handler verification (fast UX path; webhook stays source
of truth). Auth: session. Request: `{ razorpay_order_id, razorpay_payment_id,
razorpay_signature }` → HMAC check → 200 `{ ok, order_id }` / 400
`invalid_signature` / 404 `payment_not_found`.

### GET `/api/orders/:id/track` (M3)

Order + status history. Auth: session (RLS: owner or store-scoped admin) or
`x-n8n-secret`. 200: `{ order: { …totals, stores(name), delivery_slots(start_time,end_time) }, history: [{ status, note, changed_at }] }` · 404.

### GET `/api/orders/:id/receipt` (M3)

Branded printable HTML receipt (print-to-PDF). Auth: session owner or
`x-n8n-secret` (n8n sends the URL in the WhatsApp receipt message). 409
`not_paid` while `pending_payment`/`failed`.

### POST `/api/subscriptions` (M4)

Create a subscription from a saved combo. Auth: session. `next_delivery_date`
computed server-side (`firstDeliveryDate`, IST). Validates combo + address
ownership and store coverage.

Request: `{ saved_combo_id, store_id, address_id, delivery_slot_id?, frequency: "daily"|"weekly"|"alternate_days"|"custom", custom_days?: ["mon"…], start_date?: YYYY-MM-DD }`

201 `{ subscription: { id, frequency, next_delivery_date, status } }` ·
400 `invalid_body`/`unknown_combo`/`invalid_address`/`no_coverage` · 401.

### PATCH `/api/subscriptions/:id` (M4)

Manage a subscription. Auth: session (RLS owner) or `x-n8n-secret` + `phone`
(WhatsApp — ownership checked against the phone).

Request: `{ action: "skip"|"pause"|"resume"|"cancel"|"change_frequency", phone?, pause_days? (default 7), paused_until?, frequency?, custom_days? }`

Semantics: **skip** advances `next_delivery_date` one occurrence · **pause**
sets `status='paused'` + `paused_until` · **resume** reactivates with the next
occurrence after today · **cancel** is terminal (409 `already_cancelled` after)
· **change_frequency** recomputes the schedule from today.

200 `{ subscription: { id, status, frequency, custom_days, next_delivery_date, paused_until } }`.

### POST `/api/subscriptions/renew` (M4)

n8n daily-cron endpoint (auth: `x-n8n-secret` only). Request:
`{ subscription_id, scheduled_date? (default today IST) }`.

Creates the day's `order_type='subscription'` order (price recomputed from
the saved combo via the shared pricing engine), advances
`next_delivery_date`, and returns a Razorpay **payment link** for n8n to
deliver on WhatsApp.

| Status | Meaning |
|---|---|
| 201 | `{ order, payment: { type:"link", url } \| null, phone, next_delivery_date }` |
| 409 | `already_renewed` (unique `(subscription_id, scheduled_date)` — **treat as success**) / `not_active` / `paused` |
| 422 | combo/basket no longer valid — flag for manual follow-up |

Payment note: custom frequencies don't fit Razorpay's plan-based
Subscriptions API, so MVP charges via payment link; saved-card tokenisation
(server-initiated charge) is the documented upgrade path inside this route.

### GET/POST `/api/webhooks/whatsapp` (M5)

Register this as the Meta callback URL (it handles the GET handshake n8n
can't).

- **GET** — subscription handshake: echoes `hub.challenge` when
  `hub.verify_token` = `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, else 403.
- **POST** — verifies `X-Hub-Signature-256` (HMAC-SHA256 of raw body with
  `WHATSAPP_APP_SECRET`, 401 on mismatch, 503 if unset), logs inbound
  messages to `whatsapp_messages_log`, and forwards the raw payload to
  `N8N_WHATSAPP_WEBHOOK_URL` fire-and-forget. Always 200 `{received:true}`
  for verified payloads.

Outbound: the n8n state machine owns the conversation; the platform itself
sends only instant transactional texts (order confirmed + ETA + track link
on `payment.captured`; retry link on `payment.failed`) via
`src/lib/whatsapp.ts`, logged in `notifications_log`.

### GET `/api/admin/dashboard/revenue` (M7)

Admin-only aggregates (403 without an `admin_users` row). Queries run
through the caller's RLS-scoped client, so a `store_manager` gets numbers
for their store only.

200:

```jsonc
{
  "scope": "all_stores" | "<store uuid>",
  "gmv": { "today": 0, "last7": 0, "last30": 0 },          // paid statuses only
  "orders": { "today": 0, "last30": 0, "byStatus": {…} },
  "subscriptions": { "active": 0, "paused": 0, "mrrEstimate": 0 },
  "topCombos": [{ "label": "…", "orders": 0, "revenue": 0 }]  // top 5, 30d
}
```

MRR estimate = Σ over active subscriptions of (combo unit price × deliveries
per month: daily 30, alternate 15, weekly 4.33, custom days×4.33).

Admin CRUD (stores / products / inventory / coupons / roles) is implemented
as server actions inside `/admin` pages rather than public API routes —
RLS enforces role scoping either way.

All planned spec §6 endpoints are now implemented. 🎉
