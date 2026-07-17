import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { priceOptionBuild } from "@/lib/pricing";
import { createPaymentLink, razorpayConfigured } from "@/lib/razorpay";
import {
  nextDeliveryDate,
  todayIst,
  type DayKey,
  type Frequency,
} from "@/lib/subscriptions";
import { createServiceClient } from "@/lib/supabase/admin";

const renewSchema = z.object({
  subscription_id: z.string().uuid(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * POST /api/subscriptions/renew — called by the n8n daily cron (§5.3/§5.8).
 *
 * IDEMPOTENT (spec §7): the DB enforces unique(subscription_id,
 * scheduled_date); a re-run (n8n restart mid-batch, double cron) gets 409
 * `already_renewed`, which the workflow treats as success.
 *
 * Payment: MVP charges via a Razorpay payment link delivered on WhatsApp by
 * n8n (custom frequencies don't fit Razorpay's Subscriptions API plans;
 * saved-card tokenisation is the documented upgrade path — swap
 * createPaymentLink for a token charge here when mandates are set up).
 */
export async function POST(request: NextRequest) {
  const n8nSecret = request.headers.get("x-n8n-secret");
  if (!process.env.N8N_API_SECRET || n8nSecret !== process.env.N8N_API_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = renewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const scheduledDate = parsed.data.scheduled_date ?? todayIst();

  const db = createServiceClient();

  const { data: sub } = await db
    .from("subscriptions")
    .select(
      "id, customer_id, saved_combo_id, store_id, address_id, delivery_slot_id, frequency, custom_days, status, next_delivery_date, paused_until, customer_profiles(phone), saved_combos(option_ids, curated_basket_id, name)",
    )
    .eq("id", parsed.data.subscription_id)
    .maybeSingle();

  if (!sub) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (sub.status !== "active") {
    return NextResponse.json({ error: "not_active", status: sub.status }, { status: 409 });
  }
  if (sub.paused_until && (sub.paused_until as string) >= scheduledDate) {
    return NextResponse.json({ error: "paused" }, { status: 409 });
  }

  const combo = sub.saved_combos as unknown as {
    option_ids: string[] | null;
    curated_basket_id: string | null;
    name: string | null;
  } | null;
  if (!combo) {
    return NextResponse.json({ error: "combo_missing" }, { status: 422 });
  }

  // ── Price server-side (same engine as checkout) ────────────
  let unitPrice: number;
  if (combo.option_ids?.length) {
    const priced = await priceOptionBuild(db, combo.option_ids);
    if ("error" in priced) {
      return NextResponse.json({ error: priced.error }, { status: 422 });
    }
    unitPrice = priced.unitPrice;
  } else if (combo.curated_basket_id) {
    const { data: basket } = await db
      .from("curated_baskets")
      .select("base_price, is_active")
      .eq("id", combo.curated_basket_id)
      .maybeSingle();
    if (!basket || !basket.is_active) {
      return NextResponse.json({ error: "unknown_basket" }, { status: 422 });
    }
    unitPrice = Number(basket.base_price);
  } else {
    return NextResponse.json({ error: "combo_empty" }, { status: 422 });
  }

  // Delivery fee from the locked store + subscription address
  const { data: address } = await db
    .from("customer_addresses")
    .select("pincode")
    .eq("id", sub.address_id as string)
    .maybeSingle();
  const { data: coverage } = address
    ? await db
        .from("store_pincode_coverage")
        .select("delivery_fee")
        .eq("store_id", sub.store_id as string)
        .eq("pincode", address.pincode)
        .eq("is_active", true)
        .maybeSingle()
    : { data: null };
  const deliveryFee = Number(coverage?.delivery_fee ?? 0);
  const total = unitPrice + deliveryFee;

  // ── Create the order — the unique index is the idempotency guard ──
  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      customer_id: sub.customer_id,
      subscription_id: sub.id,
      store_id: sub.store_id,
      address_id: sub.address_id,
      delivery_slot_id: sub.delivery_slot_id,
      order_type: "subscription",
      channel: "whatsapp",
      status: "pending_payment",
      subtotal: unitPrice,
      delivery_fee: deliveryFee,
      discount: 0,
      total,
      scheduled_date: scheduledDate,
    })
    .select("id, order_number, total")
    .single();

  if (orderError) {
    if (orderError.code === "23505") {
      // unique(subscription_id, scheduled_date) — already renewed today
      return NextResponse.json({ error: "already_renewed" }, { status: 409 });
    }
    return NextResponse.json({ error: "order_create_failed" }, { status: 500 });
  }

  await db.from("order_items").insert({
    order_id: order.id,
    saved_combo_id: sub.saved_combo_id,
    option_ids: combo.option_ids,
    curated_basket_id: combo.curated_basket_id,
    quantity: 1,
    unit_price: unitPrice,
    line_total: unitPrice,
  });

  // ── Advance the schedule (order exists — re-runs now 409) ──
  const newNext = nextDeliveryDate(
    sub.frequency as Frequency,
    scheduledDate,
    (sub.custom_days ?? null) as DayKey[] | null,
  );
  await db
    .from("subscriptions")
    .update({ next_delivery_date: newNext })
    .eq("id", sub.id);

  // ── Payment link for n8n to deliver on WhatsApp ────────────
  const phone =
    (sub.customer_profiles as unknown as { phone: string } | null)?.phone;
  let payment: { type: string; url: string } | null = null;
  if (razorpayConfigured()) {
    try {
      const link = await createPaymentLink({
        amountInr: total,
        description: `Aeden Fresh subscription — ${combo.name ?? "your usual"} (${order.order_number})`,
        contact: phone ?? undefined,
        notes: { order_id: order.id },
      });
      await db.from("payments").insert({
        order_id: order.id,
        subscription_id: sub.id,
        razorpay_order_id: link.id,
        amount: total,
        status: "created",
      });
      payment = { type: "link", url: link.short_url };
    } catch {
      // Order + schedule stand; failed-payment recovery picks this up
    }
  }

  return NextResponse.json(
    {
      order: { id: order.id, order_number: order.order_number, total },
      payment,
      phone,
      next_delivery_date: newNext,
    },
    { status: 201 },
  );
}
